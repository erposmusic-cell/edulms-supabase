import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireTeacherOrAdmin } from '@/lib/auth-guard'

export async function GET(request: Request) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const { searchParams } = new URL(request.url)
    const subjectId = searchParams.get('subjectId')
    const teacherId = searchParams.get('teacherId')
    const isPublished = searchParams.get('isPublished')
    const studentId = searchParams.get('studentId')

    const where: Record<string, unknown> = {}
    if (subjectId) where.subjectId = subjectId
    if (teacherId) where.teacherId = teacherId
    if (isPublished !== null && isPublished !== undefined && isPublished !== '') where.isPublished = isPublished === 'true'

    if (studentId) {
      // For students: get assignments from their class subjects
      const student = await db.student.findUnique({ where: { id: studentId } })
      if (!student) return NextResponse.json([])

      const classSubjectAssignments = await db.subjectAssignment.findMany({
        where: { classId: student.classId },
        select: { subjectId: true },
      })
      const subjectIds = classSubjectAssignments.map((sa: { subjectId: string }) => sa.subjectId)
      where.subjectId = { in: subjectIds }
      where.isPublished = true
    }

    const assignments = await db.assignment.findMany({
      where,
      include: {
        subject: true,
        teacher: { select: { id: true, name: true, email: true } },
        gradeCategory: true,
        submissions: {
          include: {
            student: { include: { user: { select: { id: true, name: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(assignments)
  } catch (error) {
    console.error('Assignments GET error:', error)
    return NextResponse.json({ error: 'Gagal memuat data tugas' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error
  try {
    const body = await request.json()
    const { subjectId, teacherId, title, description, instructions, dueDate, allowLateSubmit, maxScore, attachmentUrl, gradeCategoryId, isPublished } = body

    if (!subjectId || !teacherId || !title || !dueDate) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }

    const assignment = await db.assignment.create({
      data: {
        subjectId,
        teacherId,
        title,
        description: description || null,
        instructions: instructions || null,
        dueDate: new Date(dueDate),
        allowLateSubmit: allowLateSubmit || false,
        maxScore: maxScore || 100,
        attachmentUrl: attachmentUrl || null,
        gradeCategoryId: gradeCategoryId || null,
        isPublished: isPublished || false,
      },
      include: {
        subject: true,
        teacher: { select: { id: true, name: true, email: true } },
        gradeCategory: true,
        submissions: true,
      },
    })

    return NextResponse.json(assignment, { status: 201 })
  } catch (error) {
    console.error('Assignments POST error:', error)
    return NextResponse.json({ error: 'Gagal membuat tugas' }, { status: 500 })
  }
}
