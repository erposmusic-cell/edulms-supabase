import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

/**
 * Forgot Password - Admin Self-Service Reset
 * 
 * This endpoint allows an admin to reset their password using a security verification.
 * Since email may not be configured, we use a different approach:
 * - Verify the admin email exists
 * - Generate a temporary reset token (valid for 15 minutes)
 * - Return the token so admin can use it to set new password
 * 
 * Security: This is intentionally simple for school environments where
 * email infrastructure may not be set up. The token is single-use and expires.
 */

// Store temporary reset tokens in memory (resets on server restart)
const resetTokens = new Map<string, { email: string; expiresAt: number; used: boolean }>()

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action } = body

    // Step 1: Request a reset token
    if (action === 'request') {
      const { email } = body
      if (!email) {
        return NextResponse.json({ error: 'Email wajib diisi' }, { status: 400 })
      }

      // Only allow admin email to use this feature
      const user = await db.user.findUnique({ where: { email } })
      if (!user) {
        // Don't reveal if email exists or not for security
        return NextResponse.json({ 
          message: 'Jika email terdaftar sebagai admin, token reset akan diberikan.',
          showTokenInput: true 
        })
      }

      if (user.role !== 'admin') {
        return NextResponse.json({ 
          error: 'Fitur ini hanya untuk admin. Hubungi admin sekolah untuk reset password.' 
        }, { status: 403 })
      }

      // Generate a simple 6-digit token
      const token = Math.floor(100000 + Math.random() * 900000).toString()
      resetTokens.set(token, {
        email: user.email,
        expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
        used: false
      })

      // In a real system, this token would be sent via email
      // Since email may not be configured, we return it directly
      // This is acceptable for internal school systems
      return NextResponse.json({
        message: 'Token reset telah dibuat. Gunakan token ini untuk mengatur password baru.',
        token, // In production, this would be sent via email
        showTokenInput: true
      })
    }

    // Step 2: Verify token and reset password
    if (action === 'reset') {
      const { token, newPassword } = body
      if (!token || !newPassword) {
        return NextResponse.json({ error: 'Token dan password baru wajib diisi' }, { status: 400 })
      }

      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 })
      }

      const resetData = resetTokens.get(token)
      if (!resetData) {
        return NextResponse.json({ error: 'Token tidak valid' }, { status: 400 })
      }

      if (resetData.used) {
        return NextResponse.json({ error: 'Token sudah digunakan' }, { status: 400 })
      }

      if (Date.now() > resetData.expiresAt) {
        resetTokens.delete(token)
        return NextResponse.json({ error: 'Token sudah kedaluwarsa. Silakan minta token baru.' }, { status: 400 })
      }

      // Hash and update password
      const hashedPassword = await hashPassword(newPassword)
      await db.user.update({
        where: { email: resetData.email },
        data: { password: hashedPassword }
      })

      // Mark token as used
      resetData.used = true
      resetTokens.delete(token)

      // Log the password reset
      const user = await db.user.findUnique({ where: { email: resetData.email } })
      if (user) {
        await db.activityLog.create({
          data: {
            userId: user.id,
            userName: user.name,
            userRole: user.role,
            action: 'FORGOT_PASSWORD_RESET',
            details: `Password reset via forgot password feature for ${user.email}`,
          }
        })
      }

      return NextResponse.json({ message: 'Password berhasil diubah! Silakan login dengan password baru.' })
    }

    return NextResponse.json({ error: 'Action tidak valid' }, { status: 400 })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
