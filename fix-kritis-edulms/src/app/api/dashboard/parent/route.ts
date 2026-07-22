import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

export async function GET(request: Request) {
  const auth = await requireAuth(['admin', 'parent'])
  if ('error' in auth) return auth.error

  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const parent = await db.parent.findUnique({
      where: { userId },
      include: { user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } } },
    })
    if (!parent) return NextResponse.json({ error: 'Parent not found' }, { status: 404 })

    const child = await db.student.findUnique({
      where: { id: parent.childId },
      include: {
        user: { select: { name: true, email: true } },
        class: { select: { name: true, major: true } },
      },
    })
    if (!child) return NextResponse.json({ error: 'Child not found' }, { status: 404 })

    // All parallel queries after parent/child lookup
    const [attendance, recentGrades, announcements, upcomingAssignments] = await Promise.all([
      db.attendance.findMany({
        where: { studentId: child.id },
        orderBy: { date: 'desc' },
        take: 30,
      }),
      db.grade.findMany({
        where: { studentId: child.id },
        include: { gradeCategory: { include: { subject: { select: { name: true, code: true } } } } },
        orderBy: { date: 'desc' },
        take: 10,
      }),
      db.announcement.findMany({
        where: {
          isPublished: true,
          OR: [
            { classId: null },
            { classId: child.classId },
          ],
        },
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      db.assignment.findMany({
        where: {
          subject: {
            subjectAssignments: {
              some: { classId: child.classId },
            },
          },
          dueDate: { gte: new Date() },
          isPublished: true,
        },
        include: { subject: { select: { name: true, code: true } } },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),
    ])

    // Attendance summary (computed in JS)
    const totalDays = attendance.length
    const hadir = attendance.filter(a => a.status === 'hadir').length
    const terlambat = attendance.filter(a => a.status === 'terlambat').length
    const izin = attendance.filter(a => a.status === 'izin').length
    const sakit = attendance.filter(a => a.status === 'sakit').length
    const alpha = attendance.filter(a => a.status === 'alpha').length
    const attendanceRate = totalDays > 0 ? Math.round((hadir + terlambat) / totalDays * 100) : 0

    return NextResponse.json({
      parent: { id: parent.id, name: parent.user.name, relation: parent.relation },
      child: {
        id: child.id,
        name: child.user.name,
        nis: child.nis,
        className: child.class.name,
        major: child.class.major,
      },
      attendanceSummary: { totalDays, hadir, terlambat, izin, sakit, alpha, attendanceRate },
      recentGrades: recentGrades.map(g => ({
        id: g.id,
        subjectName: g.gradeCategory.subject.name,
        subjectCode: g.gradeCategory.subject.code,
        categoryName: g.gradeCategory.name,
        score: g.score,
        date: g.date,
        description: g.description,
      })),
      announcements: announcements.map(a => ({
        id: a.id,
        title: a.title,
        content: a.content,
        priority: a.priority,
        authorName: a.author.name,
        createdAt: a.createdAt,
      })),
      upcomingAssignments: upcomingAssignments.map(a => ({
        id: a.id,
        title: a.title,
        subjectName: a.subject.name,
        dueDate: a.dueDate,
        maxScore: a.maxScore,
      })),
    })
  } catch (error) {
    console.error('Parent dashboard error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
