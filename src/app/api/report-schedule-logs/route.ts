import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-guard'

export async function GET() {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const logs = await db.reportScheduleLog.findMany({
      include: { schedule: true },
      orderBy: { sentAt: 'desc' },
      take: 100,
    })
    return NextResponse.json(logs)
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()
    const { scheduleId, sentAt, status, totalSent, totalFailed, details } = body

    if (!scheduleId) {
      return NextResponse.json({ error: 'scheduleId wajib diisi' }, { status: 400 })
    }

    const log = await db.reportScheduleLog.create({
      data: {
        scheduleId,
        sentAt: sentAt ? new Date(sentAt) : new Date(),
        status: status || 'completed',
        totalSent: totalSent || 0,
        totalFailed: totalFailed || 0,
        details: details || null,
      },
    })
    return NextResponse.json(log, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
