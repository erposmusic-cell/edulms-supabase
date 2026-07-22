import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireAdmin } from '@/lib/auth-guard'

export async function GET(request: Request) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const { searchParams } = new URL(request.url)
    const academicYearId = searchParams.get('academicYearId')
    const userId = searchParams.get('userId')
    const where: Record<string, unknown> = {}
    if (academicYearId) where.academicYearId = academicYearId

    // If userId is provided, filter classes based on user role
    if (userId) {
      const user = await db.user.findUnique({ where: { id: userId } })
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

      // Admin and guru_bk can see all classes
      if (user.role === 'admin' || user.role === 'guru_bk') {
        const classes = await db.class.findMany({
          where,
          include: {
            academicYear: true,
            students: { include: { user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } } } },
            classAdvisors: { include: { teacher: { include: { user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } } } } } },
            _count: { select: { students: true } },
          },
          orderBy: { createdAt: 'desc' },
        })
        return NextResponse.json(classes)
      }

      // Teacher and wali_kelas: only their assigned classes
      const teacher = await db.teacher.findUnique({ where: { userId } })
      if (!teacher) return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })

      // Get class IDs from SubjectAssignments
      const assignments = await db.subjectAssignment.findMany({
        where: { teacherId: teacher.id },
        select: { classId: true },
      })
      const classIds = [...new Set(assignments.map(a => a.classId))]

      // For wali_kelas, also add their advisory classes
      if (user.role === 'wali_kelas') {
        const advisories = await db.classAdvisor.findMany({
          where: { teacherId: teacher.id },
          select: { classId: true },
        })
        advisories.forEach(a => classIds.push(a.classId))
        // Remove duplicates
        const uniqueClassIds = [...new Set(classIds)]
        where.id = { in: uniqueClassIds }
      } else {
        where.id = { in: classIds }
      }
    }

    const classes = await db.class.findMany({
      where,
      include: {
        academicYear: true,
        students: { include: { user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } } } },
        classAdvisors: { include: { teacher: { include: { user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } } } } } },
        _count: { select: { students: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(classes)
  } catch (error) {
    console.error('Classes GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  try {
    const body = await request.json()
    const { name, major, academicYearId } = body

    if (!name || !academicYearId) {
      return NextResponse.json({ error: 'Nama dan tahun ajaran wajib diisi' }, { status: 400 })
    }

    const cls = await db.class.create({
      data: { name, major: major || null, academicYearId },
      include: { academicYear: true, _count: { select: { students: true } } },
    })

    return NextResponse.json(cls, { status: 201 })
  } catch (error) {
    console.error('Classes POST error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}