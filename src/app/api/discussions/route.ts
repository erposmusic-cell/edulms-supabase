import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

export async function GET(request: Request) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')
    const subjectAssignmentId = searchParams.get('subjectAssignmentId')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}
    if (classId) where.classId = classId
    if (subjectAssignmentId) where.subjectAssignmentId = subjectAssignmentId
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ]
    }

    const forums = await db.discussionForum.findMany({
      where,
      include: {
        class: { select: { id: true, name: true } },
        subjectAssignment: {
          include: {
            subject: { select: { id: true, name: true } },
          },
        },
        _count: { select: { posts: true } },
      },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 100,
    })

    return NextResponse.json(forums)
  } catch (error) {
    console.error('Discussions GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const body = await request.json()
    const { title, description, classId, subjectAssignmentId, isPinned, isLocked } = body

    if (!title || !classId) {
      return NextResponse.json({ error: 'Judul dan kelas wajib diisi' }, { status: 400 })
    }

    const forum = await db.discussionForum.create({
      data: {
        title,
        description: description || null,
        classId,
        subjectAssignmentId: subjectAssignmentId || null,
        isPinned: isPinned || false,
        isLocked: isLocked || false,
      },
      include: {
        class: { select: { id: true, name: true } },
        subjectAssignment: {
          include: { subject: { select: { id: true, name: true } } },
        },
        _count: { select: { posts: true } },
      },
    })

    return NextResponse.json(forum, { status: 201 })
  } catch (error) {
    console.error('Discussions POST error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
