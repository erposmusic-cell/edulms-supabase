import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireTeacherOrAdmin } from '@/lib/auth-guard'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const material = await db.material.findUnique({
      where: { id },
      include: { subject: true, teacher: { select: { id: true, name: true } } },
    })
    if (!material) return NextResponse.json({ error: 'Materi tidak ditemukan' }, { status: 404 })
    return NextResponse.json(material)
  } catch (error) {
    console.error('Material GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const body = await request.json()
    const material = await db.material.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description || null,
        content: body.content || null,
        type: body.type,
        fileUrl: body.fileUrl || null,
        videoUrl: body.videoUrl || null,
        topic: body.topic || null,
        orderNum: body.orderNum ?? 0,
        isPublished: body.isPublished ?? false,
        subjectId: body.subjectId,
      },
      include: { subject: true, teacher: { select: { id: true, name: true } } },
    })
    return NextResponse.json(material)
  } catch (error) {
    console.error('Material PUT error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    await db.material.delete({ where: { id } })
    return NextResponse.json({ message: 'Materi berhasil dihapus' })
  } catch (error) {
    console.error('Material DELETE error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
