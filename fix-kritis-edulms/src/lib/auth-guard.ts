import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'

interface AuthResult {
  session: NonNullable<Awaited<ReturnType<typeof getServerSession>>>
  user: {
    id: string
    email: string
    name: string
    role: string
    phone?: string | null
    photoUrl?: string | null
  }
}

/**
 * Require authentication for API routes.
 * Returns the session and user info if authenticated, or an error response if not.
 *
 * Usage in API routes:
 * ```ts
 * export async function GET(request: Request) {
 *   const auth = await requireAuth()
 *   if ('error' in auth) return auth.error
 *   // auth.user.id, auth.user.role, etc. are available
 * }
 * ```
 */
export async function requireAuth(allowedRoles?: string[]): Promise<AuthResult | { error: NextResponse }> {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return {
      error: NextResponse.json(
        { error: 'Tidak terautentikasi. Silakan login terlebih dahulu.' },
        { status: 401 }
      ),
    }
  }

  const user = {
    id: session.user.id,
    email: session.user.email!,
    name: session.user.name!,
    role: session.user.role,
    phone: session.user.phone ?? null,
    photoUrl: session.user.photoUrl ?? null,
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return {
      error: NextResponse.json(
        { error: 'Akses ditolak. Anda tidak memiliki izin untuk melakukan aksi ini.' },
        { status: 403 }
      ),
    }
  }

  return { session, user }
}

/**
 * Require admin role for API routes.
 */
export async function requireAdmin(): Promise<AuthResult | { error: NextResponse }> {
  return requireAuth(['admin'])
}

/**
 * Require teacher or admin role for API routes.
 */
export async function requireTeacherOrAdmin(): Promise<AuthResult | { error: NextResponse }> {
  return requireAuth(['admin', 'teacher', 'wali_kelas', 'guru_bk'])
}

/**
 * Require student role for API routes.
 */
export async function requireStudent(): Promise<AuthResult | { error: NextResponse }> {
  return requireAuth(['student'])
}

/**
 * Require parent role for API routes.
 */
export async function requireParent(): Promise<AuthResult | { error: NextResponse }> {
  return requireAuth(['parent'])
}

/**
 * Require staff roles (admin, teacher, wali_kelas, guru_bk) for read operations.
 */
export async function requireStaff(): Promise<AuthResult | { error: NextResponse }> {
  return requireAuth(['admin', 'teacher', 'wali_kelas', 'guru_bk'])
}
