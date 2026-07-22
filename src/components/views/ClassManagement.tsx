'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Plus, Pencil, Trash2, GraduationCap } from 'lucide-react'

interface ClassItem {
  id: string
  name: string
  major: string | null
  academicYearId: string
  academicYear?: { name: string }
  students?: { id: string }[]
  classAdvisors?: Array<{ teacher: { user: { name: string } } }>
  _count?: { students: number }
}

export default function ClassManagement() {
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [academicYears, setAcademicYears] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', major: '', academicYearId: '' })
  const { toast } = useToast()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const [clsRes, ayRes] = await Promise.all([fetch('/api/classes'), fetch('/api/academic-years')])
      const clsData = await clsRes.json()
      const ayData = await ayRes.json()
      if (Array.isArray(clsData)) setClasses(clsData)
      if (Array.isArray(ayData)) setAcademicYears(ayData)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit() {
    if (!form.name || !form.academicYearId) {
      toast({ title: 'Error', description: 'Nama dan tahun ajaran wajib diisi', variant: 'destructive' })
      return
    }
    try {
      if (editId) {
        await fetch(`/api/classes/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        toast({ title: 'Berhasil', description: 'Kelas berhasil diperbarui' })
      } else {
        await fetch('/api/classes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        toast({ title: 'Berhasil', description: 'Kelas berhasil ditambahkan' })
      }
      setDialogOpen(false)
      setEditId(null)
      setForm({ name: '', major: '', academicYearId: '' })
      loadData()
    } catch (e) {
      toast({ title: 'Error', description: 'Gagal menyimpan data', variant: 'destructive' })
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Yakin ingin menghapus kelas ini?')) return
    try {
      await fetch(`/api/classes/${id}`, { method: 'DELETE' })
      toast({ title: 'Berhasil', description: 'Kelas berhasil dihapus' })
      loadData()
    } catch (e) {
      toast({ title: 'Error', description: 'Gagal menghapus kelas', variant: 'destructive' })
    }
  }

  function openEdit(cls: ClassItem) {
    setEditId(cls.id)
    setForm({ name: cls.name, major: cls.major || '', academicYearId: cls.academicYearId })
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Manajemen Kelas</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditId(null); setForm({ name: '', major: '', academicYearId: '' }) } }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Tambah Kelas</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? 'Edit Kelas' : 'Tambah Kelas'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nama Kelas</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="XII TKJ 1" /></div>
              <div><Label>Jurusan</Label><Input value={form.major} onChange={e => setForm({ ...form, major: e.target.value })} placeholder="TKJ" /></div>
              <div><Label>Tahun Ajaran</Label>
                <select className="w-full border rounded-md p-2 bg-background" value={form.academicYearId} onChange={e => setForm({ ...form, academicYearId: e.target.value })}>
                  <option value="">Pilih Tahun Ajaran</option>
                  {academicYears.map(ay => <option key={ay.id} value={ay.id}>{ay.name}</option>)}
                </select>
              </div>
              <Button onClick={handleSubmit} className="w-full">{editId ? 'Simpan' : 'Tambah'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [...Array(3)].map((_, i) => <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-24 bg-muted rounded" /></CardContent></Card>)
        ) : (
          classes.map(cls => (
            <Card key={cls.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{cls.name}</h3>
                      <p className="text-sm text-muted-foreground">{cls.major || '-'}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(cls)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(cls.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Badge variant="secondary">{cls._count?.students || 0} Siswa</Badge>
                  <Badge variant="outline">{cls.academicYear?.name || '-'}</Badge>
                </div>
                {cls.classAdvisors && cls.classAdvisors.length > 0 && (
                  <p className="text-sm mt-2 text-muted-foreground">Wali: {cls.classAdvisors.map(w => w.teacher.user.name).join(', ')}</p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
