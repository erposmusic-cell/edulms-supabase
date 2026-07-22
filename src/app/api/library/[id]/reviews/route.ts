import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const reviews = await db.libraryBookReview.findMany({
      where: { bookId: id },
      include: { user: { select: { id: true, name: true, photoUrl: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(reviews)
  } catch (error) {
    console.error('Book reviews GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const body = await request.json()
    const { userId, rating, review } = body

    if (!userId || !rating) {
      return NextResponse.json({ error: 'User dan rating wajib diisi' }, { status: 400 })
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating harus antara 1-5' }, { status: 400 })
    }

    // Check if user already reviewed this book
    const existing = await db.libraryBookReview.findFirst({
      where: { bookId: id, userId },
    })

    if (existing) {
      const updated = await db.libraryBookReview.update({
        where: { id: existing.id },
        data: { rating, review: review || null },
        include: { user: { select: { id: true, name: true, photoUrl: true } } },
      })
      return NextResponse.json(updated)
    }

    const newReview = await db.libraryBookReview.create({
      data: {
        bookId: id,
        userId,
        rating,
        review: review || null,
      },
      include: { user: { select: { id: true, name: true, photoUrl: true } } },
    })

    return NextResponse.json(newReview, { status: 201 })
  } catch (error) {
    console.error('Book review POST error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
