import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireTeacherOrAdmin } from '@/lib/auth-guard'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const questions = await db.quizQuestion.findMany({
      where: { quizId: id },
      orderBy: { orderNum: 'asc' },
    })

    return NextResponse.json(questions)
  } catch (error) {
    console.error('Quiz questions GET error:', error)
    return NextResponse.json({ error: 'Gagal memuat soal quiz' }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const body = await request.json()
    const { question, type, options, correctAnswer, points, orderNum, explanation } = body

    if (!question || !type) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }

    // Get max orderNum for this quiz
    const maxOrder = await db.quizQuestion.findFirst({
      where: { quizId: id },
      orderBy: { orderNum: 'desc' },
      select: { orderNum: true },
    })

    const quizQuestion = await db.quizQuestion.create({
      data: {
        quizId: id,
        question,
        type,
        options: options ? JSON.stringify(options) : null,
        correctAnswer: correctAnswer || null,
        points: points || 1,
        orderNum: orderNum !== undefined ? orderNum : (maxOrder?.orderNum ?? -1) + 1,
        explanation: explanation || null,
      },
    })

    return NextResponse.json(quizQuestion, { status: 201 })
  } catch (error) {
    console.error('Quiz question POST error:', error)
    return NextResponse.json({ error: 'Gagal membuat soal quiz' }, { status: 500 })
  }
}
