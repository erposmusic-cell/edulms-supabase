'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import { authFetch, cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import {
  ShieldCheck, Plus, Search, Clock, Play, CheckCircle, AlertCircle, Edit, Trash2,
  Eye, Send, ChevronUp, ChevronDown, Timer, ListOrdered, HelpCircle,
  Type, ArrowUp, ArrowDown, BarChart3, Users, Star, BookOpen, RotateCcw,
  Trophy, Lock, Shield, Shuffle, Monitor, Keyboard, MessageSquare,
  PenTool, ListChecks, ToggleLeft, AlertTriangle, FileText, EyeOff,
  ClipboardCheck, ClipboardX, MousePointerClick, Maximize2, Copy, Clipboard,
  Download, Upload, KeyRound, UserCheck
} from 'lucide-react'

// ==================== INTERFACES ====================

interface Subject { id: string; name: string; code?: string }
interface GradeCategory { id: string; name: string; weight: number; subjectId: string }
interface QuizQuestion {
  id: string; quizId: string; question: string; type: string;
  options: string | null; correctAnswer: string | null; points: number;
  orderNum: number; explanation?: string; imageUrl?: string | null;
}
interface QuizAttempt {
  id: string; quizId: string; studentId: string; score?: number | null;
  status: string; startedAt: string; completedAt?: string | null;
  timeSpent?: number | null;
  tabSwitches?: number; copyAttempts?: number; pasteAttempts?: number;
  rightClicks?: number; fullscreenExited?: number; cheatLog?: string | null;
  answers?: QuizAnswer[];
  student?: { id: string; user: { id: string; name: string } }
}
interface QuizAnswer {
  id: string; attemptId: string; questionId: string; answer?: string | null;
  isCorrect?: boolean | null; pointsEarned: number; question?: QuizQuestion;
  feedback?: string;
}
interface Exam {
  id: string; title: string; description?: string; subjectId: string;
  teacherId: string; duration: number; maxAttempts: number; isPublished: boolean;
  startDate?: string | null; endDate?: string | null; gradeCategoryId?: string | null;
  createdAt: string;
  isExam: boolean; shuffleQuestions: boolean; shuffleOptions: boolean;
  showResult: string; showCorrectAnswers: boolean; tabSwitchLimit: number;
  passwordProtected: boolean; examPassword?: string | null;
  autoSubmitOnCheat: boolean; token?: string | null;
  subject: Subject; gradeCategory?: GradeCategory;
  questions: QuizQuestion[]; attempts: QuizAttempt[];
}

interface ExamFormState {
  title: string; description: string; subjectId: string; duration: number;
  maxAttempts: number; startDate: string; endDate: string; gradeCategoryId: string;
  isPublished: boolean;
  shuffleQuestions: boolean; shuffleOptions: boolean; tabSwitchLimit: number;
  autoSubmitOnCheat: boolean; passwordProtected: boolean; examPassword: string;
  showCorrectAnswers: boolean; showResult: string;
}

interface QuestionFormState {
  question: string; type: string;
  options: string[]; correctAnswer: string;
  points: number; explanation: string; imageUrl: string;
  // B/S specific
  bsStatements: string[]; bsAnswers: number[];
  // MCMA specific
  mcmaCorrectAnswers: string[];
}

const DEFAULT_EXAM_FORM: ExamFormState = {
  title: '', description: '', subjectId: '', duration: 60, maxAttempts: 1,
  startDate: '', endDate: '', gradeCategoryId: '', isPublished: false,
  shuffleQuestions: true, shuffleOptions: true, tabSwitchLimit: 3,
  autoSubmitOnCheat: true, passwordProtected: false, examPassword: '',
  showCorrectAnswers: false, showResult: 'after_exam',
}

const DEFAULT_QUESTION_FORM: QuestionFormState = {
  question: '', type: 'multiple_choice',
  options: ['', '', '', ''], correctAnswer: '',
  points: 1, explanation: '', imageUrl: '',
  bsStatements: ['', '', '', '', ''], bsAnswers: [0, 0, 0, 0, 0],
  mcmaCorrectAnswers: [],
}

// ==================== COMPONENT ====================

export default function ExamManagement() {
  const { currentUser } = useAppStore()
  const { toast } = useToast()

  // Core data
  const [exams, setExams] = useState<Exam[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [gradeCategories, setGradeCategories] = useState<GradeCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterSubject, setFilterSubject] = useState('all')
  const [activeTab, setActiveTab] = useState('exams')

  // Teacher: Create/Edit exam
  const [showExamDialog, setShowExamDialog] = useState(false)
  const [editingExamId, setEditingExamId] = useState<string | null>(null)
  const [examForm, setExamForm] = useState<ExamFormState>({ ...DEFAULT_EXAM_FORM })
  const [saving, setSaving] = useState(false)

  // Teacher: Question builder
  const [showQuestionDialog, setShowQuestionDialog] = useState(false)
  const [selectedExamForQuestions, setSelectedExamForQuestions] = useState<Exam | null>(null)
  const [questionForm, setQuestionForm] = useState<QuestionFormState>({ ...DEFAULT_QUESTION_FORM })
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)

  // Teacher: View attempts
  const [showAttemptsDialog, setShowAttemptsDialog] = useState(false)
  const [selectedExamForAttempts, setSelectedExamForAttempts] = useState<Exam | null>(null)

  // Teacher: Grade essays
  const [showGradeDialog, setShowGradeDialog] = useState(false)
  const [essayAttempts, setEssayAttempts] = useState<QuizAttempt[]>([])
  const [currentGradeIndex, setCurrentGradeIndex] = useState(0)
  const [gradeScore, setGradeScore] = useState<number>(0)
  const [gradeFeedback, setGradeFeedback] = useState('')

  // Student: Take exam
  const [showTakeExamDialog, setShowTakeExamDialog] = useState(false)
  const [currentExamAttempt, setCurrentExamAttempt] = useState<QuizAttempt | null>(null)
  const [currentExamQuestions, setCurrentExamQuestions] = useState<QuizQuestion[]>([])
  const [currentAnswers, setCurrentAnswers] = useState<Record<string, string>>({})
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [examStarted, setExamStarted] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  // Refs to avoid stale closures in timer/anti-cheat callbacks
  const currentAnswersRef = useRef<Record<string, string>>({})
  const currentExamAttemptRef = useRef<QuizAttempt | null>(null)
  const timerSecondsRef = useRef(0)
  const examsRef = useRef<Exam[]>([])
  const [studentId, setStudentId] = useState<string | null>(null)
  const [studentAttempts, setStudentAttempts] = useState<QuizAttempt[]>([])
  const [examPassword, setExamPassword] = useState('')
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [pendingExam, setPendingExam] = useState<Exam | null>(null)

  // Anti-cheat tracking for student
  const cheatDataRef = useRef({
    tabSwitches: 0, copyAttempts: 0, pasteAttempts: 0,
    rightClicks: 0, fullscreenExited: 0, cheatLog: [] as string[],
  })

  // Student: View results
  const [showResultsDialog, setShowResultsDialog] = useState(false)
  const [selectedResult, setSelectedResult] = useState<QuizAttempt | null>(null)

  // Feature: DOCX import
  const [importingDocx, setImportingDocx] = useState(false)
  const docxFileRef = useRef<HTMLInputElement | null>(null)

  // Feature: Re-admit confirmation
  const [showReadmitDialog, setShowReadmitDialog] = useState(false)
  const [readmitAttemptId, setReadmitAttemptId] = useState<string | null>(null)
  const [readmitStudentName, setReadmitStudentName] = useState<string>('')

  // Feature: Exam token
  const [showTokenDialog, setShowTokenDialog] = useState(false)
  const [examToken, setExamToken] = useState('')
  const [tokenExam, setTokenExam] = useState<Exam | null>(null)

  const isTeacher = currentUser?.role === 'teacher' || currentUser?.role === 'admin'

  // ==================== DATA LOADING ====================

  const loadData = useCallback(async () => {
    try {
      const subRes = await authFetch('/api/subjects')
      if (subRes.ok) {
        const d = await subRes.json()
        setSubjects(Array.isArray(d) ? d : [])
      }

      const gcRes = await authFetch('/api/grade-categories')
      if (gcRes.ok) {
        const d = await gcRes.json()
        setGradeCategories(Array.isArray(d) ? d : [])
      }

      if (isTeacher) {
        const res = await authFetch(`/api/quizzes?teacherId=${currentUser?.id}`)
        if (res.ok) {
          const d = await res.json()
          // Filter to only show exams (isExam=true)
          const examData = Array.isArray(d) ? d.filter((q: Exam) => q.isExam) : []
          setExams(examData)
        }
      } else {
        const stuRes = await authFetch(`/api/students?userId=${currentUser?.id}`)
        if (stuRes.ok) {
          const stuData = await stuRes.json()
          const me = Array.isArray(stuData) ? stuData[0] : null
          if (me) {
            setStudentId(me.id)
            const res = await authFetch(`/api/quizzes?studentId=${me.id}`)
            if (res.ok) {
              const d = await res.json()
              const examData = Array.isArray(d) ? d.filter((q: Exam) => q.isExam) : []
              setExams(examData)
            }
            const attRes = await authFetch(`/api/quiz-attempts?studentId=${me.id}`)
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

  // ==================== TIMER ====================

  // Keep refs in sync with state for timer/cheat callbacks
  useEffect(() => { currentAnswersRef.current = currentAnswers }, [currentAnswers])
  useEffect(() => { currentExamAttemptRef.current = currentExamAttempt }, [currentExamAttempt])
  useEffect(() => { timerSecondsRef.current = timerSeconds }, [timerSeconds])
  useEffect(() => { examsRef.current = exams }, [exams])

  useEffect(() => {
    if (examStarted && timerSeconds > 0) {
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
  }, [examStarted])

  // ==================== ANTI-CHEAT EVENT LISTENERS ====================

  useEffect(() => {
    if (!examStarted) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        cheatDataRef.current.tabSwitches++
        cheatDataRef.current.cheatLog.push(`Tab switch at ${new Date().toLocaleTimeString()}`)

        const currentExam = examsRef.current.find(e => e.id === currentExamAttemptRef.current?.quizId)
        if (currentExam?.autoSubmitOnCheat && cheatDataRef.current.tabSwitches >= currentExam.tabSwitchLimit) {
          handleCheatDetected()
        }
      }
    }

    const handleCopy = (e: Event) => {
      e.preventDefault()
      cheatDataRef.current.copyAttempts++
      cheatDataRef.current.cheatLog.push(`Copy attempt at ${new Date().toLocaleTimeString()}`)
      toast({ title: 'Dilarang Menyalin', description: 'Menyalin teks tidak diizinkan selama ujian', variant: 'destructive' })
    }

    const handlePaste = (e: Event) => {
      e.preventDefault()
      cheatDataRef.current.pasteAttempts++
      cheatDataRef.current.cheatLog.push(`Paste attempt at ${new Date().toLocaleTimeString()}`)
      toast({ title: 'Dilarang Menempel', description: 'Menempel teks tidak diizinkan selama ujian', variant: 'destructive' })
    }

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      cheatDataRef.current.rightClicks++
      cheatDataRef.current.cheatLog.push(`Right-click at ${new Date().toLocaleTimeString()}`)
    }

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && examStarted) {
        cheatDataRef.current.fullscreenExited++
        cheatDataRef.current.cheatLog.push(`Exited fullscreen at ${new Date().toLocaleTimeString()}`)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    document.addEventListener('copy', handleCopy)
    document.addEventListener('paste', handlePaste)
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.removeEventListener('copy', handleCopy)
      document.removeEventListener('paste', handlePaste)
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [examStarted])

  // ==================== EXAM CRUD ====================

  const resetExamForm = () => {
    setExamForm({ ...DEFAULT_EXAM_FORM })
    setEditingExamId(null)
  }

  const openCreateExam = () => { resetExamForm(); setShowExamDialog(true) }

  const openEditExam = (e: Exam) => {
    setExamForm({
      title: e.title, description: e.description || '', subjectId: e.subjectId,
      duration: e.duration, maxAttempts: e.maxAttempts,
      startDate: e.startDate ? new Date(e.startDate).toISOString().slice(0, 16) : '',
      endDate: e.endDate ? new Date(e.endDate).toISOString().slice(0, 16) : '',
      gradeCategoryId: e.gradeCategoryId || '', isPublished: e.isPublished,
      shuffleQuestions: e.shuffleQuestions, shuffleOptions: e.shuffleOptions,
      tabSwitchLimit: e.tabSwitchLimit, autoSubmitOnCheat: e.autoSubmitOnCheat,
      passwordProtected: e.passwordProtected, examPassword: e.examPassword || '',
      showCorrectAnswers: e.showCorrectAnswers, showResult: e.showResult,
    })
    setEditingExamId(e.id)
    setShowExamDialog(true)
  }

  const handleSaveExam = async () => {
    if (!examForm.title || !examForm.subjectId) {
      toast({ title: 'Error', description: 'Judul dan mata pelajaran wajib diisi', variant: 'destructive' })
      return
    }
    if (examForm.passwordProtected && !examForm.examPassword) {
      toast({ title: 'Error', description: 'Password ujian wajib diisi jika diaktifkan', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...examForm,
        teacherId: currentUser?.id,
        isExam: true,
        startDate: examForm.startDate || null,
        endDate: examForm.endDate || null,
        gradeCategoryId: examForm.gradeCategoryId || null,
        examPassword: examForm.passwordProtected ? examForm.examPassword : null,
      }
      const res = editingExamId
        ? await authFetch(`/api/quizzes/${editingExamId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        : await authFetch('/api/quizzes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })

      if (res.ok) {
        toast({ title: 'Berhasil', description: editingExamId ? 'Ujian berhasil diupdate' : 'Ujian berhasil dibuat' })
        setShowExamDialog(false)
        resetExamForm()
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

  const handleDeleteExam = async (id: string) => {
    if (!confirm('Yakin ingin menghapus ujian ini? Semua soal dan hasil percobaan akan ikut terhapus.')) return
    try {
      const res = await authFetch(`/api/quizzes/${id}`, { method: 'DELETE' })
      if (res.ok) { toast({ title: 'Berhasil', description: 'Ujian berhasil dihapus' }); loadData() }
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus', variant: 'destructive' })
    }
  }

  const togglePublish = async (e: Exam) => {
    try {
      const res = await authFetch(`/api/quizzes/${e.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isPublished: !e.isPublished }) })
      if (res.ok) { toast({ title: 'Berhasil', description: e.isPublished ? 'Ujian dibatalkan publikasi' : 'Ujian dipublikasi' }); loadData() }
    } catch {
      toast({ title: 'Error', description: 'Gagal mengubah status', variant: 'destructive' })
    }
  }

  // ==================== QUESTION MANAGEMENT ====================

  const openQuestionBuilder = (e: Exam) => {
    setSelectedExamForQuestions(e)
    resetQuestionForm()
    setShowQuestionDialog(true)
  }

  const resetQuestionForm = () => {
    setQuestionForm({ ...DEFAULT_QUESTION_FORM })
    setEditingQuestionId(null)
  }

  const openEditQuestion = (q: QuizQuestion) => {
    const baseForm: QuestionFormState = {
      question: q.question, type: q.type, options: ['', '', '', ''],
      correctAnswer: q.correctAnswer || '', points: q.points,
      explanation: q.explanation || '', imageUrl: q.imageUrl || '',
      bsStatements: ['', '', '', '', ''], bsAnswers: [0, 0, 0, 0, 0],
      mcmaCorrectAnswers: [],
    }

    try {
      if (q.type === 'multiple_choice' && q.options) {
        baseForm.options = JSON.parse(q.options)
      } else if (q.type === 'benar_salah' && q.options) {
        const parsed = JSON.parse(q.options)
        baseForm.bsStatements = parsed.statements || ['', '', '', '', '']
        if (q.correctAnswer) {
          const answers = JSON.parse(q.correctAnswer)
          baseForm.bsAnswers = answers.answers || [0, 0, 0, 0, 0]
        }
      } else if (q.type === 'mcma' && q.options) {
        const parsed = JSON.parse(q.options)
        baseForm.options = parsed.options || ['', '', '', '']
        if (q.correctAnswer) {
          baseForm.mcmaCorrectAnswers = JSON.parse(q.correctAnswer)
        }
      }
    } catch { /* keep defaults */ }

    setQuestionForm(baseForm)
    setEditingQuestionId(q.id)
  }

  const handleSaveQuestion = async () => {
    if (!questionForm.question || !selectedExamForQuestions) {
      toast({ title: 'Error', description: 'Pertanyaan wajib diisi', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      let payload: Record<string, unknown> = {
        question: questionForm.question,
        type: questionForm.type,
        points: questionForm.points,
        explanation: questionForm.explanation || null,
        imageUrl: questionForm.imageUrl || null,
      }

      // Build options and correctAnswer based on type
      switch (questionForm.type) {
        case 'multiple_choice':
          payload.options = questionForm.options.filter(o => o.trim() !== '')
          payload.correctAnswer = questionForm.correctAnswer
          break
        case 'benar_salah':
          payload.options = JSON.stringify({ statements: questionForm.bsStatements })
          payload.correctAnswer = JSON.stringify({ answers: questionForm.bsAnswers })
          break
        case 'mcma':
          payload.options = JSON.stringify({ options: questionForm.options.filter(o => o.trim() !== '') })
          payload.correctAnswer = JSON.stringify(questionForm.mcmaCorrectAnswers)
          break
        case 'essay':
          payload.options = null
          payload.correctAnswer = null
          break
      }

      const res = editingQuestionId
        ? await authFetch(`/api/quiz-questions/${editingQuestionId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        : await authFetch(`/api/quizzes/${selectedExamForQuestions.id}/questions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })

      if (res.ok) {
        toast({ title: 'Berhasil', description: editingQuestionId ? 'Soal berhasil diupdate' : 'Soal berhasil ditambahkan' })
        resetQuestionForm()
        const freshRes = await authFetch(`/api/quizzes/${selectedExamForQuestions.id}`)
        if (freshRes.ok) setSelectedExamForQuestions(await freshRes.json())
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
      const res = await authFetch(`/api/quiz-questions/${qId}`, { method: 'DELETE' })
      if (res.ok && selectedExamForQuestions) {
        toast({ title: 'Berhasil', description: 'Soal berhasil dihapus' })
        const freshRes = await authFetch(`/api/quizzes/${selectedExamForQuestions.id}`)
        if (freshRes.ok) setSelectedExamForQuestions(await freshRes.json())
        loadData()
      }
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus soal', variant: 'destructive' })
    }
  }

  const handleReorderQuestion = async (q: QuizQuestion, direction: 'up' | 'down') => {
    if (!selectedExamForQuestions) return
    const questions = [...(selectedExamForQuestions.questions || [])].sort((a, b) => a.orderNum - b.orderNum)
    const idx = questions.findIndex(x => x.id === q.id)
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === questions.length - 1)) return

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    const tempOrder = questions[idx].orderNum
    try {
      await authFetch(`/api/quiz-questions/${questions[idx].id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderNum: questions[swapIdx].orderNum }) })
      await authFetch(`/api/quiz-questions/${questions[swapIdx].id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderNum: tempOrder }) })
      const freshRes = await authFetch(`/api/quizzes/${selectedExamForQuestions.id}`)
      if (freshRes.ok) setSelectedExamForQuestions(await freshRes.json())
      loadData()
    } catch {
      toast({ title: 'Error', description: 'Gagal mengubah urutan', variant: 'destructive' })
    }
  }

  // ==================== VIEW ATTEMPTS ====================

  const openAttempts = (e: Exam) => {
    setSelectedExamForAttempts(e)
    setShowAttemptsDialog(true)
  }

  // ==================== GRADE ESSAYS ====================

  const openGradeEssays = async (e: Exam) => {
    try {
      // Find attempts with essay questions that need grading
      const res = await authFetch(`/api/quiz-attempts?quizId=${e.id}`)
      if (res.ok) {
        const attempts: QuizAttempt[] = await res.json()
        // Filter attempts that have essay answers needing grading (isCorrect === null)
        const essayAttemptsFiltered = attempts.filter(a =>
          a.status === 'completed' && a.answers?.some(ans => ans.isCorrect === null)
        )
        if (essayAttemptsFiltered.length === 0) {
          toast({ title: 'Info', description: 'Tidak ada esai yang perlu dinilai' })
          return
        }
        setEssayAttempts(essayAttemptsFiltered)
        setCurrentGradeIndex(0)
        setGradeScore(0)
        setGradeFeedback('')
        setShowGradeDialog(true)
      }
    } catch {
      toast({ title: 'Error', description: 'Gagal memuat data penilaian', variant: 'destructive' })
    }
  }

  const handleGradeEssay = async () => {
    const attempt = essayAttempts[currentGradeIndex]
    if (!attempt) return

    const essayAnswer = attempt.answers?.find(a => a.isCorrect === null)
    if (!essayAnswer) return

    setSaving(true)
    try {
      // Update the specific answer with score and feedback
      await authFetch(`/api/quiz-attempts/${attempt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: attempt.answers?.map(a =>
            a.id === essayAnswer.id
              ? { questionId: a.questionId, answer: a.answer || '', pointsOverride: gradeScore }
              : { questionId: a.questionId, answer: a.answer || '' }
          ),
          status: 'completed',
        }),
      })

      toast({ title: 'Berhasil', description: 'Esai berhasil dinilai' })

      // Move to next or close
      if (currentGradeIndex < essayAttempts.length - 1) {
        const nextIndex = currentGradeIndex + 1
        setCurrentGradeIndex(nextIndex)
        setGradeScore(0)
        setGradeFeedback('')
        // Reload attempt data
        const freshRes = await authFetch(`/api/quiz-attempts/${essayAttempts[nextIndex].id}`)
        if (freshRes.ok) {
          const freshAttempt = await freshRes.json()
          const updated = [...essayAttempts]
          updated[nextIndex] = freshAttempt
          setEssayAttempts(updated)
        }
      } else {
        setShowGradeDialog(false)
        loadData()
      }
    } catch {
      toast({ title: 'Error', description: 'Gagal menyimpan nilai', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // ==================== STUDENT: TAKE EXAM ====================

  const requestStartExam = (e: Exam) => {
    if (e.passwordProtected) {
      setPendingExam(e)
      setExamPassword('')
      setShowPasswordDialog(true)
    } else {
      startExam(e)
    }
  }

  const startExam = async (e: Exam) => {
    if (!studentId) return
    try {
      const body: Record<string, string> = { quizId: e.id, studentId }
      if (e.passwordProtected && examPassword) {
        body.password = examPassword
      }
      // Include token if exam has one (already validated client-side)
      if (e.token && tokenExam?.id === e.id) {
        body.token = e.token
      }

      const res = await authFetch('/api/quiz-attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const attempt = await res.json()
        setCurrentExamAttempt(attempt)
        const questions = attempt.quiz?.questions || e.questions || []

        // Shuffle questions if enabled
        let sortedQuestions = [...questions].sort((a, b) => a.orderNum - b.orderNum)
        if (e.shuffleQuestions) {
          sortedQuestions = sortedQuestions.sort(() => Math.random() - 0.5)
        }

        setCurrentExamQuestions(sortedQuestions)
        setCurrentAnswers({})
        setCurrentQuestionIndex(0)
        setTimerSeconds(e.duration * 60)
        setExamStarted(true)
        setShowTakeExamDialog(true)
        setShowPasswordDialog(false)

        // Reset cheat tracking
        cheatDataRef.current = {
          tabSwitches: 0, copyAttempts: 0, pasteAttempts: 0,
          rightClicks: 0, fullscreenExited: 0, cheatLog: [],
        }

        // Try to enter fullscreen
        try {
          await document.documentElement.requestFullscreen()
        } catch { /* fullscreen not supported or blocked */ }
      } else {
        const err = await res.json()
        toast({ title: 'Error', description: err.error || 'Gagal memulai ujian', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Terjadi kesalahan', variant: 'destructive' })
    }
  }

  const handleAutoSubmit = useCallback(async () => {
    const attempt = currentExamAttemptRef.current
    if (!attempt) return
    setExamStarted(false)
    if (timerRef.current) clearInterval(timerRef.current)
    try {
      const answers = Object.entries(currentAnswersRef.current).map(([questionId, answer]) => ({ questionId, answer }))
      await authFetch(`/api/quiz-attempts/${attempt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers, status: 'timed_out',
          timeSpent: (examsRef.current.find(e => e.id === attempt.quizId)?.duration || 60) * 60 - timerSecondsRef.current,
          cheatData: cheatDataRef.current,
        }),
      })
      toast({ title: 'Waktu Habis', description: 'Ujian otomatis dikumpulkan', variant: 'destructive' })
      setShowTakeExamDialog(false)
      setExamStarted(false)
      exitFullscreen()
      loadData()
    } catch { /* silent */ }
  }, [toast, loadData])

  const handleCheatDetected = useCallback(async () => {
    const attempt = currentExamAttemptRef.current
    if (!attempt) return
    setExamStarted(false)
    if (timerRef.current) clearInterval(timerRef.current)
    try {
      const answers = Object.entries(currentAnswersRef.current).map(([questionId, answer]) => ({ questionId, answer }))
      await authFetch(`/api/quiz-attempts/${attempt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers, status: 'cheat_detected',
          timeSpent: (examsRef.current.find(e => e.id === attempt.quizId)?.duration || 60) * 60 - timerSecondsRef.current,
          cheatData: cheatDataRef.current,
        }),
      })
      toast({ title: 'Pelanggaran Terdeteksi', description: 'Ujian otomatis dikumpulkan karena terdeteksi kecurangan', variant: 'destructive' })
      setShowTakeExamDialog(false)
      exitFullscreen()
      loadData()
    } catch { /* silent */ }
  }, [toast, loadData])

  const submitExam = async () => {
    if (!currentExamAttempt) return
    if (!confirm('Yakin ingin mengumpulkan ujian? Pastikan semua jawaban sudah terisi.')) return
    setExamStarted(false)
    if (timerRef.current) clearInterval(timerRef.current)
    setSaving(true)
    try {
      const answers = Object.entries(currentAnswers).map(([questionId, answer]) => ({ questionId, answer }))
      const timeSpent = (exams.find(e => e.id === currentExamAttempt.quizId)?.duration || 60) * 60 - timerSeconds
      const res = await authFetch(`/api/quiz-attempts/${currentExamAttempt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, status: 'completed', timeSpent, cheatData: cheatDataRef.current }),
      })
      if (res.ok) {
        const result = await res.json()
        toast({ title: 'Ujian Selesai', description: `Ujian berhasil dikumpulkan${result.score != null ? `. Skor: ${Math.round(result.score)}` : ''}` })
        setShowTakeExamDialog(false)
        exitFullscreen()
        loadData()
      }
    } catch {
      toast({ title: 'Error', description: 'Gagal mengumpulkan ujian', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const exitFullscreen = () => {
    try {
      if (document.fullscreenElement) document.exitFullscreen()
    } catch { /* ignore */ }
  }

  const viewResult = async (attempt: QuizAttempt) => {
    try {
      const res = await authFetch(`/api/quiz-attempts/${attempt.id}`)
      if (res.ok) {
        const d = await res.json()
        setSelectedResult(d)
        setShowResultsDialog(true)
      }
    } catch {
      toast({ title: 'Error', description: 'Gagal memuat hasil', variant: 'destructive' })
    }
  }

  // ==================== HELPERS ====================

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
      cheat_detected: { variant: 'destructive', label: 'Pelanggaran' },
      disqualified: { variant: 'secondary', label: 'Diizinkan Ulang' },
    }
    const s = map[status] || { variant: 'outline' as const, label: status }
    return <Badge variant={s.variant}>{s.label}</Badge>
  }

  const getQuestionTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      multiple_choice: 'Pilihan Ganda',
      benar_salah: 'Benar/Salah',
      mcma: 'MCMA (Jawaban Ganda)',
      essay: 'Esai',
      true_false: 'Benar/Salah',
    }
    return map[type] || type
  }

  const canTakeExam = (e: Exam) => {
    if (!studentId) return false
    // Only count active (non-disqualified) attempts toward maxAttempts limit
    const myAttempts = studentAttempts.filter(a => a.quizId === e.id && ['completed', 'timed_out', 'cheat_detected'].includes(a.status)).length
    if (myAttempts >= e.maxAttempts) return false
    if (e.startDate && new Date(e.startDate) > new Date()) return false
    if (e.endDate && new Date(e.endDate) < new Date()) return false
    return true
  }

  const filteredExams = exams.filter(e => {
    if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false
    if (filterSubject !== 'all' && e.subjectId !== filterSubject) return false
    return true
  })

  const getExamStatusInfo = (e: Exam) => {
    const now = new Date()
    if (!e.isPublished) return { label: 'Draft', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' }
    if (e.startDate && new Date(e.startDate) > now) return { label: 'Belum Dimulai', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' }
    if (e.endDate && new Date(e.endDate) < now) return { label: 'Selesai', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
    return { label: 'Aktif', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' }
  }

  // ==================== FEATURE: DOCX TEMPLATE/IMPORT ====================

  const handleDownloadTemplate = async () => {
    try {
      const res = await authFetch('/api/exams/template')
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'template-soal-ujian.docx'
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast({ title: 'Berhasil', description: 'Template berhasil diunduh' })
      } else {
        toast({ title: 'Error', description: 'Gagal mengunduh template', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Gagal mengunduh template', variant: 'destructive' })
    }
  }

  const handleImportDocx = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedExamForQuestions) return
    if (!file.name.endsWith('.docx')) {
      toast({ title: 'Error', description: 'Hanya file DOCX yang didukung', variant: 'destructive' })
      return
    }
    setImportingDocx(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('quizId', selectedExamForQuestions.id)
      const res = await authFetch('/api/exams/import', {
        method: 'POST',
        body: formData,
      })
      if (res.ok) {
        const data = await res.json()
        toast({ title: 'Berhasil', description: data.message || `${data.imported} soal berhasil diimpor` })
        // Refresh question list
        const freshRes = await authFetch(`/api/quizzes/${selectedExamForQuestions.id}`)
        if (freshRes.ok) setSelectedExamForQuestions(await freshRes.json())
        loadData()
      } else {
        const err = await res.json()
        toast({ title: 'Error', description: err.error || 'Gagal mengimpor soal', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Gagal mengimpor file', variant: 'destructive' })
    } finally {
      setImportingDocx(false)
      // Reset file input
      if (docxFileRef.current) docxFileRef.current.value = ''
    }
  }

  // ==================== FEATURE: RE-ADMIT ====================

  const handleReadmit = async () => {
    if (!readmitAttemptId) return
    setSaving(true)
    try {
      // Use the existing quiz-attempts/[id] PUT endpoint with readmit action
      const res = await authFetch(`/api/quiz-attempts/${readmitAttemptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'readmit',
          readmitBy: currentUser?.id,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        toast({ title: 'Berhasil', description: data.message || 'Siswa berhasil diizinkan kembali mengerjakan ujian' })
        setShowReadmitDialog(false)
        setReadmitAttemptId(null)
        // Refresh data
        if (selectedExamForAttempts) {
          const freshRes = await authFetch(`/api/quizzes/${selectedExamForAttempts.id}`)
          if (freshRes.ok) setSelectedExamForAttempts(await freshRes.json())
        }
        loadData()
      } else {
        const err = await res.json()
        toast({ title: 'Error', description: err.error || 'Gagal mengizinkan kembali', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Gagal memproses', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // ==================== FEATURE: EXAM TOKEN ====================

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: 'Disalin', description: 'Token berhasil disalin ke clipboard' })
  }

  const requestStartExamWithToken = (e: Exam) => {
    // First check for token, then password
    if (e.token) {
      setTokenExam(e)
      setExamToken('')
      setShowTokenDialog(true)
      return
    }
    // No token, check password
    if (e.passwordProtected) {
      setPendingExam(e)
      setExamPassword('')
      setShowPasswordDialog(true)
    } else {
      startExam(e)
    }
  }

  const handleTokenSubmit = () => {
    if (!tokenExam) return
    if (examToken.toUpperCase() !== tokenExam.token?.toUpperCase()) {
      toast({ title: 'Token Salah', description: 'Token yang dimasukkan tidak sesuai', variant: 'destructive' })
      return
    }
    setShowTokenDialog(false)
    // Now check password
    if (tokenExam.passwordProtected) {
      setPendingExam(tokenExam)
      setExamPassword('')
      setShowPasswordDialog(true)
    } else {
      startExam(tokenExam)
    }
  }

  // ==================== LOADING STATE ====================

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-primary" />
          Ujian Anti-Cheat
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    )
  }

  // ==================== RENDER ====================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            Ujian Anti-Cheat
          </h1>
          <p className="text-sm text-muted-foreground">
            {isTeacher ? 'Kelola ujian dengan sistem anti-nyontek' : 'Kerjakan ujian dan lihat hasil'}
          </p>
        </div>
        {isTeacher && (
          <Button onClick={openCreateExam}>
            <Plus className="w-4 h-4 mr-2" />
            Buat Ujian
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari ujian..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
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
              <TabsTrigger value="exams">Ujian Tersedia</TabsTrigger>
              <TabsTrigger value="results">Hasil Saya</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      {/* ============ TEACHER: EXAM LIST ============ */}
      {isTeacher && (
        filteredExams.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <ShieldCheck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Tidak ada ujian</h3>
              <p className="text-sm text-muted-foreground mt-1">Buat ujian baru dengan fitur anti-nyontek</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredExams.map(e => {
              const qCount = e.questions?.length || 0
              const aCount = e.attempts?.length || 0
              const statusInfo = getExamStatusInfo(e)
              const essayCount = e.questions?.filter(q => q.type === 'essay').length || 0
              const pendingEssays = e.attempts?.filter(a =>
                a.status === 'completed' && a.answers?.some(ans => ans.isCorrect === null)
              ).length || 0
              const avgScore = e.attempts?.filter(a => a.status === 'completed' && a.score != null).length
                ? Math.round(e.attempts.filter(a => a.status === 'completed' && a.score != null).reduce((sum, a) => sum + (a.score || 0), 0) / e.attempts.filter(a => a.status === 'completed' && a.score != null).length)
                : null

              return (
                <Card key={e.id} className="transition-shadow hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base leading-tight">{e.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-xs"><BookOpen className="w-3 h-3 mr-1" />{e.subject?.name || '-'}</Badge>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
                          {e.passwordProtected && <Lock className="w-3.5 h-3.5 text-amber-500" />}
                        </div>
                      </div>
                      <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    {e.description && <p className="text-sm text-muted-foreground line-clamp-2">{e.description}</p>}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>{qCount} Soal</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Timer className="w-3.5 h-3.5" />
                        <span>{e.duration} min</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Users className="w-3.5 h-3.5" />
                        <span>{aCount} Peserta</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{e.maxAttempts}x</span>
                      </div>
                    </div>

                    {/* Anti-cheat info */}
                    <div className="flex flex-wrap gap-1.5">
                      {e.shuffleQuestions && <Badge variant="secondary" className="text-xs"><Shuffle className="w-3 h-3 mr-1" />Acak Soal</Badge>}
                      {e.shuffleOptions && <Badge variant="secondary" className="text-xs"><Shuffle className="w-3 h-3 mr-1" />Acak Opsi</Badge>}
                      {e.autoSubmitOnCheat && <Badge variant="secondary" className="text-xs"><Shield className="w-3 h-3 mr-1" />Auto Submit</Badge>}
                      {e.tabSwitchLimit > 0 && <Badge variant="secondary" className="text-xs"><Monitor className="w-3 h-3 mr-1" />Max {e.tabSwitchLimit} Tab</Badge>}
                    </div>

                    {/* Token display for teacher */}
                    {e.token && (
                      <div className="flex items-center gap-2 p-2 rounded-md bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                        <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Token:</span>
                        <code className="text-sm font-bold tracking-widest text-emerald-800 dark:text-emerald-300">{e.token}</code>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(e.token!)} title="Salin token">
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 px-1 text-xs text-emerald-600" onClick={async () => {
                          // Regenerate token
                          const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
                          let newToken = ''
                          for (let i = 0; i < 6; i++) newToken += chars.charAt(Math.floor(Math.random() * chars.length))
                          const res = await authFetch(`/api/quizzes/${e.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ token: newToken }),
                          })
                          if (res.ok) {
                            toast({ title: 'Token Baru', description: `Token berhasil diubah ke ${newToken}` })
                            loadData()
                          } else {
                            toast({ title: 'Error', description: 'Gagal mengubah token', variant: 'destructive' })
                          }
                        }} title="Buat token baru">
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                      </div>
                    )}

                    {avgScore !== null && (
                      <div className="flex items-center gap-1.5 text-sm">
                        <BarChart3 className="w-3.5 h-3.5 text-primary" />
                        <span>Rata-rata: <span className="font-bold text-primary">{avgScore}</span></span>
                      </div>
                    )}
                    {pendingEssays > 0 && (
                      <div className="flex items-center gap-1.5 text-sm">
                        <PenTool className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-amber-600 font-medium">{pendingEssays} esai belum dinilai</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <Button variant="outline" size="sm" onClick={() => openQuestionBuilder(e)}>
                        <ListOrdered className="w-3.5 h-3.5 mr-1" /> Soal ({qCount})
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openAttempts(e)}>
                        <Users className="w-3.5 h-3.5 mr-1" /> Hasil ({aCount})
                      </Button>
                      {essayCount > 0 && (
                        <Button variant="outline" size="sm" onClick={() => openGradeEssays(e)} className="text-amber-600 border-amber-300 hover:bg-amber-50">
                          <PenTool className="w-3.5 h-3.5 mr-1" /> Nilai Esai
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => openEditExam(e)}>
                        <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => togglePublish(e)}>
                        {e.isPublished ? <EyeOff className="w-3.5 h-3.5 mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                        {e.isPublished ? 'Unpublish' : 'Publish'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteExam(e.id)} className="text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )
      )}

      {/* ============ STUDENT: EXAM LIST ============ */}
      {!isTeacher && activeTab === 'exams' && (
        filteredExams.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <ShieldCheck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Tidak ada ujian tersedia</h3>
              <p className="text-sm text-muted-foreground mt-1">Ujian akan muncul saat guru mempublikasikannya</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredExams.map(e => {
              const qCount = e.questions?.length || 0
              const statusInfo = getExamStatusInfo(e)
              const myAttempts = studentAttempts.filter(a => a.quizId === e.id)
              const bestScore = myAttempts.length > 0 ? Math.max(...myAttempts.map(a => a.score || 0)) : null
              const canTake = canTakeExam(e)

              return (
                <Card key={e.id} className="transition-shadow hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base leading-tight">{e.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-xs"><BookOpen className="w-3 h-3 mr-1" />{e.subject?.name || '-'}</Badge>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
                          {e.passwordProtected && <Lock className="w-3.5 h-3.5 text-amber-500" />}
                        </div>
                      </div>
                      <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    {e.description && <p className="text-sm text-muted-foreground line-clamp-2">{e.description}</p>}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>{qCount} Soal</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Timer className="w-3.5 h-3.5" />
                        <span>{e.duration} menit</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{e.maxAttempts}x Percobaan</span>
                      </div>
                      {e.startDate && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{new Date(e.startDate).toLocaleDateString('id-ID')}</span>
                        </div>
                      )}
                    </div>

                    {/* Anti-cheat warnings */}
                    <div className="flex flex-wrap gap-1.5">
                      {e.autoSubmitOnCheat && (
                        <Badge variant="outline" className="text-xs border-red-300 text-red-600">
                          <AlertTriangle className="w-3 h-3 mr-1" /> Auto-submit saat curang
                        </Badge>
                      )}
                      {e.passwordProtected && (
                        <Badge variant="outline" className="text-xs border-amber-300 text-amber-600">
                          <Lock className="w-3 h-3 mr-1" /> Password Required
                        </Badge>
                      )}
                      {e.token && (
                        <Badge variant="outline" className="text-xs border-emerald-300 text-emerald-600">
                          <KeyRound className="w-3 h-3 mr-1" /> Token Required
                        </Badge>
                      )}
                    </div>

                    {bestScore !== null && (
                      <div className="flex items-center gap-1.5 text-sm">
                        <Trophy className="w-3.5 h-3.5 text-amber-500" />
                        <span>Skor terbaik: <span className="font-bold text-amber-600">{Math.round(bestScore)}</span></span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      {canTake && (
                        <Button size="sm" onClick={() => requestStartExamWithToken(e)}>
                          <Play className="w-3.5 h-3.5 mr-1" /> Mulai Ujian
                        </Button>
                      )}
                      {myAttempts.length > 0 && (
                        <Button variant="outline" size="sm" onClick={() => viewResult(myAttempts[0])}>
                          <Eye className="w-3.5 h-3.5 mr-1" /> Lihat Hasil
                        </Button>
                      )}
                      {!canTake && myAttempts.length === 0 && (
                        <Badge variant="secondary" className="text-xs">Tidak tersedia</Badge>
                      )}
                      {!canTake && myAttempts.length > 0 && (
                        <Badge variant="secondary" className="text-xs">Percobaan habis</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )
      )}

      {/* ============ STUDENT: RESULTS TAB ============ */}
      {!isTeacher && activeTab === 'results' && (
        studentAttempts.filter(a => exams.some(e => e.id === a.quizId)).length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Belum ada hasil ujian</h3>
              <p className="text-sm text-muted-foreground mt-1">Kerjakan ujian untuk melihat hasil</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {studentAttempts
              .filter(a => exams.some(e => e.id === a.quizId))
              .map(a => (
                <Card key={a.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{exams.find(e => e.id === a.quizId)?.title || 'Ujian'}</span>
                          {getStatusBadge(a.status)}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>Dimulai: {new Date(a.startedAt).toLocaleString('id-ID')}</span>
                          {a.timeSpent != null && <span>Waktu: {Math.floor(a.timeSpent / 60)}:{(a.timeSpent % 60).toString().padStart(2, '0')}</span>}
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

      {/* ============ CREATE/EDIT EXAM DIALOG ============ */}
      <Dialog open={showExamDialog} onOpenChange={setShowExamDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              {editingExamId ? 'Edit Ujian' : 'Buat Ujian Baru'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="space-y-2">
              <Label className="font-semibold">Judul Ujian *</Label>
              <Input value={examForm.title} onChange={e => setExamForm({ ...examForm, title: e.target.value })} placeholder="Masukkan judul ujian" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mata Pelajaran *</Label>
                <Select value={examForm.subjectId} onValueChange={v => setExamForm({ ...examForm, subjectId: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih Mapel" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Kategori Nilai</Label>
                <Select value={examForm.gradeCategoryId} onValueChange={v => setExamForm({ ...examForm, gradeCategoryId: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih Kategori" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tanpa Kategori</SelectItem>
                    {gradeCategories.filter(gc => !examForm.subjectId || gc.subjectId === examForm.subjectId).map(gc => (
                      <SelectItem key={gc.id} value={gc.id}>{gc.name} ({gc.weight}%)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <Textarea value={examForm.description} onChange={e => setExamForm({ ...examForm, description: e.target.value })} placeholder="Deskripsi ujian..." rows={2} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Durasi (menit)</Label>
                <Input type="number" value={examForm.duration} onChange={e => setExamForm({ ...examForm, duration: Number(e.target.value) })} min={1} />
              </div>
              <div className="space-y-2">
                <Label>Maks. Percobaan</Label>
                <Input type="number" value={examForm.maxAttempts} onChange={e => setExamForm({ ...examForm, maxAttempts: Number(e.target.value) })} min={1} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tanggal Mulai</Label>
                <Input type="datetime-local" value={examForm.startDate} onChange={e => setExamForm({ ...examForm, startDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Tanggal Selesai</Label>
                <Input type="datetime-local" value={examForm.endDate} onChange={e => setExamForm({ ...examForm, endDate: e.target.value })} />
              </div>
            </div>

            <Separator />

            {/* Anti-Cheat Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                <Label className="font-semibold text-base">Pengaturan Anti-Cheat</Label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Acak Soal</Label>
                    <p className="text-xs text-muted-foreground">Urutan soal diacak per siswa</p>
                  </div>
                  <Switch checked={examForm.shuffleQuestions} onCheckedChange={v => setExamForm({ ...examForm, shuffleQuestions: v })} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Acak Opsi</Label>
                    <p className="text-xs text-muted-foreground">Urutan jawaban diacak per siswa</p>
                  </div>
                  <Switch checked={examForm.shuffleOptions} onCheckedChange={v => setExamForm({ ...examForm, shuffleOptions: v })} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5" />
                    Batas Pindah Tab
                  </Label>
                  <Input
                    type="number"
                    value={examForm.tabSwitchLimit}
                    onChange={e => setExamForm({ ...examForm, tabSwitchLimit: Number(e.target.value) })}
                    min={0} max={20}
                  />
                  <p className="text-xs text-muted-foreground">Jumlah pindah tab sebelum auto-submit (0 = nonaktif)</p>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Auto-Submit saat Curang</Label>
                    <p className="text-xs text-muted-foreground">Kumpulkan otomatis jika melebihi batas tab</p>
                  </div>
                  <Switch checked={examForm.autoSubmitOnCheat} onCheckedChange={v => setExamForm({ ...examForm, autoSubmitOnCheat: v })} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      Password Ujian
                    </Label>
                    <p className="text-xs text-muted-foreground">Siswa harus memasukkan password untuk mulai</p>
                  </div>
                  <Switch checked={examForm.passwordProtected} onCheckedChange={v => setExamForm({ ...examForm, passwordProtected: v })} />
                </div>
                {examForm.passwordProtected && (
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input
                      type="text"
                      value={examForm.examPassword}
                      onChange={e => setExamForm({ ...examForm, examPassword: e.target.value })}
                      placeholder="Masukkan password ujian"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Tampilkan Jawaban Benar</Label>
                    <p className="text-xs text-muted-foreground">Tampilkan kunci jawaban di hasil</p>
                  </div>
                  <Switch checked={examForm.showCorrectAnswers} onCheckedChange={v => setExamForm({ ...examForm, showCorrectAnswers: v })} />
                </div>
                <div className="space-y-2">
                  <Label>Tampilkan Hasil</Label>
                  <Select value={examForm.showResult} onValueChange={v => setExamForm({ ...examForm, showResult: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="after_exam">Setelah Ujian Selesai</SelectItem>
                      <SelectItem value="after_all_done">Setelah Semua Selesai</SelectItem>
                      <SelectItem value="never">Jangan Tampilkan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex items-center gap-2">
              <Switch checked={examForm.isPublished} onCheckedChange={v => setExamForm({ ...examForm, isPublished: v })} />
              <Label>Publikasikan Ujian</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExamDialog(false)}>Batal</Button>
            <Button onClick={handleSaveExam} disabled={saving}>
              {saving ? 'Menyimpan...' : editingExamId ? 'Update' : 'Buat Ujian'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ QUESTION BUILDER DIALOG ============ */}
      <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListOrdered className="w-5 h-5 text-primary" />
              Bank Soal - {selectedExamForQuestions?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* DOCX Import/Export Buttons */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                <Download className="w-3.5 h-3.5 mr-1" /> Unduh Template DOCX
              </Button>
              <div className="relative">
                <input
                  type="file"
                  accept=".docx"
                  className="hidden"
                  ref={docxFileRef}
                  onChange={handleImportDocx}
                />
                <Button variant="outline" size="sm" onClick={() => docxFileRef.current?.click()} disabled={importingDocx}>
                  <Upload className="w-3.5 h-3.5 mr-1" /> {importingDocx ? 'Mengimpor...' : 'Impor DOCX'}
                </Button>
              </div>
            </div>

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
                    <Select value={questionForm.type} onValueChange={v => {
                      setQuestionForm({
                        ...questionForm, type: v,
                        correctAnswer: v === 'benar_salah' ? '' : questionForm.correctAnswer,
                        mcmaCorrectAnswers: [],
                        bsAnswers: [0, 0, 0, 0, 0],
                      })
                    }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="multiple_choice">Pilihan Ganda (MC)</SelectItem>
                        <SelectItem value="benar_salah">Benar/Salah (B/S)</SelectItem>
                        <SelectItem value="mcma">MCMA (Jawaban Ganda)</SelectItem>
                        <SelectItem value="essay">Esai</SelectItem>
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

                {/* Multiple Choice Options */}
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
                    <div className="flex gap-2 mt-2">
                      {questionForm.options.length < 6 && (
                        <Button variant="outline" size="sm" onClick={() => setQuestionForm({ ...questionForm, options: [...questionForm.options, ''] })}>
                          <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Opsi
                        </Button>
                      )}
                      {questionForm.options.length > 4 && (
                        <Button variant="outline" size="sm" onClick={() => setQuestionForm({ ...questionForm, options: questionForm.options.slice(0, -1) })}>
                          Hapus Opsi Terakhir
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Pilih radio button di samping jawaban yang benar</p>
                  </div>
                )}

                {/* Benar/Salah */}
                {questionForm.type === 'benar_salah' && (
                  <div className="space-y-3">
                    <Label>Pernyataan Benar/Salah</Label>
                    <p className="text-xs text-muted-foreground">Buat 5 pernyataan, lalu tentukan Benar atau Salah untuk masing-masing</p>
                    {questionForm.bsStatements.map((stmt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-sm font-medium w-6 shrink-0">{i + 1}.</span>
                        <Input
                          value={stmt}
                          onChange={e => {
                            const newStmts = [...questionForm.bsStatements]
                            newStmts[i] = e.target.value
                            setQuestionForm({ ...questionForm, bsStatements: newStmts })
                          }}
                          placeholder={`Pernyataan ${i + 1}`}
                          className="flex-1"
                        />
                        <Select
                          value={questionForm.bsAnswers[i]?.toString() || '0'}
                          onValueChange={v => {
                            const newAnswers = [...questionForm.bsAnswers]
                            newAnswers[i] = Number(v)
                            setQuestionForm({ ...questionForm, bsAnswers: newAnswers })
                          }}
                        >
                          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Benar</SelectItem>
                            <SelectItem value="0">Salah</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                )}

                {/* MCMA (Multiple Choice Multiple Answer) */}
                {questionForm.type === 'mcma' && (
                  <div className="space-y-2">
                    <Label>Pilihan Jawaban (Centang jawaban yang benar)</Label>
                    {questionForm.options.map((opt, i) => {
                      const letter = String.fromCharCode(65 + i)
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <Checkbox
                            checked={questionForm.mcmaCorrectAnswers.includes(letter)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setQuestionForm({ ...questionForm, mcmaCorrectAnswers: [...questionForm.mcmaCorrectAnswers, letter] })
                              } else {
                                setQuestionForm({ ...questionForm, mcmaCorrectAnswers: questionForm.mcmaCorrectAnswers.filter(a => a !== letter) })
                              }
                            }}
                          />
                          <span className="text-sm font-medium w-6">{letter}.</span>
                          <Input value={opt} onChange={e => {
                            const newOpts = [...questionForm.options]
                            newOpts[i] = e.target.value
                            setQuestionForm({ ...questionForm, options: newOpts })
                          }} placeholder={`Pilihan ${letter}`} />
                        </div>
                      )
                    })}
                    <div className="flex gap-2 mt-2">
                      {questionForm.options.length < 6 && (
                        <Button variant="outline" size="sm" onClick={() => setQuestionForm({ ...questionForm, options: [...questionForm.options, ''] })}>
                          <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Opsi
                        </Button>
                      )}
                      {questionForm.options.length > 4 && (
                        <Button variant="outline" size="sm" onClick={() => {
                          const lastLetter = String.fromCharCode(64 + questionForm.options.length)
                          setQuestionForm({
                            ...questionForm,
                            options: questionForm.options.slice(0, -1),
                            mcmaCorrectAnswers: questionForm.mcmaCorrectAnswers.filter(a => a !== lastLetter),
                          })
                        }}>
                          Hapus Opsi Terakhir
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Centang semua jawaban yang benar. Bisa lebih dari satu.
                      {questionForm.mcmaCorrectAnswers.length > 0 && (
                        <span className="text-primary ml-1">Jawaban benar: {questionForm.mcmaCorrectAnswers.join(', ')}</span>
                      )}
                    </p>
                  </div>
                )}

                {/* Essay */}
                {questionForm.type === 'essay' && (
                  <div className="space-y-2">
                    <Label>Panduan Jawaban (Opsional)</Label>
                    <Textarea
                      value={questionForm.explanation}
                      onChange={e => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                      placeholder="Tulis panduan jawaban yang diharapkan (hanya untuk referensi penilaian)..."
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">Esai akan dinilai secara manual oleh guru</p>
                  </div>
                )}

                {/* Explanation (for non-essay) */}
                {questionForm.type !== 'essay' && (
                  <div className="space-y-2">
                    <Label>Penjelasan (Opsional)</Label>
                    <Textarea value={questionForm.explanation} onChange={e => setQuestionForm({ ...questionForm, explanation: e.target.value })} placeholder="Penjelasan jawaban..." rows={2} />
                  </div>
                )}

                {/* Image URL */}
                <div className="space-y-2">
                  <Label>URL Gambar (Opsional)</Label>
                  <Input value={questionForm.imageUrl} onChange={e => setQuestionForm({ ...questionForm, imageUrl: e.target.value })} placeholder="https://contoh.com/gambar.png" />
                </div>
              </CardContent>
            </Card>

            {/* Existing Questions */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Daftar Soal ({selectedExamForQuestions?.questions?.length || 0})</Label>
              {(!selectedExamForQuestions?.questions || selectedExamForQuestions.questions.length === 0) ? (
                <p className="text-sm text-muted-foreground text-center py-4">Belum ada soal</p>
              ) : (
                <ScrollArea className="max-h-64">
                  <div className="space-y-2">
                    {[...(selectedExamForQuestions?.questions || [])]
                      .sort((a, b) => a.orderNum - b.orderNum)
                      .map((q, idx) => (
                        <div key={q.id} className="flex items-start gap-2 p-3 rounded-lg border bg-card">
                          <span className="text-sm font-medium text-muted-foreground mt-0.5">{idx + 1}.</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">{q.question}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant="outline" className="text-xs">{getQuestionTypeLabel(q.type)}</Badge>
                              <span className="text-xs text-muted-foreground">{q.points} poin</span>
                              {q.type === 'multiple_choice' && q.correctAnswer && (
                                <span className="text-xs text-emerald-600">Jawaban: {q.correctAnswer}</span>
                              )}
                              {q.type === 'mcma' && q.correctAnswer && (
                                <span className="text-xs text-emerald-600">Jawaban: {q.correctAnswer}</span>
                              )}
                              {q.type === 'benar_salah' && q.correctAnswer && (
                                <span className="text-xs text-emerald-600">B/S</span>
                              )}
                              {q.type === 'essay' && (
                                <span className="text-xs text-amber-600">Perlu penilaian manual</span>
                              )}
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

      {/* ============ VIEW ATTEMPTS DIALOG ============ */}
      <Dialog open={showAttemptsDialog} onOpenChange={setShowAttemptsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Hasil Percobaan - {selectedExamForAttempts?.title}
            </DialogTitle>
          </DialogHeader>
          {!selectedExamForAttempts?.attempts?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Belum ada percobaan</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-3">
                {selectedExamForAttempts.attempts.map(a => {
                  // Parse cheat log
                  let cheatLogEntries: string[] = []
                  try {
                    if (a.cheatLog) cheatLogEntries = JSON.parse(a.cheatLog)
                  } catch { /* ignore */ }

                  const hasCheatActivity = (a.tabSwitches || 0) > 0 || (a.copyAttempts || 0) > 0 || (a.pasteAttempts || 0) > 0 || (a.rightClicks || 0) > 0 || (a.fullscreenExited || 0) > 0

                  return (
                    <Card key={a.id} className={cn(hasCheatActivity && 'border-amber-300')}>
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{a.student?.user?.name || 'Siswa'}</span>
                              {getStatusBadge(a.status)}
                            </div>
                            <div className="text-xs text-muted-foreground space-y-0.5">
                              <div>Dimulai: {new Date(a.startedAt).toLocaleString('id-ID')}</div>
                              {a.completedAt && <div>Selesai: {new Date(a.completedAt).toLocaleString('id-ID')}</div>}
                              {a.timeSpent != null && <div>Waktu: {Math.floor(a.timeSpent / 60)}:{(a.timeSpent % 60).toString().padStart(2, '0')}</div>}
                            </div>

                            {/* Anti-cheat data */}
                            {hasCheatActivity && (
                              <div className="mt-2 p-2 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                                <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  Aktivitas Mencurigakan
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                                  {(a.tabSwitches || 0) > 0 && (
                                    <div className="flex items-center gap-1"><Monitor className="w-3 h-3" /> {a.tabSwitches}x pindah tab</div>
                                  )}
                                  {(a.copyAttempts || 0) > 0 && (
                                    <div className="flex items-center gap-1"><Copy className="w-3 h-3" /> {a.copyAttempts}x salin</div>
                                  )}
                                  {(a.pasteAttempts || 0) > 0 && (
                                    <div className="flex items-center gap-1"><Clipboard className="w-3 h-3" /> {a.pasteAttempts}x tempel</div>
                                  )}
                                  {(a.rightClicks || 0) > 0 && (
                                    <div className="flex items-center gap-1"><MousePointerClick className="w-3 h-3" /> {a.rightClicks}x klik kanan</div>
                                  )}
                                  {(a.fullscreenExited || 0) > 0 && (
                                    <div className="flex items-center gap-1"><Maximize2 className="w-3 h-3" /> {a.fullscreenExited}x keluar fullscreen</div>
                                  )}
                                </div>
                                {cheatLogEntries.length > 0 && (
                                  <div className="mt-1 text-xs text-amber-500 dark:text-amber-500 max-h-16 overflow-y-auto">
                                    {cheatLogEntries.map((log, i) => <div key={i}>{log}</div>)}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          {a.score != null && (
                            <div className="text-center px-4 shrink-0">
                              <p className="text-2xl font-bold text-primary">{Math.round(a.score)}</p>
                              <p className="text-xs text-muted-foreground">Skor</p>
                            </div>
                          )}
                          {/* Re-admit button for cheat_detected, timed_out, or completed attempts */}
                          {['cheat_detected', 'timed_out', 'completed'].includes(a.status) && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-emerald-600 border-emerald-300 hover:bg-emerald-50 shrink-0"
                              onClick={() => {
                                setReadmitAttemptId(a.id)
                                setReadmitStudentName(a.student?.user?.name || 'Siswa')
                                setShowReadmitDialog(true)
                              }}
                            >
                              <UserCheck className="w-3.5 h-3.5 mr-1" /> Izinkan Ulang
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* ============ GRADE ESSAYS DIALOG ============ */}
      <Dialog open={showGradeDialog} onOpenChange={setShowGradeDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenTool className="w-5 h-5 text-amber-500" />
              Penilaian Esai ({currentGradeIndex + 1}/{essayAttempts.length})
            </DialogTitle>
          </DialogHeader>
          {essayAttempts[currentGradeIndex] && (() => {
            const attempt = essayAttempts[currentGradeIndex]
            const essayAnswer = attempt.answers?.find(a => a.isCorrect === null)
            return (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium">Siswa: {attempt.student?.user?.name || 'Siswa'}</p>
                  <p className="text-xs text-muted-foreground">Dimulai: {new Date(attempt.startedAt).toLocaleString('id-ID')}</p>
                </div>

                {essayAnswer && (
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Esai</Badge>
                        <span className="text-sm text-muted-foreground">{essayAnswer.question?.points || 0} poin</span>
                      </div>
                      <div>
                        <Label className="font-medium">Pertanyaan:</Label>
                        <p className="text-sm mt-1">{essayAnswer.question?.question}</p>
                        {essayAnswer.question?.explanation && (
                          <p className="text-xs text-muted-foreground mt-1 italic">Panduan: {essayAnswer.question.explanation}</p>
                        )}
                      </div>
                      <Separator />
                      <div>
                        <Label className="font-medium">Jawaban Siswa:</Label>
                        <p className="text-sm mt-1 p-3 rounded-md bg-muted/50 whitespace-pre-wrap">
                          {essayAnswer.answer || '(Tidak dijawab)'}
                        </p>
                      </div>
                      <Separator />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Nilai (0 - {essayAnswer.question?.points || 0})</Label>
                          <Input
                            type="number"
                            value={gradeScore}
                            onChange={e => setGradeScore(Math.min(Number(e.target.value), essayAnswer.question?.points || 0))}
                            min={0}
                            max={essayAnswer.question?.points || 0}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Feedback (Opsional)</Label>
                          <Textarea value={gradeFeedback} onChange={e => setGradeFeedback(e.target.value)} placeholder="Komentar untuk siswa..." rows={2} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (currentGradeIndex > 0) {
                        setCurrentGradeIndex(currentGradeIndex - 1)
                        setGradeScore(0)
                        setGradeFeedback('')
                      }
                    }}
                    disabled={currentGradeIndex === 0}
                  >
                    Sebelumnya
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {currentGradeIndex + 1} dari {essayAttempts.length}
                  </span>
                  <Button onClick={handleGradeEssay} disabled={saving}>
                    {saving ? 'Menyimpan...' : currentGradeIndex < essayAttempts.length - 1 ? 'Simpan & Lanjut' : 'Simpan & Selesai'}
                  </Button>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* ============ RE-ADMIT CONFIRMATION DIALOG ============ */}
      <Dialog open={showReadmitDialog} onOpenChange={setShowReadmitDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-500" />
              Izinkan Siswa Mengerjakan Ulang
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="p-3 rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-1.5 text-sm text-blue-700 dark:text-blue-400">
                <Users className="w-4 h-4" />
                <span className="font-medium">{readmitStudentName}</span>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Percobaan sebelumnya akan ditandai sebagai &quot;Diizinkan Ulang&quot; dan riwayat tetap tersimpan. Siswa dapat membuat percobaan baru.
              </p>
            </div>
            <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-1.5 text-sm text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">Perhatian</span>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                Siswa akan bisa mengerjakan ujian dari awal. Nilai sebelumnya tidak akan dihapus dan tetap tercatat dalam riwayat.
              </p>
            </div>
            <p className="text-sm text-muted-foreground">Apakah Anda yakin ingin mengizinkan siswa ini mengerjakan ulang ujian?</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowReadmitDialog(false); setReadmitAttemptId(null); setReadmitStudentName('') }}>Batal</Button>
            <Button onClick={handleReadmit} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? 'Memproses...' : 'Ya, Izinkan Ulang'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ TOKEN DIALOG ============ */}
      <Dialog open={showTokenDialog} onOpenChange={setShowTokenDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-emerald-500" />
              Token Ujian
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="p-3 rounded-md bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
              <p className="text-sm text-emerald-700 dark:text-emerald-400">
                Ujian ini memerlukan token untuk memulai. Masukkan 6 karakter token yang diberikan oleh guru/pengawas ujian.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Token</Label>
              <Input
                type="text"
                value={examToken}
                onChange={e => setExamToken(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder="Masukkan 6 karakter token"
                maxLength={6}
                className="text-center text-lg tracking-[0.3em] font-mono uppercase"
                onKeyDown={e => { if (e.key === 'Enter') handleTokenSubmit() }}
                autoFocus
              />
              {examToken.length > 0 && examToken.length < 6 && (
                <p className="text-xs text-muted-foreground">Kurang {6 - examToken.length} karakter lagi</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTokenDialog(false)}>Batal</Button>
            <Button onClick={handleTokenSubmit} disabled={examToken.length < 6} className="bg-emerald-600 hover:bg-emerald-700">
              <KeyRound className="w-4 h-4 mr-2" /> Verifikasi Token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ PASSWORD DIALOG ============ */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-500" />
              Password Ujian
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Ujian ini memerlukan password untuk memulai.</p>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={examPassword}
                onChange={e => setExamPassword(e.target.value)}
                placeholder="Masukkan password ujian"
                onKeyDown={e => { if (e.key === 'Enter' && pendingExam) startExam(pendingExam) }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>Batal</Button>
            <Button onClick={() => pendingExam && startExam(pendingExam)} disabled={!examPassword}>
              <Play className="w-4 h-4 mr-2" /> Mulai
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ TAKE EXAM DIALOG ============ */}
      <Dialog open={showTakeExamDialog} onOpenChange={(open) => {
        if (!open && examStarted) {
          if (!confirm('Yakin ingin keluar? Progress tidak akan disimpan dan ujian akan otomatis dikumpulkan.')) return
          submitExam()
          return
        }
        setShowTakeExamDialog(open)
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                {exams.find(e => e.id === currentExamAttempt?.quizId)?.title || 'Ujian'}
              </DialogTitle>
              {examStarted && (
                <Badge variant={timerSeconds < 60 ? 'destructive' : 'outline'} className="text-lg font-mono px-3 py-1">
                  <Timer className="w-4 h-4 mr-1" />
                  {formatTimer(timerSeconds)}
                </Badge>
              )}
            </div>
          </DialogHeader>

          {examStarted && currentExamQuestions.length > 0 && (
            <div className="space-y-4">
              {/* Anti-cheat banner */}
              <div className="flex items-center gap-2 p-2 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
                <Shield className="w-4 h-4 shrink-0" />
                <span>Ujian dilindungi anti-cheat. Jangan pindah tab, menyalin, menempel, atau klik kanan.</span>
              </div>

              {/* Progress */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Pertanyaan {currentQuestionIndex + 1} dari {currentExamQuestions.length}
                </span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${((currentQuestionIndex + 1) / currentExamQuestions.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Current Question */}
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{getQuestionTypeLabel(currentExamQuestions[currentQuestionIndex].type)}</Badge>
                    <span className="text-sm text-muted-foreground">{currentExamQuestions[currentQuestionIndex].points} poin</span>
                  </div>
                  <p className="text-lg font-medium">{currentExamQuestions[currentQuestionIndex].question}</p>

                  {/* MC */}
                  {currentExamQuestions[currentQuestionIndex].type === 'multiple_choice' && (() => {
                    let opts: string[] = []
                    try { opts = JSON.parse(currentExamQuestions[currentQuestionIndex].options || '[]') } catch { /* empty */ }
                    return (
                      <RadioGroup
                        value={currentAnswers[currentExamQuestions[currentQuestionIndex].id] || ''}
                        onValueChange={v => setCurrentAnswers({ ...currentAnswers, [currentExamQuestions[currentQuestionIndex].id]: v })}
                        className="space-y-2"
                      >
                        {opts.map((opt, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent cursor-pointer"
                            onClick={() => setCurrentAnswers({ ...currentAnswers, [currentExamQuestions[currentQuestionIndex].id]: String.fromCharCode(65 + i) })}>
                            <RadioGroupItem value={String.fromCharCode(65 + i)} />
                            <span className="text-sm"><strong>{String.fromCharCode(65 + i)}.</strong> {opt}</span>
                          </div>
                        ))}
                      </RadioGroup>
                    )
                  })()}

                  {/* Benar/Salah */}
                  {currentExamQuestions[currentQuestionIndex].type === 'benar_salah' && (() => {
                    let statements: string[] = []
                    try {
                      const parsed = JSON.parse(currentExamQuestions[currentQuestionIndex].options || '{}')
                      statements = parsed.statements || []
                    } catch { /* empty */ }

                    const currentAnswerStr = currentAnswers[currentExamQuestions[currentQuestionIndex].id] || '{}'
                    let currentBsAnswer: Record<string, number> = {}
                    try { currentBsAnswer = JSON.parse(currentAnswerStr) } catch { /* empty */ }

                    return (
                      <div className="space-y-3">
                        {statements.map((stmt, i) => (
                          <div key={i} className="p-3 rounded-lg border space-y-2">
                            <p className="text-sm font-medium">{i + 1}. {stmt}</p>
                            <div className="flex gap-2">
                              <Button
                                variant={currentBsAnswer[String(i + 1)] === 1 ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => {
                                  const newAnswer = { ...currentBsAnswer, [String(i + 1)]: 1 }
                                  setCurrentAnswers({ ...currentAnswers, [currentExamQuestions[currentQuestionIndex].id]: JSON.stringify(newAnswer) })
                                }}
                              >
                                Benar
                              </Button>
                              <Button
                                variant={currentBsAnswer[String(i + 1)] === 0 ? 'destructive' : 'outline'}
                                size="sm"
                                onClick={() => {
                                  const newAnswer = { ...currentBsAnswer, [String(i + 1)]: 0 }
                                  setCurrentAnswers({ ...currentAnswers, [currentExamQuestions[currentQuestionIndex].id]: JSON.stringify(newAnswer) })
                                }}
                              >
                                Salah
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })()}

                  {/* MCMA */}
                  {currentExamQuestions[currentQuestionIndex].type === 'mcma' && (() => {
                    let opts: string[] = []
                    try {
                      const parsed = JSON.parse(currentExamQuestions[currentQuestionIndex].options || '{}')
                      opts = parsed.options || []
                    } catch { /* empty */ }

                    const currentAnswerStr = currentAnswers[currentExamQuestions[currentQuestionIndex].id] || '[]'
                    let selectedAnswers: string[] = []
                    try { selectedAnswers = JSON.parse(currentAnswerStr) } catch { /* empty */ }

                    return (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Pilih semua jawaban yang benar (bisa lebih dari satu)</p>
                        {opts.map((opt, i) => {
                          const letter = String.fromCharCode(65 + i)
                          const isSelected = selectedAnswers.includes(letter)
                          return (
                            <div key={i}
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                                isSelected ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                              )}
                              onClick={() => {
                                const newSelected = isSelected
                                  ? selectedAnswers.filter(a => a !== letter)
                                  : [...selectedAnswers, letter]
                                setCurrentAnswers({ ...currentAnswers, [currentExamQuestions[currentQuestionIndex].id]: JSON.stringify(newSelected) })
                              }}
                            >
                              <Checkbox checked={isSelected} />
                              <span className="text-sm"><strong>{letter}.</strong> {opt}</span>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}

                  {/* Essay */}
                  {currentExamQuestions[currentQuestionIndex].type === 'essay' && (
                    <Textarea
                      value={currentAnswers[currentExamQuestions[currentQuestionIndex].id] || ''}
                      onChange={e => setCurrentAnswers({ ...currentAnswers, [currentExamQuestions[currentQuestionIndex].id]: e.target.value })}
                      placeholder="Tulis jawaban Anda..."
                      rows={6}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))} disabled={currentQuestionIndex === 0}>
                  Sebelumnya
                </Button>
                <div className="flex gap-1 flex-wrap justify-center max-w-[200px]">
                  {currentExamQuestions.map((_, i) => (
                    <button
                      key={i}
                      className={cn(
                        "w-8 h-8 rounded-full text-xs font-medium transition-colors",
                        i === currentQuestionIndex ? 'bg-primary text-primary-foreground' :
                        currentAnswers[currentExamQuestions[i].id] ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        'bg-muted text-muted-foreground'
                      )}
                      onClick={() => setCurrentQuestionIndex(i)}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                {currentQuestionIndex < currentExamQuestions.length - 1 ? (
                  <Button onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}>
                    Selanjutnya
                  </Button>
                ) : (
                  <Button onClick={submitExam} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                    {saving ? 'Menyimpan...' : 'Kumpulkan'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ============ VIEW RESULTS DIALOG ============ */}
      <Dialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Hasil Ujian
            </DialogTitle>
          </DialogHeader>
          {selectedResult && (() => {
            const exam = exams.find(e => e.id === selectedResult.quizId)
            const canShowResults = exam?.showResult === 'after_exam' || selectedResult.status === 'completed'
            const canShowCorrectAnswers = exam?.showCorrectAnswers

            if (!canShowResults) {
              return (
                <div className="text-center py-8">
                  <EyeOff className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Hasil Belum Tersedia</h3>
                  <p className="text-sm text-muted-foreground mt-1">Guru belum membuka hasil ujian</p>
                </div>
              )
            }

            let cheatLogEntries: string[] = []
            try {
              if (selectedResult.cheatLog) cheatLogEntries = JSON.parse(selectedResult.cheatLog)
            } catch { /* ignore */ }

            return (
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-primary">{Math.round(selectedResult.score || 0)}</p>
                    <p className="text-sm text-muted-foreground">Skor Akhir</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="flex justify-center">{getStatusBadge(selectedResult.status)}</div>
                    <p className="text-xs text-muted-foreground mt-1">Status</p>
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

                {/* Cheat data in results */}
                {((selectedResult.tabSwitches || 0) > 0 || (selectedResult.copyAttempts || 0) > 0 ||
                  (selectedResult.pasteAttempts || 0) > 0 || (selectedResult.rightClicks || 0) > 0 ||
                  (selectedResult.fullscreenExited || 0) > 0) && (
                  <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-400 mb-1">
                      <AlertTriangle className="w-4 h-4" />
                      Aktivitas Mencurigakan Terdeteksi
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-amber-600 dark:text-amber-400">
                      {(selectedResult.tabSwitches || 0) > 0 && <span>{selectedResult.tabSwitches}x pindah tab</span>}
                      {(selectedResult.copyAttempts || 0) > 0 && <span>{selectedResult.copyAttempts}x salin</span>}
                      {(selectedResult.pasteAttempts || 0) > 0 && <span>{selectedResult.pasteAttempts}x tempel</span>}
                      {(selectedResult.rightClicks || 0) > 0 && <span>{selectedResult.rightClicks}x klik kanan</span>}
                      {(selectedResult.fullscreenExited || 0) > 0 && <span>{selectedResult.fullscreenExited}x keluar fullscreen</span>}
                    </div>
                  </div>
                )}

                <Separator />
                <ScrollArea className="max-h-64">
                  <div className="space-y-3">
                    {selectedResult.answers?.map((a, i) => {
                      // Format answer display
                      let displayAnswer = a.answer || '(tidak dijawab)'
                      let displayCorrect = a.question?.correctAnswer || ''

                      // For B/S, format the answers nicely
                      if (a.question?.type === 'benar_salah') {
                        try {
                          const studentAns = JSON.parse(a.answer || '{}')
                          displayAnswer = Object.entries(studentAns).map(([k, v]) => `${k}: ${v === 1 ? 'Benar' : 'Salah'}`).join(', ')
                        } catch { /* keep raw */ }
                        try {
                          const correctAns = JSON.parse(a.question.correctAnswer || '{}')
                          displayCorrect = (correctAns.answers || []).map((ans: number, idx: number) => `${idx + 1}: ${ans === 1 ? 'Benar' : 'Salah'}`).join(', ')
                        } catch { /* keep raw */ }
                      }
                      // For MCMA, format the answers
                      if (a.question?.type === 'mcma') {
                        try {
                          const studentAns = JSON.parse(a.answer || '[]')
                          displayAnswer = Array.isArray(studentAns) ? studentAns.join(', ') : displayAnswer
                        } catch { /* keep raw */ }
                        try {
                          const correctAns = JSON.parse(a.question.correctAnswer || '[]')
                          displayCorrect = Array.isArray(correctAns) ? correctAns.join(', ') : displayCorrect
                        } catch { /* keep raw */ }
                      }

                      return (
                        <div key={a.id} className={cn(
                          "p-3 rounded-lg border",
                          a.isCorrect ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20' :
                          a.isCorrect === false ? 'border-red-200 bg-red-50 dark:bg-red-950/20' :
                          'border-border'
                        )}>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium">{i + 1}. {a.question?.question || 'Soal'}</p>
                            <Badge variant={a.isCorrect ? 'default' : a.isCorrect === false ? 'destructive' : 'secondary'} className="text-xs shrink-0">
                              {a.isCorrect ? 'Benar' : a.isCorrect === false ? 'Salah' : 'Belum Dinilai'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Jawaban Anda: {displayAnswer}
                          </p>
                          {canShowCorrectAnswers && a.isCorrect === false && displayCorrect && (
                            <p className="text-sm text-emerald-600 mt-1">
                              Jawaban benar: {displayCorrect}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">Poin: {a.pointsEarned}/{a.question?.points || 0}</p>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
