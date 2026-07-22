import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ---- API route protection ----
  if (pathname.startsWith('/api/')) {
    if (pathname.startsWith('/api/auth/')) {
      return NextResponse.next()
    }

    if (pathname === '/api/seed' && process.env.NODE_ENV === 'development') {
      return NextResponse.next()
    }

    // Deteksi apakah request HTTPS atau HTTP
    const isSecure = request.nextUrl.protocol === 'https:' ||
                     request.headers.get('x-forwarded-proto') === 'https'

    try {
      const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
        secureCookie: isSecure, // FIX: agar getToken cari cookie yang benar
      })

      if (!token) {
        return NextResponse.json(
          { error: 'Tidak terautentikasi. Silakan login terlebih dahulu.' },
          { status: 401 }
        )
      }

      const requestHeaders = new Headers(request.headers)
      requestHeaders.set('x-user-id', token.id as string)
      requestHeaders.set('x-user-email', (token.email as string) || '')
      requestHeaders.set('x-user-role', (token.role as string) || '')
      requestHeaders.set('x-user-name', (token.name as string) || '')

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
    } catch (error) {
      console.error('Middleware auth error:', error)
      return NextResponse.json(
        { error: 'Sesi telah berakhir. Silakan login kembali.', reauth: true },
        { status: 401 }
      )
    }
  }

  // ---- Public routes ----
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname === '/' ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/models') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // ---- Protected page routes ----
  const isSecure = request.nextUrl.protocol === 'https:' ||
                   request.headers.get('x-forwarded-proto') === 'https'

  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: isSecure, // FIX: agar getToken cari cookie yang benar
    })

    if (!token) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    return NextResponse.next()
  } catch {
    return NextResponse.redirect(new URL('/', request.url))
  }
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico|icons/|models/|sw.js|manifest.json|robots.txt|logo.svg).*)',
  ],
}