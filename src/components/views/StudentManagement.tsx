'use client'

import { useEffect, useState, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { FileSpreadsheet } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/lib/store'
import { Plus, Pencil, Trash2, Search, Download, Upload, FileUp } from 'lucide-react'

interface StudentItem {
  id: string
  nis: string
  parentPhone: string | null
  faceRegistered: boolean
  status: string
  classId: string
  user: { name: string; email: string; phone: string | null }
  class: { name: string; major: string | null }
}

export default function StudentManagement() {
  const { currentUser } = useAppStore()
  const [students, setStudents] = useState<StudentItem[]>([])
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', nis: '', phone: '', parentPhone: '', classId: '' })
  const [importOpen, setImportOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  useEffect(() => { loadData() }, [search, filterClass])

  async function loadData() {
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filterClass) params.set('classId', filterClass)
      const [sRes, cRes] = await Promise.all([fetch(`/api/students?${params}`), fetch('/api/classes')])
      const sData = await sRes.json()
      const cData = await cRes.json()
      if (Array.isArray(sData)) setStudents(sData)
      if (Array.isArray(cData)) setClasses(cData)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  async function handleSubmit() {
    if (!form.name || !form.email || !form.nis || !form.classId) {
      toast({ title: 'Error', description: 'Data wajib belum lengkap', variant: 'destructive' }); return
    }
    try {
      if (editId) {
        await fetch(`/api/students/${editId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, changedBy: currentUser?.id, changedByName: currentUser?.name }),
        })
        toast({ title: 'Berhasil', description: 'Siswa berhasil diperbarui' })
      } else {
        if (!form.password) { toast({ title: 'Error', description: 'Password wajib diisi', variant: 'destructive' }); return }
        await fetch('/api/students', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, changedBy: currentUser?.id, changedByName: currentUser?.name }),
        })
        toast({ title: 'Berhasil', description: 'Siswa berhasil ditambahkan' })
      }
      setDialogOpen(false); setEditId(null); setForm({ name: '', email: '', password: '', nis: '', phone: '', parentPhone: '', classId: '' })
      loadData()
    } catch (e) { toast({ title: 'Error', description: 'Gagal menyimpan', variant: 'destructive' }) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Yakin ingin menghapus siswa ini?')) return
    try {
      await fetch(`/api/students/${id}`, { method: 'DELETE' })
      toast({ title: 'Berhasil', description: 'Siswa berhasil dihapus' }); loadData()
    } catch (e) { toast({ title: 'Error', description: 'Gagal menghapus', variant: 'destructive' }) }
  }

  function openEdit(s: StudentItem) {
    setEditId(s.id)
    setForm({ name: s.user.name, email: s.user.email, password: '', nis: s.nis, phone: s.user.phone || '', parentPhone: s.parentPhone || '', classId: s.classId })
    setDialogOpen(true)
  }

  function exportCSV() {
    const headers = 'NIS,Nama,Email,Kelas,Jurusan,Status,Wajah Terdaftar'
    const rows = students.map(s => `${s.nis},${s.user.name},${s.user.email},${s.class.name},${s.class.major || ''},${s.status},${s.faceRegistered ? 'Ya' : 'Tidak'}`)
    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'students.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  function exportExcel() {
    const params = new URLSearchParams()
    if (filterClass) params.set('classId', filterClass)
    window.open(`/api/reports/students-excel?${params}`, '_blank')
  }

  function downloadTemplate() {
    const headers = 'nama,email,password,nis,telepon,telepon_orang_tua,kelas'
    const example = 'Ahmad Fauzi,ahmad@sekolah.id,password123,20250001,081234567890,081234567891,X MIPA 1'
    const csv = [headers, example].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'template_import_siswa.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImportCSV(file: File) {
    setImporting(true)
    setImportResult(null)
    
    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        toast({ title: 'Error', description: 'File CSV kosong atau tidak valid', variant: 'destructive' })
        setImporting(false)
        return
      }

      const dataLines = lines.slice(1)
      let success = 0
      let failed = 0
      const errors: string[] = []

      for (let i = 0; i < dataLines.length; i++) {
        const cols = dataLines[i].split(',').map(c => c.trim())
        const [name, email, password, nis, phone, parentPhone, className] = cols

        if (!name || !email || !password || !nis || !className) {
          failed++
          errors.push(`Baris ${i + 2}: Data tidak lengkap`)
          continue
        }

        const classObj = classes.find(c => c.name === className)
        if (!classObj) {
          failed++
          errors.push(`Baris ${i + 2}: Kelas "${className}" tidak ditemukan`)
          continue
        }

        try {
          const res = await fetch('/api/students', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name, email, password, nis,
              phone: phone || '',
              parentPhone: parentPhone || '',
              classId: classObj.id,
              changedBy: currentUser?.id,
              changedByName: currentUser?.name,
            }),
          })

          if (res.ok) {
            success++
          } else {
            const errData = await res.json().catch(() => ({}))
            failed++
            errors.push(`Baris ${i + 2}: ${errData.error || 'Gagal menambahkan'}`)
          }
        } catch {
          failed++
          errors.push(`Baris ${i + 2}: Error koneksi`)
        }
      }

      setImportResult({ success, failed, errors })
      loadData()
    } catch {
      toast({ title: 'Error', description: 'Gagal membaca file CSV', variant: 'destructive' })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Manajemen Siswa</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="w-4 h-4 mr-1" />CSV</Button>
          <Button variant="outline" size="sm" onClick={exportExcel} className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"><FileSpreadsheet className="w-4 h-4 mr-1" />Excel</Button>
          
          <Dialog open={importOpen} onOpenChange={(open) => { setImportOpen(open); if (!open) setImportResult(null) }}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                <Upload className="w-4 h-4 mr-1" />Import CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Import Data Siswa dari CSV</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground space-y-2">
                  <p><strong>Format CSV yang diperlukan:</strong></p>
                  <p>nama, email, password, nis, telepon, telepon_orang_tua, kelas</p>
                  <p className="text-xs">Kolom <strong>kelas</strong> harus sesuai dengan nama kelas yang sudah ada di sistem.</p>
                </div>

                <Button variant="outline" size="sm" onClick={downloadTemplate} className="w-full">
                  <Download className="w-4 h-4 mr-2" />Download Template CSV
                </Button>

                <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}>
                  <FileUp className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">Klik untuk pilih file CSV</p>
                  <p className="text-xs text-muted-foreground mt-1">atau drag & drop file di sini</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleImportCSV(file)
                    }}
                  />
                </div>

                {importing && (
                  <div className="text-center py-4">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Mengimport data...</p>
                  </div>
                )}

                {importResult && (
                  <div className="space-y-2 p-4 rounded-lg bg-muted/50">
                    <p className="font-medium">Hasil Import:</p>
                    <p className="text-sm text-green-600">✅ Berhasil: {importResult.success} siswa</p>
                    {importResult.failed > 0 && (
                      <>
                        <p className="text-sm text-red-600">❌ Gagal: {importResult.failed} siswa</p>
                        <div className="max-h-32 overflow-y-auto text-xs text-muted-foreground space-y-1">
                          {importResult.errors.map((err, i) => (
                            <p key={i}>{err}</p>
                          ))}
                        </div>
                      </>
                    )}
                    <Button size="sm" onClick={() => { setImportOpen(false); setImportResult(null) }} className="w-full mt-2">Selesai</Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditId(null); setForm({ name: '', email: '', password: '', nis: '', phone: '', parentPhone: '', classId: '' }) } }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />Tambah Siswa</Button></DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editId ? 'Edit Siswa' : 'Tambah Siswa'}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Nama</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                {!editId && <div><Label>Password</Label><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>}
                <div><Label>NIS</Label><Input value={form.nis} onChange={e => setForm({ ...form, nis: e.target.value })} /></div>
                <div><Label>Telepon</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                <div><Label>Telepon Orang Tua</Label><Input value={form.parentPhone} onChange={e => setForm({ ...form, parentPhone: e.target.value })} /></div>
                <div><Label>Kelas</Label>
                  <select className="w-full border rounded-md p-2 bg-background" value={form.classId} onChange={e => setForm({ ...form, classId: e.target.value })}>
                    <option value="">Pilih Kelas</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <Button onClick={handleSubmit} className="w-full">{editId ? 'Simpan' : 'Tambah'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Cari nama atau NIS..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="border rounded-md p-2 bg-background" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
          <option value="">Semua Kelas</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card border-b">
                <tr>
                  <th className="text-left py-3 px-4 font-medium">NIS</th>
                  <th className="text-left py-3 px-4 font-medium">Nama</th>
                  <th className="text-left py-3 px-4 font-medium">Kelas</th>
                  <th className="text-center py-3 px-4 font-medium">Wajah</th>
                  <th className="text-center py-3 px-4 font-medium">Status</th>
                  <th className="text-center py-3 px-4 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Memuat...</td></tr>
                ) : students.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Tidak ada data siswa</td></tr>
                ) : (
                  students.map(s => (
                    <tr key={s.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 font-mono">{s.nis}</td>
                      <td className="py-3 px-4">
                        <div><span className="font-medium">{s.user.name}</span></div>
                        <div className="text-xs text-muted-foreground">{s.user.email}</div>
                      </td>
                      <td className="py-3 px-4">{s.class.name}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={s.faceRegistered ? 'default' : 'secondary'}>{s.faceRegistered ? 'Terdaftar' : 'Belum'}</Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={s.status === 'active' ? 'default' : 'destructive'}>{s.status === 'active' ? 'Aktif' : 'Nonaktif'}</Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex justify-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}