import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { notifyAnnouncement } from '@/lib/wa-notifier'
import { requireAuth, requireTeacherOrAdmin } from '@/lib/auth-guard'

export async function GET(request: Request) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')
    const priority = searchParams.get('priority')
    const search = searchParams.get('search')
    const isPublished = searchParams.get('isPublished')

    const where: Record<string, unknown> = {}
    if (classId) where.classId = classId
    if (priority) where.priority = priority
    if (isPublished !== null && isPublished !== undefined && isPublished !== '') where.isPublished = isPublished === 'true'
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
      ]
    }

    const announcements = await db.announcement.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, role: true } },
        class: { select: { id: true, name: true } },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 100,
    })

    return NextResponse.json(announcements)
  } catch (error) {
    console.error('Announcements GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error
  try {
    const body = await request.json()
    const { title, content, authorId, classId, priority, isPublished } = body

    if (!title || !content || !authorId) {
      return NextResponse.json({ error: 'Judul, konten, dan penulis wajib diisi' }, { status: 400 })
    }

    const announcement = await db.announcement.create({
      data: {
        title,
        content,
        authorId,
        classId: classId || null,
        priority: priority || 'normal',
        isPublished: isPublished !== undefined ? isPublished : true,
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
        class: { select: { id: true, name: true } },
      },
    })

    // 🔔 Send real WhatsApp notification to parents when announcement is published
    if (announcement.isPublished) {
      notifyAnnouncement(announcement.id).catch(err => {
        console.error('WA announcement notification failed:', err)
      })
    }

    return NextResponse.json(announcement, { status: 201 })
  } catch (error) {
    console.error('Announcements POST error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
