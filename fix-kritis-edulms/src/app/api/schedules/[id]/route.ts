import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTeacherOrAdmin } from '@/lib/auth-guard'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const body = await request.json()
    const { classId, subjectAssignmentId, dayOfWeek, startTime, endTime, room } = body

    const schedule = await db.schedule.update({
      where: { id },
      data: {
        classId: classId || undefined,
        subjectAssignmentId: subjectAssignmentId || undefined,
        dayOfWeek: dayOfWeek !== undefined ? Number(dayOfWeek) : undefined,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        room: room !== undefined ? room || null : undefined,
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

    return NextResponse.json(schedule)
  } catch (error) {
    console.error('Schedule PUT error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    await db.schedule.delete({ where: { id } })
    return NextResponse.json({ message: 'Jadwal berhasil dihapus' })
  } catch (error) {
    console.error('Schedule DELETE error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
