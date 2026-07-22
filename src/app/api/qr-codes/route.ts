import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'
import { requireTeacherOrAdmin } from '@/lib/auth-guard'

export async function GET() {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error
  try {
    const qrCodes = await db.qRCode.findMany({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json(qrCodes)
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error
  try {
    const body = await request.json()
    const { validFrom, validUntil } = body
    const code = uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase()

    const qr = await db.qRCode.create({
      data: {
        code,
        validFrom: new Date(validFrom || new Date()),
        validUntil: new Date(validUntil || new Date(Date.now() + 3600000)),
        isActive: true,
      },
    })
    return NextResponse.json(qr, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
