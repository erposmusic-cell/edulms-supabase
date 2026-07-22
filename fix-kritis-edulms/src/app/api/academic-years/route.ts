import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireAdmin } from '@/lib/auth-guard'

export async function GET() {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const academicYears = await db.academicYear.findMany({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json(academicYears)
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  try {
    const body = await request.json()
    const { name } = body
    if (!name) return NextResponse.json({ error: 'Nama tahun ajaran wajib diisi' }, { status: 400 })
    const ay = await db.academicYear.create({ data: { name, isActive: false, isArchived: false } })
    return NextResponse.json(ay, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
