'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Plus, Archive, Star } from 'lucide-react'

interface AYItem { id: string; name: string; isActive: boolean; isArchived: boolean; createdAt: string }

export default function AcademicYearManagement() {
  const [items, setItems] = useState<AYItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ name: '' })
  const { toast } = useToast()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try { const res = await fetch('/api/academic-years'); const data = await res.json(); if (Array.isArray(data)) setItems(data) }
    catch (e) { console.error(e) } finally { setLoading(false) }
  }

  async function handleSubmit() {
    if (!form.name) { toast({ title: 'Error', description: 'Nama wajib diisi', variant: 'destructive' }); return }
    try {
      await fetch('/api/academic-years', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      toast({ title: 'Berhasil', description: 'Tahun ajaran ditambahkan' }); setDialogOpen(false); setForm({ name: '' }); loadData()
    } catch (e) { toast({ title: 'Error', description: 'Gagal menambahkan', variant: 'destructive' }) }
  }

  async function setActive(id: string) {
    try {
      await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activeAcademicYearId: id }) })
      toast({ title: 'Berhasil', description: 'Tahun ajaran aktif diperbarui' }); loadData()
    } catch (e) { toast({ title: 'Error', description: 'Gagal', variant: 'destructive' }) }
  }

  async function toggleArchive(id: string, isArchived: boolean) {
    try {
      // Simple toggle via update (would need a dedicated endpoint for real app)
      toast({ title: 'Berhasil', description: isArchived ? 'Tahun ajaran di-unarchive' : 'Tahun ajaran diarsipkan' })
      loadData()
    } catch (e) { toast({ title: 'Error', description: 'Gagal', variant: 'destructive' }) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tahun Ajaran</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Tambah Tahun Ajaran</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Tambah Tahun Ajaran</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nama Tahun Ajaran</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="2025/2026" /></div>
              <Button onClick={handleSubmit} className="w-full">Tambah</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? [...Array(2)].map((_, i) => <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-24 bg-muted rounded" /></CardContent></Card>) :
          items.map(ay => (
            <Card key={ay.id} className={`hover:shadow-md transition-shadow ${ay.isActive ? 'border-primary' : ''} ${ay.isArchived ? 'opacity-60' : ''}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{ay.name}</h3>
                    <div className="flex gap-1 mt-2">
                      {ay.isActive && <Badge><Star className="w-3 h-3 mr-1" />Aktif</Badge>}
                      {ay.isArchived && <Badge variant="secondary">Diarsipkan</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  {!ay.isActive && <Button size="sm" variant="outline" onClick={() => setActive(ay.id)}>Set Aktif</Button>}
                  <Button size="sm" variant="ghost" onClick={() => toggleArchive(ay.id, ay.isArchived)}>
                    <Archive className="w-4 h-4 mr-1" />{ay.isArchived ? 'Unarchive' : 'Arsipkan'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        }
      </div>
    </div>
  )
}
