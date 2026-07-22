'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/store'
import { signOut } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BookOpen, Clock, Users, GraduationCap, FileText,
  Brain, Calendar, Plus, ClipboardCheck, BarChart3
} from 'lucide-react'

interface DashboardData {
  teacher: { id: string; name: string; nip: string; specialization: string }
  subjectAssignments: Array<{ id: string; subjectName: string; subjectCode: string; className: string; studentCount: number }>
  todayClasses: Array<{ id: string; subjectName: string; subjectCode: string; className: string; startTime: string; endTime: string; room: string | null; studentCount: number }>
  pendingGrading: number
  myAssignments: Array<{ id: string; title: string; subjectName: string; dueDate: string; submissionCount: number; maxScore: number }>
  recentQuizAttempts: Array<{ id: string; quizTitle: string; subjectName: string; studentName: string; score: number | null; completedAt: string | null }>
  stats: { materialsCount: number; quizzesCount: number; totalClasses: number }
  classAdvisory: { className: string; studentCount: number } | null
}

export default function TeacherDashboard() {
  const { currentUser } = useAppStore()
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (currentUser) loadData()
  }, [currentUser])

  const loadData = useCallback(async () => {
    try {
      setError('')
      const res = await fetch(`/api/dashboard/teacher?userId=${currentUser!.id}`)
      if (res.status === 401) {
        signOut({ redirect: false })
        return
      }
      const d = await res.json()
      if (d.error) {
        setError(d.error)
      } else {
        setData(d)
      }
    } catch (e) {
      console.error(e)
      setError('Gagal memuat data dashboard')
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    )
  }

  if (!data) return (
    <div className="text-center py-8">
      <p className="text-muted-foreground mb-2">Gagal memuat data dashboard</p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button onClick={loadData} className="mt-3 text-sm text-primary hover:underline">Coba lagi</button>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
          <p className="text-muted-foreground">{data.teacher.name} &middot; NIP: {data.teacher.nip}</p>
        </div>
        <Badge variant="outline" className="text-sm">
          <GraduationCap className="w-3 h-3 mr-1" />
          {data.teacher.specialization}
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">My Classes</p>
                <p className="text-3xl font-bold">{data.stats.totalClasses}</p>
              </div>
              <SchoolIcon className="w-10 h-10 text-emerald-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending to Grade</p>
                <p className="text-3xl font-bold text-amber-600">{data.pendingGrading}</p>
              </div>
              <ClipboardCheck className="w-10 h-10 text-amber-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Materials</p>
                <p className="text-3xl font-bold">{data.stats.materialsCount}</p>
              </div>
              <FileText className="w-10 h-10 text-teal-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Quizzes</p>
                <p className="text-3xl font-bold">{data.stats.quizzesCount}</p>
              </div>
              <Brain className="w-10 h-10 text-cyan-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Links */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Quick Actions</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => router.push('/materials')}>
              <Plus className="w-5 h-5 text-emerald-500" />
              <span className="text-xs">New Material</span>
            </Button>
            <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => router.push('/assignments')}>
              <Plus className="w-5 h-5 text-blue-500" />
              <span className="text-xs">New Assignment</span>
            </Button>
            <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => router.push('/quizzes')}>
              <Plus className="w-5 h-5 text-purple-500" />
              <span className="text-xs">New Quiz</span>
            </Button>
            <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => router.push('/grades')}>
              <BarChart3 className="w-5 h-5 text-teal-500" />
              <span className="text-xs">Grade Entry</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg">Today&apos;s Schedule</CardTitle>
            <Calendar className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {data.todayClasses.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground mt-2">No classes scheduled today</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.todayClasses.map((cls, i) => (
                  <div key={cls.id} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm">{cls.subjectName}</h4>
                      <p className="text-xs text-muted-foreground">{cls.className} &middot; {cls.studentCount} students</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium">{cls.startTime} - {cls.endTime}</p>
                      {cls.room && <p className="text-xs text-muted-foreground">{cls.room}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Subjects & Classes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg">My Subjects & Classes</CardTitle>
            <BookOpen className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
              {data.subjectAssignments.map(sa => (
                <div key={sa.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">{sa.subjectCode}</Badge>
                    <div>
                      <p className="text-sm font-medium">{sa.subjectName}</p>
                      <p className="text-xs text-muted-foreground">{sa.className}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="w-3 h-3" />
                    {sa.studentCount}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Assignments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg">My Assignments</CardTitle>
            <FileText className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
              {data.myAssignments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No assignments</p>
              ) : (
                data.myAssignments.map(a => (
                  <div key={a.id} className="p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-sm">{a.title}</h4>
                        <p className="text-xs text-muted-foreground">{a.subjectName}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">{a.submissionCount} submitted</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      Due: {new Date(a.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Quiz Attempts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg">Recent Quiz Attempts</CardTitle>
            <Brain className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
              {data.recentQuizAttempts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No quiz attempts</p>
              ) : (
                data.recentQuizAttempts.map(qa => (
                  <div key={qa.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div>
                      <h4 className="font-medium text-sm">{qa.quizTitle}</h4>
                      <p className="text-xs text-muted-foreground">{qa.studentName} &middot; {qa.subjectName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{qa.score != null ? qa.score : '-'}</p>
                      {qa.completedAt && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(qa.completedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Class Advisory */}
      {data.classAdvisory && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Class Advisory</p>
                <p className="text-lg font-bold">{data.classAdvisory.className}</p>
                <p className="text-sm text-muted-foreground">{data.classAdvisory.studentCount} students</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Simple school icon to avoid name collision
function SchoolIcon({ className }: { className?: string }) {
  return <GraduationCap className={className} />
}
