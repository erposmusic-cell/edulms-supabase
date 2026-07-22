'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts'
import {
  BarChart3,
  Users,
  GraduationCap,
  BookOpen,
  Megaphone,
  TrendingUp,
  Download,
  ClipboardList,
  Brain,
  PenTool,
  FileText,
  FileSpreadsheet,
} from 'lucide-react'

interface AnalyticsData {
  studentPerformance: Array<{ name: string; avgGrade: number; studentCount: number }>
  attendanceRate: Array<{ name: string; rate: number; total: number; hadir: number }>
  assignmentCompletion: {
    totalAssignments: number
    totalSubmissions: number
    completionRate: number
    byClass: Array<{ name: string; completionRate: number }>
  }
  quizPerformance: Array<{ month: string; avgScore: number; attemptCount: number }>
  overview: {
    totalStudents: number
    totalTeachers: number
    totalBooks: number
    totalAnnouncements: number
  }
}

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#ec4899', '#14b8a6', '#f97316']

export default function ReportsAnalytics() {
  const { currentUser } = useAppStore()
  const { toast } = useToast()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics')
      const d = await res.json()
      if (!d.error) setData(d)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleExport = () => {
    if (!data) return
    const csvContent = [
      ['Metric', 'Value'],
      ['Total Students', data.overview.totalStudents],
      ['Total Teachers', data.overview.totalTeachers],
      ['Total Books', data.overview.totalBooks],
      ['Total Announcements', data.overview.totalAnnouncements],
      ['Assignment Completion Rate', `${data.assignmentCompletion.completionRate}%`],
      ...data.studentPerformance.map(p => [`Avg Grade - ${p.name}`, p.avgGrade]),
      ...data.attendanceRate.map(a => [`Attendance Rate - ${a.name}`, `${a.rate}%`]),
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: 'Berhasil', description: 'Laporan CSV berhasil diekspor' })
  }

  const handleExportPDF = () => {
    window.open('/api/reports/analytics-pdf', '_blank')
    toast({ title: 'Berhasil', description: 'Laporan PDF sedang diunduh' })
  }

  const handleExportExcel = () => {
    window.open('/api/reports/students-excel', '_blank')
    toast({ title: 'Berhasil', description: 'Data siswa Excel sedang diunduh' })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
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

  if (!data) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <BarChart3 className="w-12 h-12 mx-auto mb-4" />
        <p>Gagal memuat data analitik</p>
        <Button onClick={fetchData} className="mt-4">Coba Lagi</Button>
      </div>
    )
  }

  const attendancePieData = data.attendanceRate.map((a, i) => ({
    name: a.name,
    value: a.hadir,
    color: COLORS[i % COLORS.length],
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" /> Laporan & Analitik
          </h1>
          <p className="text-sm text-muted-foreground">Ringkasan performa akademik dan kehadiran</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" /> CSV
          </Button>
          <Button variant="outline" onClick={handleExportPDF} className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50">
            <FileText className="w-4 h-4" /> PDF
          </Button>
          <Button variant="outline" onClick={handleExportExcel} className="gap-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.overview.totalStudents}</p>
                <p className="text-xs text-muted-foreground">Siswa</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-950/50 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.overview.totalTeachers}</p>
                <p className="text-xs text-muted-foreground">Guru</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.overview.totalBooks}</p>
                <p className="text-xs text-muted-foreground">Buku</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center">
                <Megaphone className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.overview.totalAnnouncements}</p>
                <p className="text-xs text-muted-foreground">Pengumuman</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="performance" className="gap-1"><TrendingUp className="w-4 h-4" /> Performa</TabsTrigger>
          <TabsTrigger value="attendance" className="gap-1"><ClipboardList className="w-4 h-4" /> Kehadiran</TabsTrigger>
          <TabsTrigger value="assignments" className="gap-1"><PenTool className="w-4 h-4" /> Tugas</TabsTrigger>
          <TabsTrigger value="quizzes" className="gap-1"><Brain className="w-4 h-4" /> Quiz</TabsTrigger>
        </TabsList>

        {/* Student Performance */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Rata-rata Nilai per Kelas</CardTitle></CardHeader>
              <CardContent>
                {data.studentPerformance.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.studentPerformance}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="avgGrade" fill="#10b981" name="Rata-rata Nilai" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">Belum ada data nilai</div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">Jumlah Siswa per Kelas</CardTitle></CardHeader>
              <CardContent>
                {data.studentPerformance.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.studentPerformance}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="studentCount" fill="#14b8a6" name="Jumlah Siswa" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">Belum ada data</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Performance Table */}
          <Card>
            <CardHeader><CardTitle className="text-lg">Detail Performa Siswa</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">Kelas</th>
                      <th className="text-center py-2 px-3">Jumlah Siswa</th>
                      <th className="text-center py-2 px-3">Rata-rata Nilai</th>
                      <th className="text-center py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.studentPerformance.map(p => (
                      <tr key={p.name} className="border-b hover:bg-muted/50">
                        <td className="py-2 px-3 font-medium">{p.name}</td>
                        <td className="py-2 px-3 text-center">{p.studentCount}</td>
                        <td className="py-2 px-3 text-center font-bold">{p.avgGrade}</td>
                        <td className="py-2 px-3 text-center">
                          <Badge variant={p.avgGrade >= 75 ? 'default' : p.avgGrade >= 60 ? 'secondary' : 'destructive'}>
                            {p.avgGrade >= 75 ? 'Baik' : p.avgGrade >= 60 ? 'Cukup' : 'Kurang'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance */}
        <TabsContent value="attendance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Tingkat Kehadiran per Kelas</CardTitle></CardHeader>
              <CardContent>
                {data.attendanceRate.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.attendanceRate}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="rate" fill="#10b981" name="Kehadiran (%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">Belum ada data kehadiran</div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">Distribusi Kehadiran</CardTitle></CardHeader>
              <CardContent>
                {attendancePieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={attendancePieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {attendancePieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">Belum ada data</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Assignments */}
        <TabsContent value="assignments" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <PenTool className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-3xl font-bold">{data.assignmentCompletion.totalAssignments}</p>
                <p className="text-sm text-muted-foreground">Total Tugas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <ClipboardList className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-3xl font-bold">{data.assignmentCompletion.totalSubmissions}</p>
                <p className="text-sm text-muted-foreground">Total Pengumpulan</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-8 h-8 text-teal-500 mx-auto mb-2" />
                <p className="text-3xl font-bold">{data.assignmentCompletion.completionRate}%</p>
                <p className="text-sm text-muted-foreground">Tingkat Penyelesaian</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-lg">Tingkat Penyelesaian Tugas per Kelas</CardTitle></CardHeader>
            <CardContent>
              {data.assignmentCompletion.byClass.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.assignmentCompletion.byClass}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="completionRate" fill="#14b8a6" name="Penyelesaian (%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground">Belum ada data tugas</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quiz Performance */}
        <TabsContent value="quizzes" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Tren Performa Quiz</CardTitle></CardHeader>
            <CardContent>
              {data.quizPerformance.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={data.quizPerformance}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                    <Tooltip />
                    <Area type="monotone" dataKey="avgScore" stroke="#10b981" fill="#10b981" fillOpacity={0.2} name="Rata-rata Skor" strokeWidth={2} />
                    <Line type="monotone" dataKey="attemptCount" stroke="#f59e0b" name="Jumlah Percobaan" strokeWidth={2} yAxisId={0} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground">Belum ada data quiz</div>
              )}
            </CardContent>
          </Card>

          {data.quizPerformance.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Detail Performa Quiz</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3">Bulan</th>
                        <th className="text-center py-2 px-3">Rata-rata Skor</th>
                        <th className="text-center py-2 px-3">Jumlah Percobaan</th>
                        <th className="text-center py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.quizPerformance.map(q => (
                        <tr key={q.month} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-3 font-medium">{q.month}</td>
                          <td className="py-2 px-3 text-center font-bold">{q.avgScore}</td>
                          <td className="py-2 px-3 text-center">{q.attemptCount}</td>
                          <td className="py-2 px-3 text-center">
                            <Badge variant={q.avgScore >= 75 ? 'default' : q.avgScore >= 60 ? 'secondary' : 'destructive'}>
                              {q.avgScore >= 75 ? 'Baik' : q.avgScore >= 60 ? 'Cukup' : 'Kurang'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
