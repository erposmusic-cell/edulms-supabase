import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

/**
 * Check if a string is a bcrypt hash
 */
export function isBcryptHash(str: string): boolean {
  return str.startsWith('$2a$') || str.startsWith('$2b$') || str.startsWith('$2y$')
}

/**
 * Verify password against hash (supports both bcrypt and legacy plaintext)
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (isBcryptHash(hash)) {
    return bcrypt.compare(password, hash)
  }
  // Legacy plaintext comparison for migration
  return password === hash
}

/**
 * Hash a password with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

/**
 * Get cookie options based on protocol
 * - HTTPS (server/cloudflare/iframe): SameSite=None, Secure=true → works in cross-origin iframe
 * - HTTP (localhost): SameSite=Lax, Secure=false → works on local development
 */
function getCookieOptions(isSecure: boolean) {
  const sameSite = isSecure ? 'none' : 'lax'
  const secure = isSecure

  return {
    sessionToken: {
      name: isSecure ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: { httpOnly: true, sameSite, path: '/', secure },
    },
    callbackUrl: {
      name: isSecure ? '__Secure-next-auth.callback-url' : 'next-auth.callback-url',
      options: { httpOnly: true, sameSite, path: '/', secure },
    },
    csrfToken: {
      name: isSecure ? '__Host-next-auth.csrf-token' : 'next-auth.csrf-token',
      options: { httpOnly: true, sameSite, path: '/', secure },
    },
  }
}

/**
 * Create NextAuth options dynamically based on request
 */
export function createAuthOptions(isSecure: boolean, host?: string): NextAuthOptions {
  return {
    providers: [
      CredentialsProvider({
        name: 'Credentials',
        credentials: {
          email: { label: 'Email', type: 'email', placeholder: 'admin@sekolah.id' },
          password: { label: 'Password', type: 'password' },
        },
        async authorize(credentials) {
          if (!credentials?.email || !credentials?.password) {
            throw new Error('Email dan password wajib diisi')
          }

          const user = await db.user.findUnique({ where: { email: credentials.email } })
          if (!user) {
            throw new Error('Email atau password salah')
          }

          if (!user.isActive) {
            throw new Error('Akun telah dinonaktifkan')
          }

          const isValid = await verifyPassword(credentials.password, user.password)
          if (!isValid) {
            throw new Error('Email atau password salah')
          }

          // Verify role is one of the allowed LMS roles
          const allowedRoles = ['admin', 'teacher', 'student', 'parent', 'wali_kelas', 'guru_bk']
          if (!allowedRoles.includes(user.role)) {
            throw new Error('Role tidak diizinkan untuk sistem ini')
          }

          // Auto-upgrade plaintext password to bcrypt hash
          if (!isBcryptHash(user.password)) {
            const hashedPassword = await hashPassword(credentials.password)
            await db.user.update({
              where: { id: user.id },
              data: { password: hashedPassword },
            })
          }

          // Log successful login
          await db.activityLog.create({
            data: {
              userId: user.id,
              userName: user.name,
              userRole: user.role,
              action: 'LOGIN',
              details: `User ${user.name} (${user.role}) logged in`,
            },
          })

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            phone: user.phone,
            photoUrl: user.photoUrl,
            darkMode: user.darkMode,
          }
        },
      }),
    ],
    callbacks: {
      async jwt({ token, user, trigger, session }) {
        // Initial sign in
        if (user) {
          token.id = user.id
          token.role = user.role
          token.phone = user.phone ?? null
          token.photoUrl = user.photoUrl ?? null
          token.darkMode = user.darkMode ?? false
        }

        // Update session when user updates their profile
        if (trigger === 'update' && session) {
          token.name = session.name ?? token.name
          token.phone = session.phone ?? token.phone
          token.photoUrl = session.photoUrl ?? token.photoUrl
          token.darkMode = session.darkMode ?? token.darkMode
        }

        return token
      },
      async session({ session, token }) {
        if (session.user) {
          session.user.id = token.id as string
          ;(session.user as Record<string, unknown>).role = token.role
          ;(session.user as Record<string, unknown>).phone = token.phone
          ;(session.user as Record<string, unknown>).photoUrl = token.photoUrl
          ;(session.user as Record<string, unknown>).darkMode = token.darkMode
        }
        return session
      },
    },
    pages: {
      signIn: '/',
    },
    session: {
      strategy: 'jwt',
      maxAge: 24 * 60 * 60, // 24 hours
    },
    secret: process.env.NEXTAUTH_SECRET,
    debug: process.env.NODE_ENV === 'development',
    useSecureCookies: isSecure,
    cookies: getCookieOptions(isSecure) as any,
  }
}

/**
 * Static auth options for backward compatibility (defaults to localhost/HTTP)
 */
export const authOptions: NextAuthOptions = createAuthOptions(false)
