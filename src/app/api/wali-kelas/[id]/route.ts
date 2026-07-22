import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireAdmin } from '@/lib/auth-guard'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    // Wali Kelas uses Teacher table
    const wk = await db.teacher.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } },
        classAdvisory: { include: { class: true } },
      },
    })
    if (!wk || wk.user.role !== 'wali_kelas') return NextResponse.json({ error: 'Wali Kelas tidak ditemukan' }, { status: 404 })
    return NextResponse.json(wk)
  } catch (error) {
    console.error('Wali Kelas GET by ID error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const body = await request.json()
    const wk = await db.teacher.findUnique({ where: { id }, include: { user: true } })
    if (!wk || wk.user.role !== 'wali_kelas') return NextResponse.json({ error: 'Wali Kelas tidak ditemukan' }, { status: 404 })

    if (body.name || body.phone) {
      await db.user.update({ where: { id: wk.userId }, data: { name: body.name, phone: body.phone } })
    }

    if (body.classIds) {
      const settings = await db.settings.findUnique({ where: { id: 'settings' } })
      const academicYearId = settings?.activeAcademicYearId
      // Remove existing class assignments
      await db.classAdvisor.deleteMany({ where: { teacherId: id } })
      // Create new ones
      for (const classId of body.classIds) {
        await db.classAdvisor.create({
          data: {
            teacherId: id,
            classId,
            academicYearId: academicYearId || '',
          },
        })
      }
    }

    const result = await db.teacher.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } },
        classAdvisory: { include: { class: true } },
      },
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Wali Kelas PUT error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const wk = await db.teacher.findUnique({ where: { id }, include: { user: true } })
    if (!wk || wk.user.role !== 'wali_kelas') return NextResponse.json({ error: 'Wali Kelas tidak ditemukan' }, { status: 404 })
    // Remove class advisor assignments first
    await db.classAdvisor.deleteMany({ where: { teacherId: id } })
    await db.teacher.delete({ where: { id } })
    await db.user.delete({ where: { id: wk.userId } })
    return NextResponse.json({ message: 'Wali Kelas berhasil dihapus' })
  } catch (error) {
    console.error('Wali Kelas DELETE error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
