import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { requireAdmin } from '@/lib/auth-guard'

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const body = await request.json()
    const { confirmation } = body

    if (confirmation !== 'RESET') {
      return NextResponse.json({ error: 'Konfirmasi tidak valid. Ketik RESET untuk mengkonfirmasi.' }, { status: 400 })
    }

    // Get admin user info before wiping
    const adminUser = await db.user.findFirst({ where: { role: 'admin' } })
    if (!adminUser) {
      return NextResponse.json({ error: 'Admin tidak ditemukan.' }, { status: 404 })
    }

    // Delete all data in correct order (respecting foreign keys)
    // 1. Quiz answers & attempts
    await db.quizAnswer.deleteMany()
    await db.quizAttempt.deleteMany()

    // 2. Quiz questions & quizzes
    await db.quizQuestion.deleteMany()
    await db.quiz.deleteMany()

    // 3. Assignment submissions & assignments
    await db.assignmentSubmission.deleteMany()
    await db.assignment.deleteMany()

    // 4. Grades
    await db.grade.deleteMany()

    // 5. Grade categories
    await db.gradeCategory.deleteMany()

    // 6. Attendance
    await db.attendance.deleteMany()

    // 7. Leave requests
    await db.leaveRequest.deleteMany()

    // 8. QR codes
    await db.qRCode.deleteMany()

    // 9. Location classes & attendance locations
    await db.locationClass.deleteMany()
    await db.attendanceLocation.deleteMany()

    // 10. Schedules
    await db.schedule.deleteMany()

    // 11. Subject assignments
    await db.subjectAssignment.deleteMany()

    // 12. Class advisors
    await db.classAdvisor.deleteMany()

    // 13. Subjects
    await db.subject.deleteMany()

    // 14. Materials, bookmarks, notes
    await db.bookmark.deleteMany()
    await db.studentNote.deleteMany()
    await db.material.deleteMany()

    // 15. Announcements
    await db.announcement.deleteMany()

    // 16. Discussion posts & forums
    await db.discussionPost.deleteMany()
    await db.discussionForum.deleteMany()

    // 17. Chat messages, participants, rooms
    await db.chatMessage.deleteMany()
    await db.chatParticipant.deleteMany()
    await db.chatRoom.deleteMany()

    // 18. Notifications
    await db.notification.deleteMany()

    // 19. Calendar events
    await db.calendarEvent.deleteMany()

    // 20. Holidays
    await db.holiday.deleteMany()

    // 21. Library book reviews & books
    await db.libraryBookReview.deleteMany()
    await db.libraryBook.deleteMany()

    // 22. Media items
    await db.mediaItem.deleteMany()

    // 23. Activity logs & student audit logs
    await db.activityLog.deleteMany()
    await db.studentAuditLog.deleteMany()

    // 24. Report schedule logs & schedules
    await db.reportScheduleLog.deleteMany()
    await db.reportSchedule.deleteMany()

    // 25. Students, teachers, parents (must be before classes)
    await db.student.deleteMany()
    await db.teacher.deleteMany()
    await db.parent.deleteMany()

    // 26. Classes
    await db.class.deleteMany()

    // 27. Semesters & academic years
    await db.semester.deleteMany()
    await db.academicYear.deleteMany()

    // 28. Delete all non-admin users
    await db.user.deleteMany({ where: { role: { not: 'admin' } } })

    // 29. Reset settings to defaults (keep school name if changed)
    await db.settings.delete({ where: { id: 'settings' } })
    await db.settings.create({
      data: {
        id: 'settings',
        schoolName: 'Sekolah Saya',
        timeIn: '07:00',
        timeLate: '07:30',
        timeOutMin: '13:00',
        timeOutDeadline: '16:00',
        attendanceThreshold: 80.0,
        faceRecognitionThreshold: 0.6,
        reminderMinutes: 30,
      }
    })

    // Log the reset action
    await db.activityLog.create({
      data: {
        userId: adminUser.id,
        userName: adminUser.name,
        userRole: adminUser.role,
        action: 'RESET_DATABASE',
        details: 'Semua data demo telah dihapus. Database bersih siap untuk data sekolah.',
      }
    })

    return NextResponse.json({
      message: 'Database berhasil di-reset! Semua data demo telah dihapus. Anda bisa mulai mengisi data sekolah yang sebenarnya.',
      reset: true
    })
  } catch (error) {
    console.error('Reset database error:', error)
    return NextResponse.json({ error: 'Gagal reset database: ' + String(error) }, { status: 500 })
  }
}
