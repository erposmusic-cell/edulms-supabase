import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireAdmin } from '@/lib/auth-guard'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const cls = await db.class.findUnique({
      where: { id },
      include: {
        academicYear: true,
        students: { include: { user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } } } },
        classAdvisors: { include: { teacher: { include: { user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } } } } } },
      },
    })
    if (!cls) return NextResponse.json({ error: 'Kelas tidak ditemukan' }, { status: 404 })
    return NextResponse.json(cls)
  } catch (error) {
    console.error('Class GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const body = await request.json()
    const cls = await db.class.update({
      where: { id },
      data: { name: body.name, major: body.major },
      include: { academicYear: true },
    })
    return NextResponse.json(cls)
  } catch (error) {
    console.error('Class PUT error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    await db.class.delete({ where: { id } })
    return NextResponse.json({ message: 'Kelas berhasil dihapus' })
  } catch (error) {
    console.error('Class DELETE error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
