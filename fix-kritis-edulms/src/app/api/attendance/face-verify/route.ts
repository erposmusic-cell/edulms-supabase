import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { notifyAttendance } from '@/lib/wa-notifier'
import { requireStudent } from '@/lib/auth-guard'

export async function POST(request: Request) {
  const auth = await requireStudent()
  if ('error' in auth) return auth.error
  try {
    const body = await request.json()
    const { studentId, descriptor, latitude, longitude } = body

    if (!studentId || !descriptor) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }

    // Get student's stored face descriptor
    const student = await db.student.findUnique({
      where: { id: studentId },
      include: { user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } }, class: true },
    })

    if (!student?.faceRegistered || !student.faceDescriptorUrl) {
      return NextResponse.json(
        { error: 'Wajah belum terdaftar. Silakan daftarkan wajah terlebih dahulu.' },
        { status: 400 }
      )
    }

    // Parse stored descriptor
    let storedDescriptor: number[]
    try {
      if (student.faceDescriptorUrl.startsWith('data:')) {
        const base64Data = student.faceDescriptorUrl.split(',')[1]
        storedDescriptor = JSON.parse(atob(base64Data))
      } else {
        // Old format - can't verify
        return NextResponse.json(
          { error: 'Data wajah tidak valid. Silakan daftarkan ulang wajah.' },
          { status: 400 }
        )
      }
    } catch {
      return NextResponse.json(
        { error: 'Data wajah korup. Silakan daftarkan ulang.' },
        { status: 400 }
      )
    }

    // Compare descriptors using Euclidean distance
    const currentDescriptor = Array.isArray(descriptor) ? descriptor : Object.values(descriptor) as number[]
    const distance = Math.sqrt(
      storedDescriptor.reduce((sum, val, i) => sum + Math.pow(val - (currentDescriptor[i] || 0), 2), 0)
    )

    // Get threshold from settings
    const settings = await db.settings.findUnique({ where: { id: 'settings' } })
    const threshold = settings?.faceRecognitionThreshold || 0.6

    if (distance > threshold) {
      return NextResponse.json(
        {
          error: `Wajah tidak cocok (jarak: ${distance.toFixed(3)}, batas: ${threshold}). Coba lagi.`,
          distance,
          threshold,
        },
        { status: 400 }
      )
    }

    // Geofence validation for face attendance
    if (latitude && longitude && student.classId) {
      const { validateStudentLocation } = await import('@/lib/geofence')
      const geoResult = await validateStudentLocation(latitude, longitude, student.classId)
      if (!geoResult.valid) {
        return NextResponse.json({
          error: geoResult.error || 'Anda berada di luar area absensi. Absensi wajah hanya bisa dilakukan di area sekolah.'
        }, { status: 400 })
      }
    }

    // Face matched! Create attendance
    const academicYearId = settings?.activeAcademicYearId
    if (!academicYearId) {
      return NextResponse.json({ error: 'Tahun ajaran aktif belum diatur' }, { status: 400 })
    }

    const now = new Date()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const existing = await db.attendance.findUnique({
      where: { studentId_date: { studentId, date: today } },
    })

    if (existing) {
      return NextResponse.json({ error: 'Anda sudah melakukan absensi hari ini' }, { status: 400 })
    }

    // Use numeric comparison to avoid locale-dependent string comparison issues
    const timeLate = settings?.timeLate || '07:30'
    const [lateH, lateM] = timeLate.split(':').map(Number)
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const lateMinutes = lateH * 60 + lateM
    const status = currentMinutes > lateMinutes ? 'terlambat' : 'hadir'

    const attendance = await db.attendance.create({
      data: {
        studentId,
        academicYearId,
        date: today,
        timeIn: now,
        status,
        method: 'face',
        latitude: latitude ?? null,
        longitude: longitude ?? null,
      },
      include: { student: { include: { user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } }, class: true } } },
    })

    // Send WA notification (fire and forget)
    notifyAttendance(studentId, status, today.toISOString(), now.toISOString(), student.class?.name)
      .catch(err => console.error('WA notification failed:', err))

    return NextResponse.json({
      success: true,
      message: `Absensi berhasil! Wajah terverifikasi (jarak: ${distance.toFixed(3)}). Status: ${status === 'hadir' ? 'Hadir' : 'Terlambat'}`,
      attendance: {
        id: attendance.id,
        status: attendance.status,
        timeIn: attendance.timeIn?.toISOString(),
        date: attendance.date.toISOString(),
        student: {
          user: { name: attendance.student?.user?.name },
          class: { name: attendance.student?.class?.name },
        },
      },
      distance,
    })
  } catch (error) {
    console.error('Face verify error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
