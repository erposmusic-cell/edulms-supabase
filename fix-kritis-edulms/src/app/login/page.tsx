'use client'

import { useAppStore } from '@/lib/store'
import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { School, Eye, EyeOff, Loader2, AlertCircle, ArrowLeft } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useSession, signIn } from 'next-auth/react'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { toast } = useToast()
  const router = useRouter()

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Email dan password wajib diisi')
      return
    }
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError(result.error)
        toast({ title: 'Login Gagal', description: result.error, variant: 'destructive' })
      } else if (result?.ok) {
        toast({ title: 'Selamat Datang', description: 'Berhasil masuk ke EduLMS!' })
        router.push('/dashboard')
      }
    } catch {
      setError('Terjadi kesalahan koneksi')
      toast({ title: 'Error', description: 'Terjadi kesalahan koneksi', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [email, password, toast, router])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-950 dark:to-gray-900">
      <div className="w-full max-w-md">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Beranda
        </button>
        <Card>
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4">
              <School className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">EduLMS</CardTitle>
            <p className="text-sm text-muted-foreground">Learning Management System</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Masukkan email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Masukkan password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Masuk
              </Button>
            </form>
          </CardContent>
          <div className="px-6 pb-4 text-center space-y-1">
            <p className="text-xs text-muted-foreground">v2.0.0 &copy; 2026 EduLMS</p>
            <p className="text-xs text-muted-foreground">Developed by Murdani</p>
          </div>
        </Card>
      </div>
    </div>
  )
}

/**
 * SessionSync component - syncs NextAuth session with Zustand store
 */
function SessionSync() {
  const { data: session, status } = useSession()
  const { setCurrentUser, logout } = useAppStore()
  const hadSession = useRef(false)

  useEffect(() => {
    if (status === 'loading') return

    if (session?.user) {
      hadSession.current = true
      setCurrentUser({
        id: session.user.id,
        email: session.user.email!,
        name: session.user.name!,
        role: session.user.role,
        phone: session.user.phone ?? null,
        photoUrl: session.user.photoUrl ?? null,
        darkMode: session.user.darkMode ?? false,
      })
    } else if (status === 'unauthenticated' && hadSession.current) {
      hadSession.current = false
      logout()
    }
  }, [session, status, setCurrentUser, logout])

  return null
}

export default function LoginPageWrapper() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/dashboard')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-950 dark:to-gray-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Memuat...</p>
        </div>
      </div>
    )
  }

  if (status === 'authenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-950 dark:to-gray-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Mengalihkan...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <SessionSync />
      <LoginPage />
    </>
  )
}
