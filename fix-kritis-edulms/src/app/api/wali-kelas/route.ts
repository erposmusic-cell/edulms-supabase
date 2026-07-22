import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { requireAuth, requireAdmin } from '@/lib/auth-guard'

export async function GET(request: Request) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    // Wali Kelas users are stored as Teacher records with user.role = 'wali_kelas'
    const waliKelasList = await db.teacher.findMany({
      where: { user: { role: 'wali_kelas' } },
      include: {
        user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } },
        classAdvisory: { include: { class: { include: { academicYear: true, _count: { select: { students: true } } } } } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(waliKelasList)
  } catch (error) {
    console.error('Wali Kelas GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  try {
    const body = await request.json()
    const { email, password, name, phone, nip, classIds } = body

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }

    const hashedPassword = await hashPassword(password)
    const user = await db.user.create({
      data: { email, password: hashedPassword, name, role: 'wali_kelas', phone: phone || null },
    })

    // Wali Kelas is stored in the Teacher table
    const teacher = await db.teacher.create({
      data: {
        userId: user.id,
        nip: nip || `WK${Date.now()}`,
        specialization: 'Wali Kelas',
      },
    })

    // Assign classes via ClassAdvisor
    if (classIds && Array.isArray(classIds)) {
      const settings = await db.settings.findUnique({ where: { id: 'settings' } })
      const academicYearId = settings?.activeAcademicYearId
      for (const classId of classIds) {
        await db.classAdvisor.create({
          data: {
            teacherId: teacher.id,
            classId,
            academicYearId: academicYearId || '',
          },
        })
      }
    }

    const result = await db.teacher.findUnique({
      where: { id: teacher.id },
      include: {
        user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } },
        classAdvisory: { include: { class: true } },
      },
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Wali Kelas POST error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
