import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { notifyGrade } from '@/lib/wa-notifier'
import { requireAuth, requireTeacherOrAdmin } from '@/lib/auth-guard'

export async function GET(request: Request) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    const gradeCategoryId = searchParams.get('gradeCategoryId')
    const semesterId = searchParams.get('semesterId')
    const subjectId = searchParams.get('subjectId')

    const where: Record<string, unknown> = {}
    if (studentId) where.studentId = studentId
    if (gradeCategoryId) where.gradeCategoryId = gradeCategoryId
    if (semesterId) where.semesterId = semesterId
    if (subjectId) {
      where.gradeCategory = { subjectId }
    }

    const grades = await db.grade.findMany({
      where,
      include: {
        student: { include: { user: { select: { id: true, name: true } }, class: true } },
        gradeCategory: { include: { subject: true } },
        semester: { include: { academicYear: true } },
      },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json(grades)
  } catch (error) {
    console.error('Grades GET error:', error)
    return NextResponse.json({ error: 'Gagal memuat data nilai' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error
  try {
    const body = await request.json()
    const { studentId, gradeCategoryId, semesterId, score, description, date } = body

    if (!studentId || !gradeCategoryId || !semesterId || score === undefined) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }

    const grade = await db.grade.create({
      data: {
        studentId,
        gradeCategoryId,
        semesterId,
        score: parseFloat(String(score)),
        description: description || null,
        date: date ? new Date(date) : new Date(),
      },
      include: {
        student: { include: { user: { select: { id: true, name: true } }, class: true } },
        gradeCategory: { include: { subject: true } },
        semester: { include: { academicYear: true } },
      },
    })

    // 🔔 Send real WhatsApp notification to parent about new grade
    const subjectName = grade.gradeCategory?.subject?.name || 'Mata Pelajaran'
    const categoryName = grade.gradeCategory?.name || ''
    const className = grade.student?.class?.name

    notifyGrade(
      studentId,
      `${subjectName}${categoryName ? ` (${categoryName})` : ''}`,
      parseFloat(String(score)),
      categoryName,
      className
    ).catch(err => {
      console.error('WA grade notification failed:', err)
    })

    return NextResponse.json(grade, { status: 201 })
  } catch (error) {
    console.error('Grade POST error:', error)
    return NextResponse.json({ error: 'Gagal membuat nilai' }, { status: 500 })
  }
}
