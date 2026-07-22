import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireTeacherOrAdmin } from '@/lib/auth-guard'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const assignment = await db.assignment.findUnique({
      where: { id },
      include: {
        subject: true,
        teacher: { select: { id: true, name: true, email: true } },
        gradeCategory: true,
        submissions: {
          include: {
            student: { include: { user: { select: { id: true, name: true } } } },
          },
          orderBy: { submittedAt: 'desc' },
        },
      },
    })

    if (!assignment) {
      return NextResponse.json({ error: 'Tugas tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json(assignment)
  } catch (error) {
    console.error('Assignment GET error:', error)
    return NextResponse.json({ error: 'Gagal memuat data tugas' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const body = await request.json()

    const assignment = await db.assignment.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.instructions !== undefined && { instructions: body.instructions }),
        ...(body.dueDate !== undefined && { dueDate: new Date(body.dueDate) }),
        ...(body.allowLateSubmit !== undefined && { allowLateSubmit: body.allowLateSubmit }),
        ...(body.maxScore !== undefined && { maxScore: body.maxScore }),
        ...(body.attachmentUrl !== undefined && { attachmentUrl: body.attachmentUrl }),
        ...(body.gradeCategoryId !== undefined && { gradeCategoryId: body.gradeCategoryId }),
        ...(body.isPublished !== undefined && { isPublished: body.isPublished }),
        ...(body.subjectId !== undefined && { subjectId: body.subjectId }),
      },
      include: {
        subject: true,
        teacher: { select: { id: true, name: true, email: true } },
        gradeCategory: true,
        submissions: true,
      },
    })

    return NextResponse.json(assignment)
  } catch (error) {
    console.error('Assignment PUT error:', error)
    return NextResponse.json({ error: 'Gagal mengupdate tugas' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params

    // Delete related submissions first
    await db.assignmentSubmission.deleteMany({ where: { assignmentId: id } })
    await db.assignment.delete({ where: { id } })

    return NextResponse.json({ message: 'Tugas berhasil dihapus' })
  } catch (error) {
    console.error('Assignment DELETE error:', error)
    return NextResponse.json({ error: 'Gagal menghapus tugas' }, { status: 500 })
  }
}
