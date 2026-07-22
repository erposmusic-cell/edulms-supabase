'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { Settings, Plus, Trash2, Calendar, MessageCircle, Mail, CheckCircle, XCircle, Loader2, ExternalLink } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

interface SettingsData {
  schoolName: string; schoolLogoUrl: string | null; activeAcademicYearId: string | null;
  timeIn: string; timeLate: string; timeOutMin: string; timeOutDeadline: string;
  attendanceThreshold: number; faceRecognitionThreshold: number; reminderMinutes: number;
  // WhatsApp Integration
  waEnabled: boolean; waApiUrl: string; waApiKey: string | null; waSession: string;
  waSenderNumber: string | null; waAutoAttendance: boolean; waAutoGrade: boolean;
  waAutoAnnouncement: boolean; waAutoLeaveRequest: boolean;
  // Email Integration
  emailEnabled: boolean; emailHost: string; emailPort: number; emailSecure: boolean;
  emailUser: string | null; emailPass: string | null; emailFromName: string;
  emailFromAddress: string | null; emailAutoAttendance: boolean; emailAutoGrade: boolean;
  emailAutoAnnouncement: boolean;
}

interface HolidayItem { id: string; name: string; date: string }

interface WAStatus {
  configured: boolean; enabled: boolean; connected?: boolean;
  phoneNumber?: string; apiUrl?: string; session?: string; status?: string;
}

export default function SystemSettings() {
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [holidays, setHolidays] = useState<HolidayItem[]>([])
  const [academicYears, setAcademicYears] = useState<Array<{ id: string; name: string }>>([])
  const [waStatus, setWaStatus] = useState<WAStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingWA, setTestingWA] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)
  const [testPhone, setTestPhone] = useState('')
  const [testEmail, setTestEmail] = useState('')
  const [holidayDialog, setHolidayDialog] = useState(false)
  const [holidayForm, setHolidayForm] = useState({ name: '', date: '' })
  const { toast } = useToast()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const [sRes, hRes, ayRes, waRes] = await Promise.all([
        fetch('/api/settings'), fetch('/api/holidays'), fetch('/api/academic-years'), fetch('/api/whatsapp/status')
      ])
      const sData = await sRes.json(); const hData = await hRes.json(); const ayData = await ayRes.json(); const waData = await waRes.json()
      if (!sData.error) setSettings(sData)
      if (Array.isArray(hData)) setHolidays(hData)
      if (Array.isArray(ayData)) setAcademicYears(ayData)
      setWaStatus(waData)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  async function saveSettings() {
    if (!settings) return
    setSaving(true)
    try {
      await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) })
      toast({ title: 'Berhasil', description: 'Pengaturan berhasil disimpan' })
      // Refresh WA status
      const waRes = await fetch('/api/whatsapp/status')
      setWaStatus(await waRes.json())
    } catch (e) { toast({ title: 'Error', description: 'Gagal menyimpan', variant: 'destructive' }) }
    finally { setSaving(false) }
  }

  async function testWA() {
    if (!testPhone) { toast({ title: 'Error', description: 'Masukkan nomor telepon untuk test', variant: 'destructive' }); return }
    setTestingWA(true)
    try {
      const res = await fetch('/api/whatsapp/test', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: testPhone })
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Berhasil', description: 'Pesan test berhasil dikirim! Cek WhatsApp Anda.' })
      } else {
        toast({ title: 'Gagal', description: data.error || 'Gagal mengirim pesan test', variant: 'destructive' })
      }
    } catch (e) { toast({ title: 'Error', description: 'Gagal mengirim pesan test', variant: 'destructive' }) }
    finally { setTestingWA(false) }
  }

  async function addHoliday() {
    if (!holidayForm.name || !holidayForm.date) { toast({ title: 'Error', description: 'Data wajib belum lengkap', variant: 'destructive' }); return }
    try {
      await fetch('/api/holidays', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(holidayForm) })
      toast({ title: 'Berhasil', description: 'Hari libur ditambahkan' }); setHolidayDialog(false); setHolidayForm({ name: '', date: '' }); loadData()
    } catch (e) { toast({ title: 'Error', description: 'Gagal menambahkan', variant: 'destructive' }) }
  }

  async function deleteHoliday(id: string) {
    try { await fetch(`/api/holidays/${id}`, { method: 'DELETE' }); loadData() }
    catch (e) { toast({ title: 'Error', description: 'Gagal menghapus', variant: 'destructive' }) }
  }

  if (loading || !settings) return <div className="space-y-4"><h1 className="text-2xl font-bold">Pengaturan Sistem</h1><div className="animate-pulse h-64 bg-muted rounded-lg" /></div>

  const updateField = (field: string, value: unknown) => setSettings({ ...settings, [field]: value })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Pengaturan Sistem</h1>

      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Settings className="w-5 h-5" />Pengaturan Umum</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Nama Sekolah</Label><Input value={settings.schoolName} onChange={e => updateField('schoolName', e.target.value)} /></div>
            <div><Label>Tahun Ajaran Aktif</Label>
              <select className="w-full border rounded-md p-2 bg-background" value={settings.activeAcademicYearId || ''} onChange={e => updateField('activeAcademicYearId', e.target.value)}>
                <option value="">Pilih</option>
                {academicYears.map(ay => <option key={ay.id} value={ay.id}>{ay.name}</option>)}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Pengaturan Waktu Absensi</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div><Label>Jam Masuk</Label><Input type="time" value={settings.timeIn} onChange={e => updateField('timeIn', e.target.value)} /></div>
            <div><Label>Batas Terlambat</Label><Input type="time" value={settings.timeLate} onChange={e => updateField('timeLate', e.target.value)} /></div>
            <div><Label>Jam Pulang Min</Label><Input type="time" value={settings.timeOutMin} onChange={e => updateField('timeOutMin', e.target.value)} /></div>
            <div><Label>Batas Jam Pulang</Label><Input type="time" value={settings.timeOutDeadline} onChange={e => updateField('timeOutDeadline', e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Pengaturan Absensi & Wajah</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><Label>Ambang Batas Kehadiran (%)</Label><Input type="number" value={settings.attendanceThreshold} onChange={e => updateField('attendanceThreshold', parseFloat(e.target.value))} /></div>
            <div><Label>Threshold Wajah</Label><Input type="number" step="0.1" value={settings.faceRecognitionThreshold} onChange={e => updateField('faceRecognitionThreshold', parseFloat(e.target.value))} /></div>
            <div><Label>Reminder (menit)</Label><Input type="number" value={settings.reminderMinutes} onChange={e => updateField('reminderMinutes', parseInt(e.target.value))} /></div>
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp Integration Card */}
      <Card className="border-2 border-green-200 dark:border-green-900">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-600" />
              Integrasi WhatsApp (waha.devlike.pro)
            </CardTitle>
            <div className="flex items-center gap-2">
              {waStatus?.connected ? (
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                  <CheckCircle className="w-3 h-3 mr-1" /> Terhubung
                </Badge>
              ) : waStatus?.configured ? (
                <Badge variant="destructive">
                  <XCircle className="w-3 h-3 mr-1" /> Terputus
                </Badge>
              ) : (
                <Badge variant="outline">
                  <XCircle className="w-3 h-3 mr-1" /> Belum Dikonfigurasi
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div>
              <p className="font-medium">Aktifkan WhatsApp Otomatis</p>
              <p className="text-sm text-muted-foreground">Kirim notifikasi otomatis melalui waha.devlike.pro (WAHA)</p>
            </div>
            <Switch
              checked={settings.waEnabled}
              onCheckedChange={(checked) => updateField('waEnabled', checked)}
            />
          </div>

          {/* API Configuration */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Konfigurasi API</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>API URL</Label>
                <Input 
                  value={settings.waApiUrl} 
                  onChange={e => updateField('waApiUrl', e.target.value)} 
                  placeholder="https://waha.devlike.pro"
                />
                <p className="text-xs text-muted-foreground mt-1">Default: https://waha.devlike.pro</p>
              </div>
              <div>
                <Label>API Key</Label>
                <Input 
                  type="password" 
                  value={settings.waApiKey || ''} 
                  onChange={e => updateField('waApiKey', e.target.value || null)} 
                  placeholder="Masukkan API Key dari WAHA"
                />
                <p className="text-xs text-muted-foreground mt-1">Dapatkan dari dashboard waha.devlike.pro</p>
              </div>
              <div>
                <Label>Session Name</Label>
                <Input 
                  value={settings.waSession || ''} 
                  onChange={e => updateField('waSession', e.target.value)} 
                  placeholder="default"
                />
                <p className="text-xs text-muted-foreground mt-1">Nama session WAHA (default: &quot;default&quot;)</p>
              </div>
              <div>
                <Label>Nomor Pengirim</Label>
                <Input 
                  value={settings.waSenderNumber || ''} 
                  onChange={e => updateField('waSenderNumber', e.target.value || null)} 
                  placeholder="62812345678"
                />
                <p className="text-xs text-muted-foreground mt-1">Nomor WhatsApp pengirim (format 62xxx)</p>
              </div>
            </div>
          </div>

          {/* Auto Notification Settings */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Notifikasi Otomatis</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="text-sm font-medium">Notifikasi Kehadiran</p>
                  <p className="text-xs text-muted-foreground">Kirim saat absensi tercatat</p>
                </div>
                <Switch
                  checked={settings.waAutoAttendance}
                  onCheckedChange={(checked) => updateField('waAutoAttendance', checked)}
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="text-sm font-medium">Notifikasi Nilai</p>
                  <p className="text-xs text-muted-foreground">Kirim saat nilai dirilis</p>
                </div>
                <Switch
                  checked={settings.waAutoGrade}
                  onCheckedChange={(checked) => updateField('waAutoGrade', checked)}
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="text-sm font-medium">Notifikasi Pengumuman</p>
                  <p className="text-xs text-muted-foreground">Kirim saat pengumuman baru</p>
                </div>
                <Switch
                  checked={settings.waAutoAnnouncement}
                  onCheckedChange={(checked) => updateField('waAutoAnnouncement', checked)}
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="text-sm font-medium">Notifikasi Izin/Sakit</p>
                  <p className="text-xs text-muted-foreground">Kirim saat pengajuan izin/sakit</p>
                </div>
                <Switch
                  checked={settings.waAutoLeaveRequest}
                  onCheckedChange={(checked) => updateField('waAutoLeaveRequest', checked)}
                />
              </div>
            </div>
          </div>

          {/* Test Connection */}
          <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-dashed">
            <h4 className="font-medium text-sm">Test Koneksi WhatsApp</h4>
            <p className="text-xs text-muted-foreground">Kirim pesan test untuk memverifikasi koneksi ke waha.devlike.pro</p>
            <div className="flex gap-2">
              <Input 
                placeholder="Nomor WA (contoh: 62812345678)" 
                value={testPhone}
                onChange={e => setTestPhone(e.target.value)}
                className="flex-1"
              />
              <Button onClick={testWA} disabled={testingWA || !settings.waEnabled} variant="outline">
                {testingWA ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageCircle className="w-4 h-4 mr-2" />}
                Kirim Test
              </Button>
            </div>
          </div>

          {/* Help Link */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300">
            <ExternalLink className="w-4 h-4 shrink-0" />
            <p className="text-xs">
              Konfigurasi WAHA di{' '}
              <a href="https://waha.devlike.pro" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                waha.devlike.pro
              </a>. 
              Pastikan session sudah STARTED dan status CONNECTED sebelum mengirim pesan.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Email Integration Card */}
      <Card className="border-2 border-blue-200 dark:border-blue-900">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              Integrasi Email (SMTP)
            </CardTitle>
            <Badge variant={settings.emailEnabled && settings.emailUser ? 'default' : 'outline'}>
              {settings.emailEnabled && settings.emailUser ? 'Aktif' : 'Nonaktif'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div>
              <p className="font-medium">Aktifkan Notifikasi Email</p>
              <p className="text-sm text-muted-foreground">Kirim email otomatis ke orang tua</p>
            </div>
            <Switch
              checked={settings.emailEnabled}
              onCheckedChange={(checked) => updateField('emailEnabled', checked)}
            />
          </div>

          {/* SMTP Configuration */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Konfigurasi SMTP</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>SMTP Host</Label>
                <Input value={settings.emailHost} onChange={e => updateField('emailHost', e.target.value)} placeholder="smtp.gmail.com" />
                <p className="text-xs text-muted-foreground mt-1">Contoh: smtp.gmail.com, smtp.sendgrid.net</p>
              </div>
              <div>
                <Label>SMTP Port</Label>
                <Input type="number" value={settings.emailPort} onChange={e => updateField('emailPort', parseInt(e.target.value))} placeholder="587" />
                <p className="text-xs text-muted-foreground mt-1">587 (TLS) atau 465 (SSL)</p>
              </div>
              <div>
                <Label>SMTP Username</Label>
                <Input value={settings.emailUser || ''} onChange={e => updateField('emailUser', e.target.value || null)} placeholder="your@gmail.com" />
              </div>
              <div>
                <Label>SMTP Password</Label>
                <Input type="password" value={settings.emailPass || ''} onChange={e => updateField('emailPass', e.target.value || null)} placeholder="App Password" />
                <p className="text-xs text-muted-foreground mt-1">Gunakan App Password untuk Gmail</p>
              </div>
              <div>
                <Label>Nama Pengirim</Label>
                <Input value={settings.emailFromName} onChange={e => updateField('emailFromName', e.target.value)} placeholder="EduLMS" />
              </div>
              <div>
                <Label>Email Pengirim</Label>
                <Input value={settings.emailFromAddress || ''} onChange={e => updateField('emailFromAddress', e.target.value || null)} placeholder="noreply@school.com" />
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <Switch checked={settings.emailSecure} onCheckedChange={(checked) => updateField('emailSecure', checked)} />
              <div>
                <p className="text-sm font-medium">Gunakan SSL/TLS</p>
                <p className="text-xs text-muted-foreground">Aktifkan jika port 465</p>
              </div>
            </div>
          </div>

          {/* Email Auto Notifications */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Notifikasi Email Otomatis</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div><p className="text-sm font-medium">Kehadiran</p></div>
                <Switch checked={settings.emailAutoAttendance} onCheckedChange={(checked) => updateField('emailAutoAttendance', checked)} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div><p className="text-sm font-medium">Nilai</p></div>
                <Switch checked={settings.emailAutoGrade} onCheckedChange={(checked) => updateField('emailAutoGrade', checked)} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div><p className="text-sm font-medium">Pengumuman</p></div>
                <Switch checked={settings.emailAutoAnnouncement} onCheckedChange={(checked) => updateField('emailAutoAnnouncement', checked)} />
              </div>
            </div>
          </div>

          {/* Test Email */}
          <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-dashed">
            <h4 className="font-medium text-sm">Test Koneksi Email</h4>
            <div className="flex gap-2">
              <Input placeholder="email@example.com" value={testEmail} onChange={e => setTestEmail(e.target.value)} className="flex-1" />
              <Button onClick={async () => {
                if (!testEmail) { toast({ title: 'Error', description: 'Masukkan email', variant: 'destructive' }); return }
                setTestingEmail(true)
                try {
                  const res = await fetch('/api/email/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: testEmail }) })
                  const data = await res.json()
                  if (data.success) toast({ title: 'Berhasil', description: 'Email test terkirim!' })
                  else toast({ title: 'Gagal', description: data.error, variant: 'destructive' })
                } catch { toast({ title: 'Error', description: 'Gagal', variant: 'destructive' }) }
                finally { setTestingEmail(false) }
              }} disabled={testingEmail || !settings.emailEnabled} variant="outline">
                {testingEmail ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                Kirim Test
              </Button>
            </div>
          </div>

          {/* Help */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300">
            <ExternalLink className="w-4 h-4 shrink-0" />
            <p className="text-xs">
              Untuk Gmail: Aktifkan 2FA → Buat App Password → Gunakan sebagai SMTP Password. Port 587 untuk TLS, 465 untuk SSL.
            </p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={saveSettings} disabled={saving} className="w-full sm:w-auto">
        {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2"><Calendar className="w-5 h-5" />Hari Libur</CardTitle>
            <Dialog open={holidayDialog} onOpenChange={setHolidayDialog}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />Tambah</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Tambah Hari Libur</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Nama</Label><Input value={holidayForm.name} onChange={e => setHolidayForm({ ...holidayForm, name: e.target.value })} placeholder="Hari Raya" /></div>
                  <div><Label>Tanggal</Label><Input type="date" value={holidayForm.date} onChange={e => setHolidayForm({ ...holidayForm, date: e.target.value })} /></div>
                  <Button onClick={addHoliday} className="w-full">Tambah</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
            {holidays.length === 0 ? <p className="text-center text-muted-foreground py-4">Belum ada hari libur</p> :
              holidays.map(h => (
                <div key={h.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div><p className="font-medium">{h.name}</p><p className="text-sm text-muted-foreground">{new Date(h.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p></div>
                  <Button variant="ghost" size="icon" onClick={() => deleteHoliday(h.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              ))
            }
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
