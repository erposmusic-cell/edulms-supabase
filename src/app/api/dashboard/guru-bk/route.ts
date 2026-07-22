import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

export async function GET() {
  const auth = await requireAuth(['admin', 'guru_bk'])
  if ('error' in auth) return auth.error

  try {
    const settings = await db.settings.findUnique({ where: { id: 'settings' } })
    const academicYearId = settings?.activeAcademicYearId
    const ayFilter = academicYearId ? { academicYearId } : {}
    const threshold = settings?.attendanceThreshold || 80

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Single batch of parallel queries instead of nested loops
    const [classes, todayAttendanceAll, pendingLeaves, totalStudents, allStudentAttendance] = await Promise.all([
      db.class.findMany({
        where: ayFilter,
        include: {
          students: {
            where: { status: 'active' },
            include: { user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } } },
          },
          _count: { select: { students: true } },
        },
      }),
      // All today's attendance in one query
      db.attendance.findMany({
        where: { date: today, ...ayFilter },
      }),
      db.leaveRequest.count({ where: { status: 'pending' } }),
      db.student.count({ where: { status: 'active' } }),
      // All attendance records for low-attendance check in one query
      db.attendance.findMany({
        where: ayFilter,
        select: { id: true, studentId: true, status: true },
      }),
    ])

    // Build a Map for today's attendance by classId
    const classStudentMap = new Map<string, Set<string>>()
    for (const cls of classes) {
      classStudentMap.set(cls.id, new Set(cls.students.map(s => s.id)))
    }

    // Group today's attendance by class
    const classStats: Array<{ id: string; name: string; major: string | null; totalStudents: number; hadir: number; terlambat: number; izin: number; sakit: number; alpha: number }> = []
    const todayByClass = new Map<string, typeof todayAttendanceAll>()
    for (const att of todayAttendanceAll) {
      for (const [classId, studentIds] of classStudentMap) {
        if (studentIds.has(att.studentId)) {
          if (!todayByClass.has(classId)) todayByClass.set(classId, [])
          todayByClass.get(classId)!.push(att)
        }
      }
    }

    for (const cls of classes) {
      const classAtt = todayByClass.get(cls.id) || []
      classStats.push({
        id: cls.id,
        name: cls.name,
        major: cls.major,
        totalStudents: cls._count.students,
        hadir: classAtt.filter(a => a.status === 'hadir').length,
        terlambat: classAtt.filter(a => a.status === 'terlambat').length,
        izin: classAtt.filter(a => a.status === 'izin').length,
        sakit: classAtt.filter(a => a.status === 'sakit').length,
        alpha: classAtt.filter(a => a.status === 'alpha').length,
      })
    }

    // Build attendance map for low-attendance detection (JS instead of N+1 queries)
    const studentAttMap = new Map<string, { total: number; hadir: number }>()
    for (const att of allStudentAttendance) {
      const existing = studentAttMap.get(att.studentId) || { total: 0, hadir: 0 }
      existing.total++
      if (att.status === 'hadir' || att.status === 'terlambat') existing.hadir++
      studentAttMap.set(att.studentId, existing)
    }

    // Find low attendance students
    const lowAttendance: Array<{ id: string; name: string; className: string; rate: number }> = []
    for (const cls of classes) {
      for (const s of cls.students) {
        const stats = studentAttMap.get(s.id)
        if (stats && stats.total > 0) {
          const rate = (stats.hadir / stats.total) * 100
          if (rate < threshold) {
            lowAttendance.push({
              id: s.id,
              name: s.user.name,
              className: cls.name,
              rate: Math.round(rate),
            })
          }
        }
      }
    }

    return NextResponse.json({
      classStats,
      totalClasses: classes.length,
      totalStudents,
      pendingLeaves,
      lowAttendance: lowAttendance.sort((a, b) => a.rate - b.rate).slice(0, 20),
    })
  } catch (error) {
    console.error('Guru BK dashboard error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
