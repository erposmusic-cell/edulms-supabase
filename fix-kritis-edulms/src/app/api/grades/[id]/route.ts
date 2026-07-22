import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { notifyGrade } from '@/lib/wa-notifier'
import { requireTeacherOrAdmin } from '@/lib/auth-guard'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const body = await request.json()

    const grade = await db.grade.update({
      where: { id },
      data: {
        ...(body.score !== undefined && { score: parseFloat(String(body.score)) }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.date !== undefined && { date: new Date(body.date) }),
        ...(body.gradeCategoryId !== undefined && { gradeCategoryId: body.gradeCategoryId }),
        ...(body.semesterId !== undefined && { semesterId: body.semesterId }),
      },
      include: {
        student: { include: { user: { select: { id: true, name: true } }, class: true } },
        gradeCategory: { include: { subject: true } },
        semester: { include: { academicYear: true } },
      },
    })

    // 🔔 Send real WhatsApp notification to parent about updated grade
    if (body.score !== undefined) {
      const subjectName = grade.gradeCategory?.subject?.name || 'Mata Pelajaran'
      const categoryName = grade.gradeCategory?.name || ''
      const className = grade.student?.class?.name

      notifyGrade(
        grade.studentId,
        `${subjectName}${categoryName ? ` (${categoryName})` : ''}`,
        parseFloat(String(body.score)),
        categoryName,
        className
      ).catch(err => {
        console.error('WA grade update notification failed:', err)
      })
    }

    return NextResponse.json(grade)
  } catch (error) {
    console.error('Grade PUT error:', error)
    return NextResponse.json({ error: 'Gagal mengupdate nilai' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    await db.grade.delete({ where: { id } })
    return NextResponse.json({ message: 'Nilai berhasil dihapus' })
  } catch (error) {
    console.error('Grade DELETE error:', error)
    return NextResponse.json({ error: 'Gagal menghapus nilai' }, { status: 500 })
  }
}
