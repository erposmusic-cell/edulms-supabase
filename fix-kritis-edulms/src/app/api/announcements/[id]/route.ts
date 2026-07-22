import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { notifyAnnouncement } from '@/lib/wa-notifier'
import { requireAuth, requireTeacherOrAdmin } from '@/lib/auth-guard'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const announcement = await db.announcement.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, role: true } },
        class: { select: { id: true, name: true } },
      },
    })

    if (!announcement) {
      return NextResponse.json({ error: 'Pengumuman tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json(announcement)
  } catch (error) {
    console.error('Announcement GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const body = await request.json()
    const { title, content, classId, priority, isPublished } = body

    // Check if this is being published for the first time (was draft, now published)
    const existing = await db.announcement.findUnique({ where: { id } })
    const wasPublished = existing?.isPublished || false

    const announcement = await db.announcement.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(classId !== undefined && { classId: classId || null }),
        ...(priority !== undefined && { priority }),
        ...(isPublished !== undefined && { isPublished }),
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
        class: { select: { id: true, name: true } },
      },
    })

    // 🔔 Send real WhatsApp notification when announcement is newly published
    if (announcement.isPublished && !wasPublished) {
      notifyAnnouncement(announcement.id).catch(err => {
        console.error('WA announcement notification failed:', err)
      })
    }

    return NextResponse.json(announcement)
  } catch (error) {
    console.error('Announcement PUT error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    await db.announcement.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Announcement DELETE error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
