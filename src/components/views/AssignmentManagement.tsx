'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import {
  PenTool, Plus, Search, FileText, Calendar, Clock, Users, CheckCircle,
  AlertCircle, Edit, Trash2, Eye, Send, ChevronDown, ChevronUp, Star,
  Filter, BookOpen, MessageSquare, Upload
} from 'lucide-react'
import FileUpload from '@/components/ui/file-upload'

interface Subject { id: string; name: string; code?: string }
interface GradeCategory { id: string; name: string; weight: number; subjectId: string }
interface Assignment {
  id: string; title: string; description?: string; instructions?: string; dueDate: string;
  allowLateSubmit: boolean; maxScore: number; isPublished: boolean; subjectId: string;
  teacherId: string; gradeCategoryId?: string; attachmentUrl?: string; createdAt: string;
  subject: Subject; gradeCategory?: GradeCategory;
  submissions: Submission[];
  _count?: { submissions: number }
}
interface Submission {
  id: string; assignmentId: string; studentId: string; fileUrl?: string;
  textContent?: string; submittedAt?: string; status: string; score?: number;
  feedback?: string; gradedAt?: string;
  student: { id: string; user: { id: string; name: string } }
  assignment?: Assignment
}

export default function AssignmentManagement() {
  const { currentUser } = useAppStore()
  const { toast } = useToast()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [gradeCategories, setGradeCategories] = useState<GradeCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterSubject, setFilterSubject] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showSubmissionsDialog, setShowSubmissionsDialog] = useState(false)
  const [showGradeDialog, setShowGradeDialog] = useState(false)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [studentId, setStudentId] = useState<string | null>(null)

  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formInstructions, setFormInstructions] = useState('')
  const [formSubjectId, setFormSubjectId] = useState('')
  const [formDueDate, setFormDueDate] = useState('')
  const [formMaxScore, setFormMaxScore] = useState(100)
  const [formAllowLate, setFormAllowLate] = useState(false)
  const [formGradeCategory, setFormGradeCategory] = useState('')
  const [formIsPublished, setFormIsPublished] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [gradeScore, setGradeScore] = useState('')
  const [gradeFeedback, setGradeFeedback] = useState('')
  const [submitText, setSubmitText] = useState('')
  const [submitFileUrl, setSubmitFileUrl] = useState('')
  const [formAttachmentUrl, setFormAttachmentUrl] = useState('')

  const isTeacher = currentUser?.role === 'teacher' || currentUser?.role === 'admin'

  const loadData = useCallback(async () => {
    try {
      // Load subjects
      const subRes = await fetch('/api/subjects')
      if (subRes.ok) {
        const subData = await subRes.json()
        setSubjects(Array.isArray(subData) ? subData : [])
      }

      // Load grade categories
      const gcRes = await fetch('/api/grade-categories')
      if (gcRes.ok) {
        const gcData = await gcRes.json()
        setGradeCategories(Array.isArray(gcData) ? gcData : [])
      }

      if (isTeacher) {
        // Admin sees all assignments, teachers see only their own
        const url = currentUser?.role === 'admin' 
          ? '/api/assignments' 
          : `/api/assignments?teacherId=${currentUser?.id}`
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          setAssignments(Array.isArray(data) ? data : [])
        }
      } else {
        // Student - get student record using userId filter
        const stuRes = await fetch(`/api/students?userId=${currentUser?.id}`)
        if (stuRes.ok) {
          const stuData = await stuRes.json()
          const me = Array.isArray(stuData) ? stuData[0] : null
          if (me) {
            setStudentId(me.id)
            const res = await fetch(`/api/assignments?studentId=${me.id}`)
            if (res.ok) {
              const data = await res.json()
              setAssignments(Array.isArray(data) ? data : [])
            }
            // Load student's submissions
            const subRes = await fetch(`/api/assignment-submissions?studentId=${me.id}`)
            if (subRes.ok) {
              const data = await subRes.json()
              setSubmissions(Array.isArray(data) ? data : [])
            }
          }
        }
      }
    } catch (error) {
      console.error('Load error:', error)
    } finally {
      setLoading(false)
    }
  }, [currentUser, isTeacher])

  useEffect(() => { loadData() }, [loadData])

  const resetForm = () => {
    setFormTitle(''); setFormDescription(''); setFormInstructions('')
    setFormSubjectId(''); setFormDueDate(''); setFormMaxScore(100)
    setFormAllowLate(false); setFormGradeCategory(''); setFormIsPublished(false)
    setFormAttachmentUrl(''); setEditingId(null)
  }

  const openCreate = () => {
    resetForm()
    setShowCreateDialog(true)
  }

  const openEdit = (a: Assignment) => {
    setFormTitle(a.title); setFormDescription(a.description || '')
    setFormInstructions(a.instructions || ''); setFormSubjectId(a.subjectId)
    setFormDueDate(new Date(a.dueDate).toISOString().slice(0, 16))
    setFormMaxScore(a.maxScore); setFormAllowLate(a.allowLateSubmit)
    setFormGradeCategory(a.gradeCategoryId || ''); setFormIsPublished(a.isPublished)
    setFormAttachmentUrl(a.attachmentUrl || ''); setEditingId(a.id)
    setShowCreateDialog(true)
  }

  const handleSave = async () => {
    if (!formTitle || !formSubjectId || !formDueDate) {
      toast({ title: 'Error', description: 'Judul, mata pelajaran, dan tenggat wajib diisi', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: formTitle, description: formDescription, instructions: formInstructions,
        subjectId: formSubjectId, teacherId: currentUser?.id, dueDate: formDueDate,
        maxScore: formMaxScore, allowLateSubmit: formAllowLate,
        attachmentUrl: formAttachmentUrl || null,
        gradeCategoryId: formGradeCategory || null, isPublished: formIsPublished,
      }
      const res = editingId
        ? await fetch(`/api/assignments/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        : await fetch('/api/assignments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })

      if (res.ok) {
        toast({ title: 'Berhasil', description: editingId ? 'Tugas berhasil diupdate' : 'Tugas berhasil dibuat' })
        setShowCreateDialog(false)
        resetForm()
        loadData()
      } else {
        const err = await res.json()
        toast({ title: 'Error', description: err.error || 'Gagal menyimpan', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Terjadi kesalahan', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus tugas ini?')) return
    try {
      const res = await fetch(`/api/assignments/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'Berhasil', description: 'Tugas berhasil dihapus' })
        loadData()
      }
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus', variant: 'destructive' })
    }
  }

  const openSubmissions = (a: Assignment) => {
    setSelectedAssignment(a)
    setShowSubmissionsDialog(true)
  }

  const openGrade = (s: Submission) => {
    setSelectedSubmission(s)
    setGradeScore(s.score !== null && s.score !== undefined ? String(s.score) : '')
    setGradeFeedback(s.feedback || '')
    setShowGradeDialog(true)
  }

  const handleGrade = async () => {
    if (!selectedSubmission) return
    setSaving(true)
    try {
      const res = await fetch(`/api/assignment-submissions/${selectedSubmission.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: gradeScore, feedback: gradeFeedback, status: 'graded' }),
      })
      if (res.ok) {
        toast({ title: 'Berhasil', description: 'Nilai berhasil disimpan' })
        setShowGradeDialog(false)
        loadData()
        if (selectedAssignment) {
          const freshRes = await fetch(`/api/assignments/${selectedAssignment.id}`)
          if (freshRes.ok) setSelectedAssignment(await freshRes.json())
        }
      }
    } catch {
      toast({ title: 'Error', description: 'Gagal menyimpan nilai', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleBulkGrade = async (assignmentId: string) => {
    const a = assignments.find(x => x.id === assignmentId)
    if (!a) return
    const pending = a.submissions.filter(s => s.status === 'submitted')
    if (pending.length === 0) {
      toast({ title: 'Info', description: 'Tidak ada tugas yang perlu dinilai' })
      return
    }
    if (!confirm(`Berikan nilai otomatis ${a.maxScore} untuk ${pending.length} tugas?`)) return
    try {
      for (const s of pending) {
        await fetch(`/api/assignment-submissions/${s.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ score: a.maxScore, feedback: 'Dinilai otomatis - lengkap', status: 'graded' }),
        })
      }
      toast({ title: 'Berhasil', description: `${pending.length} tugas berhasil dinilai` })
      loadData()
    } catch {
      toast({ title: 'Error', description: 'Gagal menilai otomatis', variant: 'destructive' })
    }
  }

  const openSubmit = (a: Assignment) => {
    setSelectedAssignment(a)
    const existing = submissions.find(s => s.assignmentId === a.id)
    setSubmitText(existing?.textContent || '')
    setSubmitFileUrl(existing?.fileUrl || '')
    setShowSubmitDialog(true)
  }

  const handleSubmit = async () => {
    if (!selectedAssignment || !studentId) return
    setSaving(true)
    try {
      const res = await fetch('/api/assignment-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: selectedAssignment.id,
          studentId,
          textContent: submitText,
          fileUrl: submitFileUrl || null,
        }),
      })
      if (res.ok) {
        toast({ title: 'Berhasil', description: 'Tugas berhasil dikumpulkan' })
        setShowSubmitDialog(false)
        setSubmitText('')
        loadData()
      } else {
        const err = await res.json()
        toast({ title: 'Error', description: err.error || 'Gagal mengumpulkan', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Terjadi kesalahan', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const togglePublish = async (a: Assignment) => {
    try {
      const res = await fetch(`/api/assignments/${a.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !a.isPublished }),
      })
      if (res.ok) {
        toast({ title: 'Berhasil', description: a.isPublished ? 'Tugas dibatalkan publikasi' : 'Tugas dipublikasi' })
        loadData()
      }
    } catch {
      toast({ title: 'Error', description: 'Gagal mengubah status', variant: 'destructive' })
    }
  }

  const getStatusBadge = (status: string) => {
    const map: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      pending: { variant: 'outline', label: 'Pending' },
      submitted: { variant: 'secondary', label: 'Dikumpulkan' },
      graded: { variant: 'default', label: 'Dinilai' },
      late: { variant: 'destructive', label: 'Terlambat' },
    }
    const s = map[status] || { variant: 'outline' as const, label: status }
    return <Badge variant={s.variant}>{s.label}</Badge>
  }

  const isOverdue = (dueDate: string) => new Date(dueDate) < new Date()

  const filteredAssignments = assignments.filter(a => {
    if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false
    if (filterSubject !== 'all' && a.subjectId !== filterSubject) return false
    if (filterStatus !== 'all') {
      if (filterStatus === 'published' && !a.isPublished) return false
      if (filterStatus === 'draft' && a.isPublished) return false
      if (filterStatus === 'overdue' && !isOverdue(a.dueDate)) return false
    }
    return true
  })

  const getSubmissionForAssignment = (assignmentId: string) => {
    return submissions.find(s => s.assignmentId === assignmentId)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Manajemen Tugas</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PenTool className="w-6 h-6 text-primary" />
            Manajemen Tugas
          </h1>
          <p className="text-sm text-muted-foreground">
            {isTeacher ? 'Kelola tugas dan penilaian siswa' : 'Lihat dan kumpulkan tugas Anda'}
          </p>
        </div>
        {isTeacher && (
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Buat Tugas
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari tugas..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Mata Pelajaran" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Mapel</SelectItem>
            {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            {isTeacher && <SelectItem value="published">Dipublikasi</SelectItem>}
            {isTeacher && <SelectItem value="draft">Draft</SelectItem>}
            <SelectItem value="overdue">Melewati Tenggat</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Assignment List */}
      {filteredAssignments.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Tidak ada tugas</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {isTeacher ? 'Buat tugas baru untuk memulai' : 'Belum ada tugas yang ditugaskan'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredAssignments.map(a => {
            const subCount = a.submissions?.length || 0
            const gradedCount = a.submissions?.filter(s => s.status === 'graded').length || 0
            const overdue = isOverdue(a.dueDate)
            const mySubmission = !isTeacher ? getSubmissionForAssignment(a.id) : null

            return (
              <Card key={a.id} className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base leading-tight">{a.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          <BookOpen className="w-3 h-3 mr-1" />
                          {a.subject?.name || '-'}
                        </Badge>
                        {a.isPublished ? (
                          <Badge className="text-xs bg-emerald-500">Dipublikasi</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Draft</Badge>
                        )}
                        {overdue && a.isPublished && (
                          <Badge variant="destructive" className="text-xs">Lewat Tenggat</Badge>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}>
                      {expandedId === a.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Tenggat: {new Date(a.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Star className="w-3.5 h-3.5" />
                      <span>Max: {a.maxScore} poin</span>
                    </div>
                    {isTeacher && (
                      <>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Users className="w-3.5 h-3.5" />
                          <span>Dikumpulkan: {subCount}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Dinilai: {gradedCount}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {a.gradeCategory && (
                    <div className="text-xs text-muted-foreground">
                      Kategori: {a.gradeCategory.name} ({a.gradeCategory.weight}%)
                    </div>
                  )}

                  {expandedId === a.id && (
                    <>
                      <Separator />
                      {a.description && (
                        <div className="text-sm">
                          <p className="font-medium mb-1">Deskripsi:</p>
                          <p className="text-muted-foreground whitespace-pre-wrap">{a.description}</p>
                        </div>
                      )}
                      {a.instructions && (
                        <div className="text-sm">
                          <p className="font-medium mb-1">Instruksi:</p>
                          <p className="text-muted-foreground whitespace-pre-wrap">{a.instructions}</p>
                        </div>
                      )}
                      {a.attachmentUrl && (
                        <div className="text-sm">
                          <p className="font-medium mb-1">Lampiran:</p>
                          <a href={a.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">
                            📎 {a.attachmentUrl.split('/').pop()}
                          </a>
                        </div>
                      )}
                    </>
                  )}

                  {!isTeacher && mySubmission && (
                    <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Pengumpulan Anda</span>
                        {getStatusBadge(mySubmission.status)}
                      </div>
                      {mySubmission.score !== null && mySubmission.score !== undefined && (
                        <p className="text-sm">Nilai: <span className="font-bold text-primary">{mySubmission.score}/{a.maxScore}</span></p>
                      )}
                      {mySubmission.feedback && (
                        <p className="text-sm text-muted-foreground">Feedback: {mySubmission.feedback}</p>
                      )}
                      {mySubmission.fileUrl && (
                        <a href={mySubmission.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
                          📎 {mySubmission.fileUrl.split('/').pop()}
                        </a>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Dikumpulkan: {mySubmission.submittedAt ? new Date(mySubmission.submittedAt).toLocaleString('id-ID') : '-'}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    {isTeacher ? (
                      <>
                        <Button variant="outline" size="sm" onClick={() => openSubmissions(a)}>
                          <Users className="w-3.5 h-3.5 mr-1" />
                          Lihat Pengumpulan ({subCount})
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openEdit(a)}>
                          <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => togglePublish(a)}>
                          {a.isPublished ? <Eye className="w-3.5 h-3.5 mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                          {a.isPublished ? 'Unpublish' : 'Publish'}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleBulkGrade(a.id)} className="text-emerald-600">
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Nilai Otomatis
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(a.id)} className="text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        {!mySubmission || mySubmission.status === 'pending' ? (
                          <Button size="sm" onClick={() => openSubmit(a)} disabled={overdue && !a.allowLateSubmit}>
                            <Upload className="w-3.5 h-3.5 mr-1" /> Kumpulkan
                          </Button>
                        ) : mySubmission.status === 'submitted' ? (
                          <Button variant="outline" size="sm" onClick={() => openSubmit(a)}>
                            <Edit className="w-3.5 h-3.5 mr-1" /> Ubah Jawaban
                          </Button>
                        ) : null}
                        {mySubmission?.status === 'graded' && (
                          <Button variant="outline" size="sm" onClick={() => { setSelectedSubmission(mySubmission); setGradeScore(String(mySubmission.score ?? '')); setGradeFeedback(mySubmission.feedback || ''); }}>
                            <Eye className="w-3.5 h-3.5 mr-1" /> Lihat Nilai
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create/Edit Assignment Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Tugas' : 'Buat Tugas Baru'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Judul Tugas *</Label>
              <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Masukkan judul tugas" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mata Pelajaran *</Label>
                <Select value={formSubjectId} onValueChange={setFormSubjectId}>
                  <SelectTrigger><SelectValue placeholder="Pilih Mapel" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tenggat Waktu *</Label>
                <Input type="datetime-local" value={formDueDate} onChange={e => setFormDueDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Deskripsi tugas..." rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Instruksi</Label>
              <Textarea value={formInstructions} onChange={e => setFormInstructions(e.target.value)} placeholder="Instruksi pengerjaan..." rows={4} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Skor Maksimum</Label>
                <Input type="number" value={formMaxScore} onChange={e => setFormMaxScore(Number(e.target.value))} min={1} />
              </div>
              <div className="space-y-2">
                <Label>Kategori Nilai</Label>
                <Select value={formGradeCategory} onValueChange={setFormGradeCategory}>
                  <SelectTrigger><SelectValue placeholder="Pilih Kategori" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tanpa Kategori</SelectItem>
                    {gradeCategories.filter(gc => !formSubjectId || gc.subjectId === formSubjectId).map(gc => (
                      <SelectItem key={gc.id} value={gc.id}>{gc.name} ({gc.weight}%)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Lampiran Tugas</Label>
              <FileUpload
                onUpload={(url, name) => setFormAttachmentUrl(url)}
                currentUrl={formAttachmentUrl}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.mp4,.webm,.zip,.rar"
                label="Upload Lampiran"
              />
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={formAllowLate} onCheckedChange={setFormAllowLate} />
                <Label>Izinkan Terlambat</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={formIsPublished} onCheckedChange={setFormIsPublished} />
                <Label>Publikasikan</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Menyimpan...' : editingId ? 'Update' : 'Buat'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submissions Dialog */}
      <Dialog open={showSubmissionsDialog} onOpenChange={setShowSubmissionsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pengumpulan - {selectedAssignment?.title}</DialogTitle>
          </DialogHeader>
          {!selectedAssignment?.submissions?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Belum ada pengumpulan</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-3">
                {selectedAssignment.submissions.map(s => (
                  <Card key={s.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{s.student?.user?.name || 'Siswa'}</span>
                            {getStatusBadge(s.status)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Dikumpulkan: {s.submittedAt ? new Date(s.submittedAt).toLocaleString('id-ID') : 'Belum'}
                          </p>
                          {s.textContent && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{s.textContent}</p>
                          )}
                          {s.fileUrl && (
                            <a href={s.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
                              📎 {s.fileUrl.split('/').pop()}
                            </a>
                          )}
                          {s.score !== null && s.score !== undefined && (
                            <p className="text-sm font-medium text-primary">Nilai: {s.score}/{selectedAssignment?.maxScore}</p>
                          )}
                          {s.feedback && (
                            <p className="text-sm text-muted-foreground">Feedback: {s.feedback}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => openGrade(s)}>
                            <Star className="w-3.5 h-3.5 mr-1" /> Nilai
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Grade Dialog */}
      <Dialog open={showGradeDialog} onOpenChange={setShowGradeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nilai Tugas - {selectedSubmission?.student?.user?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedSubmission?.textContent && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Jawaban Siswa:</Label>
                <div className="bg-muted rounded-lg p-3 text-sm whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {selectedSubmission.textContent}
                </div>
              </div>
            )}
            {selectedSubmission?.fileUrl && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">File Jawaban:</Label>
                <a href={selectedSubmission.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline break-all">
                  {selectedSubmission.fileUrl.split('/').pop()}
                </a>
              </div>
            )}
            <div className="space-y-2">
              <Label>Nilai (max {selectedAssignment?.maxScore || 100})</Label>
              <Input type="number" value={gradeScore} onChange={e => setGradeScore(e.target.value)} min={0} max={selectedAssignment?.maxScore || 100} />
            </div>
            <div className="space-y-2">
              <Label>Feedback</Label>
              <Textarea value={gradeFeedback} onChange={e => setGradeFeedback(e.target.value)} placeholder="Masukkan feedback..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGradeDialog(false)}>Batal</Button>
            <Button onClick={handleGrade} disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan Nilai'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Kumpulkan Tugas - {selectedAssignment?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedAssignment?.instructions && (
              <div className="bg-muted rounded-lg p-3 text-sm">
                <p className="font-medium mb-1">Instruksi:</p>
                <p className="text-muted-foreground whitespace-pre-wrap">{selectedAssignment.instructions}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Jawaban Text</Label>
              <Textarea value={submitText} onChange={e => setSubmitText(e.target.value)} placeholder="Tulis jawaban Anda di sini..." rows={6} />
            </div>
            <div className="space-y-2">
              <Label>Upload File Jawaban</Label>
              <FileUpload
                onUpload={(url, name) => setSubmitFileUrl(url)}
                currentUrl={submitFileUrl}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.rar,.jpg,.jpeg,.png"
                label="Upload File Jawaban"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              Tenggat: {selectedAssignment?.dueDate ? new Date(selectedAssignment.dueDate).toLocaleString('id-ID') : '-'}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>Batal</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Mengumpulkan...' : 'Kumpulkan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
