/**
 * WhatsApp Auto-Notifier - Real WAHA Integration
 * 
 * This module provides automatic WhatsApp notification triggers
 * that are called from API routes when events occur:
 * - Attendance recorded → notify parent
 * - Grade created/updated → notify parent
 * - Announcement published → notify class/all parents
 * - Leave request submitted/approved → notify relevant parties
 * - Assignment graded → notify parent
 * 
 * All notifications use the WAHA API at waha.devlike.pro
 */

import { getWAService, WAService } from './wa-service'
import { db } from './db'
import { createNotification, createNotificationForClassParents, createNotificationForUsers } from './notification-service'

interface NotificationResult {
  sent: boolean
  phone?: string
  error?: string
}

/**
 * Send WA notification - checks settings and auto-notification flags before sending
 */
async function sendWANotification(
  type: 'attendance' | 'grade' | 'announcement' | 'leaveRequest' | 'assignmentGrade',
  phone: string,
  message: string
): Promise<NotificationResult> {
  try {
    // Check if WA is enabled and auto-notification for this type is on
    const settings = await db.settings.findUnique({ where: { id: 'settings' } })

    if (!settings?.waEnabled || !settings?.waApiUrl) {
      return { sent: false, error: 'WhatsApp tidak aktif atau belum dikonfigurasi' }
    }

    // Check auto-notification flag for this specific type
    const autoFlagMap: Record<string, string> = {
      attendance: 'waAutoAttendance',
      grade: 'waAutoGrade',
      assignmentGrade: 'waAutoGrade',
      announcement: 'waAutoAnnouncement',
      leaveRequest: 'waAutoLeaveRequest',
    }

    const flagField = autoFlagMap[type]
    if (flagField && !(settings as Record<string, unknown>)[flagField]) {
      return { sent: false, error: `Auto-notifikasi ${type} dinonaktifkan` }
    }

    if (!phone) {
      return { sent: false, error: 'Nomor telepon tidak tersedia' }
    }

    const waService = await getWAService()

    if (!waService.isConfigured()) {
      return { sent: false, error: 'WAHA belum dikonfigurasi' }
    }

    const result = await waService.sendMessage({ phone, message })

    if (result.success) {
      // Log the notification
      await db.activityLog.create({
        data: {
          userId: 'system',
          userName: 'System WA',
          userRole: 'system',
          action: `WA_NOTIFY_${type.toUpperCase()}`,
          details: `Pesan ${type} terkirim ke ${phone}`,
        },
      })
      return { sent: true, phone }
    } else {
      return { sent: false, phone, error: result.error || 'Gagal mengirim pesan WA' }
    }
  } catch (error) {
    console.error(`WA Notification error (${type}):`, error)
    return { sent: false, error: `Error: ${error instanceof Error ? error.message : 'Unknown'}` }
  }
}

/**
 * Notify parent when attendance is recorded
 * Called from: POST /api/attendance, POST /api/attendance/bulk
 */
export async function notifyAttendance(
  studentId: string,
  status: string,
  date: string,
  timeIn?: string | null,
  className?: string
): Promise<NotificationResult> {
  try {
    const student = await db.student.findUnique({
      where: { id: studentId },
      include: { user: true, class: true },
    })

    if (!student) return { sent: false, error: 'Siswa tidak ditemukan' }

    const settings = await db.settings.findUnique({ where: { id: 'settings' } })
    const schoolName = settings?.schoolName || 'Sekolah'

    const studentName = student.user?.name || 'Siswa'
    const cName = className || student.class?.name || '-'
    const formattedDate = new Date(date).toLocaleDateString('id-ID', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })
    const formattedTime = timeIn
      ? new Date(timeIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      : '-'

    // Create in-app notification for the student's user (always, regardless of WA availability)
    await createNotification({
      userId: student.userId,
      title: `Kehadiran: ${status === 'hadir' ? 'Hadir' : status === 'terlambat' ? 'Terlambat' : status === 'izin' ? 'Izin' : status === 'sakit' ? 'Sakit' : 'Alpha'}`,
      message: `${studentName} tercatat ${status === 'hadir' ? 'hadir' : status === 'terlambat' ? 'terlambat' : status === 'izin' ? 'izin' : status === 'sakit' ? 'sakit' : 'alpha'} pada ${formattedDate}${formattedTime !== '-' ? ' pukul ' + formattedTime : ''}.`,
      type: 'attendance',
    })

    const parentPhone = student.parentPhone || student.user?.phone
    if (!parentPhone) return { sent: false, error: 'Nomor telepon orang tua tidak tersedia' }

    const parentName = student.parentPhone ? 'Orang Tua' : (student.user?.name || 'Orang Tua')

    const template = WAService.getDefaultAttendanceTemplate()
    const waService = new WAService('', null, 'default') // Just for template generation
    const message = waService.generateAttendanceMessage(template, {
      parentName,
      studentName,
      date: formattedDate,
      timeIn: formattedTime,
      status: status === 'hadir' ? 'Hadir' : status === 'terlambat' ? 'Terlambat' : status === 'izin' ? 'Izin' : status === 'sakit' ? 'Sakit' : 'Alpha/Tidak Hadir',
      className: cName,
    }).replace(/\{school\}/g, schoolName)

    return await sendWANotification('attendance', parentPhone, message)
  } catch (error) {
    console.error('notifyAttendance error:', error)
    return { sent: false, error: `Error: ${error instanceof Error ? error.message : 'Unknown'}` }
  }
}

/**
 * Notify parent when a grade is created or updated
 * Called from: POST /api/grades, PUT /api/grades/[id]
 */
export async function notifyGrade(
  studentId: string,
  subjectName: string,
  score: number,
  gradeCategoryName: string,
  className?: string
): Promise<NotificationResult> {
  try {
    const student = await db.student.findUnique({
      where: { id: studentId },
      include: { user: true, class: true },
    })

    if (!student) return { sent: false, error: 'Siswa tidak ditemukan' }

    const settings = await db.settings.findUnique({ where: { id: 'settings' } })
    const schoolName = settings?.schoolName || 'Sekolah'

    const studentName = student.user?.name || 'Siswa'
    const cName = className || student.class?.name || '-'

    // Determine grade letter
    const gradeLetter = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'E'

    // Create in-app notification for the student's user (always, regardless of WA availability)
    await createNotification({
      userId: student.userId,
      title: `Nilai ${subjectName}`,
      message: `${studentName} mendapatkan nilai ${score} (${gradeLetter}) untuk ${subjectName} - ${gradeCategoryName} di kelas ${cName}.`,
      type: 'grade',
    })

    const parentPhone = student.parentPhone || student.user?.phone
    if (!parentPhone) return { sent: false, error: 'Nomor telepon orang tua tidak tersedia' }

    const parentName = student.parentPhone ? 'Orang Tua' : (student.user?.name || 'Orang Tua')

    const template = WAService.getDefaultGradeTemplate()
    const waService = new WAService('', null, 'default')
    const message = waService.generateGradeMessage(template, {
      parentName,
      studentName,
      subject: subjectName,
      score: String(score),
      grade: gradeLetter,
      className: cName,
    }).replace(/\{school\}/g, schoolName)

    return await sendWANotification('grade', parentPhone, message)
  } catch (error) {
    console.error('notifyGrade error:', error)
    return { sent: false, error: `Error: ${error instanceof Error ? error.message : 'Unknown'}` }
  }
}

/**
 * Notify parents when an announcement is published
 * Called from: POST /api/announcements, PUT /api/announcements/[id]
 */
export async function notifyAnnouncement(
  announcementId: string
): Promise<{ totalSent: number; totalFailed: number; results: NotificationResult[] }> {
  try {
    const announcement = await db.announcement.findUnique({
      where: { id: announcementId },
      include: {
        class: { include: { students: { include: { user: true } } } },
      },
    })

    if (!announcement || !announcement.isPublished) {
      return { totalSent: 0, totalFailed: 0, results: [] }
    }

    const settings = await db.settings.findUnique({ where: { id: 'settings' } })
    const schoolName = settings?.schoolName || 'Sekolah'

    const formattedDate = new Date(announcement.createdAt).toLocaleDateString('id-ID', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })

    const template = WAService.getDefaultAnnouncementTemplate()
    const waService = new WAService('', null, 'default')
    const message = waService.generateAnnouncementMessage(template, {
      title: announcement.title,
      content: announcement.content,
      schoolName,
      date: formattedDate,
    })

    // Collect phone numbers of parents
    let students: Array<{ parentPhone: string | null; userPhone: string | null }> = []

    if (announcement.classId && announcement.class) {
      // Class-specific announcement
      students = announcement.class.students.map(s => ({
        parentPhone: s.parentPhone,
        userPhone: s.user?.phone || null,
      }))
    } else {
      // Global announcement - get all students
      const allStudents = await db.student.findMany({
        include: { user: { select: { phone: true } } },
      })
      students = allStudents.map(s => ({
        parentPhone: s.parentPhone,
        userPhone: s.user?.phone || null,
      }))
    }

    // Get unique phone numbers
    const phones = [...new Set(
      students
        .map(s => s.parentPhone || s.userPhone)
        .filter((p): p is string => !!p)
    )]

    // Create in-app notifications for class parents or all users
    if (announcement.classId) {
      await createNotificationForClassParents({
        classId: announcement.classId,
        title: `Pengumuman: ${announcement.title}`,
        message: announcement.content.substring(0, 200) + (announcement.content.length > 200 ? '...' : ''),
        type: 'announcement',
      })
    } else {
      // Global announcement - notify all active users
      const allUsers = await db.user.findMany({ where: { isActive: true } })
      if (allUsers.length > 0) {
        await createNotificationForUsers({
          userIds: allUsers.map(u => u.id),
          title: `Pengumuman: ${announcement.title}`,
          message: announcement.content.substring(0, 200) + (announcement.content.length > 200 ? '...' : ''),
          type: 'announcement',
        })
      }
    }

    const results: NotificationResult[] = []
    let totalSent = 0
    let totalFailed = 0

    for (const phone of phones) {
      const result = await sendWANotification('announcement', phone, message)
      results.push(result)
      if (result.sent) totalSent++
      else totalFailed++

      // Delay between messages to avoid rate limiting
      if (phones.indexOf(phone) < phones.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1500))
      }
    }

    return { totalSent, totalFailed, results }
  } catch (error) {
    console.error('notifyAnnouncement error:', error)
    return { totalSent: 0, totalFailed: 0, results: [] }
  }
}

/**
 * Notify relevant parties about leave request
 * - When submitted: notify wali kelas / admin
 * - When status changes: notify parent
 * Called from: POST /api/leave-requests, PUT /api/leave-requests/[id]
 */
export async function notifyLeaveRequest(
  leaveRequestId: string,
  event: 'created' | 'statusChanged'
): Promise<NotificationResult> {
  try {
    const leaveRequest = await db.leaveRequest.findUnique({
      where: { id: leaveRequestId },
      include: {
        student: { include: { user: true, class: { include: { classAdvisors: { include: { teacher: { include: { user: true } } } } } } } },
      },
    })

    if (!leaveRequest) return { sent: false, error: 'Pengajuan izin tidak ditemukan' }

    const settings = await db.settings.findUnique({ where: { id: 'settings' } })
    const schoolName = settings?.schoolName || 'Sekolah'

    const studentName = leaveRequest.student?.user?.name || 'Siswa'
    const className = leaveRequest.student?.class?.name || '-'
    const startDate = new Date(leaveRequest.startDate).toLocaleDateString('id-ID', {
      year: 'numeric', month: 'long', day: 'numeric'
    })
    const endDate = leaveRequest.endDate
      ? new Date(leaveRequest.endDate).toLocaleDateString('id-ID', {
          year: 'numeric', month: 'long', day: 'numeric'
        })
      : startDate
    const typeLabel = leaveRequest.type === 'sick' ? 'Sakit' : 'Izin'
    const statusLabel = leaveRequest.status === 'pending' ? 'Menunggu Persetujuan'
      : leaveRequest.status === 'approved' ? 'Disetujui'
      : 'Ditolak'

    if (event === 'created') {
      // Notify wali kelas about new leave request
      const advisors = leaveRequest.student?.class?.classAdvisors || []
      const advisorPhones = advisors
        .map(a => a.teacher?.user?.phone)
        .filter((p): p is string => !!p)

      // Create in-app notifications for wali kelas (advisors)
      const advisorUserIds = advisors
        .map(a => a.teacher?.userId)
        .filter((id): id is string => !!id)

      if (advisorUserIds.length > 0) {
        await createNotificationForUsers({
          userIds: advisorUserIds,
          title: `Pengajuan ${typeLabel} Baru`,
          message: `${studentName} (Kelas ${className}) mengajukan ${typeLabel.toLowerCase()}: ${leaveRequest.reason}. Tanggal: ${startDate} s/d ${endDate}.`,
          type: 'leave_request',
        })
      }

      if (advisorPhones.length === 0) {
        // Try to notify admin users
        const admins = await db.user.findMany({
          where: { role: 'admin', phone: { not: null } },
        })
        const adminPhones = admins.map(a => a.phone).filter((p): p is string => !!p)

        // Create in-app notifications for admins too
        const adminUserIds = admins.map(a => a.id)
        if (adminUserIds.length > 0) {
          await createNotificationForUsers({
            userIds: adminUserIds,
            title: `Pengajuan ${typeLabel} Baru`,
            message: `${studentName} (Kelas ${className}) mengajukan ${typeLabel.toLowerCase()}: ${leaveRequest.reason}. Tanggal: ${startDate} s/d ${endDate}.`,
            type: 'leave_request',
          })
        }

        if (adminPhones.length === 0) return { sent: false, error: 'Tidak ada nomor wali kelas/admin' }

        const message = `📋 *Pengajuan ${typeLabel} - ${schoolName}*\n\n${studentName} (Kelas ${className}) mengajukan ${typeLabel.toLowerCase()}:\n📝 Alasan: ${leaveRequest.reason}\n📅 Tanggal: ${startDate} s/d ${endDate}\n📊 Status: *${statusLabel}*\n\nPesan ini dikirim otomatis oleh sistem EduLMS.`

        const firstAdminPhone = adminPhones[0]
        return await sendWANotification('leaveRequest', firstAdminPhone, message)
      }

      const message = `📋 *Pengajuan ${typeLabel} - ${schoolName}*\n\n${studentName} (Kelas ${className}) mengajukan ${typeLabel.toLowerCase()}:\n📝 Alasan: ${leaveRequest.reason}\n📅 Tanggal: ${startDate} s/d ${endDate}\n📊 Status: *${statusLabel}*\n\nPesan ini dikirim otomatis oleh sistem EduLMS.`

      return await sendWANotification('leaveRequest', advisorPhones[0], message)
    } else {
      // Notify parent about status change
      const parentPhone = leaveRequest.student?.parentPhone || leaveRequest.student?.user?.phone

      // Create in-app notification for the student's user
      await createNotification({
        userId: leaveRequest.student?.userId || '',
        title: `Update Pengajuan ${typeLabel}`,
        message: `Pengajuan ${typeLabel.toLowerCase()} Anda telah diperbarui. Status: ${statusLabel}. Tanggal: ${startDate} s/d ${endDate}.`,
        type: 'leave_request',
      })

      // Also notify parent user if exists
      const parentId = await db.parent.findFirst({
        where: { childId: leaveRequest.studentId },
        select: { userId: true },
      })
      if (parentId) {
        await createNotification({
          userId: parentId.userId,
          title: `Update Pengajuan ${typeLabel}`,
          message: `Pengajuan ${typeLabel.toLowerCase()} ${studentName} telah diperbarui. Status: ${statusLabel}.`,
          type: 'leave_request',
        })
      }

      if (!parentPhone) return { sent: false, error: 'Nomor telepon orang tua tidak tersedia' }

      const message = `📋 *Update Pengajuan ${typeLabel} - ${schoolName}*\n\nHalo Orang Tua dari ${studentName} (Kelas ${className}),\n\nPengajuan ${typeLabel.toLowerCase()} anak Anda:\n📝 Alasan: ${leaveRequest.reason}\n📅 Tanggal: ${startDate} s/d ${endDate}\n📊 Status: *${statusLabel}*\n\nPesan ini dikirim otomatis oleh sistem EduLMS.`

      return await sendWANotification('leaveRequest', parentPhone, message)
    }
  } catch (error) {
    console.error('notifyLeaveRequest error:', error)
    return { sent: false, error: `Error: ${error instanceof Error ? error.message : 'Unknown'}` }
  }
}

/**
 * Notify parent when assignment is graded
 * Called from: PUT /api/assignments/[id]/submissions (when grading)
 */
export async function notifyAssignmentGrade(
  studentId: string,
  assignmentTitle: string,
  score: number,
  maxScore: number,
  className?: string
): Promise<NotificationResult> {
  try {
    const student = await db.student.findUnique({
      where: { id: studentId },
      include: { user: true, class: true },
    })

    if (!student) return { sent: false, error: 'Siswa tidak ditemukan' }

    const settings = await db.settings.findUnique({ where: { id: 'settings' } })
    const schoolName = settings?.schoolName || 'Sekolah'

    const studentName = student.user?.name || 'Siswa'
    const cName = className || student.class?.name || '-'
    const percentage = Math.round((score / maxScore) * 100)
    const gradeLetter = percentage >= 90 ? 'A' : percentage >= 80 ? 'B' : percentage >= 70 ? 'C' : percentage >= 60 ? 'D' : 'E'

    // Create in-app notification for the student's user (always, regardless of WA availability)
    await createNotification({
      userId: student.userId,
      title: `Nilai Tugas: ${assignmentTitle}`,
      message: `${studentName} mendapatkan nilai ${score}/${maxScore} (${percentage}%) untuk tugas "${assignmentTitle}" di kelas ${cName}. Grade: ${gradeLetter}.`,
      type: 'assignment',
    })

    const parentPhone = student.parentPhone || student.user?.phone
    if (!parentPhone) return { sent: false, error: 'Nomor telepon orang tua tidak tersedia' }

    const message = `📝 *Notifikasi Penilaian Tugas - ${schoolName}*\n\nHalo Orang Tua,\n\nNilai tugas ${studentName} (Kelas ${cName}):\n📚 Tugas: ${assignmentTitle}\n📝 Nilai: *${score}/${maxScore}* (${percentage}%)\n📊 Grade: *${gradeLetter}*\n\nPesan ini dikirim otomatis oleh sistem EduLMS.`

    return await sendWANotification('assignmentGrade', parentPhone, message)
  } catch (error) {
    console.error('notifyAssignmentGrade error:', error)
    return { sent: false, error: `Error: ${error instanceof Error ? error.message : 'Unknown'}` }
  }
}

/**
 * Bulk notify attendance for multiple students
 * Used after bulk attendance marking
 */
export async function notifyBulkAttendance(
  attendanceRecords: Array<{ studentId: string; status: string; date: string; timeIn?: string | null }>
): Promise<{ totalSent: number; totalFailed: number }> {
  let totalSent = 0
  let totalFailed = 0

  for (const record of attendanceRecords) {
    // Only send for non-hadir statuses (terlambat, izin, sakit, alpha)
    // For hadir, we skip to avoid too many messages
    if (record.status !== 'hadir') {
      const result = await notifyAttendance(
        record.studentId,
        record.status,
        record.date,
        record.timeIn
      )
      if (result.sent) totalSent++
      else totalFailed++
    }
  }

  return { totalSent, totalFailed }
}
