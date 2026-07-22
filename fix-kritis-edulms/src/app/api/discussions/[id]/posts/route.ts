import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const posts = await db.discussionPost.findMany({
      where: { forumId: id },
      include: {
        author: { select: { id: true, name: true, role: true, photoUrl: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(posts)
  } catch (error) {
    console.error('Discussion posts GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const body = await request.json()
    const { authorId, content, parentPostId } = body

    if (!content || !authorId) {
      return NextResponse.json({ error: 'Konten dan penulis wajib diisi' }, { status: 400 })
    }

    // Check if forum is locked
    const forum = await db.discussionForum.findUnique({ where: { id } })
    if (!forum) {
      return NextResponse.json({ error: 'Forum tidak ditemukan' }, { status: 404 })
    }
    if (forum.isLocked) {
      return NextResponse.json({ error: 'Forum terkunci, tidak bisa menambahkan post' }, { status: 400 })
    }

    const post = await db.discussionPost.create({
      data: {
        forumId: id,
        authorId,
        content,
        parentPostId: parentPostId || null,
      },
      include: {
        author: { select: { id: true, name: true, role: true, photoUrl: true } },
      },
    })

    return NextResponse.json(post, { status: 201 })
  } catch (error) {
    console.error('Discussion post POST error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
