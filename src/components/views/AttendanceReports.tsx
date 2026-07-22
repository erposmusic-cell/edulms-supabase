'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { Input } from '@/components/ui/input'
import { Download, FileText, FileSpreadsheet } from 'lucide-react'

interface ReportData {
  records: Array<{
    id: string; date: string; status: string; student: { user: { name: string }; class: { name: string } };
    timeIn: string | null; timeOut: string | null; method: string | null
  }>
  summary: { totalRecords: number; hadir: number; terlambat: number; izin: number; sakit: number; alpha: number }
  byClass: Array<{ name: string; hadir: number; terlambat: number; izin: number; sakit: number; alpha: number; total: number }>
  dailyStats: Array<{ date: string; hadir: number; terlambat: number; izin: number; sakit: number; alpha: number }>
}

export default function AttendanceReports() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [classId, setClassId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => { fetch('/api/classes').then(r => r.json()).then(d => { if (Array.isArray(d)) setClasses(d) }) }, [])

  useEffect(() => { loadData() }, [classId, startDate, endDate])

  async function loadData() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (classId) params.set('classId', classId)
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      const res = await fetch(`/api/reports?${params}`)
      const d = await res.json()
      if (!d.error) setData(d)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  function exportCSV() {
    if (!data) return
    const headers = 'Tanggal,Siswa,Kelas,Status,Jam Masuk,Jam Keluar,Metode'
    const rows = data.records.map(r =>
      `${new Date(r.date).toLocaleDateString('id-ID')},${r.student?.user?.name},${r.student?.class?.name},${r.status},${r.timeIn ? new Date(r.timeIn).toLocaleTimeString('id-ID') : '-'},${r.timeOut ? new Date(r.timeOut).toLocaleTimeString('id-ID') : '-'},${r.method || '-'}`
    )
    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'attendance-report.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  function exportPDF() {
    if (!classId) {
      alert('Pilih kelas terlebih dahulu untuk mengekspor PDF')
      return
    }
    const params = new URLSearchParams({ classId, startDate: startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], endDate: endDate || new Date().toISOString().split('T')[0] })
    window.open(`/api/reports/attendance-pdf?${params}`, '_blank')
  }

  function exportExcel() {
    if (!classId) {
      alert('Pilih kelas terlebih dahulu untuk mengekspor Excel')
      return
    }
    const params = new URLSearchParams({ classId, startDate: startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], endDate: endDate || new Date().toISOString().split('T')[0] })
    window.open(`/api/reports/attendance-excel?${params}`, '_blank')
  }

  if (loading || !data) return <div className="space-y-4"><h1 className="text-2xl font-bold">Laporan Absensi</h1><div className="animate-pulse h-64 bg-muted rounded-lg" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Laporan Absensi</h1>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={exportCSV}><Download className="w-4 h-4 mr-2" />CSV</Button>
          <Button variant="outline" onClick={exportPDF} className="text-red-600 hover:text-red-700 hover:bg-red-50"><FileText className="w-4 h-4 mr-2" />PDF</Button>
          <Button variant="outline" onClick={exportExcel} className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"><FileSpreadsheet className="w-4 h-4 mr-2" />Excel</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div><label className="text-sm font-medium">Kelas</label>
              <select className="w-full border rounded-md p-2 bg-background" value={classId} onChange={e => setClassId(e.target.value)}>
                <option value="">Semua Kelas</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><label className="text-sm font-medium">Dari</label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
            <div><label className="text-sm font-medium">Sampai</label><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
            <div className="grid grid-cols-5 gap-2">
              <div className="text-center p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded"><p className="text-lg font-bold text-emerald-600">{data.summary.hadir}</p><p className="text-[10px]">Hadir</p></div>
              <div className="text-center p-2 bg-amber-50 dark:bg-amber-950/30 rounded"><p className="text-lg font-bold text-amber-600">{data.summary.terlambat}</p><p className="text-[10px]">Terlambat</p></div>
              <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/30 rounded"><p className="text-lg font-bold text-blue-600">{data.summary.izin}</p><p className="text-[10px]">Izin</p></div>
              <div className="text-center p-2 bg-purple-50 dark:bg-purple-950/30 rounded"><p className="text-lg font-bold text-purple-600">{data.summary.sakit}</p><p className="text-[10px]">Sakit</p></div>
              <div className="text-center p-2 bg-red-50 dark:bg-red-950/30 rounded"><p className="text-lg font-bold text-red-600">{data.summary.alpha}</p><p className="text-[10px]">Alpha</p></div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Tren Harian</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.dailyStats}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="hadir" stroke="#10b981" name="Hadir" />
                <Line type="monotone" dataKey="terlambat" stroke="#f59e0b" name="Terlambat" />
                <Line type="monotone" dataKey="alpha" stroke="#ef4444" name="Alpha" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Perbandingan Kelas</CardTitle></CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
