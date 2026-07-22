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
import { Plus, Pencil, Trash2, Calendar, Clock, MapPin, Filter } from 'lucide-react'
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

interface ScheduleItem {
  id: string
  classId: string
  subjectAssignmentId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  room: string | null
  class: { id: string; name: string }
  subjectAssignment: {
    id: string
    subject: { id: string; name: string; code: string | null }
    teacher: { id: string; user: { name: string } }
  }
}

interface ClassOption {
  id: string
  name: string
}

interface SubjectAssignmentOption {
  id: string
  classId: string
  subject: { id: string; name: string; code: string | null }
  teacher: { id: string; user: { name: string } }
  class: { id: string; name: string }
}

const DAYS = [
  { value: 1, label: 'Senin' },
  { value: 2, label: 'Selasa' },
  { value: 3, label: 'Rabu' },
  { value: 4, label: 'Kamis' },
  { value: 5, label: 'Jumat' },
  { value: 6, label: 'Sabtu' },
]

const TIME_SLOTS = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00',
]

export default function ScheduleManagement() {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([])
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [assignments, setAssignments] = useState<SubjectAssignmentOption[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [filterClass, setFilterClass] = useState('')
  const [form, setForm] = useState({
    classId: '',
    subjectAssignmentId: '',
    dayOfWeek: 1,
    startTime: '07:00',
    endTime: '08:30',
    room: '',
  })
  const { toast } = useToast()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const params = new URLSearchParams()
      if (filterClass) params.set('classId', filterClass)

      const [schedRes, clsRes, assignRes] = await Promise.all([
        fetch(`/api/schedules?${params.toString()}`),
        fetch('/api/classes'),
        fetch('/api/subject-assignments'),
      ])
      const schedData = await schedRes.json()
      const clsData = await clsRes.json()
      const assignData = await assignRes.json()
      if (Array.isArray(schedData)) setSchedules(schedData)
      if (Array.isArray(clsData)) setClasses(clsData)
      if (Array.isArray(assignData)) setAssignments(assignData)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [filterClass])

  // Group schedules by day
  const scheduleByDay = DAYS.map(day => ({
    ...day,
    items: schedules
      .filter(s => s.dayOfWeek === day.value)
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
  }))

  async function handleSubmit() {
    if (!form.classId || !form.subjectAssignmentId || !form.startTime || !form.endTime) {
      toast({ title: 'Error', description: 'Semua field wajib diisi', variant: 'destructive' })
      return
    }
    if (form.startTime >= form.endTime) {
      toast({ title: 'Error', description: 'Jam selesai harus lebih dari jam mulai', variant: 'destructive' })
      return
    }
    try {
      const body = { ...form, dayOfWeek: Number(form.dayOfWeek) }
      if (editId) {
        const res = await fetch(`/api/schedules/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (data.error) {
          toast({ title: 'Error', description: data.error, variant: 'destructive' })
          return
        }
        toast({ title: 'Berhasil', description: 'Jadwal berhasil diperbarui' })
      } else {
        const res = await fetch('/api/schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (data.error) {
          toast({ title: 'Error', description: data.error, variant: 'destructive' })
          return
        }
        toast({ title: 'Berhasil', description: 'Jadwal berhasil ditambahkan' })
      }
      setDialogOpen(false)
      setEditId(null)
      setForm({ classId: '', subjectAssignmentId: '', dayOfWeek: 1, startTime: '07:00', endTime: '08:30', room: '' })
      loadData()
    } catch {
      toast({ title: 'Error', description: 'Gagal menyimpan jadwal', variant: 'destructive' })
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await fetch(`/api/schedules/${deleteId}`, { method: 'DELETE' })
      toast({ title: 'Berhasil', description: 'Jadwal berhasil dihapus' })
      loadData()
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus jadwal', variant: 'destructive' })
    }
    setDeleteId(null)
  }

  function openEdit(item: ScheduleItem) {
    setEditId(item.id)
    setForm({
      classId: item.classId,
      subjectAssignmentId: item.subjectAssignmentId,
      dayOfWeek: item.dayOfWeek,
      startTime: item.startTime,
      endTime: item.endTime,
      room: item.room || '',
    })
    setDialogOpen(true)
  }

  function openAdd() {
    setEditId(null)
    setForm({
      classId: filterClass || '',
      subjectAssignmentId: '',
      dayOfWeek: 1,
      startTime: '07:00',
      endTime: '08:30',
      room: '',
    })
    setDialogOpen(true)
  }

  // Filter assignments by selected class in form
  const filteredAssignments = form.classId
    ? assignments.filter(a => a.classId === form.classId)
    : assignments

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Jadwal Pelajaran</h1>
          <p className="text-sm text-muted-foreground">Kelola jadwal pelajaran per kelas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditId(null) } }}>
          <DialogTrigger asChild>
            <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" />Tambah Jadwal</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? 'Edit Jadwal' : 'Tambah Jadwal'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Kelas *</Label>
                <select className="w-full border rounded-md p-2 bg-background" value={form.classId} onChange={e => setForm({ ...form, classId: e.target.value, subjectAssignmentId: '' })}>
                  <option value="">Pilih Kelas</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Mata Pelajaran & Guru *</Label>
                <select className="w-full border rounded-md p-2 bg-background" value={form.subjectAssignmentId} onChange={e => setForm({ ...form, subjectAssignmentId: e.target.value })}>
                  <option value="">Pilih Penugasan</option>
                  {filteredAssignments.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.subject.name} - {a.teacher.user.name} ({a.class.name})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Hari *</Label>
                <select className="w-full border rounded-md p-2 bg-background" value={form.dayOfWeek} onChange={e => setForm({ ...form, dayOfWeek: Number(e.target.value) })}>
                  {DAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Jam Mulai *</Label>
                  <select className="w-full border rounded-md p-2 bg-background" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })}>
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Jam Selesai *</Label>
                  <select className="w-full border rounded-md p-2 bg-background" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })}>
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <Label>Ruangan</Label>
                <Input value={form.room} onChange={e => setForm({ ...form, room: e.target.value })} placeholder="Ruang 101" />
              </div>
              <Button onClick={handleSubmit} className="w-full">{editId ? 'Simpan Perubahan' : 'Tambah Jadwal'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Class Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Label className="text-sm whitespace-nowrap">Filter Kelas:</Label>
            <select className="border rounded-md p-2 bg-background text-sm flex-1 sm:flex-none" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
              <option value="">Semua Kelas</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {filterClass && (
              <Button variant="ghost" size="sm" onClick={() => setFilterClass('')}>Reset</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Weekly Schedule Grid */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent>
            </Card>
          ))}
        </div>
      ) : schedules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mb-3" />
            <h3 className="font-semibold text-lg">Belum ada jadwal</h3>
            <p className="text-sm text-muted-foreground">Tambahkan jadwal pelajaran pertama</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {scheduleByDay.map(day => (
            <Card key={day.value} className={day.items.length === 0 ? 'opacity-50' : ''}>
              <CardHeader className="pb-3 pt-4 px-6">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  {day.label}
                  <Badge variant="secondary" className="ml-1">{day.items.length} jadwal</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-4">
                {day.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Tidak ada jadwal</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {day.items.map(item => (
                      <div key={item.id} className="p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{item.subjectAssignment.subject.name}</p>
                            <p className="text-xs text-muted-foreground">{item.subjectAssignment.teacher.user.name}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteId(item.id)}>
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <Clock className="w-3 h-3" />{item.startTime} - {item.endTime}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">{item.class.name}</Badge>
                          {item.room && (
                            <Badge variant="outline" className="text-xs flex items-center gap-1">
                              <MapPin className="w-3 h-3" />{item.room}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Jadwal</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus jadwal ini? Tindakan ini tidak dapat dibatalkan.
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
