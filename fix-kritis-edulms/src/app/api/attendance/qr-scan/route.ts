import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { notifyAttendance } from '@/lib/wa-notifier'
import { requireStudent } from '@/lib/auth-guard'

export async function POST(request: Request) {
  const auth = await requireStudent()
  if ('error' in auth) return auth.error
  try {
    const body = await request.json()
    const { code, studentId, latitude, longitude } = body

    if (!code || !studentId) {
      return NextResponse.json({ error: 'QR code dan ID siswa wajib diisi' }, { status: 400 })
    }

    // Find the QR code in database
    const qrCode = await db.qRCode.findUnique({ where: { code } })

    if (!qrCode) {
      return NextResponse.json({ error: 'QR code tidak valid' }, { status: 400 })
    }

    if (!qrCode.isActive) {
      return NextResponse.json({ error: 'QR code sudah tidak aktif' }, { status: 400 })
    }

    const now = new Date()
    if (now < qrCode.validFrom || now > qrCode.validUntil) {
      return NextResponse.json({ error: 'QR code sudah expired' }, { status: 400 })
    }

    // Get student info
    const student = await db.student.findUnique({
      where: { id: studentId },
      include: { class: true },
    })

    if (!student) {
      return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 400 })
    }

    // Geofence validation for QR attendance
    if (latitude && longitude && student.classId) {
      const { validateStudentLocation } = await import('@/lib/geofence')
      const geoResult = await validateStudentLocation(latitude, longitude, student.classId)
      if (!geoResult.valid) {
        return NextResponse.json({
          error: geoResult.error || 'Anda berada di luar area absensi. QR attendance hanya bisa dilakukan di area sekolah.'
        }, { status: 400 })
      }
    }

    // Get active academic year
    const settings = await db.settings.findUnique({ where: { id: 'settings' } })
    const academicYearId = settings?.activeAcademicYearId

    if (!academicYearId) {
      return NextResponse.json({ error: 'Tahun ajaran aktif belum diatur' }, { status: 400 })
    }

    // Check if already attended today
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

    // Create attendance
    const attendance = await db.attendance.create({
      data: {
        studentId,
        academicYearId,
        date: today,
        timeIn: now,
        status,
        method: 'qr',
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
      message: `Absensi berhasil! Status: ${status === 'hadir' ? 'Hadir' : 'Terlambat'}`,
      attendance,
    })
  } catch (error) {
    console.error('QR scan error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
