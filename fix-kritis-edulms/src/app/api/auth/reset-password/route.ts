import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, verifyPassword, isBcryptHash } from '@/lib/auth'
import { requireAuth } from '@/lib/auth-guard'

export async function POST(request: Request) {
  try {
    const auth = await requireAuth()
    if ('error' in auth) return auth.error

    const body = await request.json()
    const { email, currentPassword, newPassword } = body

    if (!email || !newPassword) {
      return NextResponse.json({ error: 'Email dan password baru wajib diisi' }, { status: 400 })
    }

    // Users can only reset their own password (unless admin)
    if (auth.user.role !== 'admin' && email !== auth.user.email) {
      return NextResponse.json({ error: 'Anda hanya bisa mereset password akun sendiri' }, { status: 403 })
    }

    const user = await db.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
    }

    // If currentPassword is provided, verify it (for self-service password change)
    if (currentPassword) {
      const isValid = await verifyPassword(currentPassword, user.password)
      if (!isValid) {
        return NextResponse.json({ error: 'Password saat ini salah' }, { status: 401 })
      }
    }

    // Hash the new password with bcrypt
    const hashedPassword = await hashPassword(newPassword)

    await db.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    })

    await db.activityLog.create({
      data: {
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'PASSWORD_RESET',
        details: `Password reset for user ${user.name} (${user.email})`,
      },
    })

    return NextResponse.json({ message: 'Password berhasil direset' })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
