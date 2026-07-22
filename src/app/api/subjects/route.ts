import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireAdmin } from '@/lib/auth-guard'

export async function GET(request: Request) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const { searchParams } = new URL(request.url)
    const academicYearId = searchParams.get('academicYearId')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}
    if (academicYearId) where.academicYearId = academicYearId
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { description: { contains: search } },
      ]
    }

    const subjects = await db.subject.findMany({
      where,
      include: {
        academicYear: true,
        subjectAssignments: {
          include: {
            teacher: { include: { user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } } } },
            class: true,
          },
        },
        _count: { select: { materials: true, assignments: true, quizzes: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(subjects)
  } catch (error) {
    console.error('Subjects GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  try {
    const body = await request.json()
    const { name, code, description, academicYearId } = body

    if (!name || !academicYearId) {
      return NextResponse.json({ error: 'Nama dan tahun ajaran wajib diisi' }, { status: 400 })
    }

    const subject = await db.subject.create({
      data: {
        name,
        code: code || null,
        description: description || null,
        academicYearId,
      },
      include: { academicYear: true },
    })

    return NextResponse.json(subject, { status: 201 })
  } catch (error) {
    console.error('Subjects POST error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
