import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireTeacherOrAdmin, requireAdmin } from '@/lib/auth-guard'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const student = await db.student.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } }, class: { include: { academicYear: true } } },
    })
    if (!student) return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 })
    return NextResponse.json(student)
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const body = await request.json()
    const student = await db.student.findUnique({ where: { id }, include: { user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } } } })
    if (!student) return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 })

    if (body.name !== undefined || body.phone !== undefined) {
      await db.user.update({
        where: { id: student.userId },
        data: { name: body.name, phone: body.phone },
      })
    }

    const studentData: Record<string, unknown> = {}
    if (body.nis !== undefined) studentData.nis = body.nis
    if (body.parentPhone !== undefined) studentData.parentPhone = body.parentPhone
    if (body.classId !== undefined) studentData.classId = body.classId
    if (body.status !== undefined) studentData.status = body.status
    if (body.faceRegistered !== undefined) studentData.faceRegistered = body.faceRegistered
    if (body.faceDescriptorUrl !== undefined) studentData.faceDescriptorUrl = body.faceDescriptorUrl

    if (Object.keys(studentData).length > 0) {
      await db.student.update({ where: { id }, data: studentData })
    }

    if (body.changedBy) {
      for (const field of Object.keys(studentData)) {
        const oldVal = String((student as Record<string, unknown>)[field] ?? '')
        const newVal = String(studentData[field] ?? '')
        if (oldVal !== newVal) {
          await db.studentAuditLog.create({
            data: {
              studentId: id,
              studentName: body.name || student.user.name,
              changedBy: body.changedBy,
              changedByName: body.changedByName || 'System',
              field,
              oldValue: oldVal,
              newValue: newVal,
            },
          })
        }
      }
    }

    const updated = await db.student.findUnique({ where: { id }, include: { user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } }, class: true } })
    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const student = await db.student.findUnique({ where: { id } })
    if (!student) return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 })
    await db.student.delete({ where: { id } })
    await db.user.delete({ where: { id: student.userId } })
    return NextResponse.json({ message: 'Siswa berhasil dihapus' })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
