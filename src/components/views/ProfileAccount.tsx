'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Save, User } from 'lucide-react'

export default function ProfileAccount() {
  const { currentUser, setCurrentUser } = useAppStore()
  const [form, setForm] = useState({ name: '', phone: '', currentPassword: '', newPassword: '' })
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (currentUser) {
      setForm(f => ({ ...f, name: currentUser.name, phone: currentUser.phone || '' }))
    }
  }, [currentUser])

  async function handleSave() {
    if (!currentUser) return
    setSaving(true)
    try {
      const body: Record<string, unknown> = { userId: currentUser.id, name: form.name, phone: form.phone }
      if (form.newPassword) body.password = form.newPassword
      const res = await fetch('/api/users/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!data.error) {
        setCurrentUser({ ...currentUser, name: data.name, phone: data.phone })
        toast({ title: 'Berhasil', description: 'Profil berhasil diperbarui' })
        setForm(f => ({ ...f, currentPassword: '', newPassword: '' }))
      }
    } catch (e) { toast({ title: 'Error', description: 'Gagal menyimpan', variant: 'destructive' }) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Profil Akun</h1>

      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><User className="w-5 h-5" />Informasi Akun</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Email</Label><Input value={currentUser?.email || ''} disabled /></div>
          <div><Label>Role</Label><Input value={currentUser?.role?.replace('_', ' ') || ''} disabled className="capitalize" /></div>
          <div><Label>Nama</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Telepon</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Ubah Password</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Password Baru</Label><Input type="password" value={form.newPassword} onChange={e => setForm({ ...form, newPassword: e.target.value })} placeholder="Kosongkan jika tidak ingin mengubah" /></div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving}>
        <Save className="w-4 h-4 mr-2" />{saving ? 'Menyimpan...' : 'Simpan Perubahan'}
      </Button>
    </div>
  )
}
