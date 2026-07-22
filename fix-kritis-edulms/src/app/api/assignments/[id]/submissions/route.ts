import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const submissions = await db.assignmentSubmission.findMany({
      where: { assignmentId: id },
      include: {
        student: { include: { user: { select: { id: true, name: true, email: true } } } },
        assignment: { select: { id: true, title: true, maxScore: true } },
      },
      orderBy: { submittedAt: 'desc' },
    })

    return NextResponse.json(submissions)
  } catch (error) {
    console.error('Assignment submissions GET error:', error)
    return NextResponse.json({ error: 'Gagal memuat data pengumpulan' }, { status: 500 })
  }
}
