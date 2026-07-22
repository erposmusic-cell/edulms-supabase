import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTeacherOrAdmin } from '@/lib/auth-guard'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const body = await request.json()
    const { title, description, startDate, endDate, type, location, classId } = body

    const event = await db.calendarEvent.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(type !== undefined && { type }),
        ...(location !== undefined && { location }),
        ...(classId !== undefined && { classId: classId || null }),
      },
      include: {
        creator: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(event)
  } catch (error) {
    console.error('Calendar event PUT error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    await db.calendarEvent.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Calendar event DELETE error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
