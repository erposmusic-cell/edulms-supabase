'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Plus, Pencil, Trash2, FileText, Search, Filter, Eye, Video, Link as LinkIcon, Presentation, FolderOpen } from 'lucide-react'
import FileUpload from '@/components/ui/file-upload'
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

interface MaterialItem {
  id: string
  subjectId: string
  teacherId: string
  title: string
  description: string | null
  content: string | null
  type: string
  fileUrl: string | null
  videoUrl: string | null
  topic: string | null
  orderNum: number
  isPublished: boolean
  subject: { id: string; name: string; code: string | null }
  teacher: { id: string; name: string }
}

interface SubjectOption {
  id: string
  name: string
  code: string | null
}

interface TeacherOption {
  id: string
  userId: string
  user: { name: string }
  nip: string
}

export default function MaterialManagement() {
  const [materials, setMaterials] = useState<MaterialItem[]>([])
  const [subjects, setSubjects] = useState<SubjectOption[]>([])
  const [teachers, setTeachers] = useState<TeacherOption[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [previewItem, setPreviewItem] = useState<MaterialItem | null>(null)
  const [search, setSearch] = useState('')
  const [filterSubject, setFilterSubject] = useState('')
  const [filterType, setFilterType] = useState('')
  const [form, setForm] = useState({
    subjectId: '',
    teacherId: '',
    title: '',
    description: '',
    content: '',
    type: 'document',
    fileUrl: '',
    videoUrl: '',
    topic: '',
    orderNum: 0,
    isPublished: false,
  })
  const { toast } = useToast()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const params = new URLSearchParams()
      if (filterSubject) params.set('subjectId', filterSubject)
      if (filterType) params.set('type', filterType)

      const [matRes, subRes, teachRes] = await Promise.all([
        fetch(`/api/materials?${params.toString()}`),
        fetch('/api/subjects'),
        fetch('/api/teachers'),
      ])
      const matData = await matRes.json()
      const subData = await subRes.json()
      const teachData = await teachRes.json()
      if (Array.isArray(matData)) setMaterials(matData)
      if (Array.isArray(subData)) setSubjects(subData)
      if (Array.isArray(teachData)) setTeachers(teachData)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [filterSubject, filterType])

  const filteredMaterials = materials.filter(m => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      m.title.toLowerCase().includes(q) ||
      (m.description && m.description.toLowerCase().includes(q)) ||
      (m.topic && m.topic.toLowerCase().includes(q))
    )
  })

  // Group by subject and topic
  const grouped = filteredMaterials.reduce<Record<string, Record<string, MaterialItem[]>>>((acc, m) => {
    const subjectKey = m.subject?.name || 'Tanpa Mata Pelajaran'
    const topicKey = m.topic || 'Tanpa Topik'
    if (!acc[subjectKey]) acc[subjectKey] = {}
    if (!acc[subjectKey][topicKey]) acc[subjectKey][topicKey] = []
    acc[subjectKey][topicKey].push(m)
    return acc
  }, {})

  async function handleSubmit() {
    if (!form.subjectId || !form.title) {
      toast({ title: 'Error', description: 'Mata pelajaran dan judul wajib diisi', variant: 'destructive' })
      return
    }
    try {
      const body = { ...form, orderNum: Number(form.orderNum) }
      if (editId) {
        await fetch(`/api/materials/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        toast({ title: 'Berhasil', description: 'Materi berhasil diperbarui' })
      } else {
        await fetch('/api/materials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        toast({ title: 'Berhasil', description: 'Materi berhasil ditambahkan' })
      }
      setDialogOpen(false)
      setEditId(null)
      resetForm()
      loadData()
    } catch {
      toast({ title: 'Error', description: 'Gagal menyimpan materi', variant: 'destructive' })
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await fetch(`/api/materials/${deleteId}`, { method: 'DELETE' })
      toast({ title: 'Berhasil', description: 'Materi berhasil dihapus' })
      loadData()
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus materi', variant: 'destructive' })
    }
    setDeleteId(null)
  }

  function openEdit(item: MaterialItem) {
    setEditId(item.id)
    setForm({
      subjectId: item.subjectId,
      teacherId: item.teacherId,
      title: item.title,
      description: item.description || '',
      content: item.content || '',
      type: item.type,
      fileUrl: item.fileUrl || '',
      videoUrl: item.videoUrl || '',
      topic: item.topic || '',
      orderNum: item.orderNum,
      isPublished: item.isPublished,
    })
    setDialogOpen(true)
  }

  function openAdd() {
    setEditId(null)
    resetForm()
    setDialogOpen(true)
  }

  function resetForm() {
    setForm({
      subjectId: '',
      teacherId: '',
      title: '',
      description: '',
      content: '',
      type: 'document',
      fileUrl: '',
      videoUrl: '',
      topic: '',
      orderNum: 0,
      isPublished: false,
    })
  }

  function getTypeIcon(type: string) {
    switch (type) {
      case 'video': return <Video className="w-4 h-4" />
      case 'link': return <LinkIcon className="w-4 h-4" />
      case 'presentation': return <Presentation className="w-4 h-4" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  function getTypeBadge(type: string) {
    switch (type) {
      case 'video': return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"><Video className="w-3 h-3 mr-1" />Video</Badge>
      case 'link': return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"><LinkIcon className="w-3 h-3 mr-1" />Link</Badge>
      case 'presentation': return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"><Presentation className="w-3 h-3 mr-1" />Presentasi</Badge>
      default: return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"><FileText className="w-3 h-3 mr-1" />Dokumen</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Manajemen Materi</h1>
          <p className="text-sm text-muted-foreground">Kelola materi pembelajaran</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditId(null); resetForm() } }}>
          <DialogTrigger asChild>
            <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" />Tambah Materi</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? 'Edit Materi' : 'Tambah Materi'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Mata Pelajaran *</Label>
                <select className="w-full border rounded-md p-2 bg-background" value={form.subjectId} onChange={e => setForm({ ...form, subjectId: e.target.value })}>
                  <option value="">Pilih Mata Pelajaran</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name} {s.code ? `(${s.code})` : ''}</option>)}
                </select>
              </div>
              <div>
                <Label>Guru</Label>
                <select className="w-full border rounded-md p-2 bg-background" value={form.teacherId} onChange={e => setForm({ ...form, teacherId: e.target.value })}>
                  <option value="">Pilih Guru</option>
                  {teachers.map(t => <option key={t.id} value={t.userId}>{t.user.name} ({t.nip})</option>)}
                </select>
              </div>
              <div>
                <Label>Judul *</Label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Judul materi" />
              </div>
              <div>
                <Label>Deskripsi</Label>
                <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi singkat" />
              </div>
              <div>
                <Label>Konten</Label>
                <Textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Konten materi..." rows={4} />
              </div>
              <div>
                <Label>Tipe</Label>
                <select className="w-full border rounded-md p-2 bg-background" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option value="document">Dokumen</option>
                  <option value="video">Video</option>
                  <option value="link">Link</option>
                  <option value="presentation">Presentasi</option>
                </select>
              </div>
              <div>
                <Label>File Materi</Label>
                <FileUpload
                  onUpload={(url, name) => setForm({ ...form, fileUrl: url })}
                  currentUrl={form.fileUrl}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.mp4,.webm"
                  label="Upload Materi"
                />
              </div>
              {form.type === 'video' && (
                <div>
                  <Label>YouTube URL</Label>
                  <Input value={form.videoUrl} onChange={e => setForm({ ...form, videoUrl: e.target.value })} placeholder="https://youtube.com/watch?v=..." />
                </div>
              )}
              <div>
                <Label>Topik / Bab</Label>
                <Input value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} placeholder="Bab 1 - Pendahuluan" />
              </div>
              <div>
                <Label>Urutan</Label>
                <Input type="number" value={form.orderNum} onChange={e => setForm({ ...form, orderNum: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.isPublished} onCheckedChange={checked => setForm({ ...form, isPublished: checked })} />
                <Label>Publikasikan</Label>
              </div>
              <Button onClick={handleSubmit} className="w-full">{editId ? 'Simpan Perubahan' : 'Tambah Materi'}</Button>
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
              <Input placeholder="Cari materi..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select className="border rounded-md p-2 bg-background text-sm" value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
                <option value="">Semua Mapel</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select className="border rounded-md p-2 bg-background text-sm" value={filterType} onChange={e => setFilterType(e.target.value)}>
                <option value="">Semua Tipe</option>
                <option value="document">Dokumen</option>
                <option value="video">Video</option>
                <option value="link">Link</option>
                <option value="presentation">Presentasi</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Materials grouped by subject and topic */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent>
            </Card>
          ))}
        </div>
      ) : filteredMaterials.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FolderOpen className="w-12 h-12 text-muted-foreground mb-3" />
            <h3 className="font-semibold text-lg">Belum ada materi</h3>
            <p className="text-sm text-muted-foreground">Tambahkan materi pembelajaran pertama</p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" defaultValue={Object.keys(grouped)} className="space-y-3">
          {Object.entries(grouped).map(([subjectName, topics]) => (
            <AccordionItem key={subjectName} value={subjectName} className="border rounded-lg px-0">
              <AccordionTrigger className="px-6 hover:no-underline">
                <div className="flex items-center gap-3">
                  <BookOpenIcon className="w-5 h-5 text-primary" />
                  <span className="font-semibold">{subjectName}</span>
                  <Badge variant="secondary" className="ml-2">
                    {Object.values(topics).flat().length} materi
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                <Accordion type="multiple" defaultValue={Object.keys(topics)} className="space-y-2">
                  {Object.entries(topics).map(([topicName, items]) => (
                    <AccordionItem key={topicName} value={topicName} className="border rounded-md">
                      <AccordionTrigger className="px-4 py-2 hover:no-underline text-sm">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="w-4 h-4 text-muted-foreground" />
                          <span>{topicName}</span>
                          <Badge variant="outline" className="text-xs">{items.length}</Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-3">
                        <div className="space-y-2">
                          {items.map(item => (
                            <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                              <div className="flex items-center gap-3 min-w-0">
                                {getTypeIcon(item.type)}
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm truncate">{item.title}</span>
                                    {getTypeBadge(item.type)}
                                    {!item.isPublished && <Badge variant="destructive" className="text-xs">Draft</Badge>}
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {item.teacher?.name || '-'} · Urutan {item.orderNum}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button variant="ghost" size="icon" onClick={() => { setPreviewItem(item); setPreviewOpen(true) }}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => setDeleteId(item.id)}>
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewItem && getTypeIcon(previewItem.type)}
              {previewItem?.title || 'Preview Materi'}
            </DialogTitle>
          </DialogHeader>
          {previewItem && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {getTypeBadge(previewItem.type)}
                <Badge variant="secondary">{previewItem.subject?.name || '-'}</Badge>
                {previewItem.topic && <Badge variant="outline">{previewItem.topic}</Badge>}
                <Badge variant={previewItem.isPublished ? 'default' : 'destructive'}>
                  {previewItem.isPublished ? 'Dipublikasi' : 'Draft'}
                </Badge>
              </div>
              {previewItem.description && (
                <p className="text-sm text-muted-foreground">{previewItem.description}</p>
              )}
              {previewItem.content && (
                <div className="prose prose-sm dark:prose-invert max-w-none p-4 bg-muted rounded-lg">
                  <pre className="whitespace-pre-wrap text-sm">{previewItem.content}</pre>
                </div>
              )}
              {previewItem.videoUrl && (
                <div className="space-y-2">
                  <Label>Video URL</Label>
                  <a href={previewItem.videoUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm break-all">
                    {previewItem.videoUrl}
                  </a>
                </div>
              )}
              {previewItem.fileUrl && (
                <div className="space-y-2">
                  <Label>File URL</Label>
                  <a href={previewItem.fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm break-all">
                    {previewItem.fileUrl}
                  </a>
                </div>
              )}
              <p className="text-xs text-muted-foreground">Dibuat oleh: {previewItem.teacher?.name || '-'}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Materi</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus materi ini? Tindakan ini tidak dapat dibatalkan.
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

// Simple BookOpen icon component to avoid naming conflict
function BookOpenIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  )
}
