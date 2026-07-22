'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { signOut } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  CheckCircle, Clock, BarChart3, Megaphone,
  FileText, Users, GraduationCap
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface DashboardData {
  parent: { id: string; name: string; relation: string }
  child: { id: string; name: string; nis: string; className: string; major: string | null }
  attendanceSummary: { totalDays: number; hadir: number; terlambat: number; izin: number; sakit: number; alpha: number; attendanceRate: number }
  recentGrades: Array<{ id: string; subjectName: string; subjectCode: string; categoryName: string; score: number; date: string; description: string | null }>
  announcements: Array<{ id: string; title: string; content: string; priority: string; authorName: string; createdAt: string }>
  upcomingAssignments: Array<{ id: string; title: string; subjectName: string; dueDate: string; maxScore: number }>
}

export default function ParentDashboard() {
  const { currentUser } = useAppStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (currentUser) loadData()
  }, [currentUser])

  const loadData = useCallback(async () => {
    try {
      setError('')
      const res = await fetch(`/api/dashboard/parent?userId=${currentUser!.id}`)
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
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

  const attendanceChartData = [
    { name: 'Hadir', value: data.attendanceSummary.hadir, fill: '#10b981' },
    { name: 'Terlambat', value: data.attendanceSummary.terlambat, fill: '#f59e0b' },
    { name: 'Izin', value: data.attendanceSummary.izin, fill: '#3b82f6' },
    { name: 'Sakit', value: data.attendanceSummary.sakit, fill: '#8b5cf6' },
    { name: 'Alpha', value: data.attendanceSummary.alpha, fill: '#ef4444' },
  ]

  const avgGrade = data.recentGrades.length > 0
    ? Math.round(data.recentGrades.reduce((sum, g) => sum + g.score, 0) / data.recentGrades.length)
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Parent Dashboard</h1>
          <p className="text-muted-foreground">Welcome, {data.parent.name}</p>
        </div>
        <Badge variant="outline" className="text-sm">
          <Users className="w-3 h-3 mr-1" />
          {data.parent.relation === 'father' ? 'Father' : data.parent.relation === 'mother' ? 'Mother' : 'Guardian'}
        </Badge>
      </div>

      {/* Child Info Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{data.child.name}</h2>
              <p className="text-sm text-muted-foreground">NIS: {data.child.nis} &middot; {data.child.className}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Child&apos;s Attendance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="text-center">
                <p className="text-4xl font-bold text-emerald-600">{data.attendanceSummary.attendanceRate}%</p>
                <p className="text-sm text-muted-foreground">Attendance Rate</p>
              </div>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={attendanceChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {attendanceChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[
                { label: 'Hadir', value: data.attendanceSummary.hadir, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' },
                { label: 'Terlambat', value: data.attendanceSummary.terlambat, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30' },
                { label: 'Izin', value: data.attendanceSummary.izin, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30' },
                { label: 'Sakit', value: data.attendanceSummary.sakit, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/30' },
                { label: 'Alpha', value: data.attendanceSummary.alpha, color: 'text-red-600 bg-red-50 dark:bg-red-950/30' },
              ].map(item => (
                <div key={item.label} className={`rounded-lg p-2 text-center ${item.color}`}>
                  <p className="text-lg font-bold">{item.value}</p>
                  <p className="text-[10px]">{item.label}</p>
                </div>
              ))}
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
            <div className="flex items-center gap-4 mb-4 p-3 rounded-lg bg-muted/50">
              <div className="text-center">
                <p className="text-3xl font-bold text-teal-600">{avgGrade}</p>
                <p className="text-xs text-muted-foreground">Average</p>
              </div>
              <div className="flex-1">
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${avgGrade >= 75 ? 'bg-emerald-500' : avgGrade >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${avgGrade}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
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
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(g.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

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

      {/* Upcoming Assignments */}
      {data.upcomingAssignments.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg">Child&apos;s Upcoming Assignments</CardTitle>
            <FileText className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.upcomingAssignments.map(a => {
                const daysLeft = Math.ceil((new Date(a.dueDate).getTime() - Date.now()) / 86400000)
                return (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div>
                      <h4 className="font-medium text-sm">{a.title}</h4>
                      <p className="text-xs text-muted-foreground">{a.subjectName}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={daysLeft <= 2 ? 'destructive' : 'outline'} className="text-[10px]">
                        {daysLeft}d left
                      </Badge>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(a.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


