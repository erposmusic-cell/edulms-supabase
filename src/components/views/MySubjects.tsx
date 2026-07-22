'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppStore } from '@/lib/store'
import { useToast } from '@/hooks/use-toast'
import { BookOpen, FileText, Brain, ClipboardList, ArrowLeft, ExternalLink, Video, Link as LinkIcon, Presentation } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface SubjectAssignment {
  id: string
  subjectId: string
  teacherId: string
  classId: string
  subject: {
    id: string
    name: string
    code: string | null
    description: string | null
  }
  teacher: {
    id: string
    user: { name: string }
  }
  class: {
    id: string
    name: string
  }
}

interface MaterialItem {
  id: string
  title: string
  type: string
  topic: string | null
  isPublished: boolean
}

interface AssignmentItem {
  id: string
  title: string
  dueDate: string
  isPublished: boolean
}

interface QuizItem {
  id: string
  title: string
  duration: number
  isPublished: boolean
}

interface SubjectDetail {
  id: string
  name: string
  code: string | null
  description: string | null
  materials: MaterialItem[]
  assignments: AssignmentItem[]
  quizzes: QuizItem[]
  subjectAssignments: SubjectAssignment[]
}

export default function MySubjects() {
  const { currentUser } = useAppStore()
  const [assignments, setAssignments] = useState<SubjectAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState<SubjectDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => { loadAssignments() }, [currentUser])

  async function loadAssignments() {
    if (!currentUser) return
    setLoading(true)
    try {
      let url = '/api/subject-assignments'
      if (currentUser.role === 'teacher') {
        // Get teacher record first
        const teacherRes = await fetch('/api/teachers')
        const teachers = await teacherRes.json()
        const myTeacher = Array.isArray(teachers) ? teachers.find((t: { userId: string }) => t.userId === currentUser.id) : null
        if (myTeacher) {
          url = `/api/subject-assignments?teacherId=${myTeacher.id}`
        }
      } else if (currentUser.role === 'student') {
        // Get student record to find class
        const studentRes = await fetch(`/api/students?userId=${currentUser.id}`)
        const students = await studentRes.json()
        const myStudent = Array.isArray(students) && students.length > 0 ? students[0] : null
        if (myStudent) {
          url = `/api/subject-assignments?classId=${myStudent.classId}`
        }
      }
      const res = await fetch(url)
      const data = await res.json()
      if (Array.isArray(data)) setAssignments(data)
    } catch (e) {
      console.error(e)
      toast({ title: 'Error', description: 'Gagal memuat data mata pelajaran', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  async function openSubjectDetail(subjectId: string) {
    setDetailLoading(true)
    setDetailOpen(true)
    try {
      const res = await fetch(`/api/subjects/${subjectId}`)
      const data = await res.json()
      setSelectedSubject(data)
    } catch {
      toast({ title: 'Error', description: 'Gagal memuat detail mata pelajaran', variant: 'destructive' })
    } finally {
      setDetailLoading(false)
    }
  }

  const typeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4" />
      case 'link': return <LinkIcon className="w-4 h-4" />
      case 'presentation': return <Presentation className="w-4 h-4" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  const typeLabel = (type: string) => {
    switch (type) {
      case 'video': return 'Video'
      case 'link': return 'Link'
      case 'presentation': return 'Presentasi'
      default: return 'Dokumen'
    }
  }

  // Group by class for students
  const groupedByClass = assignments.reduce<Record<string, SubjectAssignment[]>>((acc, a) => {
    const key = a.class.name
    if (!acc[key]) acc[key] = []
    acc[key].push(a)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {currentUser?.role === 'teacher' ? 'Mata Pelajaran Saya' : 'Mata Pelajaran'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {currentUser?.role === 'teacher'
            ? 'Daftar mata pelajaran yang Anda ampu'
            : 'Daftar mata pelajaran di kelas Anda'}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-24 mb-4" />
                <Skeleton className="h-4 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : assignments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground mb-3" />
            <h3 className="font-semibold text-lg">Belum ada mata pelajaran</h3>
            <p className="text-sm text-muted-foreground">
              {currentUser?.role === 'teacher'
                ? 'Belum ada mata pelajaran yang ditugaskan ke Anda'
                : 'Belum ada mata pelajaran di kelas Anda'}
            </p>
          </CardContent>
        </Card>
      ) : currentUser?.role === 'student' ? (
        // Group by class for students
        Object.entries(groupedByClass).map(([className, items]) => (
          <div key={className} className="space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              {className}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map(assignment => (
                <Card
                  key={assignment.id}
                  className="hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => openSubjectDetail(assignment.subjectId)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold group-hover:text-primary transition-colors">{assignment.subject.name}</h3>
                          <p className="text-sm text-muted-foreground">{assignment.subject.code || '-'}</p>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge variant="secondary">{assignment.teacher.user.name}</Badge>
                      <Badge variant="outline">{assignment.class.name}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      ) : (
        // Teacher view - simple grid
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assignments.map(assignment => (
            <Card
              key={assignment.id}
              className="hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => openSubjectDetail(assignment.subjectId)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold group-hover:text-primary transition-colors">{assignment.subject.name}</h3>
                      <p className="text-sm text-muted-foreground">{assignment.subject.code || '-'}</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="secondary">{assignment.class.name}</Badge>
                </div>
                {assignment.subject.description && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{assignment.subject.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Subject Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              {detailLoading ? 'Memuat...' : selectedSubject?.name || 'Detail Mata Pelajaran'}
            </DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : selectedSubject ? (
            <div className="space-y-6">
              {selectedSubject.code && (
                <Badge variant="outline" className="font-mono">{selectedSubject.code}</Badge>
              )}
              {selectedSubject.description && (
                <p className="text-sm text-muted-foreground">{selectedSubject.description}</p>
              )}

              {/* Materials */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Materi ({selectedSubject.materials.length})
                </h3>
                {selectedSubject.materials.length === 0 ? (
                  <p className="text-sm text-muted-foreground pl-6">Belum ada materi</p>
                ) : (
                  <div className="space-y-2 pl-6">
                    {selectedSubject.materials.map(m => (
                      <div key={m.id} className="flex items-center gap-2 text-sm">
                        {typeIcon(m.type)}
                        <span>{m.title}</span>
                        <Badge variant="outline" className="text-xs">{typeLabel(m.type)}</Badge>
                        {m.topic && <Badge variant="secondary" className="text-xs">{m.topic}</Badge>}
                        {!m.isPublished && <Badge variant="destructive" className="text-xs">Draft</Badge>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Assignments */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-primary" />
                  Tugas ({selectedSubject.assignments.length})
                </h3>
                {selectedSubject.assignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground pl-6">Belum ada tugas</p>
                ) : (
                  <div className="space-y-2 pl-6">
                    {selectedSubject.assignments.map(a => (
                      <div key={a.id} className="flex items-center gap-2 text-sm">
                        <ClipboardList className="w-4 h-4 text-muted-foreground" />
                        <span>{a.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {new Date(a.dueDate).toLocaleDateString('id-ID')}
                        </Badge>
                        {!a.isPublished && <Badge variant="destructive" className="text-xs">Draft</Badge>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quizzes */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary" />
                  Quiz ({selectedSubject.quizzes.length})
                </h3>
                {selectedSubject.quizzes.length === 0 ? (
                  <p className="text-sm text-muted-foreground pl-6">Belum ada quiz</p>
                ) : (
                  <div className="space-y-2 pl-6">
                    {selectedSubject.quizzes.map(q => (
                      <div key={q.id} className="flex items-center gap-2 text-sm">
                        <Brain className="w-4 h-4 text-muted-foreground" />
                        <span>{q.title}</span>
                        <Badge variant="outline" className="text-xs">{q.duration} menit</Badge>
                        {!q.isPublished && <Badge variant="destructive" className="text-xs">Draft</Badge>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
