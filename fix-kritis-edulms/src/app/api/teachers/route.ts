import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { requireAuth, requireAdmin } from '@/lib/auth-guard'

export async function GET(request: Request) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}
    if (search) {
      where.OR = [
        { nip: { contains: search } },
        { specialization: { contains: search } },
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
      ]
    }

    const teachers = await db.teacher.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } },
        subjectAssignments: {
          include: {
            subject: true,
            class: true,
          },
        },
        classAdvisory: {
          include: { class: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(teachers)
  } catch (error) {
    console.error('Teachers GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  try {
    const body = await request.json()
    const { name, email, password, nip, specialization, phone } = body

    if (!name || !email || !password || !nip) {
      return NextResponse.json({ error: 'Nama, email, password, dan NIP wajib diisi' }, { status: 400 })
    }

    // Check if email already exists
    const existingUser = await db.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 400 })
    }

    // Check if NIP already exists
    const existingNip = await db.teacher.findUnique({ where: { nip } })
    if (existingNip) {
      return NextResponse.json({ error: 'NIP sudah terdaftar' }, { status: 400 })
    }

    // Create User with role=teacher AND Teacher record
    const hashedPassword = await hashPassword(password)
    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'teacher',
        phone: phone || null,
      },
    })

    const teacher = await db.teacher.create({
      data: {
        userId: user.id,
        nip,
        specialization: specialization || null,
      },
      include: {
        user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } },
        subjectAssignments: { include: { subject: true, class: true } },
      },
    })

    return NextResponse.json(teacher, { status: 201 })
  } catch (error) {
    console.error('Teachers POST error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
