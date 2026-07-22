import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireAdmin } from '@/lib/auth-guard'

export async function GET(request: Request) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const category = searchParams.get('category')

    const where: Record<string, unknown> = {}
    if (category) where.category = category
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { author: { contains: search } },
        { isbn: { contains: search } },
      ]
    }

    const books = await db.libraryBook.findMany({
      where,
      include: {
        reviews: {
          include: { user: { select: { id: true, name: true } } },
        },
        _count: { select: { reviews: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    // Calculate average rating
    const booksWithRating = books.map(book => {
      const avgRating = book.reviews.length > 0
        ? book.reviews.reduce((sum, r) => sum + r.rating, 0) / book.reviews.length
        : 0
      return { ...book, avgRating: Math.round(avgRating * 10) / 10 }
    })

    return NextResponse.json(booksWithRating)
  } catch (error) {
    console.error('Library GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  try {
    const body = await request.json()
    const { title, author, category, description, fileUrl, coverUrl, isbn, publisher, year, pages, isAvailable } = body

    if (!title) {
      return NextResponse.json({ error: 'Judul buku wajib diisi' }, { status: 400 })
    }

    const book = await db.libraryBook.create({
      data: {
        title,
        author: author || null,
        category: category || null,
        description: description || null,
        fileUrl: fileUrl || null,
        coverUrl: coverUrl || null,
        isbn: isbn || null,
        publisher: publisher || null,
        year: year || null,
        pages: pages || null,
        isAvailable: isAvailable !== undefined ? isAvailable : true,
      },
    })

    return NextResponse.json(book, { status: 201 })
  } catch (error) {
    console.error('Library POST error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
