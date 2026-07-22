import NextAuth from 'next-auth'
import { createAuthOptions } from '@/lib/auth'
import { NextRequest } from 'next/server'

async function handler(req: NextRequest, context: { params: Promise<any> }) {
  const params = await context.params
  const forwardedProto = req.headers.get('x-forwarded-proto')
  const host = req.headers.get('host') || ''
  const isSecure = forwardedProto === 'https' || req.nextUrl.protocol === 'https:'
  const authOptions = createAuthOptions(isSecure, host)
  return NextAuth(req, { ...context, params }, authOptions)
}

export { handler as GET, handler as POST }
