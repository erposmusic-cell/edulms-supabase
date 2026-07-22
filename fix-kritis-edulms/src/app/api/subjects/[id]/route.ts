import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireAdmin } from '@/lib/auth-guard'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const subject = await db.subject.findUnique({
      where: { id },
      include: {
        academicYear: true,
        subjectAssignments: {
          include: {
            teacher: { include: { user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } } } },
            class: true,
          },
        },
        materials: { include: { teacher: true }, orderBy: { orderNum: 'asc' } },
        assignments: { orderBy: { dueDate: 'desc' } },
        quizzes: { orderBy: { createdAt: 'desc' } },
      },
    })
    if (!subject) return NextResponse.json({ error: 'Mata pelajaran tidak ditemukan' }, { status: 404 })
    return NextResponse.json(subject)
  } catch (error) {
    console.error('Subject GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const body = await request.json()
    const subject = await db.subject.update({
      where: { id },
      data: {
        name: body.name,
        code: body.code || null,
        description: body.description || null,
        academicYearId: body.academicYearId,
      },
      include: { academicYear: true },
    })
    return NextResponse.json(subject)
  } catch (error) {
    console.error('Subject PUT error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    await db.subject.delete({ where: { id } })
    return NextResponse.json({ message: 'Mata pelajaran berhasil dihapus' })
  } catch (error) {
    console.error('Subject DELETE error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
