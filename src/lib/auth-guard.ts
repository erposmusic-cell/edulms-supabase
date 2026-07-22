import { getServerSession } from 'next-auth'
import { createAuthOptions } from '@/lib/auth'
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

// Cache authOptions to avoid recreating on every request
let _cachedSecure: ReturnType<typeof createAuthOptions> | null = null
let _cachedInsecure: ReturnType<typeof createAuthOptions> | null = null

function getCachedAuthOptions(isSecure: boolean) {
  if (isSecure) {
    if (!_cachedSecure) _cachedSecure = createAuthOptions(true)
    return _cachedSecure
  }
  if (!_cachedInsecure) _cachedInsecure = createAuthOptions(false)
  return _cachedInsecure
}

export async function requireAuth(allowedRoles?: string[]): Promise<AuthResult | { error: NextResponse }> {
  const isSecure = process.env.NODE_ENV === 'production'
  const session = await getServerSession(getCachedAuthOptions(isSecure))

  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Tidak terautentikasi. Silakan login terlebih dahulu.' }, { status: 401 }) }
  }
  const user = { id: session.user.id, email: session.user.email!, name: session.user.name!, role: session.user.role, phone: session.user.phone ?? null, photoUrl: session.user.photoUrl ?? null }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return { error: NextResponse.json({ error: 'Akses ditolak. Anda tidak memiliki izin untuk melakukan aksi ini.' }, { status: 403 }) }
  }
  return { session, user }
}

export async function requireAdmin() { return requireAuth(['admin']) }
export async function requireTeacherOrAdmin() { return requireAuth(['admin', 'teacher', 'wali_kelas', 'guru_bk']) }
export async function requireStudent() { return requireAuth(['student']) }
export async function requireParent() { return requireAuth(['parent']) }
export async function requireStaff() { return requireAuth(['admin', 'teacher', 'wali_kelas', 'guru_bk']) }