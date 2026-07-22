import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireStudent } from '@/lib/auth-guard'

export async function GET(request: Request) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const { searchParams } = new URL(request.url)
    const quizId = searchParams.get('quizId')
    const studentId = searchParams.get('studentId')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (quizId) where.quizId = quizId
    if (studentId) where.studentId = studentId
    if (status) where.status = status

    const attempts = await db.quizAttempt.findMany({
      where,
      include: {
        quiz: {
          include: {
            subject: true,
            teacher: { select: { id: true, name: true } },
            questions: { orderBy: { orderNum: 'asc' } },
          },
        },
        student: { include: { user: { select: { id: true, name: true } } } },
        answers: { include: { question: true } },
      },
      orderBy: { startedAt: 'desc' },
    })

    return NextResponse.json(attempts)
  } catch (error) {
    console.error('Quiz attempts GET error:', error)
    return NextResponse.json({ error: 'Gagal memuat data percobaan quiz' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireStudent()
  if ('error' in auth) return auth.error
  try {
    const body = await request.json()
    const { quizId, studentId, token, password } = body

    if (!quizId || !studentId) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }

    // Check max attempts
    const quiz = await db.quiz.findUnique({ where: { id: quizId } })
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz tidak ditemukan' }, { status: 404 })
    }

    // Validate token if exam has one
    if (quiz.token) {
      if (!token || token.toUpperCase() !== quiz.token.toUpperCase()) {
        return NextResponse.json({ error: 'Token ujian tidak valid' }, { status: 403 })
      }
    }

    // Validate password if exam is password protected
    if (quiz.passwordProtected && quiz.examPassword) {
      if (!password || password !== quiz.examPassword) {
        return NextResponse.json({ error: 'Password ujian tidak valid' }, { status: 403 })
      }
    }

    const existingAttempts = await db.quizAttempt.count({
      where: { quizId, studentId, status: { in: ['completed', 'timed_out', 'cheat_detected'] } },
    })

    if (existingAttempts >= quiz.maxAttempts) {
      return NextResponse.json({ error: 'Anda telah mencapai batas percobaan maksimum' }, { status: 400 })
    }

    // Check for existing in-progress attempt
    const inProgress = await db.quizAttempt.findFirst({
      where: { quizId, studentId, status: 'in_progress' },
    })

    if (inProgress) {
      return NextResponse.json({ error: 'Anda masih memiliki percobaan yang sedang berlangsung', attempt: inProgress }, { status: 400 })
    }

    // Check if quiz is within date range
    if (quiz.startDate && new Date() < new Date(quiz.startDate)) {
      return NextResponse.json({ error: 'Quiz belum dimulai' }, { status: 400 })
    }
    if (quiz.endDate && new Date() > new Date(quiz.endDate)) {
      return NextResponse.json({ error: 'Quiz telah berakhir' }, { status: 400 })
    }

    const attempt = await db.quizAttempt.create({
      data: {
        quizId,
        studentId,
        status: 'in_progress',
        startedAt: new Date(),
      },
      include: {
        quiz: {
          include: {
            questions: { orderBy: { orderNum: 'asc' } },
          },
        },
        answers: true,
      },
    })

    return NextResponse.json(attempt, { status: 201 })
  } catch (error) {
    console.error('Quiz attempt POST error:', error)
    return NextResponse.json({ error: 'Gagal memulai quiz' }, { status: 500 })
  }
}
