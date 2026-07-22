'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { Plus, Pencil, Trash2, BookOpen, Search, Filter } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface SubjectItem {
  id: string
  name: string
  code: string | null
  description: string | null
  academicYearId: string
  academicYear?: { id: string; name: string }
  subjectAssignments?: Array<{
    id: string
    teacher: { id: string; user: { name: string } }
    class: { id: string; name: string }
  }>
  _count?: { materials: number; assignments: number; quizzes: number }
}

interface AcademicYearItem {
  id: string
  name: string
}

export default function SubjectManagement() {
  const [subjects, setSubjects] = useState<SubjectItem[]>([])
  const [academicYears, setAcademicYears] = useState<AcademicYearItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterAY, setFilterAY] = useState('')
  const [form, setForm] = useState({ name: '', code: '', description: '', academicYearId: '' })
  const { toast } = useToast()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const [subRes, ayRes] = await Promise.all([
        fetch(`/api/subjects${filterAY ? `?academicYearId=${filterAY}` : ''}`),
        fetch('/api/academic-years'),
      ])
      const subData = await subRes.json()
      const ayData = await ayRes.json()
      if (Array.isArray(subData)) setSubjects(subData)
      if (Array.isArray(ayData)) setAcademicYears(ayData)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [filterAY])

  const filteredSubjects = subjects.filter(s => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      s.name.toLowerCase().includes(q) ||
      (s.code && s.code.toLowerCase().includes(q)) ||
      (s.description && s.description.toLowerCase().includes(q))
    )
  })

  async function handleSubmit() {
    if (!form.name || !form.academicYearId) {
      toast({ title: 'Error', description: 'Nama dan tahun ajaran wajib diisi', variant: 'destructive' })
      return
    }
    try {
      if (editId) {
        await fetch(`/api/subjects/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        toast({ title: 'Berhasil', description: 'Mata pelajaran berhasil diperbarui' })
      } else {
        await fetch('/api/subjects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        toast({ title: 'Berhasil', description: 'Mata pelajaran berhasil ditambahkan' })
      }
      setDialogOpen(false)
      setEditId(null)
      setForm({ name: '', code: '', description: '', academicYearId: '' })
      loadData()
    } catch {
      toast({ title: 'Error', description: 'Gagal menyimpan data', variant: 'destructive' })
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/subjects/${deleteId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
      } else {
        toast({ title: 'Berhasil', description: 'Mata pelajaran berhasil dihapus' })
        loadData()
      }
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus mata pelajaran', variant: 'destructive' })
    }
    setDeleteId(null)
  }

  function openEdit(subject: SubjectItem) {
    setEditId(subject.id)
    setForm({
      name: subject.name,
      code: subject.code || '',
      description: subject.description || '',
      academicYearId: subject.academicYearId,
    })
    setDialogOpen(true)
  }

  function openAdd() {
    setEditId(null)
    setForm({ name: '', code: '', description: '', academicYearId: '' })
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Manajemen Mata Pelajaran</h1>
          <p className="text-sm text-muted-foreground">Kelola mata pelajaran yang tersedia</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditId(null); setForm({ name: '', code: '', description: '', academicYearId: '' }) } }}>
          <DialogTrigger asChild>
            <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" />Tambah Mapel</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nama Mata Pelajaran</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Matematika" />
              </div>
              <div>
                <Label>Kode</Label>
                <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="MTK" />
              </div>
              <div>
                <Label>Deskripsi</Label>
                <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi singkat" />
              </div>
              <div>
                <Label>Tahun Ajaran</Label>
                <select className="w-full border rounded-md p-2 bg-background" value={form.academicYearId} onChange={e => setForm({ ...form, academicYearId: e.target.value })}>
                  <option value="">Pilih Tahun Ajaran</option>
                  {academicYears.map(ay => <option key={ay.id} value={ay.id}>{ay.name}</option>)}
                </select>
              </div>
              <Button onClick={handleSubmit} className="w-full">{editId ? 'Simpan Perubahan' : 'Tambah'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Cari mata pelajaran..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select className="border rounded-md p-2 bg-background text-sm" value={filterAY} onChange={e => setFilterAY(e.target.value)}>
                <option value="">Semua Tahun Ajaran</option>
                {academicYears.map(ay => <option key={ay.id} value={ay.id}>{ay.name}</option>)}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subjects Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredSubjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground mb-3" />
              <h3 className="font-semibold text-lg">Belum ada mata pelajaran</h3>
              <p className="text-sm text-muted-foreground">Tambahkan mata pelajaran pertama</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead className="hidden md:table-cell">Deskripsi</TableHead>
                    <TableHead>Tahun Ajaran</TableHead>
                    <TableHead className="hidden sm:table-cell">Guru</TableHead>
                    <TableHead className="text-center">Materi</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubjects.map(subject => (
                    <TableRow key={subject.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">{subject.code || '-'}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{subject.name}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground max-w-48 truncate">
                        {subject.description || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{subject.academicYear?.name || '-'}</Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {subject.subjectAssignments && subject.subjectAssignments.length > 0
                          ? subject.subjectAssignments.map(a => a.teacher.user.name).join(', ')
                          : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{subject._count?.materials || 0}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(subject)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(subject.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Mata Pelajaran</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus mata pelajaran ini? Tindakan ini tidak dapat dibatalkan dan akan menghapus semua materi dan tugas terkait.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
