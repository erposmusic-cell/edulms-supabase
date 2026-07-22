'use client'

import { useState, useCallback, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { School, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function HomePage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Check if already authenticated (client-only, after mount)
  useEffect(() => {
    if (!mounted) return
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/session')
        const session = await res.json()
        if (session?.user) {
          window.location.href = '/dashboard'
        }
      } catch {}
    }
    checkSession()
  }, [mounted])

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
        window.location.href = '/dashboard'
      }
    } catch {
      setError('Terjadi kesalahan koneksi')
      toast({ title: 'Error', description: 'Terjadi kesalahan koneksi', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [email, password, toast])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-950 dark:to-gray-900">
      <div className="w-full max-w-md">
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