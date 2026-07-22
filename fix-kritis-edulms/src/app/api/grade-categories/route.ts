import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireTeacherOrAdmin } from '@/lib/auth-guard'

export async function GET(request: Request) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const { searchParams } = new URL(request.url)
    const subjectId = searchParams.get('subjectId')

    const where: Record<string, unknown> = {}
    if (subjectId) where.subjectId = subjectId

    const categories = await db.gradeCategory.findMany({
      where,
      include: {
        subject: true,
        assignments: true,
        quizzes: true,
        grades: true,
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Grade categories GET error:', error)
    return NextResponse.json({ error: 'Gagal memuat data kategori nilai' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error
  try {
    const body = await request.json()
    const { subjectId, name, weight } = body

    if (!subjectId || !name) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }

    const category = await db.gradeCategory.create({
      data: {
        subjectId,
        name,
        weight: weight || 1.0,
      },
      include: {
        subject: true,
        assignments: true,
        quizzes: true,
        grades: true,
      },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('Grade category POST error:', error)
    return NextResponse.json({ error: 'Gagal membuat kategori nilai' }, { status: 500 })
  }
}
