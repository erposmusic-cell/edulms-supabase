import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { notifyAssignmentGrade } from '@/lib/wa-notifier'
import { requireAuth, requireTeacherOrAdmin } from '@/lib/auth-guard'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const submission = await db.assignmentSubmission.findUnique({
      where: { id },
      include: {
        assignment: {
          include: {
            subject: true,
            teacher: { select: { id: true, name: true } },
          },
        },
        student: { include: { user: { select: { id: true, name: true } } } },
      },
    })

    if (!submission) {
      return NextResponse.json({ error: 'Pengumpulan tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json(submission)
  } catch (error) {
    console.error('Assignment submission GET error:', error)
    return NextResponse.json({ error: 'Gagal memuat data pengumpulan' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const body = await request.json()
    const { score, feedback, status } = body

    const submission = await db.assignmentSubmission.update({
      where: { id },
      data: {
        ...(score !== undefined && { score: parseFloat(String(score)) }),
        ...(feedback !== undefined && { feedback }),
        ...(status !== undefined && { status }),
        ...(score !== undefined && { gradedAt: new Date() }),
      },
      include: {
        assignment: { include: { subject: true } },
        student: { include: { user: { select: { id: true, name: true, phone: true } }, class: true } },
      },
    })

    // 🔔 Send real WhatsApp notification to parent when assignment is graded
    if (score !== undefined && (status === 'graded' || submission.status === 'graded')) {
      const assignmentTitle = submission.assignment?.title || 'Tugas'
      const maxScore = submission.assignment?.maxScore || 100
      const className = submission.student?.class?.name

      notifyAssignmentGrade(
        submission.studentId,
        assignmentTitle,
        parseFloat(String(score)),
        maxScore,
        className
      ).catch(err => {
        console.error('WA assignment grade notification failed:', err)
      })
    }

    return NextResponse.json(submission)
  } catch (error) {
    console.error('Assignment submission PUT error:', error)
    return NextResponse.json({ error: 'Gagal mengupdate pengumpulan' }, { status: 500 })
  }
}
