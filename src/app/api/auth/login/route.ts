import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, isBcryptHash, hashPassword } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email dan password wajib diisi' }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ error: 'Email atau password salah' }, { status: 401 })
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Akun telah dinonaktifkan' }, { status: 403 })
    }

    // Verify password using bcrypt (with fallback for legacy plaintext)
    const isValid = await verifyPassword(password, user.password)
    if (!isValid) {
      return NextResponse.json({ error: 'Email atau password salah' }, { status: 401 })
    }

    // Verify role is one of the allowed LMS roles
    const allowedRoles = ['admin', 'teacher', 'student', 'parent', 'wali_kelas', 'guru_bk']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Role tidak diizinkan untuk sistem ini' }, { status: 403 })
    }

    // Auto-upgrade plaintext password to bcrypt hash
    if (!isBcryptHash(user.password)) {
      const hashedPassword = await hashPassword(password)
      await db.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      })
    }

    await db.activityLog.create({
      data: {
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'LOGIN',
        details: `User ${user.name} (${user.role}) logged in`,
      },
    })

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      photoUrl: user.photoUrl,
      darkMode: user.darkMode,
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
