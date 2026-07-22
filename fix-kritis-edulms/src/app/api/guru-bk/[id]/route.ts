import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireAdmin } from '@/lib/auth-guard'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    // Guru BK uses Teacher table, look up by teacher id
    const gbk = await db.teacher.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } } },
    })
    if (!gbk || gbk.user.role !== 'guru_bk') return NextResponse.json({ error: 'Guru BK tidak ditemukan' }, { status: 404 })
    return NextResponse.json(gbk)
  } catch (error) {
    console.error('Guru BK GET by ID error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const body = await request.json()
    const gbk = await db.teacher.findUnique({ where: { id }, include: { user: true } })
    if (!gbk || gbk.user.role !== 'guru_bk') return NextResponse.json({ error: 'Guru BK tidak ditemukan' }, { status: 404 })
    if (body.name || body.phone) {
      await db.user.update({ where: { id: gbk.userId }, data: { name: body.name, phone: body.phone } })
    }
    if (body.specialization) {
      await db.teacher.update({ where: { id }, data: { specialization: body.specialization } })
    }
    const result = await db.teacher.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } } },
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Guru BK PUT error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const gbk = await db.teacher.findUnique({ where: { id }, include: { user: true } })
    if (!gbk || gbk.user.role !== 'guru_bk') return NextResponse.json({ error: 'Guru BK tidak ditemukan' }, { status: 404 })
    await db.teacher.delete({ where: { id } })
    await db.user.delete({ where: { id: gbk.userId } })
    return NextResponse.json({ message: 'Guru BK berhasil dihapus' })
  } catch (error) {
    console.error('Guru BK DELETE error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
