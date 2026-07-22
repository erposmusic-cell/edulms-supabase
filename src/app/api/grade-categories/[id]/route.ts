import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTeacherOrAdmin } from '@/lib/auth-guard'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const body = await request.json()

    const category = await db.gradeCategory.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.weight !== undefined && { weight: body.weight }),
        ...(body.subjectId !== undefined && { subjectId: body.subjectId }),
      },
      include: {
        subject: true,
        assignments: true,
        quizzes: true,
        grades: true,
      },
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error('Grade category PUT error:', error)
    return NextResponse.json({ error: 'Gagal mengupdate kategori nilai' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params

    // Check for related records
    const relatedGrades = await db.grade.count({ where: { gradeCategoryId: id } })
    const relatedAssignments = await db.assignment.count({ where: { gradeCategoryId: id } })
    const relatedQuizzes = await db.quiz.count({ where: { gradeCategoryId: id } })

    if (relatedGrades > 0 || relatedAssignments > 0 || relatedQuizzes > 0) {
      return NextResponse.json({
        error: 'Kategori nilai tidak dapat dihapus karena masih memiliki data terkait',
      }, { status: 400 })
    }

    await db.gradeCategory.delete({ where: { id } })
    return NextResponse.json({ message: 'Kategori nilai berhasil dihapus' })
  } catch (error) {
    console.error('Grade category DELETE error:', error)
    return NextResponse.json({ error: 'Gagal menghapus kategori nilai' }, { status: 500 })
  }
}
