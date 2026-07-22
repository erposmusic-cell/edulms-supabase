import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireTeacherOrAdmin } from '@/lib/auth-guard'

export async function GET(request: Request) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')

    const where: Record<string, unknown> = {}
    if (classId) where.classId = classId

    const schedules = await db.schedule.findMany({
      where,
      include: {
        class: true,
        subjectAssignment: {
          include: {
            subject: true,
            teacher: { include: { user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } } } },
          },
        },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    })

    return NextResponse.json(schedules)
  } catch (error) {
    console.error('Schedules GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error
  try {
    const body = await request.json()
    const { classId, subjectAssignmentId, dayOfWeek, startTime, endTime, room } = body

    if (!classId || !subjectAssignmentId || !dayOfWeek || !startTime || !endTime) {
      return NextResponse.json({ error: 'Kelas, mata pelajaran, hari, jam mulai, dan jam selesai wajib diisi' }, { status: 400 })
    }

    // Check for time conflict
    const conflict = await db.schedule.findFirst({
      where: {
        classId,
        dayOfWeek: Number(dayOfWeek),
        OR: [
          {
            startTime: { lte: endTime },
            endTime: { gte: startTime },
          },
        ],
      },
    })
    if (conflict) {
      return NextResponse.json({ error: 'Jadwal bentrok dengan jadwal yang sudah ada' }, { status: 400 })
    }

    const schedule = await db.schedule.create({
      data: {
        classId,
        subjectAssignmentId,
        dayOfWeek: Number(dayOfWeek),
        startTime,
        endTime,
        room: room || null,
      },
      include: {
        class: true,
        subjectAssignment: {
          include: {
            subject: true,
            teacher: { include: { user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } } } },
          },
        },
      },
    })

    return NextResponse.json(schedule, { status: 201 })
  } catch (error) {
    console.error('Schedules POST error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
