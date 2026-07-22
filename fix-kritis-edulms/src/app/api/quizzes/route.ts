import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireTeacherOrAdmin } from '@/lib/auth-guard'

// Generate a random 6-character alphanumeric token (excluding confusing chars like O/0, I/1)
function generateToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let token = ''
  for (let i = 0; i < 6; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

export async function GET(request: Request) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const { searchParams } = new URL(request.url)
    const subjectId = searchParams.get('subjectId')
    const teacherId = searchParams.get('teacherId')
    const isPublished = searchParams.get('isPublished')
    const studentId = searchParams.get('studentId')
    const isExam = searchParams.get('isExam')

    const where: Record<string, unknown> = {}
    if (subjectId) where.subjectId = subjectId
    if (teacherId) where.teacherId = teacherId
    if (isPublished !== null && isPublished !== undefined && isPublished !== '') where.isPublished = isPublished === 'true'
    if (isExam !== null && isExam !== undefined && isExam !== '') where.isExam = isExam === 'true'

    if (studentId) {
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

    const quizzes = await db.quiz.findMany({
      where,
      include: {
        subject: true,
        teacher: { select: { id: true, name: true, email: true } },
        gradeCategory: true,
        questions: { orderBy: { orderNum: 'asc' } },
        attempts: {
          include: {
            student: { include: { user: { select: { id: true, name: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(quizzes)
  } catch (error) {
    console.error('Quizzes GET error:', error)
    return NextResponse.json({ error: 'Gagal memuat data quiz' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error
  try {
    const body = await request.json()
    const { subjectId, teacherId, title, description, duration, maxAttempts, isPublished, startDate, endDate, gradeCategoryId,
      isExam, shuffleQuestions, shuffleOptions, showResult, showCorrectAnswers, tabSwitchLimit, passwordProtected, examPassword, autoSubmitOnCheat
    } = body

    if (!subjectId || !teacherId || !title) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }

    const quiz = await db.quiz.create({
      data: {
        subjectId,
        teacherId,
        title,
        description: description || null,
        duration: duration || 30,
        maxAttempts: maxAttempts || 1,
        isPublished: isPublished || false,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        gradeCategoryId: gradeCategoryId || null,
        ...(isExam !== undefined && { isExam }),
        ...(shuffleQuestions !== undefined && { shuffleQuestions }),
        ...(shuffleOptions !== undefined && { shuffleOptions }),
        ...(showResult !== undefined && { showResult }),
        ...(showCorrectAnswers !== undefined && { showCorrectAnswers }),
        ...(tabSwitchLimit !== undefined && { tabSwitchLimit }),
        ...(passwordProtected !== undefined && { passwordProtected }),
        ...(examPassword !== undefined && { examPassword }),
        ...(autoSubmitOnCheat !== undefined && { autoSubmitOnCheat }),
        // Auto-generate token for exams
        ...(isExam && { token: generateToken() }),
      },
      include: {
        subject: true,
        teacher: { select: { id: true, name: true, email: true } },
        gradeCategory: true,
        questions: true,
        attempts: true,
      },
    })

    return NextResponse.json(quiz, { status: 201 })
  } catch (error) {
    console.error('Quiz POST error:', error)
    return NextResponse.json({ error: 'Gagal membuat quiz' }, { status: 500 })
  }
}
