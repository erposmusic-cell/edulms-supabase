'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import {
  Brain, Plus, Search, Clock, Play, CheckCircle, AlertCircle, Edit, Trash2,
  Eye, Send, ChevronUp, ChevronDown, Timer, ListOrdered, HelpCircle,
  Type, ToggleLeft, ArrowUp, ArrowDown, BarChart3, Users, Star,
  BookOpen, RotateCcw, Trophy
} from 'lucide-react'

interface Subject { id: string; name: string; code?: string }
interface GradeCategory { id: string; name: string; weight: number; subjectId: string }
interface QuizQuestion {
  id: string; quizId: string; question: string; type: string;
  options: string | null; correctAnswer: string | null; points: number;
  orderNum: number; explanation?: string;
}
interface QuizAttempt {
  id: string; quizId: string; studentId: string; score?: number | null;
  status: string; startedAt: string; completedAt?: string | null;
  timeSpent?: number | null;
  answers?: QuizAnswer[];
  quiz?: { questions: QuizQuestion[]; duration?: number }
  student?: { id: string; user: { id: string; name: string } }
}
interface QuizAnswer { id: string; attemptId: string; questionId: string; answer?: string | null; isCorrect?: boolean | null; pointsEarned: number; question?: QuizQuestion }
interface Quiz {
  id: string; title: string; description?: string; subjectId: string;
  teacherId: string; duration: number; maxAttempts: number; isPublished: boolean;
  startDate?: string | null; endDate?: string | null; gradeCategoryId?: string | null;
  createdAt: string;
  subject: Subject; gradeCategory?: GradeCategory;
  questions: QuizQuestion[]; attempts: QuizAttempt[];
}

export default function QuizManagement() {
  const { currentUser } = useAppStore()
  const { toast } = useToast()
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [gradeCategories, setGradeCategories] = useState<GradeCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterSubject, setFilterSubject] = useState('all')
  const [activeTab, setActiveTab] = useState('list')

  // Teacher: Create/Edit quiz
  const [showQuizDialog, setShowQuizDialog] = useState(false)
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null)
  const [quizForm, setQuizForm] = useState({ title: '', description: '', subjectId: '', duration: 30, maxAttempts: 1, startDate: '', endDate: '', gradeCategoryId: '', isPublished: false })
  const [saving, setSaving] = useState(false)

  // Teacher: Question builder
  const [showQuestionDialog, setShowQuestionDialog] = useState(false)
  const [selectedQuizForQuestions, setSelectedQuizForQuestions] = useState<Quiz | null>(null)
  const [questionForm, setQuestionForm] = useState({ question: '', type: 'multiple_choice', options: ['', '', '', ''], correctAnswer: '', points: 1, explanation: '' })
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)

  // Teacher: View attempts
  const [showAttemptsDialog, setShowAttemptsDialog] = useState(false)
  const [selectedQuizForAttempts, setSelectedQuizForAttempts] = useState<Quiz | null>(null)

  // Student: Take quiz
  const [showTakeQuizDialog, setShowTakeQuizDialog] = useState(false)
  const [currentQuizAttempt, setCurrentQuizAttempt] = useState<QuizAttempt | null>(null)
  const [currentQuizQuestions, setCurrentQuizQuestions] = useState<QuizQuestion[]>([])
  const [currentAnswers, setCurrentAnswers] = useState<Record<string, string>>({})
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [quizStarted, setQuizStarted] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  // Refs to avoid stale closures in timer callback
  const currentAnswersRef = useRef<Record<string, string>>({})
  const currentQuizAttemptRef = useRef<QuizAttempt | null>(null)
  const timerSecondsRef = useRef(0)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [studentAttempts, setStudentAttempts] = useState<QuizAttempt[]>([])

  // Student: View results
  const [showResultsDialog, setShowResultsDialog] = useState(false)
  const [selectedResult, setSelectedResult] = useState<QuizAttempt | null>(null)

  const isTeacher = currentUser?.role === 'teacher' || currentUser?.role === 'admin'

  const loadData = useCallback(async () => {
    try {
      const subRes = await fetch('/api/subjects')
      if (subRes.ok) {
        const d = await subRes.json()
        setSubjects(Array.isArray(d) ? d : [])
      }

      const gcRes = await fetch('/api/grade-categories')
      if (gcRes.ok) {
        const d = await gcRes.json()
        setGradeCategories(Array.isArray(d) ? d : [])
      }

      if (isTeacher) {
        const res = await fetch(`/api/quizzes?teacherId=${currentUser?.id}`)
        if (res.ok) {
          const d = await res.json()
          setQuizzes(Array.isArray(d) ? d : [])
        }
      } else {
        const stuRes = await fetch(`/api/students?userId=${currentUser?.id}`)
        if (stuRes.ok) {
          const stuData = await stuRes.json()
          const me = Array.isArray(stuData) ? stuData[0] : null
          if (me) {
            setStudentId(me.id)
            const res = await fetch(`/api/quizzes?studentId=${me.id}`)
            if (res.ok) {
              const d = await res.json()
              setQuizzes(Array.isArray(d) ? d : [])
            }
            const attRes = await fetch(`/api/quiz-attempts?studentId=${me.id}`)
            if (attRes.ok) {
              const d = await attRes.json()
              setStudentAttempts(Array.isArray(d) ? d : [])
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

  // Keep refs in sync with state for timer callback
  useEffect(() => { currentAnswersRef.current = currentAnswers }, [currentAnswers])
  useEffect(() => { currentQuizAttemptRef.current = currentQuizAttempt }, [currentQuizAttempt])
  useEffect(() => { timerSecondsRef.current = timerSeconds }, [timerSeconds])

  // Timer effect for quiz taking
  useEffect(() => {
    if (quizStarted && timerSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!)
            handleAutoSubmit()
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => { if (timerRef.current) clearInterval(timerRef.current) }
    }
  }, [quizStarted])

  const handleAutoSubmit = useCallback(async () => {
    const attempt = currentQuizAttemptRef.current
    if (!attempt) return
    setQuizStarted(false)
    if (timerRef.current) clearInterval(timerRef.current)
    try {
      const answers = Object.entries(currentAnswersRef.current).map(([questionId, answer]) => ({ questionId, answer }))
      await fetch(`/api/quiz-attempts/${attempt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, status: 'timed_out', timeSpent: (attempt.quiz?.duration || 30) * 60 - timerSecondsRef.current }),
      })
      toast({ title: 'Waktu Habis', description: 'Quiz otomatis dikumpulkan', variant: 'destructive' })
      setShowTakeQuizDialog(false)
      setQuizStarted(false)
      loadData()
    } catch {
      // silent
    }
  }, [toast, loadData])

  const resetQuizForm = () => {
    setQuizForm({ title: '', description: '', subjectId: '', duration: 30, maxAttempts: 1, startDate: '', endDate: '', gradeCategoryId: '', isPublished: false })
    setEditingQuizId(null)
  }

  const openCreateQuiz = () => { resetQuizForm(); setShowQuizDialog(true) }

  const openEditQuiz = (q: Quiz) => {
    setQuizForm({
      title: q.title, description: q.description || '', subjectId: q.subjectId,
      duration: q.duration, maxAttempts: q.maxAttempts,
      startDate: q.startDate ? new Date(q.startDate).toISOString().slice(0, 16) : '',
      endDate: q.endDate ? new Date(q.endDate).toISOString().slice(0, 16) : '',
      gradeCategoryId: q.gradeCategoryId || '', isPublished: q.isPublished,
    })
    setEditingQuizId(q.id)
    setShowQuizDialog(true)
  }

  const handleSaveQuiz = async () => {
    if (!quizForm.title || !quizForm.subjectId) {
      toast({ title: 'Error', description: 'Judul dan mata pelajaran wajib diisi', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...quizForm,
        teacherId: currentUser?.id,
        startDate: quizForm.startDate || null,
        endDate: quizForm.endDate || null,
        gradeCategoryId: quizForm.gradeCategoryId || null,
      }
      const res = editingQuizId
        ? await fetch(`/api/quizzes/${editingQuizId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        : await fetch('/api/quizzes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })

      if (res.ok) {
        toast({ title: 'Berhasil', description: editingQuizId ? 'Quiz berhasil diupdate' : 'Quiz berhasil dibuat' })
        setShowQuizDialog(false)
        resetQuizForm()
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

  const handleDeleteQuiz = async (id: string) => {
    if (!confirm('Yakin ingin menghapus quiz ini? Semua soal dan hasil percobaan akan ikut terhapus.')) return
    try {
      const res = await fetch(`/api/quizzes/${id}`, { method: 'DELETE' })
      if (res.ok) { toast({ title: 'Berhasil', description: 'Quiz berhasil dihapus' }); loadData() }
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus', variant: 'destructive' })
    }
  }

  const togglePublish = async (q: Quiz) => {
    try {
      const res = await fetch(`/api/quizzes/${q.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isPublished: !q.isPublished }) })
      if (res.ok) { toast({ title: 'Berhasil', description: q.isPublished ? 'Quiz dibatalkan publikasi' : 'Quiz dipublikasi' }); loadData() }
    } catch {
      toast({ title: 'Error', description: 'Gagal mengubah status', variant: 'destructive' })
    }
  }

  // Question management
  const openQuestionBuilder = (q: Quiz) => {
    setSelectedQuizForQuestions(q)
    resetQuestionForm()
    setShowQuestionDialog(true)
  }

  const resetQuestionForm = () => {
    setQuestionForm({ question: '', type: 'multiple_choice', options: ['', '', '', ''], correctAnswer: '', points: 1, explanation: '' })
    setEditingQuestionId(null)
  }

  const openEditQuestion = (q: QuizQuestion) => {
    let parsedOptions = ['', '', '', '']
    try { if (q.options) parsedOptions = JSON.parse(q.options) } catch { /* keep default */ }
    setQuestionForm({
      question: q.question, type: q.type, options: parsedOptions,
      correctAnswer: q.correctAnswer || '', points: q.points, explanation: q.explanation || '',
    })
    setEditingQuestionId(q.id)
  }

  const handleSaveQuestion = async () => {
    if (!questionForm.question || !selectedQuizForQuestions) {
      toast({ title: 'Error', description: 'Pertanyaan wajib diisi', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...questionForm,
        options: questionForm.type === 'multiple_choice' ? questionForm.options : null,
      }
      const res = editingQuestionId
        ? await fetch(`/api/quiz-questions/${editingQuestionId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        : await fetch(`/api/quizzes/${selectedQuizForQuestions.id}/questions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })

      if (res.ok) {
        toast({ title: 'Berhasil', description: editingQuestionId ? 'Soal berhasil diupdate' : 'Soal berhasil ditambahkan' })
        resetQuestionForm()
        // Refresh quiz data
        const freshRes = await fetch(`/api/quizzes/${selectedQuizForQuestions.id}`)
        if (freshRes.ok) setSelectedQuizForQuestions(await freshRes.json())
        loadData()
      } else {
        const err = await res.json()
        toast({ title: 'Error', description: err.error || 'Gagal menyimpan soal', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Terjadi kesalahan', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteQuestion = async (qId: string) => {
    if (!confirm('Hapus soal ini?')) return
    try {
      const res = await fetch(`/api/quiz-questions/${qId}`, { method: 'DELETE' })
      if (res.ok && selectedQuizForQuestions) {
        toast({ title: 'Berhasil', description: 'Soal berhasil dihapus' })
        const freshRes = await fetch(`/api/quizzes/${selectedQuizForQuestions.id}`)
        if (freshRes.ok) setSelectedQuizForQuestions(await freshRes.json())
        loadData()
      }
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus soal', variant: 'destructive' })
    }
  }

  const handleReorderQuestion = async (q: QuizQuestion, direction: 'up' | 'down') => {
    if (!selectedQuizForQuestions) return
    const questions = [...(selectedQuizForQuestions.questions || [])].sort((a, b) => a.orderNum - b.orderNum)
    const idx = questions.findIndex(x => x.id === q.id)
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === questions.length - 1)) return

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    const tempOrder = questions[idx].orderNum
    try {
      await fetch(`/api/quiz-questions/${questions[idx].id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderNum: questions[swapIdx].orderNum }) })
      await fetch(`/api/quiz-questions/${questions[swapIdx].id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderNum: tempOrder }) })
      const freshRes = await fetch(`/api/quizzes/${selectedQuizForQuestions.id}`)
      if (freshRes.ok) setSelectedQuizForQuestions(await freshRes.json())
      loadData()
    } catch {
      toast({ title: 'Error', description: 'Gagal mengubah urutan', variant: 'destructive' })
    }
  }

  // View attempts
  const openAttempts = (q: Quiz) => {
    setSelectedQuizForAttempts(q)
    setShowAttemptsDialog(true)
  }

  // Student: Start quiz
  const startQuiz = async (q: Quiz) => {
    if (!studentId) return
    try {
      const res = await fetch('/api/quiz-attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId: q.id, studentId }),
      })
      if (res.ok) {
        const attempt = await res.json()
        setCurrentQuizAttempt(attempt)
        setCurrentQuizQuestions(attempt.quiz?.questions || q.questions || [])
        setCurrentAnswers({})
        setCurrentQuestionIndex(0)
        setTimerSeconds(q.duration * 60)
        setQuizStarted(true)
        setShowTakeQuizDialog(true)
      } else {
        const err = await res.json()
        toast({ title: 'Error', description: err.error || 'Gagal memulai quiz', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Terjadi kesalahan', variant: 'destructive' })
    }
  }

  const submitQuiz = async () => {
    if (!currentQuizAttempt) return
    if (!confirm('Yakin ingin mengumpulkan quiz?')) return
    setQuizStarted(false)
    if (timerRef.current) clearInterval(timerRef.current)
    setSaving(true)
    try {
      const answers = Object.entries(currentAnswers).map(([questionId, answer]) => ({ questionId, answer }))
      const timeSpent = (currentQuizQuestions.length > 0 ? (quizzes.find(q => q.id === currentQuizAttempt.quizId)?.duration || 30) * 60 - timerSeconds : 0)
      const res = await fetch(`/api/quiz-attempts/${currentQuizAttempt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, status: 'completed', timeSpent }),
      })
      if (res.ok) {
        const result = await res.json()
        toast({ title: 'Quiz Selesai', description: `Skor Anda: ${Math.round(result.score || 0)}` })
        setShowTakeQuizDialog(false)
        loadData()
      }
    } catch {
      toast({ title: 'Error', description: 'Gagal mengumpulkan quiz', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const viewResult = async (attempt: QuizAttempt) => {
    try {
      const res = await fetch(`/api/quiz-attempts/${attempt.id}`)
      if (res.ok) {
        const d = await res.json()
        setSelectedResult(d)
        setShowResultsDialog(true)
      }
    } catch {
      toast({ title: 'Error', description: 'Gagal memuat hasil', variant: 'destructive' })
    }
  }

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const getStatusBadge = (status: string) => {
    const map: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      in_progress: { variant: 'outline', label: 'Sedang Dikerjakan' },
      completed: { variant: 'default', label: 'Selesai' },
      timed_out: { variant: 'destructive', label: 'Waktu Habis' },
    }
    const s = map[status] || { variant: 'outline' as const, label: status }
    return <Badge variant={s.variant}>{s.label}</Badge>
  }

  const canTakeQuiz = (q: Quiz) => {
    if (!studentId) return false
    const myAttempts = studentAttempts.filter(a => a.quizId === q.id && (a.status === 'completed' || a.status === 'timed_out')).length
    if (myAttempts >= q.maxAttempts) return false
    if (q.startDate && new Date(q.startDate) > new Date()) return false
    if (q.endDate && new Date(q.endDate) < new Date()) return false
    return true
  }

  const filteredQuizzes = quizzes.filter(q => {
    if (search && !q.title.toLowerCase().includes(search.toLowerCase())) return false
    if (filterSubject !== 'all' && q.subjectId !== filterSubject) return false
    return true
  })

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Quiz & Bank Soal</h1>
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
            <Brain className="w-6 h-6 text-primary" />
            Quiz & Bank Soal
          </h1>
          <p className="text-sm text-muted-foreground">
            {isTeacher ? 'Kelola quiz dan bank soal' : 'Kerjakan quiz dan lihat hasil'}
          </p>
        </div>
        {isTeacher && (
          <Button onClick={openCreateQuiz}>
            <Plus className="w-4 h-4 mr-2" />
            Buat Quiz
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari quiz..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Mata Pelajaran" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Mapel</SelectItem>
            {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {!isTeacher && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="list">Quiz Tersedia</TabsTrigger>
              <TabsTrigger value="results">Hasil Saya</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      {/* Quiz List */}
      {(isTeacher || activeTab === 'list') && (
        filteredQuizzes.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Brain className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Tidak ada quiz</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {isTeacher ? 'Buat quiz baru untuk memulai' : 'Belum ada quiz tersedia'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredQuizzes.map(q => {
              const qCount = q.questions?.length || 0
              const aCount = q.attempts?.length || 0
              const avgScore = q.attempts?.filter(a => a.status === 'completed' && a.score != null).length
                ? Math.round(q.attempts.filter(a => a.status === 'completed' && a.score != null).reduce((sum, a) => sum + (a.score || 0), 0) / q.attempts.filter(a => a.status === 'completed' && a.score != null).length)
                : null
              const myAttempts = studentAttempts.filter(a => a.quizId === q.id)
              const bestScore = myAttempts.length > 0 ? Math.max(...myAttempts.map(a => a.score || 0)) : null

              return (
                <Card key={q.id} className="transition-shadow hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base leading-tight">{q.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-xs"><BookOpen className="w-3 h-3 mr-1" />{q.subject?.name || '-'}</Badge>
                          {q.isPublished ? <Badge className="text-xs bg-emerald-500">Dipublikasi</Badge> : <Badge variant="secondary" className="text-xs">Draft</Badge>}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    {q.description && <p className="text-sm text-muted-foreground line-clamp-2">{q.description}</p>}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>{qCount} Soal</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Timer className="w-3.5 h-3.5" />
                        <span>{q.duration} min</span>
                      </div>
                      {isTeacher && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Users className="w-3.5 h-3.5" />
                          <span>{aCount} Peserta</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{q.maxAttempts}x Percobaan</span>
                      </div>
                    </div>
                    {avgScore !== null && (
                      <div className="flex items-center gap-1.5 text-sm">
                        <BarChart3 className="w-3.5 h-3.5 text-primary" />
                        <span>Rata-rata: <span className="font-bold text-primary">{avgScore}</span></span>
                      </div>
                    )}
                    {!isTeacher && bestScore !== null && (
                      <div className="flex items-center gap-1.5 text-sm">
                        <Trophy className="w-3.5 h-3.5 text-amber-500" />
                        <span>Skor terbaik: <span className="font-bold text-amber-600">{Math.round(bestScore)}</span></span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      {isTeacher ? (
                        <>
                          <Button variant="outline" size="sm" onClick={() => openQuestionBuilder(q)}>
                            <ListOrdered className="w-3.5 h-3.5 mr-1" /> Soal ({qCount})
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openAttempts(q)}>
                            <Users className="w-3.5 h-3.5 mr-1" /> Hasil ({aCount})
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openEditQuiz(q)}>
                            <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => togglePublish(q)}>
                            {q.isPublished ? <Eye className="w-3.5 h-3.5 mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                            {q.isPublished ? 'Unpublish' : 'Publish'}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteQuiz(q.id)} className="text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      ) : (
                        <>
                          {canTakeQuiz(q) && (
                            <Button size="sm" onClick={() => startQuiz(q)}>
                              <Play className="w-3.5 h-3.5 mr-1" /> Mulai Quiz
                            </Button>
                          )}
                          {myAttempts.length > 0 && (
                            <Button variant="outline" size="sm" onClick={() => viewResult(myAttempts[0])}>
                              <Eye className="w-3.5 h-3.5 mr-1" /> Lihat Hasil
                            </Button>
                          )}
                          {!canTakeQuiz(q) && myAttempts.length === 0 && (
                            <Badge variant="secondary" className="text-xs">Tidak tersedia</Badge>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )
      )}

      {/* Student: Results tab */}
      {!isTeacher && activeTab === 'results' && (
        studentAttempts.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Belum ada hasil quiz</h3>
              <p className="text-sm text-muted-foreground mt-1">Kerjakan quiz untuk melihat hasil</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {studentAttempts.map(a => (
              <Card key={a.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{quizzes.find(q => q.id === a.quizId)?.title || 'Quiz'}</span>
                        {getStatusBadge(a.status)}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>Dimulai: {new Date(a.startedAt).toLocaleString('id-ID')}</span>
                        {a.timeSpent && <span>Waktu: {Math.floor(a.timeSpent / 60)}:{(a.timeSpent % 60).toString().padStart(2, '0')}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {a.score != null && (
                        <div className="text-center">
                          <p className="text-2xl font-bold text-primary">{Math.round(a.score)}</p>
                          <p className="text-xs text-muted-foreground">Skor</p>
                        </div>
                      )}
                      <Button variant="outline" size="sm" onClick={() => viewResult(a)}>
                        <Eye className="w-3.5 h-3.5 mr-1" /> Detail
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      {/* Create/Edit Quiz Dialog */}
      <Dialog open={showQuizDialog} onOpenChange={setShowQuizDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingQuizId ? 'Edit Quiz' : 'Buat Quiz Baru'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Judul Quiz *</Label>
              <Input value={quizForm.title} onChange={e => setQuizForm({ ...quizForm, title: e.target.value })} placeholder="Masukkan judul quiz" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mata Pelajaran *</Label>
                <Select value={quizForm.subjectId} onValueChange={v => setQuizForm({ ...quizForm, subjectId: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih Mapel" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Kategori Nilai</Label>
                <Select value={quizForm.gradeCategoryId} onValueChange={v => setQuizForm({ ...quizForm, gradeCategoryId: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih Kategori" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tanpa Kategori</SelectItem>
                    {gradeCategories.filter(gc => !quizForm.subjectId || gc.subjectId === quizForm.subjectId).map(gc => (
                      <SelectItem key={gc.id} value={gc.id}>{gc.name} ({gc.weight}%)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <Textarea value={quizForm.description} onChange={e => setQuizForm({ ...quizForm, description: e.target.value })} placeholder="Deskripsi quiz..." rows={2} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Durasi (menit)</Label>
                <Input type="number" value={quizForm.duration} onChange={e => setQuizForm({ ...quizForm, duration: Number(e.target.value) })} min={1} />
              </div>
              <div className="space-y-2">
                <Label>Maks. Percobaan</Label>
                <Input type="number" value={quizForm.maxAttempts} onChange={e => setQuizForm({ ...quizForm, maxAttempts: Number(e.target.value) })} min={1} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tanggal Mulai</Label>
                <Input type="datetime-local" value={quizForm.startDate} onChange={e => setQuizForm({ ...quizForm, startDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Tanggal Selesai</Label>
                <Input type="datetime-local" value={quizForm.endDate} onChange={e => setQuizForm({ ...quizForm, endDate: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={quizForm.isPublished} onCheckedChange={v => setQuizForm({ ...quizForm, isPublished: v })} />
              <Label>Publikasikan</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuizDialog(false)}>Batal</Button>
            <Button onClick={handleSaveQuiz} disabled={saving}>{saving ? 'Menyimpan...' : editingQuizId ? 'Update' : 'Buat'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question Builder Dialog */}
      <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bank Soal - {selectedQuizForQuestions?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Add/Edit Question Form */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{editingQuestionId ? 'Edit Soal' : 'Tambah Soal Baru'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Pertanyaan *</Label>
                  <Textarea value={questionForm.question} onChange={e => setQuestionForm({ ...questionForm, question: e.target.value })} placeholder="Tulis pertanyaan..." rows={2} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Tipe Soal</Label>
                    <Select value={questionForm.type} onValueChange={v => setQuestionForm({ ...questionForm, type: v, correctAnswer: v === 'true_false' ? 'true' : questionForm.correctAnswer })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="multiple_choice">Pilihan Ganda</SelectItem>
                        <SelectItem value="true_false">Benar/Salah</SelectItem>
                        <SelectItem value="essay">Essay</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Poin</Label>
                    <Input type="number" value={questionForm.points} onChange={e => setQuestionForm({ ...questionForm, points: Number(e.target.value) })} min={1} />
                  </div>
                  <div className="flex items-end gap-2">
                    <Button onClick={handleSaveQuestion} disabled={saving} className="flex-1">
                      {saving ? 'Menyimpan...' : editingQuestionId ? 'Update Soal' : 'Tambah Soal'}
                    </Button>
                    {editingQuestionId && (
                      <Button variant="outline" onClick={resetQuestionForm}>Batal</Button>
                    )}
                  </div>
                </div>

                {/* Multiple choice options */}
                {questionForm.type === 'multiple_choice' && (
                  <div className="space-y-2">
                    <Label>Pilihan Jawaban</Label>
                    {questionForm.options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-sm font-medium w-6">{String.fromCharCode(65 + i)}.</span>
                        <Input value={opt} onChange={e => {
                          const newOpts = [...questionForm.options]
                          newOpts[i] = e.target.value
                          setQuestionForm({ ...questionForm, options: newOpts })
                        }} placeholder={`Pilihan ${String.fromCharCode(65 + i)}`} />
                        <input
                          type="radio"
                          name="correctAnswer"
                          checked={questionForm.correctAnswer === String.fromCharCode(65 + i)}
                          onChange={() => setQuestionForm({ ...questionForm, correctAnswer: String.fromCharCode(65 + i) })}
                          className="shrink-0"
                        />
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground">Pilih radio button di samping jawaban yang benar</p>
                  </div>
                )}

                {/* True/False */}
                {questionForm.type === 'true_false' && (
                  <div className="space-y-2">
                    <Label>Jawaban Benar</Label>
                    <RadioGroup value={questionForm.correctAnswer} onValueChange={v => setQuestionForm({ ...questionForm, correctAnswer: v })} className="flex gap-4">
                      <div className="flex items-center gap-2"><RadioGroupItem value="true" /><Label>Benar</Label></div>
                      <div className="flex items-center gap-2"><RadioGroupItem value="false" /><Label>Salah</Label></div>
                    </RadioGroup>
                  </div>
                )}

                {/* Explanation */}
                <div className="space-y-2">
                  <Label>Penjelasan (Opsional)</Label>
                  <Textarea value={questionForm.explanation} onChange={e => setQuestionForm({ ...questionForm, explanation: e.target.value })} placeholder="Penjelasan jawaban..." rows={2} />
                </div>
              </CardContent>
            </Card>

            {/* Existing Questions */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Daftar Soal ({selectedQuizForQuestions?.questions?.length || 0})</Label>
              {(!selectedQuizForQuestions?.questions || selectedQuizForQuestions.questions.length === 0) ? (
                <p className="text-sm text-muted-foreground text-center py-4">Belum ada soal</p>
              ) : (
                <ScrollArea className="max-h-64">
                  <div className="space-y-2">
                    {[...(selectedQuizForQuestions?.questions || [])]
                      .sort((a, b) => a.orderNum - b.orderNum)
                      .map((q, idx) => (
                        <div key={q.id} className="flex items-start gap-2 p-3 rounded-lg border bg-card">
                          <span className="text-sm font-medium text-muted-foreground mt-0.5">{idx + 1}.</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">{q.question}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {q.type === 'multiple_choice' ? 'Pilihan Ganda' : q.type === 'true_false' ? 'Benar/Salah' : 'Essay'}
                              </Badge>
                              <span className="text-xs text-muted-foreground">{q.points} poin</span>
                              {q.correctAnswer && <span className="text-xs text-emerald-600">Jawaban: {q.correctAnswer}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleReorderQuestion(q, 'up')}><ArrowUp className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleReorderQuestion(q, 'down')}><ArrowDown className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditQuestion(q)}><Edit className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteQuestion(q.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Attempts Dialog */}
      <Dialog open={showAttemptsDialog} onOpenChange={setShowAttemptsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Hasil Percobaan - {selectedQuizForAttempts?.title}</DialogTitle>
          </DialogHeader>
          {!selectedQuizForAttempts?.attempts?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Belum ada percobaan</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-3">
                {selectedQuizForAttempts.attempts.map(a => (
                  <Card key={a.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{a.student?.user?.name || 'Siswa'}</span>
                            {getStatusBadge(a.status)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            <span>Dimulai: {new Date(a.startedAt).toLocaleString('id-ID')}</span>
                            {a.completedAt && <span> | Selesai: {new Date(a.completedAt).toLocaleString('id-ID')}</span>}
                            {a.timeSpent != null && <span> | Waktu: {Math.floor(a.timeSpent / 60)}:{(a.timeSpent % 60).toString().padStart(2, '0')}</span>}
                          </div>
                        </div>
                        {a.score != null && (
                          <div className="text-center px-4">
                            <p className="text-2xl font-bold text-primary">{Math.round(a.score)}</p>
                            <p className="text-xs text-muted-foreground">Skor</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Take Quiz Dialog */}
      <Dialog open={showTakeQuizDialog} onOpenChange={(open) => {
        if (!open && quizStarted) {
          if (!confirm('Yakin ingin keluar? Progress tidak akan disimpan.')) return
          setQuizStarted(false)
          if (timerRef.current) clearInterval(timerRef.current)
        }
        setShowTakeQuizDialog(open)
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{quizzes.find(q => q.id === currentQuizAttempt?.quizId)?.title || 'Quiz'}</DialogTitle>
              {quizStarted && (
                <Badge variant={timerSeconds < 60 ? 'destructive' : 'outline'} className="text-lg font-mono px-3 py-1">
                  <Timer className="w-4 h-4 mr-1" />
                  {formatTimer(timerSeconds)}
                </Badge>
              )}
            </div>
          </DialogHeader>
          {quizStarted && currentQuizQuestions.length > 0 && (
            <div className="space-y-4">
              {/* Progress */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Pertanyaan {currentQuestionIndex + 1} dari {currentQuizQuestions.length}
                </span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${((currentQuestionIndex + 1) / currentQuizQuestions.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Current Question */}
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {currentQuizQuestions[currentQuestionIndex].type === 'multiple_choice' ? 'Pilihan Ganda' :
                       currentQuizQuestions[currentQuestionIndex].type === 'true_false' ? 'Benar/Salah' : 'Essay'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{currentQuizQuestions[currentQuestionIndex].points} poin</span>
                  </div>
                  <p className="text-lg font-medium">{currentQuizQuestions[currentQuestionIndex].question}</p>

                  {currentQuizQuestions[currentQuestionIndex].type === 'multiple_choice' && (() => {
                    let opts: string[] = []
                    try { opts = JSON.parse(currentQuizQuestions[currentQuestionIndex].options || '[]') } catch { /* empty */ }
                    return (
                      <RadioGroup
                        value={currentAnswers[currentQuizQuestions[currentQuestionIndex].id] || ''}
                        onValueChange={v => setCurrentAnswers({ ...currentAnswers, [currentQuizQuestions[currentQuestionIndex].id]: v })}
                        className="space-y-2"
                      >
                        {opts.map((opt, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent cursor-pointer"
                            onClick={() => setCurrentAnswers({ ...currentAnswers, [currentQuizQuestions[currentQuestionIndex].id]: String.fromCharCode(65 + i) })}>
                            <RadioGroupItem value={String.fromCharCode(65 + i)} />
                            <span className="text-sm"><strong>{String.fromCharCode(65 + i)}.</strong> {opt}</span>
                          </div>
                        ))}
                      </RadioGroup>
                    )
                  })()}

                  {currentQuizQuestions[currentQuestionIndex].type === 'true_false' && (
                    <RadioGroup
                      value={currentAnswers[currentQuizQuestions[currentQuestionIndex].id] || ''}
                      onValueChange={v => setCurrentAnswers({ ...currentAnswers, [currentQuizQuestions[currentQuestionIndex].id]: v })}
                      className="space-y-2"
                    >
                      <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent cursor-pointer"
                        onClick={() => setCurrentAnswers({ ...currentAnswers, [currentQuizQuestions[currentQuestionIndex].id]: 'true' })}>
                        <RadioGroupItem value="true" />
                        <span className="text-sm font-medium">Benar</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent cursor-pointer"
                        onClick={() => setCurrentAnswers({ ...currentAnswers, [currentQuizQuestions[currentQuestionIndex].id]: 'false' })}>
                        <RadioGroupItem value="false" />
                        <span className="text-sm font-medium">Salah</span>
                      </div>
                    </RadioGroup>
                  )}

                  {currentQuizQuestions[currentQuestionIndex].type === 'essay' && (
                    <Textarea
                      value={currentAnswers[currentQuizQuestions[currentQuestionIndex].id] || ''}
                      onChange={e => setCurrentAnswers({ ...currentAnswers, [currentQuizQuestions[currentQuestionIndex].id]: e.target.value })}
                      placeholder="Tulis jawaban Anda..."
                      rows={4}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))} disabled={currentQuestionIndex === 0}>
                  Sebelumnya
                </Button>
                <div className="flex gap-1">
                  {currentQuizQuestions.map((_, i) => (
                    <button
                      key={i}
                      className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                        i === currentQuestionIndex ? 'bg-primary text-primary-foreground' :
                        currentAnswers[currentQuizQuestions[i].id] ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        'bg-muted text-muted-foreground'
                      }`}
                      onClick={() => setCurrentQuestionIndex(i)}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                {currentQuestionIndex < currentQuizQuestions.length - 1 ? (
                  <Button onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}>
                    Selanjutnya
                  </Button>
                ) : (
                  <Button onClick={submitQuiz} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                    {saving ? 'Menyimpan...' : 'Kumpulkan'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Results Dialog */}
      <Dialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Hasil Quiz</DialogTitle>
          </DialogHeader>
          {selectedResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <p className="text-4xl font-bold text-primary">{Math.round(selectedResult.score || 0)}</p>
                  <p className="text-sm text-muted-foreground">Skor Akhir</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-semibold">{getStatusBadge(selectedResult.status)}</p>
                  <p className="text-xs text-muted-foreground">Status</p>
                </div>
                <div>
                  <p className="text-lg font-semibold">{selectedResult.timeSpent ? `${Math.floor(selectedResult.timeSpent / 60)}:${(selectedResult.timeSpent % 60).toString().padStart(2, '0')}` : '-'}</p>
                  <p className="text-xs text-muted-foreground">Waktu</p>
                </div>
                <div>
                  <p className="text-lg font-semibold">{selectedResult.answers?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Dijawab</p>
                </div>
              </div>
              <Separator />
              <ScrollArea className="max-h-64">
                <div className="space-y-3">
                  {selectedResult.answers?.map((a, i) => (
                    <div key={a.id} className={`p-3 rounded-lg border ${a.isCorrect ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20' : a.isCorrect === false ? 'border-red-200 bg-red-50 dark:bg-red-950/20' : 'border-border'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{i + 1}. {a.question?.question || 'Soal'}</p>
                        <Badge variant={a.isCorrect ? 'default' : a.isCorrect === false ? 'destructive' : 'secondary'} className="text-xs">
                          {a.isCorrect ? 'Benar' : a.isCorrect === false ? 'Salah' : 'Belum Dinilai'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Jawaban Anda: {a.answer || '(tidak dijawab)'}
                      </p>
                      {a.question?.correctAnswer && a.isCorrect === false && (
                        <p className="text-sm text-emerald-600 mt-1">
                          Jawaban benar: {a.question.correctAnswer}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">Poin: {a.pointsEarned}/{a.question?.points || 0}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
