import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireAdmin } from '@/lib/auth-guard'

export async function GET() {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const holidays = await db.holiday.findMany({ orderBy: { date: 'asc' } })
    return NextResponse.json(holidays)
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  try {
    const body = await request.json()
    const { name, date } = body
    if (!name || !date) return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    const holiday = await db.holiday.create({ data: { name, date: new Date(date) } })
    return NextResponse.json(holiday, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
