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
import { Plus, Pencil, Trash2, Users, Search, Mail, BookOpen, GraduationCap } from 'lucide-react'
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

interface TeacherItem {
  id: string
  userId: string
  nip: string
  specialization: string | null
  user: {
    id: string
    name: string
    email: string
    phone: string | null
  }
  subjectAssignments?: Array<{
    id: string
    subject: { id: string; name: string; code: string | null }
    class: { id: string; name: string }
  }>
  classAdvisory?: Array<{
    id: string
    class: { id: string; name: string }
  }>
}

interface SubjectOption {
  id: string
  name: string
  code: string | null
}

interface ClassOption {
  id: string
  name: string
}

export default function TeacherManagement() {
  const [teachers, setTeachers] = useState<TeacherItem[]>([])
  const [subjects, setSubjects] = useState<SubjectOption[]>([])
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [assignTeacherId, setAssignTeacherId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    nip: '',
    specialization: '',
    phone: '',
  })
  const [assignForm, setAssignForm] = useState({
    subjectId: '',
    classId: '',
  })
  const { toast } = useToast()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const [teachRes, subRes, clsRes] = await Promise.all([
        fetch('/api/teachers'),
        fetch('/api/subjects'),
        fetch('/api/classes'),
      ])
      const teachData = await teachRes.json()
      const subData = await subRes.json()
      const clsData = await clsRes.json()
      if (Array.isArray(teachData)) setTeachers(teachData)
      if (Array.isArray(subData)) setSubjects(subData)
      if (Array.isArray(clsData)) setClasses(clsData)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const filteredTeachers = teachers.filter(t => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      t.user.name.toLowerCase().includes(q) ||
      t.nip.toLowerCase().includes(q) ||
      t.user.email.toLowerCase().includes(q) ||
      (t.specialization && t.specialization.toLowerCase().includes(q))
    )
  })

  async function handleSubmit() {
    if (!form.name || !form.email || !form.nip) {
      toast({ title: 'Error', description: 'Nama, email, dan NIP wajib diisi', variant: 'destructive' })
      return
    }
    try {
      if (editId) {
        await fetch(`/api/teachers/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        toast({ title: 'Berhasil', description: 'Data guru berhasil diperbarui' })
      } else {
        if (!form.password) {
          toast({ title: 'Error', description: 'Password wajib diisi untuk guru baru', variant: 'destructive' })
          return
        }
        const res = await fetch('/api/teachers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        const data = await res.json()
        if (data.error) {
          toast({ title: 'Error', description: data.error, variant: 'destructive' })
          return
        }
        toast({ title: 'Berhasil', description: 'Guru berhasil ditambahkan' })
      }
      setDialogOpen(false)
      setEditId(null)
      setForm({ name: '', email: '', password: '', nip: '', specialization: '', phone: '' })
      loadData()
    } catch {
      toast({ title: 'Error', description: 'Gagal menyimpan data guru', variant: 'destructive' })
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/teachers/${deleteId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
      } else {
        toast({ title: 'Berhasil', description: 'Guru berhasil dihapus' })
        loadData()
      }
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus guru', variant: 'destructive' })
    }
    setDeleteId(null)
  }

  async function handleAssignSubject() {
    if (!assignTeacherId || !assignForm.subjectId || !assignForm.classId) {
      toast({ title: 'Error', description: 'Mata pelajaran dan kelas wajib diisi', variant: 'destructive' })
      return
    }
    try {
      const res = await fetch('/api/subject-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: assignForm.subjectId,
          teacherId: assignTeacherId,
          classId: assignForm.classId,
        }),
      })
      const data = await res.json()
      if (data.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
        return
      }
      toast({ title: 'Berhasil', description: 'Guru berhasil ditugaskan ke mata pelajaran' })
      setAssignDialogOpen(false)
      setAssignTeacherId(null)
      setAssignForm({ subjectId: '', classId: '' })
      loadData()
    } catch {
      toast({ title: 'Error', description: 'Gagal menugaskan guru', variant: 'destructive' })
    }
  }

  async function handleRemoveAssignment(assignmentId: string) {
    try {
      await fetch(`/api/subject-assignments/${assignmentId}`, { method: 'DELETE' })
      toast({ title: 'Berhasil', description: 'Penugasan berhasil dihapus' })
      loadData()
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus penugasan', variant: 'destructive' })
    }
  }

  function openEdit(teacher: TeacherItem) {
    setEditId(teacher.id)
    setForm({
      name: teacher.user.name,
      email: teacher.user.email,
      password: '',
      nip: teacher.nip,
      specialization: teacher.specialization || '',
      phone: teacher.user.phone || '',
    })
    setDialogOpen(true)
  }

  function openAdd() {
    setEditId(null)
    setForm({ name: '', email: '', password: '', nip: '', specialization: '', phone: '' })
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Manajemen Guru</h1>
          <p className="text-sm text-muted-foreground">Kelola data guru dan penugasan mengajar</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditId(null); setForm({ name: '', email: '', password: '', nip: '', specialization: '', phone: '' }) } }}>
          <DialogTrigger asChild>
            <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" />Tambah Guru</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? 'Edit Guru' : 'Tambah Guru'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nama Lengkap *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nama guru" />
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="guru@sekolah.id" />
              </div>
              {!editId && (
                <div>
                  <Label>Password *</Label>
                  <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Password" />
                </div>
              )}
              <div>
                <Label>NIP *</Label>
                <Input value={form.nip} onChange={e => setForm({ ...form, nip: e.target.value })} placeholder="NIP guru" />
              </div>
              <div>
                <Label>Spesialisasi</Label>
                <Input value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })} placeholder="Matematika, Fisika, dll." />
              </div>
              <div>
                <Label>No. Telepon</Label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="081234567890" />
              </div>
              <Button onClick={handleSubmit} className="w-full">{editId ? 'Simpan Perubahan' : 'Tambah Guru'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Cari guru (nama, NIP, email, spesialisasi)..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardContent>
      </Card>

      {/* Teachers Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground mb-3" />
              <h3 className="font-semibold text-lg">Belum ada guru</h3>
              <p className="text-sm text-muted-foreground">Tambahkan guru pertama</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>NIP</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead>Spesialisasi</TableHead>
                    <TableHead className="hidden lg:table-cell">Mata Pelajaran</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeachers.map(teacher => (
                    <TableRow key={teacher.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">{teacher.nip}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{teacher.user.name}</p>
                            {teacher.classAdvisory && teacher.classAdvisory.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                Wali Kelas: {teacher.classAdvisory.map(a => a.class.name).join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" />{teacher.user.email}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{teacher.specialization || '-'}</Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {teacher.subjectAssignments && teacher.subjectAssignments.length > 0 ? (
                            teacher.subjectAssignments.map(a => (
                              <Badge key={a.id} variant="outline" className="text-xs">
                                {a.subject.name} ({a.class.name})
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">Belum ditugaskan</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Tugaskan Mapel"
                            onClick={() => {
                              setAssignTeacherId(teacher.id)
                              setAssignForm({ subjectId: '', classId: '' })
                              setAssignDialogOpen(true)
                            }}
                          >
                            <BookOpen className="w-4 h-4 text-emerald-600" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(teacher)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(teacher.id)}>
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

      {/* Assign Subject Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Tugaskan Mata Pelajaran
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Mata Pelajaran *</Label>
              <select className="w-full border rounded-md p-2 bg-background" value={assignForm.subjectId} onChange={e => setAssignForm({ ...assignForm, subjectId: e.target.value })}>
                <option value="">Pilih Mata Pelajaran</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name} {s.code ? `(${s.code})` : ''}</option>)}
              </select>
            </div>
            <div>
              <Label>Kelas *</Label>
              <select className="w-full border rounded-md p-2 bg-background" value={assignForm.classId} onChange={e => setAssignForm({ ...assignForm, classId: e.target.value })}>
                <option value="">Pilih Kelas</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Show current assignments */}
            {assignTeacherId && (() => {
              const teacher = teachers.find(t => t.id === assignTeacherId)
              return teacher?.subjectAssignments && teacher.subjectAssignments.length > 0 ? (
                <div className="space-y-2">
                  <Label>Penugasan Saat Ini</Label>
                  <div className="space-y-1">
                    {teacher.subjectAssignments.map(a => (
                      <div key={a.id} className="flex items-center justify-between p-2 rounded border bg-muted/50">
                        <span className="text-sm">{a.subject.name} - {a.class.name}</span>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveAssignment(a.id)}>
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null
            })()}

            <Button onClick={handleAssignSubject} className="w-full">Tugaskan</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Guru</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus guru ini? Akun pengguna juga akan dihapus. Tindakan ini tidak dapat dibatalkan.
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
