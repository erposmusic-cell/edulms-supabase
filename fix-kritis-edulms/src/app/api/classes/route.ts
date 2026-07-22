import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireAdmin } from '@/lib/auth-guard'

export async function GET(request: Request) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const { searchParams } = new URL(request.url)
    const academicYearId = searchParams.get('academicYearId')
    const where: Record<string, unknown> = {}
    if (academicYearId) where.academicYearId = academicYearId

    const classes = await db.class.findMany({
      where,
      include: {
        academicYear: true,
        students: { include: { user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } } } },
        classAdvisors: { include: { teacher: { include: { user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } } } } } },
        _count: { select: { students: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(classes)
  } catch (error) {
    console.error('Classes GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  try {
    const body = await request.json()
    const { name, major, academicYearId } = body

    if (!name || !academicYearId) {
      return NextResponse.json({ error: 'Nama dan tahun ajaran wajib diisi' }, { status: 400 })
    }

    const cls = await db.class.create({
      data: { name, major: major || null, academicYearId },
      include: { academicYear: true, _count: { select: { students: true } } },
    })

    return NextResponse.json(cls, { status: 201 })
  } catch (error) {
    console.error('Classes POST error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
