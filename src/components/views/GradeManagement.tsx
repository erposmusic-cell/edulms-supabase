'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import {
  BarChart3, Plus, Search, Edit, Trash2, Download, TrendingUp,
  BookOpen, Award, GraduationCap, Users, Star, FileText,
  Calculator, PieChart, FileSpreadsheet
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart as RechartsPie, Pie, Cell, Legend
} from 'recharts'

interface Subject { id: string; name: string; code?: string }
interface GradeCategory { id: string; name: string; weight: number; subjectId: string; subject?: Subject }
interface Semester { id: string; name: string; academicYearId: string; academicYear?: { id: string; name: string; isActive: boolean } }
interface Student { id: string; nis: string; userId: string; classId: string; user: { id: string; name: string }; class: { id: string; name: string } }
interface Grade {
  id: string; studentId: string; gradeCategoryId: string; semesterId: string;
  score: number; description?: string | null; date: string;
  student: Student; gradeCategory: GradeCategory; semester: Semester
}
interface ClassInfo { id: string; name: string; grade?: string; major?: string }

const COLORS = ['#10b981', '#f59e0b', '#6366f1', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4']

export default function GradeManagement() {
  const { currentUser } = useAppStore()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [gradeCategories, setGradeCategories] = useState<GradeCategory[]>([])
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [saving, setSaving] = useState(false)

  // Teacher filters
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSemester, setSelectedSemester] = useState('')

  // Grade form
  const [showGradeDialog, setShowGradeDialog] = useState(false)
  const [editingGradeId, setEditingGradeId] = useState<string | null>(null)
  const [gradeForm, setGradeForm] = useState({ studentId: '', gradeCategoryId: '', semesterId: '', score: '', description: '' })

  // Category management
  const [showCategoryDialog, setShowCategoryDialog] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [categoryForm, setCategoryForm] = useState({ name: '', weight: '', subjectId: '' })

  // Student state
  const [studentId, setStudentId] = useState<string | null>(null)

  const isAdmin = currentUser?.role === 'admin'
  const isTeacher = currentUser?.role === 'teacher' || currentUser?.role === 'admin'
  const isStudent = currentUser?.role === 'student' || currentUser?.role === 'user'

  const loadData = useCallback(async () => {
    try {
      // Load subjects
      const subRes = await fetch('/api/subjects')
      if (subRes.ok) { const d = await subRes.json(); setSubjects(Array.isArray(d) ? d : []) }

      // Load grade categories
      const gcRes = await fetch('/api/grade-categories')
      if (gcRes.ok) { const d = await gcRes.json(); setGradeCategories(Array.isArray(d) ? d : []) }

      // Load semesters
      const ayRes = await fetch('/api/academic-years')
      if (ayRes.ok) {
        const ayData = await ayRes.json()
        const allSemesters: Semester[] = []
        for (const ay of Array.isArray(ayData) ? ayData : []) {
          if (ay.semesters) allSemesters.push(...ay.semesters)
        }
        setSemesters(allSemesters.length > 0 ? allSemesters : [{ id: 'default', name: 'Semester 1', academicYearId: '' }])
      }

      // Load classes
      const clsRes = await fetch('/api/classes')
      if (clsRes.ok) { const d = await clsRes.json(); setClasses(Array.isArray(d) ? d : []) }

      if (isStudent) {
        // Load student record using userId filter
        const stuRes = await fetch(`/api/students?userId=${currentUser?.id}`)
        if (stuRes.ok) {
          const stuData = await stuRes.json()
          const me = Array.isArray(stuData) ? stuData[0] : null
          if (me) {
            setStudentId(me.id)
            const res = await fetch(`/api/grades?studentId=${me.id}`)
            if (res.ok) { const d = await res.json(); setGrades(Array.isArray(d) ? d : []) }
          }
        }
      } else if (isTeacher) {
        // Load all students for teacher grading
        const stuRes = await fetch('/api/students?search=')
        if (stuRes.ok) { const d = await stuRes.json(); setStudents(Array.isArray(d) ? d : []) }
      }
    } catch (error) {
      console.error('Load error:', error)
    } finally {
      setLoading(false)
    }
  }, [currentUser, isTeacher, isStudent])

  useEffect(() => { loadData() }, [loadData])

  // Load grades for teacher based on filters
  useEffect(() => {
    if (!isTeacher || !selectedSubject || !selectedSemester) return
    const loadGrades = async () => {
      try {
        const params = new URLSearchParams()
        params.set('semesterId', selectedSemester)
        params.set('subjectId', selectedSubject)
        const res = await fetch(`/api/grades?${params}`)
        if (res.ok) { const d = await res.json(); setGrades(Array.isArray(d) ? d : []) }
      } catch (error) { console.error('Load grades error:', error) }
    }
    loadGrades()
  }, [selectedSubject, selectedSemester, isTeacher])

  // Grade CRUD
  const resetGradeForm = () => {
    setGradeForm({ studentId: '', gradeCategoryId: '', semesterId: '', score: '', description: '' })
    setEditingGradeId(null)
  }

  const openCreateGrade = () => {
    resetGradeForm()
    setGradeForm(prev => ({ ...prev, semesterId: selectedSemester }))
    setShowGradeDialog(true)
  }

  const openEditGrade = (g: Grade) => {
    setGradeForm({
      studentId: g.studentId, gradeCategoryId: g.gradeCategoryId,
      semesterId: g.semesterId, score: String(g.score), description: g.description || '',
    })
    setEditingGradeId(g.id)
    setShowGradeDialog(true)
  }

  const handleSaveGrade = async () => {
    if (!gradeForm.studentId || !gradeForm.gradeCategoryId || !gradeForm.semesterId || !gradeForm.score) {
      toast({ title: 'Error', description: 'Data tidak lengkap', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const res = editingGradeId
        ? await fetch(`/api/grades/${editingGradeId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(gradeForm) })
        : await fetch('/api/grades', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(gradeForm) })

      if (res.ok) {
        toast({ title: 'Berhasil', description: editingGradeId ? 'Nilai berhasil diupdate' : 'Nilai berhasil ditambahkan' })
        setShowGradeDialog(false)
        resetGradeForm()
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

  const handleDeleteGrade = async (id: string) => {
    if (!confirm('Yakin ingin menghapus nilai ini?')) return
    try {
      const res = await fetch(`/api/grades/${id}`, { method: 'DELETE' })
      if (res.ok) { toast({ title: 'Berhasil', description: 'Nilai berhasil dihapus' }); loadData() }
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus', variant: 'destructive' })
    }
  }

  // Category CRUD
  const resetCategoryForm = () => {
    setCategoryForm({ name: '', weight: '', subjectId: '' })
    setEditingCategoryId(null)
  }

  const openCreateCategory = () => { resetCategoryForm(); setCategoryForm(prev => ({ ...prev, subjectId: selectedSubject })); setShowCategoryDialog(true) }

  const openEditCategory = (c: GradeCategory) => {
    setCategoryForm({ name: c.name, weight: String(c.weight), subjectId: c.subjectId })
    setEditingCategoryId(c.id)
    setShowCategoryDialog(true)
  }

  const handleSaveCategory = async () => {
    if (!categoryForm.name || !categoryForm.weight || !categoryForm.subjectId) {
      toast({ title: 'Error', description: 'Data tidak lengkap', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const res = editingCategoryId
        ? await fetch(`/api/grade-categories/${editingCategoryId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...categoryForm, weight: parseFloat(categoryForm.weight) }) })
        : await fetch('/api/grade-categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...categoryForm, weight: parseFloat(categoryForm.weight) }) })

      if (res.ok) {
        toast({ title: 'Berhasil', description: editingCategoryId ? 'Kategori berhasil diupdate' : 'Kategori berhasil dibuat' })
        setShowCategoryDialog(false)
        resetCategoryForm()
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

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Yakin ingin menghapus kategori ini?')) return
    try {
      const res = await fetch(`/api/grade-categories/${id}`, { method: 'DELETE' })
      if (res.ok) { toast({ title: 'Berhasil', description: 'Kategori berhasil dihapus' }); loadData() }
      else {
        const err = await res.json()
        toast({ title: 'Error', description: err.error || 'Gagal menghapus', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus', variant: 'destructive' })
    }
  }

  // Calculate final grades for teacher view
  const calculateFinalGrades = () => {
    if (!selectedSubject || !selectedSemester) return []

    const subjectCategories = gradeCategories.filter(gc => gc.subjectId === selectedSubject)
    const subjectGrades = grades.filter(g => subjectCategories.some(gc => gc.id === g.gradeCategoryId))

    // Group by student
    const studentMap = new Map<string, { student: Student; categoryScores: Map<string, number> }>()
    for (const g of subjectGrades) {
      if (!studentMap.has(g.studentId)) {
        studentMap.set(g.studentId, { student: g.student, categoryScores: new Map() })
      }
      studentMap.get(g.studentId)!.categoryScores.set(g.gradeCategoryId, g.score)
    }

    const results: Array<{
      studentId: string; studentName: string; className: string; categoryScores: Record<string, number>; finalGrade: number
    }> = []

    for (const [, data] of studentMap) {
      const categoryScores: Record<string, number> = {}
      let weightedSum = 0
      let totalWeight = 0

      for (const cat of subjectCategories) {
        const score = data.categoryScores.get(cat.id)
        categoryScores[cat.name] = score ?? 0
        if (score !== undefined) {
          weightedSum += score * cat.weight
          totalWeight += cat.weight
        }
      }

      results.push({
        studentId: data.student.id,
        studentName: data.student.user?.name || '-',
        className: data.student.class?.name || '-',
        categoryScores,
        finalGrade: totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : 0,
      })
    }

    return results.sort((a, b) => b.finalGrade - a.finalGrade)
  }

  // Student grade analysis
  const getStudentGradeAnalysis = () => {
    if (!studentId || grades.length === 0) return null

    // Group grades by subject
    const subjectMap = new Map<string, { name: string; grades: Grade[] }>()
    for (const g of grades) {
      const subName = g.gradeCategory?.subject?.name || 'Unknown'
      if (!subjectMap.has(g.gradeCategoryId)) subjectMap.set(g.gradeCategoryId, { name: subName, grades: [] })
      subjectMap.get(g.gradeCategoryId)!.grades.push(g)
    }

    // Calculate GPA per subject
    const subjectAverages: Array<{ subject: string; average: number }> = []
    let totalScore = 0
    let totalItems = 0

    for (const [, data] of subjectMap) {
      const avg = data.grades.reduce((sum, g) => sum + g.score, 0) / data.grades.length
      subjectAverages.push({ subject: data.name, average: Math.round(avg * 100) / 100 })
      totalScore += data.grades.reduce((sum, g) => sum + g.score, 0)
      totalItems += data.grades.length
    }

    const gpa = totalItems > 0 ? Math.round((totalScore / totalItems) * 100) / 100 : 0

    // Grade trend (by date)
    const trendData = grades
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(g => ({
        date: new Date(g.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        score: g.score,
        subject: g.gradeCategory?.subject?.name || '-',
      }))

    // Distribution
    const distribution = [
      { range: '90-100', count: grades.filter(g => g.score >= 90).length, color: '#10b981' },
      { range: '80-89', count: grades.filter(g => g.score >= 80 && g.score < 90).length, color: '#14b8a6' },
      { range: '70-79', count: grades.filter(g => g.score >= 70 && g.score < 80).length, color: '#f59e0b' },
      { range: '60-69', count: grades.filter(g => g.score >= 60 && g.score < 70).length, color: '#f97316' },
      { range: '<60', count: grades.filter(g => g.score < 60).length, color: '#ef4444' },
    ]

    return { subjectAverages, gpa, trendData, distribution, subjectMap }
  }

  // Export grades as CSV
  const exportGrades = () => {
    const finalGrades = calculateFinalGrades()
    if (finalGrades.length === 0) {
      toast({ title: 'Info', description: 'Tidak ada data untuk diekspor' })
      return
    }
    const headers = ['No', 'Nama', 'Kelas', ...gradeCategories.filter(gc => gc.subjectId === selectedSubject).map(gc => gc.name), 'Nilai Akhir']
    const rows = finalGrades.map((r, i) => [
      i + 1, r.studentName, r.className,
      ...gradeCategories.filter(gc => gc.subjectId === selectedSubject).map(gc => r.categoryScores[gc.name]?.toString() || '-'),
      r.finalGrade.toString(),
    ])

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'grades_export.csv'; a.click()
    URL.revokeObjectURL(url)
    toast({ title: 'Berhasil', description: 'Data nilai berhasil diekspor (CSV)' })
  }

  // Export grades as Excel
  const exportGradesExcel = () => {
    if (!selectedClass || selectedClass === 'all') {
      toast({ title: 'Info', description: 'Pilih kelas tertentu untuk mengekspor Excel' })
      return
    }
    if (!selectedSemester) {
      toast({ title: 'Info', description: 'Pilih semester terlebih dahulu' })
      return
    }
    const params = new URLSearchParams({ classId: selectedClass, semesterId: selectedSemester })
    window.open(`/api/reports/grades-excel?${params}`, '_blank')
    toast({ title: 'Berhasil', description: 'File Excel sedang diunduh' })
  }

  // Admin: Class ranking
  const getClassRanking = () => {
    if (grades.length === 0) return []
    const classMap = new Map<string, { name: string; totalScore: number; count: number }>()
    for (const g of grades) {
      const clsName = g.student?.class?.name || 'Unknown'
      if (!classMap.has(g.student.classId)) classMap.set(g.student.classId, { name: clsName, totalScore: 0, count: 0 })
      const d = classMap.get(g.student.classId)!
      d.totalScore += g.score; d.count++
    }
    return Array.from(classMap.entries())
      .map(([id, d]) => ({ id, name: d.name, average: Math.round((d.totalScore / d.count) * 100) / 100, count: d.count }))
      .sort((a, b) => b.average - a.average)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Penilaian & Rapor</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    )
  }

  // ===================== STUDENT VIEW =====================
  if (isStudent && !isAdmin) {
    const analysis = getStudentGradeAnalysis()
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            Nilai Saya
          </h1>
          <p className="text-sm text-muted-foreground">Lihat nilai dan progress belajar Anda</p>
        </div>

        {grades.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Star className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Belum ada nilai</h3>
              <p className="text-sm text-muted-foreground mt-1">Nilai akan muncul setelah guru mempublikasikan</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* GPA Card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6 text-center">
                  <Award className="w-8 h-8 mx-auto text-primary mb-2" />
                  <p className="text-3xl font-bold text-primary">{analysis?.gpa || 0}</p>
                  <p className="text-sm text-muted-foreground">Rata-rata Nilai</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <BookOpen className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                  <p className="text-3xl font-bold text-emerald-600">{analysis?.subjectAverages.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Mata Pelajaran</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <FileText className="w-8 h-8 mx-auto text-amber-500 mb-2" />
                  <p className="text-3xl font-bold text-amber-600">{grades.length}</p>
                  <p className="text-sm text-muted-foreground">Total Nilai</p>
                </CardContent>
              </Card>
            </div>

            {/* Grade Chart */}
            {analysis && analysis.subjectAverages.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle className="text-lg">Rata-rata per Mata Pelajaran</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analysis.subjectAverages}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                        <Tooltip />
                        <Bar dataKey="average" fill="#10b981" name="Rata-rata" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-lg">Distribusi Nilai</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsPie>
                        <Pie
                          data={analysis.distribution.filter(d => d.count > 0)}
                          cx="50%" cy="50%" outerRadius={100} dataKey="count"
                          label={({ range, count }) => `${range}: ${count}`}
                        >
                          {analysis.distribution.filter(d => d.count > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Trend Chart */}
            {analysis && analysis.trendData.length > 1 && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Tren Nilai</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={analysis.trendData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                      <Tooltip />
                      <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2} name="Nilai" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Grade List */}
            <Card>
              <CardHeader><CardTitle className="text-lg">Detail Nilai</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mata Pelajaran</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead className="text-center">Nilai</TableHead>
                        <TableHead>Deskripsi</TableHead>
                        <TableHead>Tanggal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {grades.map(g => (
                        <TableRow key={g.id}>
                          <TableCell className="font-medium">{g.gradeCategory?.subject?.name || '-'}</TableCell>
                          <TableCell><Badge variant="outline">{g.gradeCategory?.name || '-'}</Badge></TableCell>
                          <TableCell className="text-center">
                            <span className={`font-bold ${g.score >= 80 ? 'text-emerald-600' : g.score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                              {g.score}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{g.description || '-'}</TableCell>
                          <TableCell className="text-muted-foreground">{new Date(g.date).toLocaleDateString('id-ID')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    )
  }

  // ===================== TEACHER / ADMIN VIEW =====================
  const finalGrades = calculateFinalGrades()
  const subjectCategories = gradeCategories.filter(gc => gc.subjectId === selectedSubject)
  const classRanking = getClassRanking()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            Penilaian & Rapor
          </h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? 'Kelola penilaian dan rapor siswa' : 'Kelola penilaian siswa'}
          </p>
        </div>
        <div className="flex gap-2">
          {selectedSubject && (
            <Button variant="outline" onClick={openCreateCategory}>
              <Plus className="w-4 h-4 mr-2" /> Kategori Nilai
            </Button>
          )}
          {selectedSubject && selectedSemester && (
            <>
              <Button onClick={openCreateGrade}>
                <Plus className="w-4 h-4 mr-2" /> Tambah Nilai
              </Button>
              <Button variant="outline" onClick={exportGrades}>
                <Download className="w-4 h-4 mr-2" /> CSV
              </Button>
              <Button variant="outline" onClick={exportGradesExcel} className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="grades" className="space-y-4">
        <TabsList>
          <TabsTrigger value="grades">Nilai</TabsTrigger>
          <TabsTrigger value="categories">Kategori Nilai</TabsTrigger>
          {isAdmin && <TabsTrigger value="reports">Rapor & Analitik</TabsTrigger>}
        </TabsList>

        {/* Grades Tab */}
        <TabsContent value="grades" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-full sm:w-60"><SelectValue placeholder="Pilih Mata Pelajaran" /></SelectTrigger>
              <SelectContent>
                {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedSemester} onValueChange={setSelectedSemester}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Pilih Semester" /></SelectTrigger>
              <SelectContent>
                {semesters.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {isTeacher && (
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kelas</SelectItem>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>

          {!selectedSubject || !selectedSemester ? (
            <Card>
              <CardContent className="p-12 text-center">
                <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Pilih Mata Pelajaran dan Semester</h3>
                <p className="text-sm text-muted-foreground mt-1">Untuk melihat dan mengelola nilai</p>
              </CardContent>
            </Card>
          ) : finalGrades.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Star className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Belum ada nilai</h3>
                <p className="text-sm text-muted-foreground mt-1">Tambahkan nilai untuk memulai</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Nama Siswa</TableHead>
                        <TableHead>Kelas</TableHead>
                        {subjectCategories.map(gc => (
                          <TableHead key={gc.id} className="text-center">{gc.name}<br /><span className="text-xs font-normal text-muted-foreground">({gc.weight}%)</span></TableHead>
                        ))}
                        <TableHead className="text-center font-bold">Nilai Akhir</TableHead>
                        <TableHead className="w-20">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {finalGrades
                        .filter(r => !selectedClass || selectedClass === 'all' || r.className === classes.find(c => c.id === selectedClass)?.name)
                        .map((r, i) => (
                        <TableRow key={r.studentId}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell className="font-medium">{r.studentName}</TableCell>
                          <TableCell>{r.className}</TableCell>
                          {subjectCategories.map(gc => (
                            <TableCell key={gc.id} className="text-center">
                              {r.categoryScores[gc.name] !== undefined ? (
                                <span className={`font-medium ${r.categoryScores[gc.name] >= 80 ? 'text-emerald-600' : r.categoryScores[gc.name] >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                                  {r.categoryScores[gc.name]}
                                </span>
                              ) : '-'}
                            </TableCell>
                          ))}
                          <TableCell className="text-center">
                            <Badge className={`${r.finalGrade >= 80 ? 'bg-emerald-500' : r.finalGrade >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}>
                              {r.finalGrade}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {grades.filter(g => g.studentId === r.studentId).map(g => (
                                <Button key={g.id} variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditGrade(g)}>
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          {selectedSubject && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Kategori Nilai - {subjects.find(s => s.id === selectedSubject)?.name}</CardTitle></CardHeader>
              <CardContent>
                {subjectCategories.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calculator className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>Belum ada kategori nilai untuk mata pelajaran ini</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nama Kategori</TableHead>
                          <TableHead className="text-center">Bobot (%)</TableHead>
                          <TableHead className="text-center">Jumlah Nilai</TableHead>
                          <TableHead className="w-24">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subjectCategories.map(gc => {
                          const gradeCount = grades.filter(g => g.gradeCategoryId === gc.id).length
                          return (
                            <TableRow key={gc.id}>
                              <TableCell className="font-medium">{gc.name}</TableCell>
                              <TableCell className="text-center">{gc.weight}%</TableCell>
                              <TableCell className="text-center">{gradeCount}</TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditCategory(gc)}>
                                    <Edit className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteCategory(gc.id)}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-1">Total Bobot: {subjectCategories.reduce((sum, gc) => sum + gc.weight, 0)}%</p>
                  {subjectCategories.reduce((sum, gc) => sum + gc.weight, 0) !== 100 && (
                    <p className="text-xs text-amber-600">⚠️ Total bobot belum mencapai 100%</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          {!selectedSubject && (
            <Card>
              <CardContent className="p-12 text-center">
                <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Pilih mata pelajaran terlebih dahulu</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Reports Tab (Admin only) */}
        {isAdmin && (
          <TabsContent value="reports" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Class Ranking */}
              <Card>
                <CardHeader><CardTitle className="text-lg">Peringkat Kelas</CardTitle></CardHeader>
                <CardContent>
                  {classRanking.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Belum ada data</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={classRanking} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                        <Tooltip />
                        <Bar dataKey="average" fill="#10b981" name="Rata-rata" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Grade Distribution */}
              <Card>
                <CardHeader><CardTitle className="text-lg">Distribusi Nilai</CardTitle></CardHeader>
                <CardContent>
                  {grades.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Belum ada data</p>
                  ) : (() => {
                    const dist = [
                      { range: '90-100', count: grades.filter(g => g.score >= 90).length, color: '#10b981' },
                      { range: '80-89', count: grades.filter(g => g.score >= 80 && g.score < 90).length, color: '#14b8a6' },
                      { range: '70-79', count: grades.filter(g => g.score >= 70 && g.score < 80).length, color: '#f59e0b' },
                      { range: '60-69', count: grades.filter(g => g.score >= 60 && g.score < 70).length, color: '#f97316' },
                      { range: '<60', count: grades.filter(g => g.score < 60).length, color: '#ef4444' },
                    ].filter(d => d.count > 0)
                    return (
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsPie>
                          <Pie data={dist} cx="50%" cy="50%" outerRadius={100} dataKey="count" label={({ range, count }) => `${range}: ${count}`}>
                            {dist.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </RechartsPie>
                      </ResponsiveContainer>
                    )
                  })()}
                </CardContent>
              </Card>
            </div>

            {/* Generate Report Card */}
            <Card>
              <CardHeader><CardTitle className="text-lg">Generate Rapor</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                    <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Pilih Semester" /></SelectTrigger>
                    <SelectContent>
                      {semesters.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Kelas</SelectItem>
                      {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button onClick={exportGrades} disabled={!selectedSemester}>
                    <Download className="w-4 h-4 mr-2" /> CSV
                  </Button>
                  <Button variant="outline" onClick={exportGradesExcel} disabled={!selectedSemester || !selectedClass || selectedClass === 'all'} className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                    <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Export data rapor dalam format CSV atau Excel. Pilih semester dan kelas untuk memfilter data. Excel memerlukan kelas tertentu.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Grade Dialog */}
      <Dialog open={showGradeDialog} onOpenChange={setShowGradeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingGradeId ? 'Edit Nilai' : 'Tambah Nilai'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Siswa *</Label>
              <Select value={gradeForm.studentId} onValueChange={v => setGradeForm({ ...gradeForm, studentId: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih Siswa" /></SelectTrigger>
                <SelectContent>
                  {students.map(s => <SelectItem key={s.id} value={s.id}>{s.user?.name} ({s.nis})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mata Pelajaran</Label>
              <Select value={gradeForm.gradeCategoryId ? gradeCategories.find(gc => gc.id === gradeForm.gradeCategoryId)?.subjectId || '' : selectedSubject} disabled>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Kategori Nilai *</Label>
              <Select value={gradeForm.gradeCategoryId} onValueChange={v => setGradeForm({ ...gradeForm, gradeCategoryId: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih Kategori" /></SelectTrigger>
                <SelectContent>
                  {gradeCategories.filter(gc => !selectedSubject || gc.subjectId === selectedSubject).map(gc => (
                    <SelectItem key={gc.id} value={gc.id}>{gc.name} ({gc.weight}%)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nilai *</Label>
                <Input type="number" value={gradeForm.score} onChange={e => setGradeForm({ ...gradeForm, score: e.target.value })} min={0} max={100} />
              </div>
              <div className="space-y-2">
                <Label>Semester *</Label>
                <Select value={gradeForm.semesterId} onValueChange={v => setGradeForm({ ...gradeForm, semesterId: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih Semester" /></SelectTrigger>
                  <SelectContent>
                    {semesters.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <Textarea value={gradeForm.description} onChange={e => setGradeForm({ ...gradeForm, description: e.target.value })} placeholder="Deskripsi nilai..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGradeDialog(false)}>Batal</Button>
            <Button onClick={handleSaveGrade} disabled={saving}>{saving ? 'Menyimpan...' : editingGradeId ? 'Update' : 'Simpan'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategoryId ? 'Edit Kategori Nilai' : 'Tambah Kategori Nilai'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Kategori *</Label>
              <Input value={categoryForm.name} onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} placeholder="Contoh: UTS, UAS, Tugas, Quiz" />
            </div>
            <div className="space-y-2">
              <Label>Bobot (%) *</Label>
              <Input type="number" value={categoryForm.weight} onChange={e => setCategoryForm({ ...categoryForm, weight: e.target.value })} placeholder="Contoh: 30" min={1} max={100} />
            </div>
            <div className="space-y-2">
              <Label>Mata Pelajaran *</Label>
              <Select value={categoryForm.subjectId} onValueChange={v => setCategoryForm({ ...categoryForm, subjectId: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih Mapel" /></SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>Batal</Button>
            <Button onClick={handleSaveCategory} disabled={saving}>{saving ? 'Menyimpan...' : editingCategoryId ? 'Update' : 'Simpan'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
