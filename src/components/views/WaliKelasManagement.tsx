'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Plus, Pencil, Trash2 } from 'lucide-react'

interface WaliKelasItem {
  id: string
  phone: string | null
  user: { name: string; email: string; phone: string | null }
  classAssignments: Array<{ class: { id: string; name: string } }>
}

export default function WaliKelasManagement() {
  const [items, setItems] = useState<WaliKelasItem[]>([])
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', classIds: [] as string[] })
  const { toast } = useToast()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const [wRes, cRes] = await Promise.all([fetch('/api/wali-kelas'), fetch('/api/classes')])
      const wData = await wRes.json(); const cData = await cRes.json()
      if (Array.isArray(wData)) setItems(wData)
      if (Array.isArray(cData)) setClasses(cData)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  async function handleSubmit() {
    if (!form.name || !form.email) { toast({ title: 'Error', description: 'Data wajib belum lengkap', variant: 'destructive' }); return }
    try {
      if (editId) {
        await fetch(`/api/wali-kelas/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        toast({ title: 'Berhasil', description: 'Wali Kelas diperbarui' })
      } else {
        if (!form.password) { toast({ title: 'Error', description: 'Password wajib', variant: 'destructive' }); return }
        await fetch('/api/wali-kelas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        toast({ title: 'Berhasil', description: 'Wali Kelas ditambahkan' })
      }
      setDialogOpen(false); setEditId(null); setForm({ name: '', email: '', password: '', phone: '', classIds: [] }); loadData()
    } catch (e) { toast({ title: 'Error', description: 'Gagal menyimpan', variant: 'destructive' }) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Yakin ingin menghapus?')) return
    try { await fetch(`/api/wali-kelas/${id}`, { method: 'DELETE' }); toast({ title: 'Berhasil', description: 'Berhasil dihapus' }); loadData() }
    catch (e) { toast({ title: 'Error', description: 'Gagal menghapus', variant: 'destructive' }) }
  }

  function openEdit(w: WaliKelasItem) {
    setEditId(w.id)
    setForm({ name: w.user.name, email: w.user.email, password: '', phone: w.phone || '', classIds: w.classAssignments.map(c => c.class.id) })
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Manajemen Wali Kelas</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditId(null); setForm({ name: '', email: '', password: '', phone: '', classIds: [] }) } }}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Tambah Wali Kelas</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? 'Edit' : 'Tambah'} Wali Kelas</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nama</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              {!editId && <div><Label>Password</Label><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>}
              <div><Label>Telepon</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>Kelas Wali</Label>
                <div className="space-y-2 mt-1">
                  {classes.map(c => (
                    <label key={c.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={form.classIds.includes(c.id)} onChange={e => {
                        if (e.target.checked) setForm({ ...form, classIds: [...form.classIds, c.id] })
                        else setForm({ ...form, classIds: form.classIds.filter(id => id !== c.id) })
                      }} className="rounded" />
                      {c.name}
                    </label>
                  ))}
                </div>
              </div>
              <Button onClick={handleSubmit} className="w-full">{editId ? 'Simpan' : 'Tambah'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? [...Array(2)].map((_, i) => <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-20 bg-muted rounded" /></CardContent></Card>) :
          items.map(w => (
            <Card key={w.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{w.user.name}</h3>
                    <p className="text-sm text-muted-foreground">{w.user.email}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(w)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(w.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {w.classAssignments.map(ca => <Badge key={ca.class.id} variant="secondary">{ca.class.name}</Badge>)}
                </div>
                {w.phone && <p className="text-sm mt-2 text-muted-foreground">{w.phone}</p>}
              </CardContent>
            </Card>
          ))
        }
      </div>
    </div>
  )
}
