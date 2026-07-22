import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { requireAuth } from '@/lib/auth-guard'

export async function GET() {
  try {
    const auth = await requireAuth()
    if ('error' in auth) return auth.error

    const { searchParams } = new URL(typeof window === 'undefined' ? '' : '')
    // For server-side, we need to get URL from request
    return NextResponse.json({})
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth()
    if ('error' in auth) return auth.error

    const body = await request.json()
    const { userId } = body
    const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    return NextResponse.json({
      id: user.id, email: user.email, name: user.name, role: user.role, phone: user.phone, photoUrl: user.photoUrl, darkMode: user.darkMode,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireAuth()
    if ('error' in auth) return auth.error

    const body = await request.json()
    const { userId, name, phone, photoUrl, darkMode, password, role, isActive } = body

    // Non-admin users can only edit their own profile
    if (auth.user.role !== 'admin' && userId !== auth.user.id) {
      return NextResponse.json({ error: 'Anda hanya bisa mengedit profil sendiri' }, { status: 403 })
    }

    // Only admin can change role and isActive
    if (auth.user.role !== 'admin' && (role !== undefined || isActive !== undefined)) {
      return NextResponse.json({ error: 'Hanya admin yang bisa mengubah role atau status akun' }, { status: 403 })
    }

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name
    if (phone !== undefined) data.phone = phone
    if (photoUrl !== undefined) data.photoUrl = photoUrl
    if (darkMode !== undefined) data.darkMode = darkMode
    if (password) data.password = await hashPassword(password)
    const user = await db.user.update({ where: { id: userId }, data, select: { id: true, email: true, name: true, role: true, phone: true, photoUrl: true, darkMode: true, isActive: true, createdAt: true, updatedAt: true } })
    return NextResponse.json({
      id: user.id, email: user.email, name: user.name, role: user.role, phone: user.phone, photoUrl: user.photoUrl, darkMode: user.darkMode,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
