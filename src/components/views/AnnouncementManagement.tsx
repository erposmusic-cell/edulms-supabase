'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Megaphone,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  AlertTriangle,
  ArrowLeft,
  Filter,
} from 'lucide-react'

interface Announcement {
  id: string
  title: string
  content: string
  authorId: string
  classId: string | null
  priority: string
  isPublished: boolean
  createdAt: string
  updatedAt: string
  author: { id: string; name: string; role: string }
  class: { id: string; name: string } | null
}

interface ClassItem {
  id: string
  name: string
}

const priorityConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400', icon: AlertTriangle },
  high: { label: 'Tinggi', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400', icon: Megaphone },
  normal: { label: 'Normal', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400', icon: Megaphone },
}

export default function AnnouncementManagement() {
  const { currentUser } = useAppStore()
  const { toast } = useToast()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [showDialog, setShowDialog] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '',
    content: '',
    classId: 'global',
    priority: 'normal',
    isPublished: true,
  })

  const isAdminOrTeacher = currentUser?.role === 'admin' || currentUser?.role === 'teacher'

  const fetchAnnouncements = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filterPriority !== 'all') params.set('priority', filterPriority)
      const res = await fetch(`/api/announcements?${params}`)
      const data = await res.json()
      if (!data.error) setAnnouncements(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [search, filterPriority])

  const fetchClasses = useCallback(async () => {
    try {
      const res = await fetch('/api/classes')
      const data = await res.json()
      if (!data.error) setClasses(data)
    } catch (e) {
      console.error(e)
    }
  }, [])

  useEffect(() => {
    fetchAnnouncements()
    fetchClasses()
  }, [fetchAnnouncements, fetchClasses])

  const handleSave = async () => {
    if (!form.title || !form.content) {
      toast({ title: 'Error', description: 'Judul dan konten wajib diisi', variant: 'destructive' })
      return
    }

    try {
      const payload = {
        title: form.title,
        content: form.content,
        authorId: currentUser?.id,
        classId: form.classId === 'global' ? null : form.classId,
        priority: form.priority,
        isPublished: form.isPublished,
      }

      if (editId) {
        const res = await fetch(`/api/announcements/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (data.error) {
          toast({ title: 'Error', description: data.error, variant: 'destructive' })
          return
        }
        toast({ title: 'Berhasil', description: 'Pengumuman berhasil diperbarui' })
      } else {
        const res = await fetch('/api/announcements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (data.error) {
          toast({ title: 'Error', description: data.error, variant: 'destructive' })
          return
        }
        toast({ title: 'Berhasil', description: 'Pengumuman berhasil dibuat' })
      }

      setShowDialog(false)
      setEditId(null)
      setForm({ title: '', content: '', classId: 'global', priority: 'normal', isPublished: true })
      fetchAnnouncements()
    } catch {
      toast({ title: 'Error', description: 'Terjadi kesalahan', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus pengumuman ini?')) return
    try {
      const res = await fetch(`/api/announcements/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
        return
      }
      toast({ title: 'Berhasil', description: 'Pengumuman berhasil dihapus' })
      fetchAnnouncements()
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus', variant: 'destructive' })
    }
  }

  const openEdit = (ann: Announcement) => {
    setForm({
      title: ann.title,
      content: ann.content,
      classId: ann.classId || 'global',
      priority: ann.priority,
      isPublished: ann.isPublished,
    })
    setEditId(ann.id)
    setShowDialog(true)
  }

  const openCreate = () => {
    setForm({ title: '', content: '', classId: 'global', priority: 'normal', isPublished: true })
    setEditId(null)
    setShowDialog(true)
  }

  // Detail view
  if (detailId) {
    const detail = announcements.find(a => a.id === detailId)
    if (!detail) return <div className="text-center py-8 text-muted-foreground">Pengumuman tidak ditemukan</div>

    const pConfig = priorityConfig[detail.priority] || priorityConfig.normal

    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setDetailId(null)} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Kembali
        </Button>
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={pConfig.color}>{pConfig.label}</Badge>
                  {detail.class ? (
                    <Badge variant="outline">{detail.class.name}</Badge>
                  ) : (
                    <Badge variant="outline" className="text-primary">Global</Badge>
                  )}
                  {!detail.isPublished && <Badge variant="secondary">Draft</Badge>}
                </div>
                <CardTitle className="text-xl">{detail.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Oleh {detail.author.name} &middot; {new Date(detail.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {isAdminOrTeacher && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(detail)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(detail.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">{detail.content}</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-primary" /> Pengumuman
          </h1>
          <p className="text-sm text-muted-foreground">Kelola dan lihat pengumuman sekolah</p>
        </div>
        {isAdminOrTeacher && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> Buat Pengumuman
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari pengumuman..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Prioritas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">Tinggi</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Announcements List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Belum ada pengumuman</p>
            <p className="text-sm text-muted-foreground">Buat pengumuman pertama untuk memulai</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="max-h-[calc(100vh-280px)]">
          <div className="space-y-3">
            {announcements.map(ann => {
              const pConfig = priorityConfig[ann.priority] || priorityConfig.normal
              const PIcon = pConfig.icon
              return (
                <Card key={ann.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setDetailId(ann.id)}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${pConfig.color}`}>
                        <PIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge variant="outline" className={`text-xs ${pConfig.color}`}>
                            {pConfig.label}
                          </Badge>
                          {ann.class ? (
                            <Badge variant="outline" className="text-xs">{ann.class.name}</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-primary">Global</Badge>
                          )}
                          {!ann.isPublished && <Badge variant="secondary" className="text-xs">Draft</Badge>}
                        </div>
                        <h3 className="font-semibold text-sm line-clamp-1">{ann.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{ann.content}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>{ann.author.name}</span>
                          <span>{new Date(ann.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={e => { e.stopPropagation(); setDetailId(ann.id) }}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        {isAdminOrTeacher && (
                          <>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={e => { e.stopPropagation(); openEdit(ann) }}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={e => { e.stopPropagation(); handleDelete(ann.id) }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </ScrollArea>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Pengumuman' : 'Buat Pengumuman Baru'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Judul</Label>
              <Input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Judul pengumuman"
              />
            </div>
            <div className="space-y-2">
              <Label>Konten</Label>
              <Textarea
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                placeholder="Isi pengumuman..."
                rows={5}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target</Label>
                <Select value={form.classId} onValueChange={v => setForm(f => ({ ...f, classId: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global (Semua)</SelectItem>
                    {classes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prioritas</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">Tinggi</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.isPublished}
                onCheckedChange={v => setForm(f => ({ ...f, isPublished: v }))}
              />
              <Label>Publikasikan</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Batal</Button>
            <Button onClick={handleSave}>{editId ? 'Simpan' : 'Buat'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
