import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireAdmin } from '@/lib/auth-guard'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const book = await db.libraryBook.findUnique({
      where: { id },
      include: {
        reviews: {
          include: { user: { select: { id: true, name: true, photoUrl: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!book) {
      return NextResponse.json({ error: 'Buku tidak ditemukan' }, { status: 404 })
    }

    const avgRating = book.reviews.length > 0
      ? book.reviews.reduce((sum, r) => sum + r.rating, 0) / book.reviews.length
      : 0

    return NextResponse.json({ ...book, avgRating: Math.round(avgRating * 10) / 10 })
  } catch (error) {
    console.error('Library book GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    const body = await request.json()
    const { title, author, category, description, fileUrl, coverUrl, isbn, publisher, year, pages, isAvailable } = body

    const book = await db.libraryBook.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(author !== undefined && { author }),
        ...(category !== undefined && { category }),
        ...(description !== undefined && { description }),
        ...(fileUrl !== undefined && { fileUrl }),
        ...(coverUrl !== undefined && { coverUrl }),
        ...(isbn !== undefined && { isbn }),
        ...(publisher !== undefined && { publisher }),
        ...(year !== undefined && { year }),
        ...(pages !== undefined && { pages }),
        ...(isAvailable !== undefined && { isAvailable }),
      },
    })

    return NextResponse.json(book)
  } catch (error) {
    console.error('Library book PUT error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  try {
    const { id } = await params
    await db.libraryBookReview.deleteMany({ where: { bookId: id } })
    await db.libraryBook.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Library book DELETE error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
