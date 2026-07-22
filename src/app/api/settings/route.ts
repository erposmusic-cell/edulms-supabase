import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireAdmin } from '@/lib/auth-guard'

export async function GET() {
  try {
    const auth = await requireAuth()
    if ('error' in auth) return auth.error

    const settings = await db.settings.findUnique({ where: { id: 'settings' } })
    if (!settings) {
      const s = await db.settings.create({ data: { id: 'settings' } })
      return NextResponse.json(s)
    }
    return NextResponse.json(settings)
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const body = await request.json()
    const settings = await db.settings.upsert({
      where: { id: 'settings' },
      update: body,
      create: { id: 'settings', ...body },
    })
    return NextResponse.json(settings)
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
