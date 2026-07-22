'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react'

interface GuruBKItem { id: string; phone: string | null; user: { name: string; email: string } }

export default function GuruBKManagement() {
  const [items, setItems] = useState<GuruBKItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' })
  const { toast } = useToast()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try { const res = await fetch('/api/guru-bk'); const data = await res.json(); if (Array.isArray(data)) setItems(data) }
    catch (e) { console.error(e) } finally { setLoading(false) }
  }

  async function handleSubmit() {
    if (!form.name || !form.email) { toast({ title: 'Error', description: 'Data wajib belum lengkap', variant: 'destructive' }); return }
    try {
      if (editId) {
        await fetch(`/api/guru-bk/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        toast({ title: 'Berhasil', description: 'Guru BK diperbarui' })
      } else {
        if (!form.password) { toast({ title: 'Error', description: 'Password wajib', variant: 'destructive' }); return }
        await fetch('/api/guru-bk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        toast({ title: 'Berhasil', description: 'Guru BK ditambahkan' })
      }
      setDialogOpen(false); setEditId(null); setForm({ name: '', email: '', password: '', phone: '' }); loadData()
    } catch (e) { toast({ title: 'Error', description: 'Gagal menyimpan', variant: 'destructive' }) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Yakin ingin menghapus?')) return
    try { await fetch(`/api/guru-bk/${id}`, { method: 'DELETE' }); toast({ title: 'Berhasil', description: 'Berhasil dihapus' }); loadData() }
    catch (e) { toast({ title: 'Error', description: 'Gagal menghapus', variant: 'destructive' }) }
  }

  function openEdit(g: GuruBKItem) {
    setEditId(g.id); setForm({ name: g.user.name, email: g.user.email, password: '', phone: g.phone || '' }); setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Manajemen Guru BK</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditId(null); setForm({ name: '', email: '', password: '', phone: '' }) } }}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Tambah Guru BK</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? 'Edit' : 'Tambah'} Guru BK</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nama</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              {!editId && <div><Label>Password</Label><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>}
              <div><Label>Telepon</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <Button onClick={handleSubmit} className="w-full">{editId ? 'Simpan' : 'Tambah'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? [...Array(2)].map((_, i) => <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-20 bg-muted rounded" /></CardContent></Card>) :
          items.map(g => (
            <Card key={g.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><BookOpen className="w-5 h-5 text-primary" /></div>
                    <div><h3 className="font-semibold">{g.user.name}</h3><p className="text-sm text-muted-foreground">{g.user.email}</p></div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(g)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(g.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        }
      </div>
    </div>
  )
}
