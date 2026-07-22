'use client'

import { useEffect, useState, useCallback } from 'react'
import { signOut } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Users, GraduationCap, BookOpen, School,
  CheckCircle, Clock, AlertTriangle, Megaphone,
  Calendar, FileText, BarChart3
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface DashboardData {
  totalStudents: number
  totalTeachers: number
  totalClasses: number
  totalSubjects: number
  attendanceRate: number
  todayStats: { hadir: number; terlambat: number; izin: number; sakit: number; alpha: number; total: number }
  weeklyAttendance: Array<{ date: string; hadir: number; terlambat: number; izin: number; sakit: number; alpha: number }>
  recentAnnouncements: Array<{ id: string; title: string; content: string; priority: string; author: { name: string }; createdAt: string }>
  upcomingEvents: Array<{ id: string; title: string; description: string | null; startDate: string; type: string }>
  assignmentStats: { totalAssignments: number; totalSubmissions: number; pendingGrading: number; gradedSubmissions: number }
  gradeDistribution: Array<{ range: string; count: number }>
}

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444']

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadData = useCallback(async () => {
    try {
      setError('')
      const res = await fetch('/api/dashboard/admin')
      if (res.status === 401) {
        // Session expired - redirect to login
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
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
          <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
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

  const pieData = [
    { name: 'Hadir', value: data.todayStats.hadir, color: '#10b981' },
    { name: 'Terlambat', value: data.todayStats.terlambat, color: '#f59e0b' },
    { name: 'Izin', value: data.todayStats.izin, color: '#3b82f6' },
    { name: 'Sakit', value: data.todayStats.sakit, color: '#8b5cf6' },
    { name: 'Alpha', value: data.todayStats.alpha, color: '#ef4444' },
  ].filter(d => d.value > 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <Badge variant="outline" className="text-sm">
          <Clock className="w-3 h-3 mr-1" />
          Auto-refresh 30s
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-3xl font-bold">{data.totalStudents}</p>
              </div>
              <Users className="w-10 h-10 text-emerald-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Teachers</p>
                <p className="text-3xl font-bold">{data.totalTeachers}</p>
              </div>
              <GraduationCap className="w-10 h-10 text-teal-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Classes</p>
                <p className="text-3xl font-bold">{data.totalClasses}</p>
              </div>
              <School className="w-10 h-10 text-cyan-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Subjects</p>
                <p className="text-3xl font-bold">{data.totalSubjects}</p>
              </div>
              <BookOpen className="w-10 h-10 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today Attendance & Rate */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Hadir', value: data.todayStats.hadir, icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' },
          { label: 'Terlambat', value: data.todayStats.terlambat, icon: Clock, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30' },
          { label: 'Izin', value: data.todayStats.izin, icon: FileText, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30' },
          { label: 'Sakit', value: data.todayStats.sakit, icon: Users, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/30' },
          { label: 'Alpha', value: data.todayStats.alpha, icon: AlertTriangle, color: 'text-red-600 bg-red-50 dark:bg-red-950/30' },
        ].map(item => (
          <div key={item.label} className={`rounded-lg p-3 ${item.color}`}>
            <item.icon className="w-5 h-5 mb-1" />
            <p className="text-2xl font-bold">{item.value}</p>
            <p className="text-xs">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Attendance Bar Chart */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Weekly Attendance</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.weeklyAttendance}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="hadir" fill="#10b981" name="Hadir" radius={[4, 4, 0, 0]} />
                <Bar dataKey="terlambat" fill="#f59e0b" name="Terlambat" radius={[4, 4, 0, 0]} />
                <Bar dataKey="alpha" fill="#ef4444" name="Alpha" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Attendance Distribution Pie */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Today&apos;s Attendance Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Assignment Stats & Grade Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assignment Submission Stats */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Assignment Submissions</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-4 text-center">
                <p className="text-3xl font-bold text-emerald-600">{data.assignmentStats.totalAssignments}</p>
                <p className="text-sm text-muted-foreground">Total Assignments</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{data.assignmentStats.totalSubmissions}</p>
                <p className="text-sm text-muted-foreground">Total Submissions</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-3xl font-bold text-amber-600">{data.assignmentStats.pendingGrading}</p>
                <p className="text-sm text-muted-foreground">Pending Grading</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-3xl font-bold text-teal-600">{data.assignmentStats.gradedSubmissions}</p>
                <p className="text-sm text-muted-foreground">Graded</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grade Distribution */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Grade Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.gradeDistribution}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#14b8a6" name="Students" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Announcements & Events Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Announcements */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg">Recent Announcements</CardTitle>
            <Megaphone className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
              {data.recentAnnouncements.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No announcements</p>
              ) : (
                data.recentAnnouncements.map(a => (
                  <div key={a.id} className="p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-sm">{a.title}</h4>
                      <Badge variant={a.priority === 'urgent' ? 'destructive' : a.priority === 'high' ? 'default' : 'secondary'} className="shrink-0 text-[10px]">
                        {a.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {a.author.name} &middot; {new Date(a.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg">Upcoming Events</CardTitle>
            <Calendar className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
              {data.upcomingEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No upcoming events</p>
              ) : (
                data.upcomingEvents.map(e => (
                  <div key={e.id} className="p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        {e.type === 'exam' ? <BarChart3 className="w-5 h-5 text-primary" /> :
                         e.type === 'holiday' ? <Calendar className="w-5 h-5 text-primary" /> :
                         <FileText className="w-5 h-5 text-primary" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm">{e.title}</h4>
                        {e.description && <p className="text-xs text-muted-foreground mt-0.5">{e.description}</p>}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(e.startDate).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">{e.type}</Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
