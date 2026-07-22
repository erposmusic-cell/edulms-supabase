import { DefaultSession, DefaultUser } from 'next-auth'
import { DefaultJWT } from 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      phone?: string | null
      photoUrl?: string | null
      darkMode?: boolean
      isActive?: boolean
    } & DefaultSession['user']
  }

  interface User extends DefaultUser {
    id: string
    role: string
    phone?: string | null
    photoUrl?: string | null
    darkMode?: boolean
    isActive?: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string
    role: string
    phone?: string | null
    photoUrl?: string | null
    darkMode?: boolean
    isActive?: boolean
  }
}
