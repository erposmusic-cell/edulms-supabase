import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTeacherOrAdmin } from '@/lib/auth-guard'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const body = await request.json()

    const question = await db.quizQuestion.update({
      where: { id },
      data: {
        ...(body.question !== undefined && { question: body.question }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.options !== undefined && { options: body.options ? JSON.stringify(body.options) : null }),
        ...(body.correctAnswer !== undefined && { correctAnswer: body.correctAnswer }),
        ...(body.points !== undefined && { points: body.points }),
        ...(body.orderNum !== undefined && { orderNum: body.orderNum }),
        ...(body.explanation !== undefined && { explanation: body.explanation }),
      },
    })

    return NextResponse.json(question)
  } catch (error) {
    console.error('Quiz question PUT error:', error)
    return NextResponse.json({ error: 'Gagal mengupdate soal quiz' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params

    // Delete related answers first
    await db.quizAnswer.deleteMany({ where: { questionId: id } })
    await db.quizQuestion.delete({ where: { id } })

    return NextResponse.json({ message: 'Soal quiz berhasil dihapus' })
  } catch (error) {
    console.error('Quiz question DELETE error:', error)
    return NextResponse.json({ error: 'Gagal menghapus soal quiz' }, { status: 500 })
  }
}
