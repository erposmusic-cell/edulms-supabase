import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireTeacherOrAdmin } from '@/lib/auth-guard'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const forum = await db.discussionForum.findUnique({
      where: { id },
      include: {
        class: { select: { id: true, name: true } },
        subjectAssignment: {
          include: { subject: { select: { id: true, name: true } } },
        },
        posts: {
          include: {
            author: { select: { id: true, name: true, role: true, photoUrl: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!forum) {
      return NextResponse.json({ error: 'Forum tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json(forum)
  } catch (error) {
    console.error('Discussion GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const body = await request.json()
    const { title, description, isPinned, isLocked } = body

    const forum = await db.discussionForum.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(isPinned !== undefined && { isPinned }),
        ...(isLocked !== undefined && { isLocked }),
      },
      include: {
        class: { select: { id: true, name: true } },
        subjectAssignment: {
          include: { subject: { select: { id: true, name: true } } },
        },
        _count: { select: { posts: true } },
      },
    })

    return NextResponse.json(forum)
  } catch (error) {
    console.error('Discussion PUT error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    await db.discussionPost.deleteMany({ where: { forumId: id } })
    await db.discussionForum.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Discussion DELETE error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
