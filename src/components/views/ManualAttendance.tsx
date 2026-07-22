'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/lib/store'
import { Plus, Pencil, Trash2, ClipboardList, Download } from 'lucide-react'

interface AttendanceItem {
  id: string; studentId: string; date: string; timeIn: string | null; timeOut: string | null;
  status: string; method: string | null; notes: string | null;
  student: { user: { name: string }; class: { name: string } }
}

export default function ManualAttendance() {
  const { currentUser } = useAppStore()
  const [records, setRecords] = useState<AttendanceItem[]>([])
  const [students, setStudents] = useState<Array<{ id: string; nis: string; user: { name: string }; class: { name: string } }>>([])
  const [academicYearId, setAcademicYearId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ studentId: '', date: '', timeIn: '', timeOut: '', status: 'hadir', method: 'manual', notes: '' })
  const { toast } = useToast()

  useEffect(() => { loadInitialData() }, [])

  async function loadInitialData() {
    try {
      const [aRes, sRes, setRes] = await Promise.all([fetch('/api/attendance'), fetch('/api/students'), fetch('/api/settings')])
      const aData = await aRes.json(); const sData = await sRes.json(); const setData = await setRes.json()
      if (Array.isArray(aData)) setRecords(aData)
      if (Array.isArray(sData)) setStudents(sData)
      if (setData?.activeAcademicYearId) setAcademicYearId(setData.activeAcademicYearId)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  async function handleSubmit() {
    if (!form.studentId || !form.date || !form.status) { toast({ title: 'Error', description: 'Data wajib belum lengkap', variant: 'destructive' }); return }
    try {
      if (editId) {
        await fetch(`/api/attendance/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        toast({ title: 'Berhasil', description: 'Absensi diperbarui' })
      } else {
        await fetch('/api/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, academicYearId, createdBy: currentUser?.id }) })
        toast({ title: 'Berhasil', description: 'Absensi ditambahkan' })
      }
      setDialogOpen(false); setEditId(null); setForm({ studentId: '', date: '', timeIn: '', timeOut: '', status: 'hadir', method: 'manual', notes: '' })
      loadInitialData()
    } catch (e) { toast({ title: 'Error', description: 'Gagal menyimpan', variant: 'destructive' }) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Yakin ingin menghapus?')) return
    try { await fetch(`/api/attendance/${id}`, { method: 'DELETE' }); toast({ title: 'Berhasil', description: 'Dihapus' }); loadInitialData() }
    catch (e) { toast({ title: 'Error', description: 'Gagal menghapus', variant: 'destructive' }) }
  }

  function openEdit(a: AttendanceItem) {
    setEditId(a.id)
    setForm({
      studentId: a.studentId, date: new Date(a.date).toISOString().split('T')[0],
      timeIn: a.timeIn ? new Date(a.timeIn).toISOString().slice(0, 16) : '',
      timeOut: a.timeOut ? new Date(a.timeOut).toISOString().slice(0, 16) : '',
      status: a.status, method: a.method || 'manual', notes: a.notes || '',
    })
    setDialogOpen(true)
  }

  const statusColors: Record<string, string> = { hadir: 'default', terlambat: 'secondary', izin: 'outline', sakit: 'outline', alpha: 'destructive' }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Absensi Manual</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditId(null); setForm({ studentId: '', date: '', timeIn: '', timeOut: '', status: 'hadir', method: 'manual', notes: '' }) } }}>
          <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" />Tambah Absensi</Button>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editId ? 'Edit' : 'Tambah'} Absensi</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Siswa</Label>
                <select className="w-full border rounded-md p-2 bg-background" value={form.studentId} onChange={e => setForm({ ...form, studentId: e.target.value })} disabled={!!editId}>
                  <option value="">Pilih Siswa</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.nis} - {s.user.name}</option>)}
                </select>
              </div>
              <div><Label>Tanggal</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Jam Masuk</Label><Input type="datetime-local" value={form.timeIn} onChange={e => setForm({ ...form, timeIn: e.target.value })} /></div>
                <div><Label>Jam Keluar</Label><Input type="datetime-local" value={form.timeOut} onChange={e => setForm({ ...form, timeOut: e.target.value })} /></div>
              </div>
              <div><Label>Status</Label>
                <select className="w-full border rounded-md p-2 bg-background" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="hadir">Hadir</option><option value="terlambat">Terlambat</option>
                  <option value="izin">Izin</option><option value="sakit">Sakit</option><option value="alpha">Alpha</option>
                </select>
              </div>
              <div><Label>Catatan</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <Button onClick={handleSubmit} className="w-full">{editId ? 'Simpan' : 'Tambah'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card border-b">
                <tr>
                  <th className="text-left py-3 px-4 font-medium">Tanggal</th>
                  <th className="text-left py-3 px-4 font-medium">Siswa</th>
                  <th className="text-left py-3 px-4 font-medium">Kelas</th>
                  <th className="text-center py-3 px-4 font-medium">Masuk</th>
                  <th className="text-center py-3 px-4 font-medium">Keluar</th>
                  <th className="text-center py-3 px-4 font-medium">Status</th>
                  <th className="text-center py-3 px-4 font-medium">Metode</th>
                  <th className="text-center py-3 px-4 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Memuat...</td></tr> :
                  records.slice(0, 100).map(a => (
                    <tr key={a.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">{new Date(a.date).toLocaleDateString('id-ID')}</td>
                      <td className="py-3 px-4 font-medium">{a.student?.user?.name || '-'}</td>
                      <td className="py-3 px-4">{a.student?.class?.name || '-'}</td>
                      <td className="py-3 px-4 text-center">{a.timeIn ? new Date(a.timeIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                      <td className="py-3 px-4 text-center">{a.timeOut ? new Date(a.timeOut).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                      <td className="py-3 px-4 text-center"><Badge variant={statusColors[a.status] as 'default' | 'secondary' | 'outline' | 'destructive'}>{a.status}</Badge></td>
                      <td className="py-3 px-4 text-center text-xs">{a.method || '-'}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex justify-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
