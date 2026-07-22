'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  ClipboardList,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Save,
  Filter,
  BarChart3,
} from 'lucide-react'

interface Student {
  id: string
  nis: string
  user: { id: string; name: string }
  classId: string
}

interface AttendanceRecord {
  id: string
  studentId: string
  date: string
  status: string
  notes: string | null
  student: { id: string; nis: string; user: { name: string } }
}

interface ClassItem {
  id: string
  name: string
  students: Student[]
}

interface AcademicYearItem {
  id: string
  name: string
  isActive: boolean
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ComponentType<{ className?: string }> }> = {
  hadir: { label: 'Hadir', color: 'text-emerald-700 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-950/50', icon: CheckCircle },
  izin: { label: 'Izin', color: 'text-blue-700 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-950/50', icon: AlertCircle },
  sakit: { label: 'Sakit', color: 'text-amber-700 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-950/50', icon: Clock },
  alpha: { label: 'Alpha', color: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-950/50', icon: XCircle },
}

const STATUS_COLORS_MAP: Record<string, string> = {
  hadir: '#10b981',
  izin: '#3b82f6',
  sakit: '#f59e0b',
  alpha: '#ef4444',
}

export default function AttendanceView() {
  const { currentUser } = useAppStore()
  const { toast } = useToast()
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [academicYears, setAcademicYears] = useState<AcademicYearItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('')
  const [attendanceMap, setAttendanceMap] = useState<Record<string, string>>({})
  const [attendanceNotes, setAttendanceNotes] = useState<Record<string, string>>({})
  const [existingAttendance, setExistingAttendance] = useState<AttendanceRecord[]>([])
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'take' | 'report'>(currentUser?.role === 'admin' ? 'report' : 'take')

  const isAdmin = currentUser?.role === 'admin'
  const isTeacher = currentUser?.role === 'teacher'

  const fetchClasses = useCallback(async () => {
    try {
      const res = await fetch('/api/classes')
      const data = await res.json()
      if (!data.error) setClasses(data)
    } catch (e) {
      console.error(e)
    }
  }, [])

  const fetchAcademicYears = useCallback(async () => {
    try {
      const res = await fetch('/api/academic-years')
      const data = await res.json()
      if (!data.error) {
        setAcademicYears(data)
        const active = data.find((ay: AcademicYearItem) => ay.isActive)
        if (active) setSelectedAcademicYear(active.id)
      }
    } catch (e) {
      console.error(e)
    }
  }, [])

  const fetchExistingAttendance = useCallback(async () => {
    if (!selectedClass || !selectedDate) return
    try {
      const params = new URLSearchParams()
      params.set('classId', selectedClass)
      params.set('date', selectedDate)
      if (selectedAcademicYear) params.set('academicYearId', selectedAcademicYear)
      const res = await fetch(`/api/attendance?${params}`)
      const data = await res.json()
      if (!data.error) {
        setExistingAttendance(data)
        const map: Record<string, string> = {}
        const notesMap: Record<string, string> = {}
        data.forEach((a: AttendanceRecord) => {
          map[a.studentId] = a.status
          if (a.notes) notesMap[a.studentId] = a.notes
        })
        setAttendanceMap(map)
        setAttendanceNotes(notesMap)
      }
    } catch (e) {
      console.error(e)
    }
  }, [selectedClass, selectedDate, selectedAcademicYear])

  useEffect(() => {
    Promise.all([fetchClasses(), fetchAcademicYears()]).finally(() => setLoading(false))
  }, [fetchClasses, fetchAcademicYears])

  useEffect(() => {
    if (selectedClass && selectedDate) fetchExistingAttendance()
  }, [selectedClass, selectedDate, fetchExistingAttendance])

  const handleSaveAttendance = async () => {
    if (!selectedClass || !selectedDate || !selectedAcademicYear) {
      toast({ title: 'Error', description: 'Pilih kelas, tanggal, dan tahun ajaran', variant: 'destructive' })
      return
    }

    const students = classes.find(c => c.id === selectedClass)?.students || []
    if (students.length === 0) {
      toast({ title: 'Error', description: 'Tidak ada siswa di kelas ini', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const results = await Promise.all(
        students.map(student => {
          const status = attendanceMap[student.id] || 'hadir'
          return fetch('/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              studentId: student.id,
              academicYearId: selectedAcademicYear,
              date: selectedDate,
              status,
              method: 'manual',
              notes: attendanceNotes[student.id] || null,
              createdBy: currentUser?.id,
            }),
          })
        })
      )
      const failed = results.filter(r => !r.ok).length
      if (failed > 0) {
        toast({ title: 'Peringatan', description: `${failed} data gagal disimpan`, variant: 'destructive' })
      } else {
        toast({ title: 'Berhasil', description: 'Absensi berhasil disimpan' })
      }
      fetchExistingAttendance()
    } catch {
      toast({ title: 'Error', description: 'Gagal menyimpan absensi', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const setAllStatus = (status: string) => {
    const students = classes.find(c => c.id === selectedClass)?.students || []
    const map: Record<string, string> = {}
    students.forEach(s => { map[s.id] = status })
    setAttendanceMap(map)
  }

  // Calculate stats for report
  const statusCounts = existingAttendance.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const pieData = Object.entries(statusCounts).map(([status, count]) => ({
    name: statusConfig[status]?.label || status,
    value: count,
    color: STATUS_COLORS_MAP[status] || '#999',
  }))

  // Attendance rate by class for admin report
  const [classStats, setClassStats] = useState<Array<{ name: string; hadir: number; izin: number; sakit: number; alpha: number; total: number; rate: number }>>([])

  const fetchClassStats = useCallback(async () => {
    if (!selectedAcademicYear) return
    try {
      const results = await Promise.all(
        classes.map(async cls => {
          const params = new URLSearchParams()
          params.set('classId', cls.id)
          params.set('academicYearId', selectedAcademicYear)
          const res = await fetch(`/api/attendance?${params}`)
          const data = await res.json()
          const counts = { hadir: 0, izin: 0, sakit: 0, alpha: 0, total: 0 }
          data.forEach((a: AttendanceRecord) => {
            if (counts[a.status as keyof typeof counts] !== undefined) {
              counts[a.status as keyof typeof counts]++
            }
            counts.total++
          })
          return {
            name: cls.name,
            ...counts,
            rate: counts.total > 0 ? Math.round((counts.hadir / counts.total) * 100) : 0,
          }
        })
      )
      setClassStats(results)
    } catch (e) {
      console.error(e)
    }
  }, [classes, selectedAcademicYear])

  useEffect(() => {
    if (isAdmin && tab === 'report' && selectedAcademicYear) fetchClassStats()
  }, [isAdmin, tab, selectedAcademicYear, fetchClassStats])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" /> Absensi
          </h1>
          <p className="text-sm text-muted-foreground">Kelola kehadiran siswa</p>
        </div>
        {(isAdmin || isTeacher) && (
          <div className="flex gap-2">
            <Button variant={tab === 'take' ? 'default' : 'outline'} size="sm" onClick={() => setTab('take')}>
              <ClipboardList className="w-4 h-4 mr-2" /> Input Absensi
            </Button>
            <Button variant={tab === 'report' ? 'default' : 'outline'} size="sm" onClick={() => setTab('report')}>
              <BarChart3 className="w-4 h-4 mr-2" /> Laporan
            </Button>
          </div>
        )}
      </div>

      {/* Take Attendance Tab */}
      {tab === 'take' && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="space-y-1 flex-1">
                  <label className="text-xs font-medium text-muted-foreground">Kelas</label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
                    <SelectContent>
                      {classes.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Tanggal</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Tahun Ajaran</label>
                  <Select value={selectedAcademicYear} onValueChange={setSelectedAcademicYear}>
                    <SelectTrigger className="w-48"><SelectValue placeholder="Pilih" /></SelectTrigger>
                    <SelectContent>
                      {academicYears.map(ay => (
                        <SelectItem key={ay.id} value={ay.id}>{ay.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {selectedClass && (
            <>
              {/* Quick Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">Set Semua:</span>
                {Object.entries(statusConfig).map(([key, cfg]) => (
                  <Button key={key} variant="outline" size="sm" className={cfg.color} onClick={() => setAllStatus(key)}>
                    <cfg.icon className="w-3 h-3 mr-1" /> {cfg.label}
                  </Button>
                ))}
              </div>

              {/* Student List - RESPONSIVE */}
              <Card>
                <CardContent className="p-0">
                  <ScrollArea className="max-h-[calc(100vh-520px)] sm:max-h-[calc(100vh-380px)]">
                    <div className="divide-y">
                      {classes.find(c => c.id === selectedClass)?.students.map((student, index) => {
                        const status = attendanceMap[student.id] || 'hadir'
                        const sc = statusConfig[status]
                        return (
                          <div key={student.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 hover:bg-muted/50">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className="w-8 text-center text-sm text-muted-foreground">{index + 1}</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{student.user.name}</p>
                                <p className="text-xs text-muted-foreground">NIS: {student.nis}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 pl-11 sm:pl-0">
                              {Object.entries(statusConfig).map(([key, cfg]) => (
                                <Button
                                  key={key}
                                  variant={status === key ? 'default' : 'outline'}
                                  size="sm"
                                  className={`h-7 text-[11px] px-2 sm:h-8 sm:text-xs sm:px-3 ${status === key ? cfg.bgColor + ' ' + cfg.color : ''}`}
                                  onClick={() => setAttendanceMap(m => ({ ...m, [student.id]: key }))}
                                >
                                  {cfg.label}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Bottom Bar - Sticky on mobile */}
              <div className="sticky bottom-0 z-10 bg-background border-t p-3 sm:static sm:border-0 sm:p-0 sm:bg-transparent">
                <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3 text-sm text-muted-foreground mb-3 sm:mb-2">
                  <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-emerald-500" /> Hadir: {Object.values(attendanceMap).filter(s => s === 'hadir').length}</span>
                  <span className="flex items-center gap-1"><AlertCircle className="w-4 h-4 text-blue-500" /> Izin: {Object.values(attendanceMap).filter(s => s === 'izin').length}</span>
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-amber-500" /> Sakit: {Object.values(attendanceMap).filter(s => s === 'sakit').length}</span>
                  <span className="flex items-center gap-1"><XCircle className="w-4 h-4 text-red-500" /> Alpha: {Object.values(attendanceMap).filter(s => s === 'alpha').length}</span>
                </div>
                <Button onClick={handleSaveAttendance} disabled={saving} className="gap-2 w-full sm:w-auto sm:self-end">
                  <Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan Absensi'}
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Report Tab */}
      {tab === 'report' && (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Tahun Ajaran</label>
                  <Select value={selectedAcademicYear} onValueChange={setSelectedAcademicYear}>
                    <SelectTrigger className="w-48"><SelectValue placeholder="Pilih" /></SelectTrigger>
                    <SelectContent>
                      {academicYears.map(ay => (
                        <SelectItem key={ay.id} value={ay.id}>{ay.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(statusConfig).map(([key, cfg]) => (
              <Card key={key}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${cfg.bgColor}`}>
                      <cfg.icon className={`w-5 h-5 ${cfg.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{statusCounts[key] || 0}</p>
                      <p className="text-xs text-muted-foreground">{cfg.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <Card>
              <CardHeader><CardTitle className="text-lg">Distribusi Kehadiran</CardTitle></CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">Pilih filter untuk melihat data</div>
                )}
              </CardContent>
            </Card>

            {/* Bar Chart - Attendance Rate per Class */}
            <Card>
              <CardHeader><CardTitle className="text-lg">Tingkat Kehadiran per Kelas</CardTitle></CardHeader>
              <CardContent>
                {classStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={classStats}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="hadir" fill="#10b981" name="Hadir" />
                      <Bar dataKey="izin" fill="#3b82f6" name="Izin" />
                      <Bar dataKey="sakit" fill="#f59e0b" name="Sakit" />
                      <Bar dataKey="alpha" fill="#ef4444" name="Alpha" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">Memuat data...</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Class Stats Table */}
          <Card>
            <CardHeader><CardTitle className="text-lg">Statistik per Kelas</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">Kelas</th>
                      <th className="text-center py-2 px-3">Total</th>
                      <th className="text-center py-2 px-3">Hadir</th>
                      <th className="text-center py-2 px-3">Izin</th>
                      <th className="text-center py-2 px-3">Sakit</th>
                      <th className="text-center py-2 px-3">Alpha</th>
                      <th className="text-center py-2 px-3">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classStats.map(cls => (
                      <tr key={cls.name} className="border-b hover:bg-muted/50">
                        <td className="py-2 px-3 font-medium">{cls.name}</td>
                        <td className="py-2 px-3 text-center">{cls.total}</td>
                        <td className="py-2 px-3 text-center text-emerald-600 font-medium">{cls.hadir}</td>
                        <td className="py-2 px-3 text-center text-blue-600">{cls.izin}</td>
                        <td className="py-2 px-3 text-center text-amber-600">{cls.sakit}</td>
                        <td className="py-2 px-3 text-center text-red-600">{cls.alpha}</td>
                        <td className="py-2 px-3 text-center">
                          <Badge variant={cls.rate >= 80 ? 'default' : cls.rate >= 60 ? 'secondary' : 'destructive'}>
                            {cls.rate}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}