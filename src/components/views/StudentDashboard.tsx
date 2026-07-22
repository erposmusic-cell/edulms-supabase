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
  Calendar, BookOpen, Clock, BarChart3, CheckCircle,
  FileText, Brain, Megaphone, Library, ClipboardList,
  GraduationCap
} from 'lucide-react'

interface DashboardData {
  student: { id: string; nis: string; name: string; email: string; className: string; major: string | null }
  todaySchedule: Array<{ id: string; subjectName: string; subjectCode: string; startTime: string; endTime: string; room: string | null }>
  attendanceSummary: { totalDays: number; hadir: number; terlambat: number; izin: number; sakit: number; alpha: number; attendanceRate: number }
  recentAttendance: Array<{ id: string; date: string; status: string; timeIn: string | null; timeOut: string | null }>
  upcomingAssignments: Array<{ id: string; title: string; subjectName: string; subjectCode: string; dueDate: string; maxScore: number; submission: { status: string; score: number | null } | null }>
  recentGrades: Array<{ id: string; subjectName: string; subjectCode: string; categoryName: string; score: number; date: string; description: string | null }>
  avgGrade: number
  announcements: Array<{ id: string; title: string; content: string; priority: string; authorName: string; createdAt: string }>
  upcomingQuizzes: Array<{ id: string; title: string; subjectName: string; startDate: string | null; duration: number }>
}

export default function StudentDashboard() {
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
      const res = await fetch(`/api/dashboard/student?userId=${currentUser!.id}`)
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
      <div>
        <h1 className="text-2xl font-bold">Student Dashboard</h1>
        <p className="text-muted-foreground">{data.student.name} &middot; {data.student.className}</p>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Attendance</p>
                <p className="text-3xl font-bold text-emerald-600">{data.attendanceSummary.attendanceRate}%</p>
              </div>
              <CheckCircle className="w-10 h-10 text-emerald-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Average Grade</p>
                <p className="text-3xl font-bold text-teal-600">{data.avgGrade}</p>
              </div>
              <BarChart3 className="w-10 h-10 text-teal-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Upcoming Tasks</p>
                <p className="text-3xl font-bold text-amber-600">{data.upcomingAssignments.length}</p>
              </div>
              <FileText className="w-10 h-10 text-amber-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Upcoming Quizzes</p>
                <p className="text-3xl font-bold text-purple-600">{data.upcomingQuizzes.length}</p>
              </div>
              <Brain className="w-10 h-10 text-purple-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Quick Links</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => router.push('/my-subjects')}>
              <BookOpen className="w-5 h-5 text-emerald-500" />
              <span className="text-xs">My Subjects</span>
            </Button>
            <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => router.push('/assignments')}>
              <FileText className="w-5 h-5 text-blue-500" />
              <span className="text-xs">Assignments</span>
            </Button>
            <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => router.push('/quizzes')}>
              <Brain className="w-5 h-5 text-purple-500" />
              <span className="text-xs">Quizzes</span>
            </Button>
            <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => router.push('/library')}>
              <Library className="w-5 h-5 text-teal-500" />
              <span className="text-xs">Library</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Today's Schedule & Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg">Today&apos;s Schedule</CardTitle>
            <Calendar className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {data.todaySchedule.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground mt-2">No classes scheduled today</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data.todaySchedule.map((s, i) => (
                  <div key={s.id} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm">{s.subjectName}</h4>
                      <p className="text-xs text-muted-foreground">{s.subjectCode}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium">{s.startTime} - {s.endTime}</p>
                      {s.room && <p className="text-xs text-muted-foreground">{s.room}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Announcements */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg">Announcements</CardTitle>
            <Megaphone className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
              {data.announcements.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No announcements</p>
              ) : (
                data.announcements.map(a => (
                  <div key={a.id} className="p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-sm">{a.title}</h4>
                      <Badge variant={a.priority === 'urgent' ? 'destructive' : a.priority === 'high' ? 'default' : 'secondary'} className="shrink-0 text-[10px]">
                        {a.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {a.authorName} &middot; {new Date(a.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Assignments & Recent Grades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Assignments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg">Upcoming Assignments</CardTitle>
            <FileText className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
              {data.upcomingAssignments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No upcoming assignments</p>
              ) : (
                data.upcomingAssignments.map(a => {
                  const daysLeft = Math.ceil((new Date(a.dueDate).getTime() - Date.now()) / 86400000)
                  return (
                    <div key={a.id} className="p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-sm">{a.title}</h4>
                          <p className="text-xs text-muted-foreground">{a.subjectName}</p>
                        </div>
                        <div className="text-right">
                          {a.submission ? (
                            <Badge variant={a.submission.status === 'graded' ? 'default' : 'secondary'} className="text-[10px]">
                              {a.submission.status}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">
                              {daysLeft}d left
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        Due: {new Date(a.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        <span>&middot;</span>
                        <span>Max: {a.maxScore}</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Grades */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg">Recent Grades</CardTitle>
            <BarChart3 className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
              {data.recentGrades.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No grades yet</p>
              ) : (
                data.recentGrades.map(g => (
                  <div key={g.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div>
                      <h4 className="font-medium text-sm">{g.subjectName}</h4>
                      <p className="text-xs text-muted-foreground">{g.categoryName}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${g.score >= 75 ? 'text-emerald-600' : g.score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                        {g.score}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg">Attendance Summary</CardTitle>
          <ClipboardList className="w-5 h-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Hadir', value: data.attendanceSummary.hadir, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' },
              { label: 'Terlambat', value: data.attendanceSummary.terlambat, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30' },
              { label: 'Izin', value: data.attendanceSummary.izin, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30' },
              { label: 'Sakit', value: data.attendanceSummary.sakit, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/30' },
              { label: 'Alpha', value: data.attendanceSummary.alpha, color: 'text-red-600 bg-red-50 dark:bg-red-950/30' },
            ].map(item => (
              <div key={item.label} className={`rounded-lg p-3 text-center ${item.color}`}>
                <p className="text-2xl font-bold">{item.value}</p>
                <p className="text-xs">{item.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Quizzes */}
      {data.upcomingQuizzes.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg">Upcoming Quizzes</CardTitle>
            <Brain className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.upcomingQuizzes.map(q => (
                <div key={q.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-950/30 flex items-center justify-center">
                      <Brain className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{q.title}</h4>
                      <p className="text-xs text-muted-foreground">{q.subjectName} &middot; {q.duration} min</p>
                    </div>
                  </div>
                  {q.startDate && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(q.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
