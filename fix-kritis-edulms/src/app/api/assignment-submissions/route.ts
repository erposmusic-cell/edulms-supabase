import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireStudent } from '@/lib/auth-guard'

export async function GET(request: Request) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const { searchParams } = new URL(request.url)
    const assignmentId = searchParams.get('assignmentId')
    const studentId = searchParams.get('studentId')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (assignmentId) where.assignmentId = assignmentId
    if (studentId) where.studentId = studentId
    if (status) where.status = status

    const submissions = await db.assignmentSubmission.findMany({
      where,
      include: {
        assignment: {
          include: {
            subject: true,
            teacher: { select: { id: true, name: true } },
            gradeCategory: true,
          },
        },
        student: { include: { user: { select: { id: true, name: true } } } },
      },
      orderBy: { submittedAt: 'desc' },
    })

    return NextResponse.json(submissions)
  } catch (error) {
    console.error('Assignment submissions GET error:', error)
    return NextResponse.json({ error: 'Gagal memuat data pengumpulan' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireStudent()
  if ('error' in auth) return auth.error
  try {
    const body = await request.json()
    const { assignmentId, studentId, fileUrl, textContent } = body

    if (!assignmentId || !studentId) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }

    // Check if already submitted
    const existing = await db.assignmentSubmission.findFirst({
      where: { assignmentId, studentId },
    })

    if (existing) {
      // Update existing submission
      const updated = await db.assignmentSubmission.update({
        where: { id: existing.id },
        data: {
          fileUrl: fileUrl || existing.fileUrl,
          textContent: textContent || existing.textContent,
          submittedAt: new Date(),
          status: 'submitted',
        },
        include: {
          assignment: true,
          student: { include: { user: { select: { id: true, name: true } } } },
        },
      })
      return NextResponse.json(updated)
    }

    const submission = await db.assignmentSubmission.create({
      data: {
        assignmentId,
        studentId,
        fileUrl: fileUrl || null,
        textContent: textContent || null,
        submittedAt: new Date(),
        status: 'submitted',
      },
      include: {
        assignment: true,
        student: { include: { user: { select: { id: true, name: true } } } },
      },
    })

    return NextResponse.json(submission, { status: 201 })
  } catch (error) {
    console.error('Assignment submission POST error:', error)
    return NextResponse.json({ error: 'Gagal mengumpulkan tugas' }, { status: 500 })
  }
}
