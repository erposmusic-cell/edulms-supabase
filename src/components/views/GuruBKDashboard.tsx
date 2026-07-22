'use client'

import { useEffect, useState, useCallback } from 'react'
import { signOut } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GraduationCap, Users, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Data {
  classStats: Array<{ id: string; name: string; major: string | null; totalStudents: number; hadir: number; terlambat: number; izin: number; sakit: number; alpha: number }>
  totalClasses: number
  totalStudents: number
  pendingLeaves: number
  lowAttendance: Array<{ id: string; name: string; className: string; rate: number }>
}

export default function GuruBKDashboard() {
  const [data, setData] = useState<Data | null>(null)
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
      const res = await fetch('/api/dashboard/guru-bk')
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
  }, [])

  if (loading) return <div className="space-y-4"><h1 className="text-2xl font-bold">Dashboard Guru BK</h1><div className="animate-pulse h-64 bg-muted rounded-lg" /></div>

  if (!data) return (
    <div className="text-center py-8">
      <h1 className="text-2xl font-bold mb-4">Dashboard Guru BK</h1>
      <p className="text-muted-foreground mb-2">Gagal memuat data dashboard</p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button onClick={loadData} className="mt-3 text-sm text-primary hover:underline">Coba lagi</button>
    </div>
  )

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard Guru BK</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Kelas</p><p className="text-3xl font-bold">{data.totalClasses}</p></div><GraduationCap className="w-10 h-10 text-primary opacity-20" /></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Siswa</p><p className="text-3xl font-bold">{data.totalStudents}</p></div><Users className="w-10 h-10 text-primary opacity-20" /></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Izin Pending</p><p className="text-3xl font-bold text-amber-600">{data.pendingLeaves}</p></div><AlertTriangle className="w-10 h-10 text-amber-500 opacity-20" /></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Rekap Semua Kelas Hari Ini</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.classStats}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="hadir" fill="#10b981" name="Hadir" />
              <Bar dataKey="terlambat" fill="#f59e0b" name="Terlambat" />
              <Bar dataKey="alpha" fill="#ef4444" name="Alpha" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Siswa dengan Kehadiran Rendah</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
            {data.lowAttendance.length === 0 ? <p className="text-center text-muted-foreground py-4">Tidak ada siswa dengan kehadiran rendah</p> :
              data.lowAttendance.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div><p className="font-medium">{s.name}</p><p className="text-sm text-muted-foreground">{s.className}</p></div>
                  <Badge variant={s.rate < 50 ? 'destructive' : 'secondary'}>{s.rate}%</Badge>
                </div>
              ))
            }
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
