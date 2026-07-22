'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Send, Loader2, MessageCircle, Users, CheckCircle, XCircle, Plus, X } from 'lucide-react'

interface ClassItem { id: string; name: string }

interface BlastResult {
  totalSent: number; totalFailed: number; totalTargets: number;
  results: Array<{ phone: string; success: boolean; error?: string }>
}

export default function WABlastManagement() {
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<BlastResult | null>(null)
  const [waConnected, setWaConnected] = useState(false)

  const [form, setForm] = useState({
    message: '',
    classId: '',
    recipientType: 'parent',
    delayMs: 1500,
  })
  const [manualPhones, setManualPhones] = useState<string[]>([])
  const [newPhone, setNewPhone] = useState('')
  const [mode, setMode] = useState<'class' | 'manual'>('class')

  const { toast } = useToast()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const [cRes, waRes] = await Promise.all([fetch('/api/classes'), fetch('/api/whatsapp/status')])
      const cData = await cRes.json(); const waData = await waRes.json()
      if (Array.isArray(cData)) setClasses(cData)
      setWaConnected(waData?.connected && waData?.enabled)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  function addPhone() {
    if (!newPhone) return
    const phone = newPhone.replace(/[\s\-]/g, '')
    if (!manualPhones.includes(phone)) {
      setManualPhones([...manualPhones, phone])
    }
    setNewPhone('')
  }

  function removePhone(phone: string) {
    setManualPhones(manualPhones.filter(p => p !== phone))
  }

  async function handleSend() {
    if (!form.message) {
      toast({ title: 'Error', description: 'Pesan wajib diisi', variant: 'destructive' }); return
    }

    setSending(true)
    setResult(null)

    try {
      const payload: Record<string, unknown> = {
        message: form.message,
        delayMs: form.delayMs,
      }

      if (mode === 'class') {
        if (!form.classId && form.recipientType !== 'all_parents') {
          toast({ title: 'Error', description: 'Pilih kelas atau ubah penerima ke "Semua Orang Tua"', variant: 'destructive' })
          setSending(false)
          return
        }
        payload.classId = form.classId || undefined
        payload.recipientType = form.recipientType
      } else {
        if (manualPhones.length === 0) {
          toast({ title: 'Error', description: 'Tambahkan minimal 1 nomor telepon', variant: 'destructive' })
          setSending(false)
          return
        }
        payload.phones = manualPhones
      }

      const res = await fetch('/api/whatsapp/blast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (data.success) {
        setResult(data)
        toast({ 
          title: 'Berhasil', 
          description: `${data.totalSent} pesan terkirim, ${data.totalFailed} gagal dari ${data.totalTargets} target` 
        })
      } else {
        toast({ title: 'Gagal', description: data.error || 'Gagal mengirim pesan', variant: 'destructive' })
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Gagal mengirim pesan', variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  if (loading) return <div className="space-y-4"><h1 className="text-2xl font-bold">WA Blast</h1><div className="animate-pulse h-64 bg-muted rounded-lg" /></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Send className="w-6 h-6 text-green-600" />
          WA Blast
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Kirim pesan broadcast ke banyak penerima sekaligus via waha.devlike.pro (WAHA)</p>
      </div>

      {/* WA Status */}
      <Card className={waConnected ? 'border-green-200 dark:border-green-900' : 'border-red-200 dark:border-red-900'}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {waConnected ? <CheckCircle className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
            <div>
              <p className="font-medium text-sm">{waConnected ? 'WhatsApp Terhubung' : 'WhatsApp Tidak Tersedia'}</p>
              <p className="text-xs text-muted-foreground">
                {waConnected ? 'Siap mengirim pesan blast' : 'Atur konfigurasi di Pengaturan Sistem → Integrasi WhatsApp (waha.devlike.pro)'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compose Panel */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Tulis Pesan</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Pesan</Label>
                <textarea
                  className="w-full border rounded-md p-3 bg-background min-h-40 text-sm"
                  value={form.message}
                  onChange={e => setForm({ ...form, message: e.target.value })}
                  placeholder="Tulis pesan Anda di sini...&#10;&#10;Anda bisa menggunakan *teks tebal*, _teks miring_, dan emoji 📋"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {form.message.length} karakter | Maks 4096 karakter
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Recipient Mode */}
          <Card>
            <CardHeader><CardTitle className="text-lg">Penerima</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={mode === 'class' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMode('class')}
                >
                  <Users className="w-4 h-4 mr-1" /> Berdasarkan Kelas
                </Button>
                <Button
                  variant={mode === 'manual' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMode('manual')}
                >
                  <MessageCircle className="w-4 h-4 mr-1" /> Nomor Manual
                </Button>
              </div>

              {mode === 'class' ? (
                <div className="space-y-3">
                  <div>
                    <Label>Penerima</Label>
                    <select
                      className="w-full border rounded-md p-2 bg-background"
                      value={form.recipientType}
                      onChange={e => setForm({ ...form, recipientType: e.target.value })}
                    >
                      <option value="parent">Orang Tua Siswa</option>
                      <option value="all_parents">Semua Orang Tua</option>
                      <option value="student">Siswa</option>
                      <option value="teacher">Guru Kelas</option>
                    </select>
                  </div>
                  {form.recipientType !== 'all_parents' && (
                    <div>
                      <Label>Kelas</Label>
                      <select
                        className="w-full border rounded-md p-2 bg-background"
                        value={form.classId}
                        onChange={e => setForm({ ...form, classId: e.target.value })}
                      >
                        <option value="">Pilih Kelas</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nomor WA (contoh: 62812345678)"
                      value={newPhone}
                      onChange={e => setNewPhone(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPhone() }}}
                    />
                    <Button onClick={addPhone} size="icon"><Plus className="w-4 h-4" /></Button>
                  </div>
                  {manualPhones.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">{manualPhones.length} nomor ditambahkan:</p>
                      <div className="flex flex-wrap gap-1">
                        {manualPhones.map(phone => (
                          <Badge key={phone} variant="secondary" className="gap-1">
                            {phone}
                            <button onClick={() => removePhone(phone)} className="ml-1 hover:text-destructive">
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Send Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Kirim Pesan</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Delay antar pesan (ms)</Label>
                <Input
                  type="number"
                  value={form.delayMs}
                  onChange={e => setForm({ ...form, delayMs: parseInt(e.target.value) || 1500 })}
                  min={500}
                  step={500}
                />
                <p className="text-xs text-muted-foreground mt-1">Minimal 500ms untuk menghindari spam</p>
              </div>

              <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                <p className="font-medium">Ringkasan:</p>
                <p className="text-muted-foreground">Mode: {mode === 'class' ? 'Berdasarkan Kelas' : 'Nomor Manual'}</p>
                {mode === 'class' && (
                  <p className="text-muted-foreground">
                    Penerima: {form.recipientType === 'parent' ? 'Orang Tua' : form.recipientType === 'all_parents' ? 'Semua Orang Tua' : form.recipientType === 'student' ? 'Siswa' : 'Guru'}
                  </p>
                )}
                {mode === 'manual' && (
                  <p className="text-muted-foreground">Jumlah nomor: {manualPhones.length}</p>
                )}
                <p className="text-muted-foreground">Panjang pesan: {form.message.length} karakter</p>
              </div>

              <Button
                onClick={handleSend}
                disabled={sending || !waConnected || !form.message}
                className="w-full"
                size="lg"
              >
                {sending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Mengirim...</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" /> Kirim Sekarang</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Result */}
          {result && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Hasil Pengiriman</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 rounded-lg bg-muted">
                    <p className="text-2xl font-bold">{result.totalTargets}</p>
                    <p className="text-xs text-muted-foreground">Target</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-green-50 dark:bg-green-950/30">
                    <p className="text-2xl font-bold text-green-600">{result.totalSent}</p>
                    <p className="text-xs text-muted-foreground">Terkirim</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-red-50 dark:bg-red-950/30">
                    <p className="text-2xl font-bold text-red-600">{result.totalFailed}</p>
                    <p className="text-xs text-muted-foreground">Gagal</p>
                  </div>
                </div>

                {result.results.filter(r => !r.success).length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-destructive">Detail Gagal:</p>
                    {result.results.filter(r => !r.success).map((r, i) => (
                      <p key={i} className="text-xs text-muted-foreground">{r.phone}: {r.error || 'Unknown error'}</p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
