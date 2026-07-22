import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

export async function GET(request: Request) {
  const auth = await requireAuth(['admin', 'teacher', 'wali_kelas', 'guru_bk'])
  if ('error' in auth) return auth.error

  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const teacher = await db.teacher.findUnique({
      where: { userId },
      include: { user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } } },
    })
    if (!teacher) return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })

    // All parallel queries
    const [subjectAssignments, pendingGrading, myAssignments, recentQuizAttempts, materialsCount, quizzesCount, classAdvisory] = await Promise.all([
      // My subject assignments (classes & subjects)
      db.subjectAssignment.findMany({
        where: { teacherId: teacher.id },
        include: {
          subject: true,
          class: { include: { _count: { select: { students: true } } } },
          schedules: true,
        },
      }),
      // Pending assignments to grade
      db.assignmentSubmission.count({
        where: {
          assignment: { teacherId: teacher.id },
          status: 'submitted',
        },
      }),
      // My assignments
      db.assignment.findMany({
        where: { teacherId: teacher.id },
        include: {
          subject: { select: { name: true, code: true } },
          _count: { select: { submissions: true } },
        },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),
      // Recent quiz attempts
      db.quizAttempt.findMany({
        where: { quiz: { teacherId: teacher.id }, status: 'completed' },
        include: {
          quiz: { select: { title: true, subject: { select: { name: true } } } },
          student: { include: { user: { select: { name: true } } } },
        },
        orderBy: { completedAt: 'desc' },
        take: 5,
      }),
      // My materials count
      db.material.count({ where: { teacherId: teacher.id } }),
      db.quiz.count({ where: { teacherId: teacher.id } }),
      // Class advisory
      db.classAdvisor.findFirst({
        where: { teacherId: teacher.id },
        include: { class: { include: { _count: { select: { students: true } } } } },
      }),
    ])

    // Today's schedule (computed from subjectAssignments, no DB query needed)
    const today = new Date()
    const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay()
    const todaySchedules = subjectAssignments
      .flatMap(sa => sa.schedules.filter(s => s.dayOfWeek === dayOfWeek))
      .sort((a, b) => a.startTime.localeCompare(b.startTime))

    const todayClasses = todaySchedules.map(s => {
      const sa = subjectAssignments.find(sa => sa.id === s.subjectAssignmentId)
      return {
        id: s.id,
        subjectName: sa?.subject.name || '',
        subjectCode: sa?.subject.code || '',
        className: sa?.class.name || '',
        startTime: s.startTime,
        endTime: s.endTime,
        room: s.room,
        studentCount: sa?.class._count.students || 0,
      }
    })

    return NextResponse.json({
      teacher: { id: teacher.id, name: teacher.user.name, nip: teacher.nip, specialization: teacher.specialization },
      subjectAssignments: subjectAssignments.map(sa => ({
        id: sa.id,
        subjectName: sa.subject.name,
        subjectCode: sa.subject.code,
        className: sa.class.name,
        studentCount: sa.class._count.students,
      })),
      todayClasses,
      pendingGrading,
      myAssignments: myAssignments.map(a => ({
        id: a.id,
        title: a.title,
        subjectName: a.subject.name,
        dueDate: a.dueDate,
        submissionCount: a._count.submissions,
        maxScore: a.maxScore,
      })),
      recentQuizAttempts: recentQuizAttempts.map(qa => ({
        id: qa.id,
        quizTitle: qa.quiz.title,
        subjectName: qa.quiz.subject.name,
        studentName: qa.student.user.name,
        score: qa.score,
        completedAt: qa.completedAt,
      })),
      stats: { materialsCount, quizzesCount, totalClasses: subjectAssignments.length },
      classAdvisory: classAdvisory ? {
        className: classAdvisory.class.name,
        studentCount: classAdvisory.class._count.students,
      } : null,
    })
  } catch (error) {
    console.error('Teacher dashboard error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
