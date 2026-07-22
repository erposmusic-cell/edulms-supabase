import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireTeacherOrAdmin } from '@/lib/auth-guard'

export async function GET(request: Request) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const { searchParams } = new URL(request.url)
    const subjectId = searchParams.get('subjectId')
    const teacherId = searchParams.get('teacherId')
    const type = searchParams.get('type')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}
    if (subjectId) where.subjectId = subjectId
    if (teacherId) where.teacherId = teacherId
    if (type) where.type = type
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { topic: { contains: search } },
      ]
    }

    const materials = await db.material.findMany({
      where,
      include: {
        subject: true,
        teacher: { select: { id: true, name: true } },
      },
      orderBy: [{ subjectId: 'asc' }, { topic: 'asc' }, { orderNum: 'asc' }],
    })

    return NextResponse.json(materials)
  } catch (error) {
    console.error('Materials GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireTeacherOrAdmin()
  if ('error' in auth) return auth.error
  try {
    const body = await request.json()
    const { subjectId, teacherId, title, description, content, type, fileUrl, videoUrl, topic, orderNum, isPublished } = body

    if (!subjectId || !teacherId || !title) {
      return NextResponse.json({ error: 'Subject, guru, dan judul wajib diisi' }, { status: 400 })
    }

    const material = await db.material.create({
      data: {
        subjectId,
        teacherId,
        title,
        description: description || null,
        content: content || null,
        type: type || 'document',
        fileUrl: fileUrl || null,
        videoUrl: videoUrl || null,
        topic: topic || null,
        orderNum: orderNum || 0,
        isPublished: isPublished ?? false,
      },
      include: { subject: true, teacher: { select: { id: true, name: true } } },
    })

    return NextResponse.json(material, { status: 201 })
  } catch (error) {
    console.error('Materials POST error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
