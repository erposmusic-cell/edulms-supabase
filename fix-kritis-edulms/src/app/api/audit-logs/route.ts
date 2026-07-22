import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTeacherOrAdmin } from '@/lib/auth-guard'

export async function GET(request: Request) {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    const limit = parseInt(searchParams.get('limit') || '100')

    const where: Record<string, unknown> = {}
    if (studentId) where.studentId = studentId

    const logs = await db.studentAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return NextResponse.json(logs)
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
