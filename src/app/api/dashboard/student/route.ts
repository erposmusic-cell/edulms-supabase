import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

export async function GET(request: Request) {
  const auth = await requireAuth(['admin', 'student'])
  if ('error' in auth) return auth.error

  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const student = await db.student.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } },
        class: {
          include: {
            academicYear: true,
            subjectAssignments: {
              include: {
                subject: true,
                schedules: true,
              },
            },
          },
        },
      },
    })
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

    // All parallel queries after student lookup
    const [attendance, upcomingAssignments, recentGrades, allGrades, announcements, leaveRequests, upcomingQuizzes] = await Promise.all([
      db.attendance.findMany({
        where: { studentId: student.id },
        orderBy: { date: 'desc' },
        take: 30,
      }),
      db.assignment.findMany({
        where: {
          subject: {
            subjectAssignments: {
              some: { classId: student.classId },
            },
          },
          dueDate: { gte: new Date() },
          isPublished: true,
        },
        include: {
          subject: { select: { name: true, code: true } },
          submissions: { where: { studentId: student.id }, select: { id: true, status: true, score: true } },
        },
        orderBy: { dueDate: 'asc' },
        take: 8,
      }),
      db.grade.findMany({
        where: { studentId: student.id },
        include: { gradeCategory: { include: { subject: { select: { name: true, code: true } } } } },
        orderBy: { date: 'desc' },
        take: 10,
      }),
      db.grade.findMany({ where: { studentId: student.id } }),
      db.announcement.findMany({
        where: {
          isPublished: true,
          OR: [
            { classId: null },
            { classId: student.classId },
          ],
        },
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      db.leaveRequest.findMany({
        where: { studentId: student.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      db.quiz.findMany({
        where: {
          subject: {
            subjectAssignments: {
              some: { classId: student.classId },
            },
          },
          isPublished: true,
          startDate: { gte: new Date() },
        },
        include: { subject: { select: { name: true } } },
        orderBy: { startDate: 'asc' },
        take: 5,
      }),
    ])

    // Today's schedule (computed from student.class.subjectAssignments, no DB query)
    const today = new Date()
    const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay()
    const todaySchedules = student.class.subjectAssignments
      .flatMap(sa => sa.schedules.filter(s => s.dayOfWeek === dayOfWeek).map(s => ({
        id: s.id,
        subjectName: sa.subject.name,
        subjectCode: sa.subject.code,
        startTime: s.startTime,
        endTime: s.endTime,
        room: s.room,
      })))
      .sort((a, b) => a.startTime.localeCompare(b.startTime))

    // Attendance summary (computed in JS)
    const totalDays = attendance.length
    const hadir = attendance.filter(a => a.status === 'hadir').length
    const terlambat = attendance.filter(a => a.status === 'terlambat').length
    const izin = attendance.filter(a => a.status === 'izin').length
    const sakit = attendance.filter(a => a.status === 'sakit').length
    const alpha = attendance.filter(a => a.status === 'alpha').length
    const attendanceRate = totalDays > 0 ? Math.round((hadir + terlambat) / totalDays * 100) : 0

    // Average grade (computed in JS)
    const avgGrade = allGrades.length > 0 ? Math.round(allGrades.reduce((sum, g) => sum + g.score, 0) / allGrades.length) : 0

    return NextResponse.json({
      student: {
        id: student.id,
        nis: student.nis,
        name: student.user.name,
        email: student.user.email,
        className: student.class.name,
        major: student.class.major,
      },
      todaySchedule: todaySchedules,
      attendanceSummary: { totalDays, hadir, terlambat, izin, sakit, alpha, attendanceRate },
      recentAttendance: attendance.slice(0, 7),
      upcomingAssignments: upcomingAssignments.map(a => ({
        id: a.id,
        title: a.title,
        subjectName: a.subject.name,
        subjectCode: a.subject.code,
        dueDate: a.dueDate,
        maxScore: a.maxScore,
        submission: a.submissions[0] ? { status: a.submissions[0].status, score: a.submissions[0].score } : null,
      })),
      recentGrades: recentGrades.map(g => ({
        id: g.id,
        subjectName: g.gradeCategory.subject.name,
        subjectCode: g.gradeCategory.subject.code,
        categoryName: g.gradeCategory.name,
        score: g.score,
        date: g.date,
        description: g.description,
      })),
      avgGrade,
      announcements: announcements.map(a => ({
        id: a.id,
        title: a.title,
        content: a.content,
        priority: a.priority,
        authorName: a.author.name,
        createdAt: a.createdAt,
      })),
      leaveRequests,
      upcomingQuizzes: upcomingQuizzes.map(q => ({
        id: q.id,
        title: q.title,
        subjectName: q.subject.name,
        startDate: q.startDate,
        duration: q.duration,
      })),
    })
  } catch (error) {
    console.error('Student dashboard error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
