import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { requireAuth, requireAdmin } from '@/lib/auth-guard'

export async function GET() {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  try {
    // Guru BK users are stored as Teacher records with user.role = 'guru_bk'
    const guruBKList = await db.teacher.findMany({
      where: { user: { role: 'guru_bk' } },
      include: { user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(guruBKList)
  } catch (error) {
    console.error('Guru BK GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  try {
    const body = await request.json()
    const { email, password, name, phone, nip } = body
    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }
    const hashedPassword = await hashPassword(password)
    const user = await db.user.create({ data: { email, password: hashedPassword, name, role: 'guru_bk', phone: phone || null } })
    // Guru BK is stored in the Teacher table with a BC specialization
    const guruBK = await db.teacher.create({
      data: {
        userId: user.id,
        nip: nip || `BK${Date.now()}`,
        specialization: 'Bimbingan Konseling',
      },
      include: { user: { select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } } },
    })
    return NextResponse.json(guruBK, { status: 201 })
  } catch (error) {
    console.error('Guru BK POST error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
