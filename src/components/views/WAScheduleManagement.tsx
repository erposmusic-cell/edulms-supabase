'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { Plus, Pencil, Trash2, Send, MessageCircle, CheckCircle, XCircle, Loader2, Clock } from 'lucide-react'

interface ScheduleItem {
  id: string; name: string; type: string; sendTime: string; sendDay: string | null;
  recipient: string; classFilter: string | null; status: string; template: string | null;
  logs: Array<{ id: string; sentAt: string; status: string; totalSent: number; totalFailed: number }>
}

interface WAStatus {
  configured: boolean; enabled: boolean; connected?: boolean;
}

const defaultTemplates = {
  attendance: `📋 *Notifikasi Kehadiran - {school}*\n\nHalo {parent},\n\nInformasi kehadiran {student} (Kelas {class}) pada {date}:\n🕐 Jam Masuk: {time}\n📊 Status: *{status}*\n\nPesan ini dikirim otomatis oleh sistem EduLMS.`,
  grade: `📊 *Notifikasi Nilai - {school}*\n\nHalo {parent},\n\nNilai {student} (Kelas {class}) untuk mata pelajaran {subject}:\n📝 Nilai: *{score}*\n📊 Grade: *{grade}*\n\nPesan ini dikirim otomatis oleh sistem EduLMS.`,
  announcement: `📢 *Pengumuman - {school}*\n\n{title}\n\n{content}\n\nTanggal: {date}\nPesan ini dikirim otomatis oleh sistem EduLMS.`,
  daily_report: `📋 *Laporan Harian - {school}*\n\nHalo {parent},\n\nBerikut laporan harian {student} (Kelas {class}) pada {date}:\n📊 Kehadiran: *{status}*\n🕐 Jam Masuk: {time}\n\nPesan ini dikirim otomatis oleh sistem EduLMS.`,
}

export default function WAScheduleManagement() {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([])
  const [logs, setLogs] = useState<Array<{ id: string; sentAt: string; status: string; totalSent: number; totalFailed: number; schedule: { name: string } }>>([])
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([])
  const [waStatus, setWaStatus] = useState<WAStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [sendingNow, setSendingNow] = useState<string | null>(null)
  const [form, setForm] = useState({ 
    name: '', type: 'daily', sendTime: '07:30', sendDay: '', recipient: 'parent', 
    classFilter: '', template: '', status: 'active' 
  })
  const { toast } = useToast()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const [sRes, lRes, cRes, waRes] = await Promise.all([
        fetch('/api/report-schedules'), fetch('/api/report-schedule-logs'), fetch('/api/classes'), fetch('/api/whatsapp/status')
      ])
      const sData = await sRes.json(); const lData = await lRes.json(); const cData = await cRes.json(); const waData = await waRes.json()
      if (Array.isArray(sData)) setSchedules(sData)
      if (Array.isArray(lData)) setLogs(lData)
      if (Array.isArray(cData)) setClasses(cData)
      setWaStatus(waData)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  async function handleSubmit() {
    if (!form.name || !form.type || !form.sendTime || !form.recipient) { 
      toast({ title: 'Error', description: 'Data wajib belum lengkap', variant: 'destructive' }); return 
    }
    try {
      if (editId) {
        await fetch(`/api/report-schedules/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        toast({ title: 'Berhasil', description: 'Jadwal diperbarui' })
      } else {
        await fetch('/api/report-schedules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        toast({ title: 'Berhasil', description: 'Jadwal ditambahkan' })
      }
      setDialogOpen(false); setEditId(null); resetForm(); loadData()
    } catch (e) { toast({ title: 'Error', description: 'Gagal menyimpan', variant: 'destructive' }) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Yakin ingin menghapus?')) return
    try { await fetch(`/api/report-schedules/${id}`, { method: 'DELETE' }); toast({ title: 'Berhasil', description: 'Jadwal dihapus' }); loadData() }
    catch (e) { toast({ title: 'Error', description: 'Gagal menghapus', variant: 'destructive' }) }
  }

  async function handleSendNow(scheduleId: string) {
    setSendingNow(scheduleId)
    try {
      const schedule = schedules.find(s => s.id === scheduleId)
      if (!schedule) return

      const res = await fetch('/api/whatsapp/blast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: schedule.classFilter || undefined,
          recipientType: schedule.recipient === 'parent' ? 'parent' : schedule.recipient === 'wali_kelas' ? 'teacher' : 'all_parents',
          message: schedule.template || 'Laporan dari EduLMS',
          delayMs: 1500,
        })
      })
      const data = await res.json()

      if (data.success) {
        // Log the result
        await fetch('/api/report-schedule-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scheduleId,
            sentAt: new Date().toISOString(),
            status: 'completed',
            totalSent: data.totalSent,
            totalFailed: data.totalFailed,
          })
        })
        toast({ 
          title: 'Berhasil', 
          description: `${data.totalSent} pesan terkirim, ${data.totalFailed} gagal` 
        })
        loadData()
      } else {
        toast({ title: 'Gagal', description: data.error || 'Gagal mengirim pesan', variant: 'destructive' })
      }
    } catch (e) { 
      toast({ title: 'Error', description: 'Gagal mengirim pesan', variant: 'destructive' }) 
    } finally { 
      setSendingNow(null) 
    }
  }

  async function toggleScheduleStatus(schedule: ScheduleItem) {
    try {
      await fetch(`/api/report-schedules/${schedule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...schedule, status: schedule.status === 'active' ? 'inactive' : 'active' })
      })
      toast({ title: 'Berhasil', description: `Jadwal ${schedule.status === 'active' ? 'dinonaktifkan' : 'diaktifkan'}` })
      loadData()
    } catch (e) { toast({ title: 'Error', description: 'Gagal mengubah status', variant: 'destructive' }) }
  }

  function resetForm() {
    setForm({ name: '', type: 'daily', sendTime: '07:30', sendDay: '', recipient: 'parent', classFilter: '', template: '', status: 'active' })
  }

  function openEdit(s: ScheduleItem) {
    setEditId(s.id)
    setForm({ name: s.name, type: s.type, sendTime: s.sendTime, sendDay: s.sendDay || '', recipient: s.recipient, classFilter: s.classFilter || '', template: s.template || '', status: s.status })
    setDialogOpen(true)
  }

  function getTemplateForType(type: string): string {
    switch (type) {
      case 'daily': return defaultTemplates.daily_report
      case 'attendance': return defaultTemplates.attendance
      case 'grade': return defaultTemplates.grade
      case 'announcement': return defaultTemplates.announcement
      default: return defaultTemplates.daily_report
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-green-600" />
            Jadwal Laporan WA
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Kelola jadwal pengiriman laporan otomatis via WhatsApp (waha.devlike.pro)</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditId(null); resetForm() } }}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Tambah Jadwal</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editId ? 'Edit' : 'Tambah'} Jadwal Laporan WA</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nama Jadwal</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Laporan Harian Orang Tua" /></div>
              <div><Label>Tipe Laporan</Label>
                <select className="w-full border rounded-md p-2 bg-background" value={form.type} onChange={e => {
                  const newType = e.target.value
                  setForm({ ...form, type: newType, template: form.template || getTemplateForType(newType) })
                }}>
                  <option value="daily">Laporan Harian</option>
                  <option value="weekly">Laporan Mingguan</option>
                  <option value="monthly">Laporan Bulanan</option>
                  <option value="attendance">Notifikasi Kehadiran</option>
                  <option value="grade">Notifikasi Nilai</option>
                  <option value="announcement">Pengumuman</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Waktu Kirim</Label><Input type="time" value={form.sendTime} onChange={e => setForm({ ...form, sendTime: e.target.value })} /></div>
                <div><Label>Hari (mingguan)</Label>
                  <select className="w-full border rounded-md p-2 bg-background" value={form.sendDay} onChange={e => setForm({ ...form, sendDay: e.target.value })}>
                    <option value="">-</option>
                    <option value="monday">Senin</option>
                    <option value="tuesday">Selasa</option>
                    <option value="wednesday">Rabu</option>
                    <option value="thursday">Kamis</option>
                    <option value="friday">Jumat</option>
                    <option value="saturday">Sabtu</option>
                  </select>
                </div>
              </div>
              <div><Label>Penerima</Label>
                <select className="w-full border rounded-md p-2 bg-background" value={form.recipient} onChange={e => setForm({ ...form, recipient: e.target.value })}>
                  <option value="parent">Orang Tua</option>
                  <option value="wali_kelas">Wali Kelas</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div><Label>Filter Kelas</Label>
                <select className="w-full border rounded-md p-2 bg-background" value={form.classFilter} onChange={e => setForm({ ...form, classFilter: e.target.value })}>
                  <option value="">Semua Kelas</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>Template Pesan</Label>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setForm({ ...form, template: getTemplateForType(form.type) })}>
                    Reset Default
                  </Button>
                </div>
                <textarea 
                  className="w-full border rounded-md p-2 bg-background min-h-32 text-sm font-mono" 
                  value={form.template} 
                  onChange={e => setForm({ ...form, template: e.target.value })} 
                  placeholder="Halo {parent}, kehadiran {student} pada {date}..." 
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Variabel: {'{parent}'}, {'{student}'}, {'{class}'}, {'{date}'}, {'{time}'}, {'{status}'}, {'{school}'}
                </p>
              </div>
              <Button onClick={handleSubmit} className="w-full">{editId ? 'Simpan' : 'Tambah'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* WA Status Banner */}
      <Card className={`border-2 ${waStatus?.connected ? 'border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20' : waStatus?.configured ? 'border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20' : 'border-yellow-200 dark:border-yellow-900 bg-yellow-50/50 dark:bg-yellow-950/20'}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {waStatus?.connected ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : waStatus?.configured ? (
                <XCircle className="w-5 h-5 text-red-600" />
              ) : (
                <Clock className="w-5 h-5 text-yellow-600" />
              )}
              <div>
                <p className="font-medium text-sm">
                  {waStatus?.connected ? 'WhatsApp Terhubung' : waStatus?.configured ? 'WhatsApp Terputus' : 'WhatsApp Belum Dikonfigurasi'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {waStatus?.connected 
                    ? 'Menggunakan waha.devlike.pro (WAHA) - Pesan akan dikirim otomatis sesuai jadwal' 
                    : waStatus?.configured 
                      ? 'Session tidak terhubung. Periksa status session di waha.devlike.pro'
                      : 'Atur konfigurasi di Pengaturan Sistem → Integrasi WhatsApp'}
                </p>
              </div>
            </div>
            <Badge variant={waStatus?.connected ? 'default' : 'outline'}>
              waha.devlike.pro
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? [...Array(2)].map((_, i) => <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-32 bg-muted rounded" /></CardContent></Card>) :
          schedules.length === 0 ? (
            <div className="col-span-2 text-center py-12">
              <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Belum ada jadwal laporan WA</p>
              <p className="text-sm text-muted-foreground">Klik &quot;Tambah Jadwal&quot; untuk membuat jadwal baru</p>
            </div>
          ) :
          schedules.map(s => (
            <Card key={s.id} className={s.status === 'inactive' ? 'opacity-60' : ''}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{s.name}</h3>
                      <Badge variant={s.status === 'active' ? 'default' : 'secondary'}>
                        {s.status === 'active' ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      <Badge variant="outline">{s.type === 'daily' ? 'Harian' : s.type === 'weekly' ? 'Mingguan' : s.type === 'monthly' ? 'Bulanan' : s.type}</Badge>
                      <Badge variant="secondary">{s.sendTime}</Badge>
                      {s.sendDay && <Badge variant="secondary">{s.sendDay}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Penerima: {s.recipient === 'parent' ? 'Orang Tua' : s.recipient === 'wali_kelas' ? 'Wali Kelas' : 'Admin'}
                    </p>
                    {s.template && (
                      <p className="text-xs text-muted-foreground mt-1 truncate max-w-xs" title={s.template}>
                        Template: {s.template.substring(0, 60)}...
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => handleSendNow(s.id)} 
                      disabled={sendingNow === s.id || !waStatus?.connected}
                      title="Kirim Sekarang"
                    >
                      {sendingNow === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => toggleScheduleStatus(s)} title={s.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}>
                      <Switch checked={s.status === 'active'} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </div>
                {s.logs.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Log terakhir:</p>
                    {s.logs.slice(0, 2).map(l => (
                      <p key={l.id} className="text-xs">
                        {new Date(l.sentAt).toLocaleString('id-ID')} - 
                        <span className="text-green-600"> {l.totalSent} terkirim</span>
                        {l.totalFailed > 0 && <span className="text-red-600">, {l.totalFailed} gagal</span>}
                      </p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        }
      </div>

      {/* Log Section */}
      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Clock className="w-5 h-5" />Log Pengiriman WA</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
            {logs.length === 0 ? <p className="text-center text-muted-foreground py-4">Belum ada log pengiriman</p> :
              logs.map(l => (
                <div key={l.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm">{l.schedule?.name || '-'}</p>
                    <p className="text-xs text-muted-foreground">{new Date(l.sentAt).toLocaleString('id-ID')}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-green-600">{l.totalSent} terkirim</Badge>
                    {l.totalFailed > 0 && <Badge variant="destructive">{l.totalFailed} gagal</Badge>}
                  </div>
                </div>
              ))
            }
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
