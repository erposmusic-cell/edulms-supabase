import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { notifyAttendance } from '@/lib/wa-notifier'
import { requireAuth, requireTeacherOrAdmin } from '@/lib/auth-guard'

export async function GET(request: Request) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    const date = searchParams.get('date')
    const academicYearId = searchParams.get('academicYearId')
    const classId = searchParams.get('classId')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (studentId) where.studentId = studentId
    if (date) where.date = new Date(date)
    if (academicYearId) where.academicYearId = academicYearId
    if (status) where.status = status
    if (classId) where.student = { classId }

    const attendance = await db.attendance.findMany({
      where,
      include: { student: { include: { user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } }, class: true } }, academicYear: true },
      orderBy: { date: 'desc' },
      take: 500,
    })

    return NextResponse.json(attendance)
  } catch (error) {
    console.error('Attendance GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error
  try {
    const body = await request.json()
    const { studentId, academicYearId, date, timeIn, timeOut, status, method, latitude, longitude, notes, createdBy } = body

    if (!studentId || !academicYearId || !date || !status) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }

    // GPS Geofence validation
    if (method === 'gps' && latitude && longitude) {
      const student = await db.student.findUnique({ where: { id: studentId } })
      if (student) {
        const { validateStudentLocation } = await import('@/lib/geofence')
        const geoResult = await validateStudentLocation(latitude, longitude, student.classId)
        if (!geoResult.valid) {
          return NextResponse.json({
            error: geoResult.error || 'Anda berada di luar area absensi'
          }, { status: 400 })
        }
      }
    }

    const existing = await db.attendance.findUnique({
      where: { studentId_date: { studentId, date: new Date(date) } },
    })

    let attendanceRecord

    if (existing) {
      attendanceRecord = await db.attendance.update({
        where: { id: existing.id },
        data: {
          timeIn: timeIn ? new Date(timeIn) : existing.timeIn,
          timeOut: timeOut ? new Date(timeOut) : existing.timeOut,
          status,
          method: method || existing.method,
          latitude: latitude ?? existing.latitude,
          longitude: longitude ?? existing.longitude,
          notes: notes ?? existing.notes,
          createdBy: createdBy || existing.createdBy,
        },
        include: { student: { include: { user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } }, class: true } } },
      })
    } else {
      attendanceRecord = await db.attendance.create({
        data: {
          studentId, academicYearId, date: new Date(date),
          timeIn: timeIn ? new Date(timeIn) : null,
          timeOut: timeOut ? new Date(timeOut) : null,
          status, method: method || null,
          latitude: latitude ?? null, longitude: longitude ?? null,
          notes: notes || null, createdBy: createdBy || null,
        },
        include: { student: { include: { user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } }, class: true } } },
      })
    }

    // 🔔 Send real WhatsApp notification to parent
    // Fire and forget - don't block the response
    notifyAttendance(
      studentId,
      status,
      date,
      timeIn,
      attendanceRecord.student?.class?.name
    ).catch(err => {
      console.error('WA attendance notification failed:', err)
    })

    return NextResponse.json(attendanceRecord, { status: existing ? 200 : 201 })
  } catch (error) {
    console.error('Attendance POST error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
