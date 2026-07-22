'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface ProfileData {
  student: { id: string; nis: string; user: { name: string; email: string }; class: { name: string } }
  stats: { totalDays: number; hadir: number; terlambat: number; izin: number; sakit: number; alpha: number; attendanceRate: number }
  attendance: Array<{ id: string; date: string; status: string; timeIn: string | null; timeOut: string | null; notes: string | null }>
  leaveRequests: Array<{ id: string; type: string; reason: string; startDate: string; status: string }>
}

export default function StudentProfile() {
  const [studentId, setStudentId] = useState<string | null>(null)
  const [data, setData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchStudents, setSearchStudents] = useState<Array<{ id: string; user: { name: string }; nis: string }>>([])

  useEffect(() => {
    fetch('/api/students').then(r => r.json()).then(d => { if (Array.isArray(d)) setSearchStudents(d) })
  }, [])

  useEffect(() => { if (studentId) loadData() }, [studentId])

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch(`/api/students/${studentId}/profile`)
      const d = await res.json()
      if (!d.error) setData(d)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  if (!studentId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Detail Siswa</h1>
        <Card><CardContent className="p-6">
          <p className="text-muted-foreground mb-4">Pilih siswa untuk melihat profil lengkap</p>
          <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
            {searchStudents.map(s => (
              <button key={s.id} onClick={() => setStudentId(s.id)} className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 text-left">
                <div><p className="font-medium">{s.user.name}</p><p className="text-sm text-muted-foreground">NIS: {s.nis}</p></div>
              </button>
            ))}
          </div>
        </CardContent></Card>
      </div>
    )
  }

  if (loading || !data) return <div className="space-y-4"><h1 className="text-2xl font-bold">Detail Siswa</h1><div className="animate-pulse h-64 bg-muted rounded-lg" /></div>

  const pieData = [
    { name: 'Hadir', value: data.stats.hadir, color: '#10b981' },
    { name: 'Terlambat', value: data.stats.terlambat, color: '#f59e0b' },
    { name: 'Izin', value: data.stats.izin, color: '#3b82f6' },
    { name: 'Sakit', value: data.stats.sakit, color: '#8b5cf6' },
    { name: 'Alpha', value: data.stats.alpha, color: '#ef4444' },
  ].filter(d => d.value > 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Profil Siswa</h1>
        <Badge variant="outline" onClick={() => setStudentId(null)} className="cursor-pointer">Kembali ke Daftar</Badge>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><p className="text-sm text-muted-foreground">Nama</p><p className="font-semibold">{data.student.user.name}</p></div>
            <div><p className="text-sm text-muted-foreground">NIS</p><p className="font-semibold">{data.student.nis}</p></div>
            <div><p className="text-sm text-muted-foreground">Email</p><p className="font-semibold">{data.student.user.email}</p></div>
            <div><p className="text-sm text-muted-foreground">Kelas</p><p className="font-semibold">{data.student.class.name}</p></div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Statistik Kehadiran</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg"><p className="text-2xl font-bold text-emerald-600">{data.stats.attendanceRate}%</p><p className="text-xs">Kehadiran</p></div>
              <div className="text-center p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg"><p className="text-2xl font-bold text-amber-600">{data.stats.terlambat}</p><p className="text-xs">Terlambat</p></div>
              <div className="text-center p-3 bg-red-50 dark:bg-red-950/30 rounded-lg"><p className="text-2xl font-bold text-red-600">{data.stats.alpha}</p><p className="text-xs">Alpha</p></div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Riwayat Absensi</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
              {data.attendance.slice(0, 20).map(a => (
                <div key={a.id} className="flex items-center justify-between p-2 rounded border">
                  <div>
                    <p className="text-sm font-medium">{new Date(a.date).toLocaleDateString('id-ID')}</p>
                    {a.notes && <p className="text-xs text-muted-foreground">{a.notes}</p>}
                  </div>
                  <Badge variant={a.status === 'hadir' ? 'default' : a.status === 'alpha' ? 'destructive' : 'secondary'}>{a.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
