import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTeacherOrAdmin } from '@/lib/auth-guard'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params

    const qrCode = await db.qRCode.findUnique({ where: { id } })

    if (!qrCode) {
      return NextResponse.json({ error: 'QR Code tidak ditemukan' }, { status: 404 })
    }

    await db.qRCode.delete({ where: { id } })

    return NextResponse.json({ message: 'QR Code berhasil dihapus' })
  } catch (error) {
    console.error('QR Code DELETE error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
