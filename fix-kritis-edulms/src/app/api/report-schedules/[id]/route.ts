import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-guard'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const { id } = await params
    const s = await db.reportSchedule.findUnique({ where: { id }, include: { logs: true } })
    if (!s) return NextResponse.json({ error: 'Schedule tidak ditemukan' }, { status: 404 })
    return NextResponse.json(s)
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const { id } = await params
    const body = await request.json()
    const s = await db.reportSchedule.update({ where: { id }, data: body })
    return NextResponse.json(s)
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const { id } = await params
    await db.reportScheduleLog.deleteMany({ where: { scheduleId: id } })
    await db.reportSchedule.delete({ where: { id } })
    return NextResponse.json({ message: 'Schedule berhasil dihapus' })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
