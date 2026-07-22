import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { requireAuth, requireAdmin } from '@/lib/auth-guard'

export async function GET(request: Request) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const userId = searchParams.get('userId')

    const where: Record<string, unknown> = {}
    if (classId) where.classId = classId
    if (status) where.status = status
    if (userId) where.userId = userId
    if (search) {
      where.OR = [
        { nis: { contains: search } },
        { user: { name: { contains: search } } },
      ]
    }

    const students = await db.student.findMany({
      where,
      include: { user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } }, class: { include: { academicYear: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(students)
  } catch (error) {
    console.error('Students GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  try {
    const body = await request.json()
    const { email, password, name, phone, nis, parentPhone, classId } = body

    if (!email || !password || !name || !nis || !classId) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }

    const hashedPassword = await hashPassword(password)
    const user = await db.user.create({
      data: { email, password: hashedPassword, name, role: 'student', phone: phone || null },
    })

    const student = await db.student.create({
      data: {
        userId: user.id,
        nis,
        parentPhone: parentPhone || null,
        faceRegistered: false,
        status: 'active',
        classId,
      },
      include: { user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } }, class: true },
    })

    if (body.changedBy) {
      await db.studentAuditLog.create({
        data: {
          studentId: student.id,
          studentName: name,
          changedBy: body.changedBy,
          changedByName: body.changedByName || 'System',
          field: 'CREATE',
          newValue: JSON.stringify({ nis, classId }),
        },
      })
    }

    return NextResponse.json(student, { status: 201 })
  } catch (error) {
    console.error('Students POST error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
