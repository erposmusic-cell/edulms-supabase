import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

export async function GET(request: Request) {
  const auth = await requireAuth(['admin', 'wali_kelas'])
  if ('error' in auth) return auth.error

  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    // Find the teacher record for this user
    const teacher = await db.teacher.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    })
    if (!teacher) return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })

    // Find classes where this teacher is a class advisor (wali kelas)
    const classAdvisors = await db.classAdvisor.findMany({
      where: { teacherId: teacher.id },
      include: {
        class: {
          include: {
            students: {
              where: { status: 'active' },
              include: {
                user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } },
              },
            },
            academicYear: true,
          },
        },
      },
    })

    const classIds = classAdvisors.map(ca => ca.classId)
    if (classIds.length === 0) {
      return NextResponse.json({
        classes: [],
        totalStudents: 0,
        todayStats: { hadir: 0, terlambat: 0, izin: 0, sakit: 0, alpha: 0, total: 0 },
        pendingLeaves: 0,
        trend: [],
        students: [],
        attendanceRate: 0,
      })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 6)

    // All parallel queries
    const [todayAttendance, totalStudents, pendingLeaves, weekAttendanceData, students] = await Promise.all([
      db.attendance.findMany({
        where: { date: today, student: { classId: { in: classIds } } },
        include: {
          student: {
            include: {
              user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } },
              class: true,
            },
          },
        },
      }),
      db.student.count({ where: { classId: { in: classIds }, status: 'active' } }),
      db.leaveRequest.count({
        where: { student: { classId: { in: classIds } }, status: 'pending' },
      }),
      // Single query for 7-day attendance instead of 7 separate queries
      db.attendance.findMany({
        where: {
          date: { gte: weekAgo, lte: new Date(new Date().setHours(23, 59, 59, 999)) },
          student: { classId: { in: classIds } },
        },
      }),
      db.student.findMany({
        where: { classId: { in: classIds }, status: 'active' },
        include: {
          user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } },
          class: true,
        },
      }),
    ])

    const hadir = todayAttendance.filter(a => a.status === 'hadir').length
    const terlambat = todayAttendance.filter(a => a.status === 'terlambat').length
    const izin = todayAttendance.filter(a => a.status === 'izin').length
    const sakit = todayAttendance.filter(a => a.status === 'sakit').length
    const alpha = todayAttendance.filter(a => a.status === 'alpha').length

    // Group weekly attendance by date in JS (instead of 7 DB queries)
    const trend: Array<{ date: string; hadir: number; terlambat: number; izin: number; sakit: number; alpha: number }> = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      d.setHours(0, 0, 0, 0)
      const dayStr = d.toDateString()
      const dayAtt = weekAttendanceData.filter(a => a.date.toDateString() === dayStr)
      trend.push({
        date: d.toISOString().split('T')[0],
        hadir: dayAtt.filter(a => a.status === 'hadir').length,
        terlambat: dayAtt.filter(a => a.status === 'terlambat').length,
        izin: dayAtt.filter(a => a.status === 'izin').length,
        sakit: dayAtt.filter(a => a.status === 'sakit').length,
        alpha: dayAtt.filter(a => a.status === 'alpha').length,
      })
    }

    return NextResponse.json({
      classes: classAdvisors.map(ca => ca.class),
      totalStudents,
      todayStats: { hadir, terlambat, izin, sakit, alpha, total: todayAttendance.length },
      pendingLeaves,
      trend,
      students,
      attendanceRate: totalStudents > 0 ? Math.round((hadir + terlambat) / totalStudents * 100) : 0,
    })
  } catch (error) {
    console.error('Wali kelas dashboard error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
