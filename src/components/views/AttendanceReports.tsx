'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Download, FileText, FileSpreadsheet, Calendar, TrendingUp, Users, Clock } from 'lucide-react'

interface ReportData {
  records: Array<{
    id: string; date: string; status: string; student: { user: { name: string }; class: { name: string }; nis: string };
    timeIn: string | null; timeOut: string | null; method: string | null; notes: string | null
  }>
  summary: { totalRecords: number; hadir: number; terlambat: number; izin: number; sakit: number; alpha: number }
  byClass: Array<{ name: string; hadir: number; terlambat: number; izin: number; sakit: number; alpha: number; total: number }>
  dailyStats: Array<{ date: string; hadir: number; terlambat: number; izin: number; sakit: number; alpha: number }>
}

type PeriodType = 'daily' | 'weekly' | 'monthly' | 'yearly'

function getDateRange(period: PeriodType, referenceDate: string): { startDate: string; endDate: string } {
  const ref = new Date(referenceDate || new Date().toISOString().split('T')[0])

  switch (period) {
    case 'daily': {
      const d = ref.toISOString().split('T')[0]
      return { startDate: d, endDate: d }
    }
    case 'weekly': {
      const dayOfWeek = ref.getDay()
      const startOfWeek = new Date(ref)
      startOfWeek.setDate(ref.getDate() - dayOfWeek)
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      return {
        startDate: startOfWeek.toISOString().split('T')[0],
        endDate: endOfWeek.toISOString().split('T')[0],
      }
    }
    case 'monthly': {
      const startOfMonth = new Date(ref.getFullYear(), ref.getMonth(), 1)
      const endOfMonth = new Date(ref.getFullYear(), ref.getMonth() + 1, 0)
      return {
        startDate: startOfMonth.toISOString().split('T')[0],
        endDate: endOfMonth.toISOString().split('T')[0],
      }
    }
    case 'yearly': {
      const startOfYear = new Date(ref.getFullYear(), 0, 1)
      const endOfYear = new Date(ref.getFullYear(), 11, 31)
      return {
        startDate: startOfYear.toISOString().split('T')[0],
        endDate: endOfYear.toISOString().split('T')[0],
      }
    }
    default:
      return { startDate: referenceDate, endDate: referenceDate }
  }
}

function getPeriodLabel(period: PeriodType, startDate: string, endDate: string): string {
  const start = new Date(startDate)
  const end = new Date(endDate)

  switch (period) {
    case 'daily':
      return start.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    case 'weekly':
      return `${start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`
    case 'monthly':
      return start.toLocaleDateString('id-ID', { year: 'numeric', month: 'long' })
    case 'yearly':
      return `Tahun ${start.getFullYear()}`
    default:
      return `${start.toLocaleDateString('id-ID')} - ${end.toLocaleDateString('id-ID')}`
  }
}

export default function AttendanceReports() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [classId, setClassId] = useState('')
  const [period, setPeriod] = useState<PeriodType>('monthly')
  const [referenceDate, setReferenceDate] = useState(new Date().toISOString().split('T')[0])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([])
  const [academicYears, setAcademicYears] = useState<Array<{ id: string; name: string; isActive: boolean }>>([])
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('')
  const [customMode, setCustomMode] = useState(false)

  useEffect(() => {
    fetch('/api/classes').then(r => r.json()).then(d => { if (Array.isArray(d)) setClasses(d) })
    fetch('/api/academic-years').then(r => r.json()).then(d => {
      if (!d.error) {
        setAcademicYears(d)
        const active = d.find((ay: { isActive: boolean }) => ay.isActive)
        if (active) setSelectedAcademicYear(active.id)
      }
    })
  }, [])

  useEffect(() => {
    if (!customMode) {
      const range = getDateRange(period, referenceDate)
      setStartDate(range.startDate)
      setEndDate(range.endDate)
    }
  }, [period, referenceDate, customMode])

  useEffect(() => { loadData() }, [classId, startDate, endDate])

  async function loadData() {
    if (!startDate || !endDate) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (classId) params.set('classId', classId)
      params.set('startDate', startDate)
      params.set('endDate', endDate)
      if (selectedAcademicYear) params.set('academicYearId', selectedAcademicYear)
      const res = await fetch(`/api/reports?${params}`)
      const d = await res.json()
      if (!d.error) setData(d)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  function exportCSV() {
    if (!data) return
    const headers = 'Tanggal,NIS,Siswa,Kelas,Status,Jam Masuk,Jam Keluar,Metode,Catatan'
    const rows = data.records.map(r =>
      `${new Date(r.date).toLocaleDateString('id-ID')},${r.student?.nis || '-'},${r.student?.user?.name},${r.student?.class?.name},${r.status},${r.timeIn ? new Date(r.timeIn).toLocaleTimeString('id-ID') : '-'},${r.timeOut ? new Date(r.timeOut).toLocaleTimeString('id-ID') : '-'},${r.method || '-'},${r.notes || '-'}`
    )
    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `absensi-${period}-${startDate}-${endDate}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  function exportPDF() {
    if (!classId) {
      alert('Pilih kelas terlebih dahulu untuk mengekspor PDF')
      return
    }
    const params = new URLSearchParams({ classId, startDate, endDate })
    window.open(`/api/reports/attendance-pdf?${params}`, '_blank')
  }

  function exportExcel() {
    if (!classId) {
      alert('Pilih kelas terlebih dahulu untuk mengekspor Excel')
      return
    }
    const params = new URLSearchParams({ classId, startDate, endDate })
    window.open(`/api/reports/attendance-excel?${params}`, '_blank')
  }

  const periodLabel = customMode
    ? `${new Date(startDate).toLocaleDateString('id-ID')} - ${new Date(endDate).toLocaleDateString('id-ID')}`
    : getPeriodLabel(period, startDate, endDate)

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Laporan Absensi</h1>
        <div className="animate-pulse h-64 bg-muted rounded-lg" />
      </div>
    )
  }

  const attendanceRate = data.summary.totalRecords > 0
    ? Math.round((data.summary.hadir / data.summary.totalRecords) * 100)
    : 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" /> Laporan Absensi
          </h1>
          <p className="text-sm text-muted-foreground">{periodLabel}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-1" />CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportPDF} className="text-red-600 hover:text-red-700 hover:bg-red-50">
            <FileText className="w-4 h-4 mr-1" />PDF
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel} className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
            <FileSpreadsheet className="w-4 h-4 mr-1" />Excel
          </Button>
        </div>
      </div>

      {/* Filter Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Period Selector */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="space-y-1 flex-1">
                <label className="text-xs font-medium text-muted-foreground">Periode</label>
                <div className="flex gap-1 flex-wrap">
                  {(['daily', 'weekly', 'monthly', 'yearly'] as PeriodType[]).map(p => (
                    <Button
                      key={p}
                      variant={period === p && !customMode ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => { setPeriod(p); setCustomMode(false) }}
                      className="text-xs"
                    >
                      {p === 'daily' ? 'Harian' : p === 'weekly' ? 'Mingguan' : p === 'monthly' ? 'Bulanan' : 'Tahunan'}
                    </Button>
                  ))}
                  <Button
                    variant={customMode ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCustomMode(true)}
                    className="text-xs"
                  >
                    Custom
                  </Button>
                </div>
              </div>

              {!customMode && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    {period === 'daily' ? 'Tanggal' : period === 'weekly' ? 'Pilih Hari' : period === 'monthly' ? 'Pilih Bulan' : 'Pilih Tahun'}
                  </label>
                  <Input
                    type={period === 'yearly' ? 'number' : 'date'}
                    value={period === 'yearly' ? new Date(referenceDate).getFullYear() : referenceDate}
                    onChange={e => {
                      if (period === 'yearly') {
                        setReferenceDate(`${e.target.value}-01-01`)
                      } else {
                        setReferenceDate(e.target.value)
                      }
                    }}
                    min={period === 'yearly' ? 2020 : undefined}
                    max={period === 'yearly' ? 2030 : undefined}
                    placeholder={period === 'yearly' ? 'Tahun' : ''}
                  />
                </div>
              )}

              {customMode && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Dari</label>
                    <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Sampai</label>
                    <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                  </div>
                </>
              )}
            </div>

            {/* Class & Academic Year */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="space-y-1 flex-1">
                <label className="text-xs font-medium text-muted-foreground">Kelas</label>
                <Select value={classId} onValueChange={setSelectedClass}>
                  <SelectTrigger><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
                  <SelectContent>
                    {classes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
                <Users className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{data.summary.hadir}</p>
                <p className="text-xs text-muted-foreground">Hadir</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center">
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{data.summary.terlambat}</p>
                <p className="text-xs text-muted-foreground">Terlambat</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center">
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{data.summary.izin}</p>
                <p className="text-xs text-muted-foreground">Izin</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{data.summary.sakit}</p>
                <p className="text-xs text-muted-foreground">Sakit</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950/50 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{data.summary.alpha}</p>
                <p className="text-xs text-muted-foreground">Alpha</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold">{attendanceRate}%</p>
                <p className="text-xs text-muted-foreground">Kehadiran</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Tren Kehadiran</CardTitle></CardHeader>
          <CardContent>
            {data.dailyStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="hadir" stroke="#10b981" name="Hadir" strokeWidth={2} />
                  <Line type="monotone" dataKey="terlambat" stroke="#f59e0b" name="Terlambat" />
                  <Line type="monotone" dataKey="alpha" stroke="#ef4444" name="Alpha" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">Tidak ada data tren</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Perbandingan Kelas</CardTitle></CardHeader>
          <CardContent>
            {data.byClass.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.byClass}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="hadir" fill="#10b981" name="Hadir" />
                  <Bar dataKey="terlambat" fill="#f59e0b" name="Terlambat" />
                  <Bar dataKey="alpha" fill="#ef4444" name="Alpha" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">Pilih kelas untuk melihat data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Detail Kehadiran ({data.records.length} data)</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">No</th>
                  <th className="text-left py-2 px-2">Siswa</th>
                  <th className="text-left py-2 px-2">Kelas</th>
                  <th className="text-left py-2 px-2">Tanggal</th>
                  <th className="text-center py-2 px-2">Status</th>
                  <th className="text-left py-2 px-2">Metode</th>
                </tr>
              </thead>
              <tbody>
                {data.records.slice(0, 50).map((r, i) => (
                  <tr key={r.id} className="border-b hover:bg-muted/50">
                    <td className="py-1.5 px-2">{i + 1}</td>
                    <td className="py-1.5 px-2 font-medium">{r.student?.user?.name || '-'}</td>
                    <td className="py-1.5 px-2">{r.student?.class?.name || '-'}</td>
                    <td className="py-1.5 px-2">{new Date(r.date).toLocaleDateString('id-ID')}</td>
                    <td className="py-1.5 px-2 text-center">
                      <Badge variant={
                        r.status === 'hadir' ? 'default' :
                        r.status === 'alpha' ? 'destructive' :
                        'secondary'
                      } className="text-xs">
                        {r.status === 'hadir' ? 'Hadir' :
                         r.status === 'terlambat' ? 'Terlambat' :
                         r.status === 'izin' ? 'Izin' :
                         r.status === 'sakit' ? 'Sakit' : 'Alpha'}
                      </Badge>
                    </td>
                    <td className="py-1.5 px-2">{r.method || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.records.length > 50 && (
              <p className="text-sm text-muted-foreground text-center mt-3">
                Menampilkan 50 dari {data.records.length} data. Download PDF/Excel untuk semua data.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Per-Class Summary */}
      {data.byClass.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Ringkasan per Kelas</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">Kelas</th>
                    <th className="text-center py-2 px-3">Total</th>
                    <th className="text-center py-2 px-3">Hadir</th>
                    <th className="text-center py-2 px-3">Terlambat</th>
                    <th className="text-center py-2 px-3">Izin</th>
                    <th className="text-center py-2 px-3">Sakit</th>
                    <th className="text-center py-2 px-3">Alpha</th>
                    <th className="text-center py-2 px-3">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byClass.map(cls => (
                    <tr key={cls.name} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-3 font-medium">{cls.name}</td>
                      <td className="py-2 px-3 text-center">{cls.total}</td>
                      <td className="py-2 px-3 text-center text-emerald-600 font-medium">{cls.hadir}</td>
                      <td className="py-2 px-3 text-center text-amber-600">{cls.terlambat}</td>
                      <td className="py-2 px-3 text-center text-blue-600">{cls.izin}</td>
                      <td className="py-2 px-3 text-center text-purple-600">{cls.sakit}</td>
                      <td className="py-2 px-3 text-center text-red-600">{cls.alpha}</td>
                      <td className="py-2 px-3 text-center">
                        <Badge variant={cls.total > 0 && (cls.hadir / cls.total) >= 0.8 ? 'default' : cls.total > 0 && (cls.hadir / cls.total) >= 0.6 ? 'secondary' : 'destructive'}>
                          {cls.total > 0 ? Math.round((cls.hadir / cls.total) * 100) : 0}%
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
    </div>
  )
}