import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireAdmin } from '@/lib/auth-guard'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const teacher = await db.teacher.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } },
        subjectAssignments: {
          include: { subject: true, class: true },
        },
        classAdvisory: {
          include: { class: true },
        },
      },
    })
    if (!teacher) return NextResponse.json({ error: 'Guru tidak ditemukan' }, { status: 404 })
    return NextResponse.json(teacher)
  } catch (error) {
    console.error('Teacher GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const body = await request.json()

    // Update teacher record
    const teacher = await db.teacher.update({
      where: { id },
      data: {
        nip: body.nip,
        specialization: body.specialization || null,
      },
      include: { user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } } },
    })

    // Update associated user
    if (body.name || body.email || body.phone) {
      await db.user.update({
        where: { id: teacher.userId },
        data: {
          ...(body.name && { name: body.name }),
          ...(body.email && { email: body.email }),
          ...(body.phone !== undefined && { phone: body.phone || null }),
        },
      })
    }

    const updated = await db.teacher.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } },
        subjectAssignments: { include: { subject: true, class: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Teacher PUT error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const teacher = await db.teacher.findUnique({ where: { id }, include: { user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } } } })
    if (!teacher) return NextResponse.json({ error: 'Guru tidak ditemukan' }, { status: 404 })

    // Delete teacher record and user
    await db.teacher.delete({ where: { id } })
    await db.user.delete({ where: { id: teacher.userId } })

    return NextResponse.json({ message: 'Guru berhasil dihapus' })
  } catch (error) {
    console.error('Teacher DELETE error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
