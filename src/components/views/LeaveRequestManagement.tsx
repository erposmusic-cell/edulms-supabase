'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/lib/store'
import { Check, X, FileText, Clock } from 'lucide-react'
import FileUpload from '@/components/ui/file-upload'

interface LeaveRequestItem {
  id: string; type: string; reason: string; startDate: string; endDate: string | null;
  evidenceUrl: string | null; status: string; approvedByWali: string | null; approvedByAdmin: string | null;
  student: { id: string; user: { name: string }; class: { name: string } }
}

export default function LeaveRequestManagement() {
  const { currentUser } = useAppStore()
  const [requests, setRequests] = useState<LeaveRequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ type: 'izin', reason: '', startDate: '', endDate: '', evidenceUrl: '' })
  const [students, setStudents] = useState<Array<{ id: string; user: { name: string } }>>([])
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const { toast } = useToast()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const res = await fetch('/api/leave-requests')
      const data = await res.json()
      if (Array.isArray(data)) setRequests(data)
      if (currentUser?.role === 'student' || currentUser?.role === 'user') {
        const sRes = await fetch(`/api/students?userId=${currentUser.id}`)
        const sData = await sRes.json()
        if (Array.isArray(sData)) {
          const me = sData[0]
          if (me) setSelectedStudentId(me.id)
          setStudents(sData)
        }
      } else {
        const sRes = await fetch('/api/students')
        const sData = await sRes.json()
        if (Array.isArray(sData)) setStudents(sData)
      }
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  async function handleSubmit() {
    if (!selectedStudentId || !form.reason || !form.startDate) { toast({ title: 'Error', description: 'Data wajib belum lengkap', variant: 'destructive' }); return }
    try {
      await fetch('/api/leave-requests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: selectedStudentId, ...form, evidenceUrl: form.evidenceUrl || null }),
      })
      toast({ title: 'Berhasil', description: 'Pengajuan izin/sakit berhasil dikirim' })
      setDialogOpen(false); setForm({ type: 'izin', reason: '', startDate: '', endDate: '', evidenceUrl: '' }); loadData()
    } catch (e) { toast({ title: 'Error', description: 'Gagal mengirim', variant: 'destructive' }) }
  }

  async function handleAction(id: string, action: 'approved' | 'rejected') {
    try {
      const body: Record<string, string> = { status: action }
      if (currentUser?.role === 'wali_kelas') body.approvedByWali = currentUser.id
      if (currentUser?.role === 'admin') body.approvedByAdmin = currentUser.id
      await fetch(`/api/leave-requests/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      toast({ title: 'Berhasil', description: `Pengajuan ${action === 'approved' ? 'disetujui' : 'ditolak'}` }); loadData()
    } catch (e) { toast({ title: 'Error', description: 'Gagal memproses', variant: 'destructive' }) }
  }

  const statusBadge = (status: string) => {
    const map: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = { pending: 'secondary', approved: 'default', rejected: 'destructive' }
    return <Badge variant={map[status] || 'outline'}>{status === 'pending' ? 'Menunggu' : status === 'approved' ? 'Disetujui' : 'Ditolak'}</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Izin / Sakit</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <Button onClick={() => setDialogOpen(true)}><FileText className="w-4 h-4 mr-2" />Ajukan Izin/Sakit</Button>
          <DialogContent>
            <DialogHeader><DialogTitle>Pengajuan Izin / Sakit</DialogTitle></DialogHeader>
            <div className="space-y-3">
              {currentUser?.role !== 'student' && currentUser?.role !== 'user' && (
                <div><Label>Siswa</Label>
                  <select className="w-full border rounded-md p-2 bg-background" value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)}>
                    <option value="">Pilih Siswa</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.user.name}</option>)}
                  </select>
                </div>
              )}
              <div><Label>Jenis</Label>
                <select className="w-full border rounded-md p-2 bg-background" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option value="izin">Izin</option><option value="sakit">Sakit</option>
                </select>
              </div>
              <div><Label>Alasan</Label><Input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} /></div>
              <div>
                <Label>Bukti / Surat Keterangan</Label>
                <FileUpload
                  onUpload={(url, name) => setForm({ ...form, evidenceUrl: url })}
                  currentUrl={form.evidenceUrl}
                  accept="image/*,.pdf"
                  label="Upload Bukti"
                  preview
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Tanggal Mulai</Label><Input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></div>
                <div><Label>Tanggal Selesai</Label><Input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} /></div>
              </div>
              <Button onClick={handleSubmit} className="w-full">Kirim Pengajuan</Button>
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
                  <th className="text-left py-3 px-4 font-medium">Siswa</th>
                  <th className="text-left py-3 px-4 font-medium">Kelas</th>
                  <th className="text-center py-3 px-4 font-medium">Jenis</th>
                  <th className="text-left py-3 px-4 font-medium">Alasan</th>
                  <th className="text-center py-3 px-4 font-medium">Bukti</th>
                  <th className="text-center py-3 px-4 font-medium">Tanggal</th>
                  <th className="text-center py-3 px-4 font-medium">Status</th>
                  {(currentUser?.role === 'admin' || currentUser?.role === 'wali_kelas') && <th className="text-center py-3 px-4 font-medium">Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Memuat...</td></tr> :
                  requests.map(lr => (
                    <tr key={lr.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium">{lr.student?.user?.name}</td>
                      <td className="py-3 px-4">{lr.student?.class?.name}</td>
                      <td className="py-3 px-4 text-center"><Badge variant="outline">{lr.type}</Badge></td>
                      <td className="py-3 px-4 max-w-48 truncate">{lr.reason}</td>
                      <td className="py-3 px-4 text-center">
                        {lr.evidenceUrl ? (
                          <a href={lr.evidenceUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline text-xs">Lihat</a>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center text-xs">{new Date(lr.startDate).toLocaleDateString('id-ID')}</td>
                      <td className="py-3 px-4 text-center">{statusBadge(lr.status)}</td>
                      {(currentUser?.role === 'admin' || currentUser?.role === 'wali_kelas') && (
                        <td className="py-3 px-4 text-center">
                          {lr.status === 'pending' && (
                            <div className="flex justify-center gap-1">
                              <Button size="sm" variant="default" onClick={() => handleAction(lr.id, 'approved')}><Check className="w-4 h-4" /></Button>
                              <Button size="sm" variant="destructive" onClick={() => handleAction(lr.id, 'rejected')}><X className="w-4 h-4" /></Button>
                            </div>
                          )}
                        </td>
                      )}
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
