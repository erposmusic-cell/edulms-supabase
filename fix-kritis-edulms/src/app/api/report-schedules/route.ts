import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-guard'

export async function GET() {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const schedules = await db.reportSchedule.findMany({
      include: { logs: { orderBy: { sentAt: 'desc' }, take: 10 } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(schedules)
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()
    const { name, type, sendTime, sendDay, recipient, classFilter, template } = body
    if (!name || !type || !sendTime || !recipient) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }
    const schedule = await db.reportSchedule.create({
      data: { name, type, sendTime, sendDay: sendDay || null, recipient, classFilter: classFilter || null, template: template || null, status: 'active' },
      include: { logs: true },
    })
    return NextResponse.json(schedule, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
