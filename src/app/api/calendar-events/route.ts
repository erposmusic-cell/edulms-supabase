import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireTeacherOrAdmin } from '@/lib/auth-guard'

export async function GET(request: Request) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const classId = searchParams.get('classId')
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    const where: Record<string, unknown> = {}
    if (type) where.type = type
    if (classId) where.classId = classId
    if (start || end) {
      const startDate: Record<string, Date> = {}
      if (start) startDate.gte = new Date(start)
      if (end) startDate.lte = new Date(end)
      where.startDate = startDate
    }

    const events = await db.calendarEvent.findMany({
      where,
      include: {
        creator: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
      },
      orderBy: { startDate: 'asc' },
      take: 200,
    })

    // Also include assignment deadlines
    const assignments = await db.assignment.findMany({
      where: {
        isPublished: true,
        ...(start && { dueDate: { gte: new Date(start) } }),
        ...(end && { dueDate: { lte: new Date(end) } }),
      },
      include: {
        subject: { select: { id: true, name: true } },
      },
    })

    const assignmentEvents = assignments.map(a => ({
      id: `assignment-${a.id}`,
      title: `📋 ${a.title}`,
      description: `Tugas: ${a.subject.name}`,
      startDate: a.dueDate,
      endDate: a.dueDate,
      type: 'deadline',
      location: null,
      createdBy: a.teacherId,
      classId: null,
      isAssignment: true,
    }))

    return NextResponse.json([...events, ...assignmentEvents])
  } catch (error) {
    console.error('Calendar events GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error
  try {
    const body = await request.json()
    const { title, description, startDate, endDate, type, location, createdBy, classId } = body

    if (!title || !startDate || !createdBy) {
      return NextResponse.json({ error: 'Judul, tanggal mulai, dan pembuat wajib diisi' }, { status: 400 })
    }

    const event = await db.calendarEvent.create({
      data: {
        title,
        description: description || null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        type: type || 'event',
        location: location || null,
        createdBy,
        classId: classId || null,
      },
      include: {
        creator: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('Calendar event POST error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
