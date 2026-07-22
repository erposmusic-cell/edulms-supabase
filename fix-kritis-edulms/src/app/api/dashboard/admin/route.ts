import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-guard'

export async function GET() {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const settings = await db.settings.findUnique({ where: { id: 'settings' } })
    const academicYearId = settings?.activeAcademicYearId
    const ayFilter = academicYearId ? { academicYearId } : {}

    const [totalStudents, totalTeachers, totalClasses, totalSubjects, todayAttendance, recentAnnouncements, upcomingEvents, totalAssignments, totalSubmissions, pendingGrading, gradedSubmissions, allGrades, weekAttendanceData] = await Promise.all([
      db.student.count({ where: { status: 'active' } }),
      db.teacher.count(),
      db.class.count({ where: ayFilter }),
      db.subject.count({ where: ayFilter }),
      db.attendance.findMany({
        where: { date: new Date(new Date().setHours(0, 0, 0, 0)), ...ayFilter },
      }),
      db.announcement.findMany({
        where: { isPublished: true },
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      db.calendarEvent.findMany({
        where: { startDate: { gte: new Date() } },
        orderBy: { startDate: 'asc' },
        take: 5,
      }),
      db.assignment.count({ where: { isPublished: true } }),
      db.assignmentSubmission.count(),
      db.assignmentSubmission.count({ where: { status: 'submitted' } }),
      db.assignmentSubmission.count({ where: { status: 'graded' } }),
      db.grade.findMany({ take: 200 }),
      // Single query for 7-day attendance instead of 7 separate queries
      db.attendance.findMany({
        where: {
          date: {
            gte: new Date(new Date(Date.now() - 6 * 86400000).setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999)),
          },
          ...ayFilter,
        },
      }),
    ])

    // Process today's attendance
    const hadir = todayAttendance.filter(a => a.status === 'hadir').length
    const terlambat = todayAttendance.filter(a => a.status === 'terlambat').length
    const izin = todayAttendance.filter(a => a.status === 'izin').length
    const sakit = todayAttendance.filter(a => a.status === 'sakit').length
    const alpha = todayAttendance.filter(a => a.status === 'alpha').length

    // Group weekly attendance by date in JS (instead of 7 DB queries)
    const weeklyAttendance: Array<{ date: string; hadir: number; terlambat: number; izin: number; sakit: number; alpha: number }> = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      d.setHours(0, 0, 0, 0)
      const dayStr = d.toDateString()
      const dayAtt = weekAttendanceData.filter(a => a.date.toDateString() === dayStr)
      weeklyAttendance.push({
        date: d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }),
        hadir: dayAtt.filter(a => a.status === 'hadir').length,
        terlambat: dayAtt.filter(a => a.status === 'terlambat').length,
        izin: dayAtt.filter(a => a.status === 'izin').length,
        sakit: dayAtt.filter(a => a.status === 'sakit').length,
        alpha: dayAtt.filter(a => a.status === 'alpha').length,
      })
    }

    // Grade distribution
    const gradeRanges: Array<{ range: string; count: number }> = [
      { range: '0-40', count: 0 },
      { range: '41-55', count: 0 },
      { range: '56-70', count: 0 },
      { range: '71-85', count: 0 },
      { range: '86-100', count: 0 },
    ]
    for (const g of allGrades) {
      if (g.score <= 40) gradeRanges[0].count++
      else if (g.score <= 55) gradeRanges[1].count++
      else if (g.score <= 70) gradeRanges[2].count++
      else if (g.score <= 85) gradeRanges[3].count++
      else gradeRanges[4].count++
    }

    return NextResponse.json({
      totalStudents,
      totalTeachers,
      totalClasses,
      totalSubjects,
      attendanceRate: totalStudents > 0 ? Math.round((hadir + terlambat) / totalStudents * 100) : 0,
      todayStats: { hadir, terlambat, izin, sakit, alpha, total: todayAttendance.length },
      weeklyAttendance,
      recentAnnouncements,
      upcomingEvents,
      assignmentStats: { totalAssignments, totalSubmissions, pendingGrading, gradedSubmissions },
      gradeDistribution: gradeRanges,
    })
  } catch (error) {
    console.error('Admin dashboard error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
