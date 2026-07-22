import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireAdmin } from '@/lib/auth-guard'

export async function GET(request: Request) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const { searchParams } = new URL(request.url)
    const subjectId = searchParams.get('subjectId')
    const teacherId = searchParams.get('teacherId')
    const classId = searchParams.get('classId')

    const where: Record<string, unknown> = {}
    if (subjectId) where.subjectId = subjectId
    if (teacherId) where.teacherId = teacherId
    if (classId) where.classId = classId

    const assignments = await db.subjectAssignment.findMany({
      where,
      include: {
        subject: true,
        teacher: { include: { user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } } } },
        class: true,
        schedules: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(assignments)
  } catch (error) {
    console.error('SubjectAssignments GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  try {
    const body = await request.json()
    const { subjectId, teacherId, classId } = body

    if (!subjectId || !teacherId || !classId) {
      return NextResponse.json({ error: 'Mata pelajaran, guru, dan kelas wajib diisi' }, { status: 400 })
    }

    // Check for unique constraint
    const existing = await db.subjectAssignment.findFirst({
      where: { subjectId, teacherId, classId },
    })
    if (existing) {
      return NextResponse.json({ error: 'Penugasan ini sudah ada' }, { status: 400 })
    }

    const assignment = await db.subjectAssignment.create({
      data: { subjectId, teacherId, classId },
      include: {
        subject: true,
        teacher: { include: { user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } } } },
        class: true,
      },
    })

    return NextResponse.json(assignment, { status: 201 })
  } catch (error) {
    console.error('SubjectAssignments POST error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
