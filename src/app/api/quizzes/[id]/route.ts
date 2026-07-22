import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireTeacherOrAdmin } from '@/lib/auth-guard'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const quiz = await db.quiz.findUnique({
      where: { id },
      include: {
        subject: true,
        teacher: { select: { id: true, name: true, email: true } },
        gradeCategory: true,
        questions: { orderBy: { orderNum: 'asc' } },
        attempts: {
          include: {
            student: { include: { user: { select: { id: true, name: true } } } },
            answers: { include: { question: true } },
          },
          orderBy: { startedAt: 'desc' },
        },
      },
    })

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json(quiz)
  } catch (error) {
    console.error('Quiz GET error:', error)
    return NextResponse.json({ error: 'Gagal memuat data quiz' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const body = await request.json()

    const quiz = await db.quiz.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.duration !== undefined && { duration: body.duration }),
        ...(body.maxAttempts !== undefined && { maxAttempts: body.maxAttempts }),
        ...(body.isPublished !== undefined && { isPublished: body.isPublished }),
        ...(body.startDate !== undefined && { startDate: body.startDate ? new Date(body.startDate) : null }),
        ...(body.endDate !== undefined && { endDate: body.endDate ? new Date(body.endDate) : null }),
        ...(body.gradeCategoryId !== undefined && { gradeCategoryId: body.gradeCategoryId }),
        ...(body.subjectId !== undefined && { subjectId: body.subjectId }),
        ...(body.isExam !== undefined && { isExam: body.isExam }),
        ...(body.shuffleQuestions !== undefined && { shuffleQuestions: body.shuffleQuestions }),
        ...(body.shuffleOptions !== undefined && { shuffleOptions: body.shuffleOptions }),
        ...(body.showResult !== undefined && { showResult: body.showResult }),
        ...(body.showCorrectAnswers !== undefined && { showCorrectAnswers: body.showCorrectAnswers }),
        ...(body.tabSwitchLimit !== undefined && { tabSwitchLimit: body.tabSwitchLimit }),
        ...(body.passwordProtected !== undefined && { passwordProtected: body.passwordProtected }),
        ...(body.examPassword !== undefined && { examPassword: body.examPassword }),
        ...(body.autoSubmitOnCheat !== undefined && { autoSubmitOnCheat: body.autoSubmitOnCheat }),
        ...(body.token !== undefined && { token: body.token }),
      },
      include: {
        subject: true,
        teacher: { select: { id: true, name: true, email: true } },
        gradeCategory: true,
        questions: { orderBy: { orderNum: 'asc' } },
        attempts: true,
      },
    })

    return NextResponse.json(quiz)
  } catch (error) {
    console.error('Quiz PUT error:', error)
    return NextResponse.json({ error: 'Gagal mengupdate quiz' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params

    // Delete related records
    const attempts = await db.quizAttempt.findMany({ where: { quizId: id } })
    for (const attempt of attempts) {
      await db.quizAnswer.deleteMany({ where: { attemptId: attempt.id } })
    }
    await db.quizAttempt.deleteMany({ where: { quizId: id } })
    await db.quizQuestion.deleteMany({ where: { quizId: id } })
    await db.quiz.delete({ where: { id } })

    return NextResponse.json({ message: 'Quiz berhasil dihapus' })
  } catch (error) {
    console.error('Quiz DELETE error:', error)
    return NextResponse.json({ error: 'Gagal menghapus quiz' }, { status: 500 })
  }
}
