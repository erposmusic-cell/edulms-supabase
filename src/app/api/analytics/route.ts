import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-guard'

export async function GET() {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    // Run all independent queries in parallel
    const [classes, attendanceByClass, assignments, quizAttempts, assignmentCompletionByClass, totalStudents, totalTeachers, totalBooks, totalAnnouncements] = await Promise.all([
      // Student performance - avg grades per class
      db.class.findMany({
        include: {
          students: {
            include: {
              grades: true,
            },
          },
        },
      }),
      // Attendance rate per class
      db.class.findMany({
        include: {
          students: {
            include: { attendance: true },
          },
        },
      }),
      // Assignment completion rate
      db.assignment.findMany({
        include: {
          _count: { select: { submissions: true } },
          subject: { include: { subjectAssignments: { include: { class: true } } } },
        },
        where: { isPublished: true },
      }),
      // Quiz performance trends (last 6 months)
      db.quizAttempt.findMany({
        where: {
          completedAt: { gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) },
          status: 'completed',
        },
        include: {
          quiz: { include: { subject: true } },
        },
      }),
      // Assignment completion by class
      db.class.findMany({
        include: {
          students: {
            include: {
              assignmentSubmissions: true,
            },
          },
        },
      }),
      db.student.count(),
      db.teacher.count(),
      db.libraryBook.count(),
      db.announcement.count({ where: { isPublished: true } }),
    ])

    // Student performance
    const studentPerformance = classes.map(cls => {
      const allGrades = cls.students.flatMap(s => s.grades.map(g => g.score))
      const avgGrade = allGrades.length > 0
        ? allGrades.reduce((a, b) => a + b, 0) / allGrades.length
        : 0
      return {
        name: cls.name,
        avgGrade: Math.round(avgGrade * 10) / 10,
        studentCount: cls.students.length,
      }
    })

    // Attendance rate
    const attendanceRate = attendanceByClass.map(cls => {
      const allAttendance = cls.students.flatMap(s => s.attendance)
      const total = allAttendance.length
      const hadir = allAttendance.filter(a => a.status === 'hadir').length
      return {
        name: cls.name,
        rate: total > 0 ? Math.round((hadir / total) * 100) : 0,
        total,
        hadir,
      }
    })

    // Assignment stats
    const totalAssignments = assignments.length
    const totalSubmissions = assignments.reduce((sum, a) => sum + a._count.submissions, 0)

    // Quiz trends
    const quizTrends: Record<string, { count: number; totalScore: number }> = {}
    quizAttempts.forEach(attempt => {
      const month = attempt.completedAt
        ? new Date(attempt.completedAt).toISOString().slice(0, 7)
        : 'unknown'
      if (!quizTrends[month]) quizTrends[month] = { count: 0, totalScore: 0 }
      quizTrends[month].count++
      quizTrends[month].totalScore += attempt.score || 0
    })

    const quizPerformance = Object.entries(quizTrends)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        avgScore: data.count > 0 ? Math.round((data.totalScore / data.count) * 10) / 10 : 0,
        attemptCount: data.count,
      }))

    // Assignment completion by class
    const completionRate = assignmentCompletionByClass.map(cls => {
      const students = cls.students
      const totalPossible = students.length * totalAssignments
      const totalSubmitted = students.reduce(
        (sum, s) => sum + s.assignmentSubmissions.filter(sub => sub.status === 'submitted' || sub.status === 'graded').length, 0
      )
      return {
        name: cls.name,
        completionRate: totalPossible > 0 ? Math.round((totalSubmitted / totalPossible) * 100) : 0,
      }
    })

    return NextResponse.json({
      studentPerformance,
      attendanceRate,
      assignmentCompletion: {
        totalAssignments,
        totalSubmissions,
        completionRate: totalAssignments > 0 ? Math.round((totalSubmissions / (totalAssignments * totalStudents)) * 100) : 0,
        byClass: completionRate,
      },
      quizPerformance,
      overview: {
        totalStudents,
        totalTeachers,
        totalBooks,
        totalAnnouncements,
      },
    })
  } catch (error) {
    console.error('Analytics GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
