'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { signOut } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Data {
  classes: Array<{ id: string; name: string; major: string | null; students: Array<{ id: string; user: { name: string } }> }>
  totalStudents: number
  todayStats: { hadir: number; terlambat: number; izin: number; sakit: number; alpha: number; total: number }
  pendingLeaves: number
  trend: Array<{ date: string; hadir: number; terlambat: number; izin: number; sakit: number; alpha: number }>
  attendanceRate: number
}

export default function WaliKelasDashboard() {
  const { currentUser } = useAppStore()
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (currentUser) loadData()
    const interval = setInterval(() => { if (currentUser) loadData() }, 30000)
    return () => clearInterval(interval)
  }, [currentUser])

  const loadData = useCallback(async () => {
    try {
      setError('')
      const res = await fetch(`/api/dashboard/wali-kelas?userId=${currentUser!.id}`)
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

  if (loading) return <div className="space-y-4"><h1 className="text-2xl font-bold">Dashboard Wali Kelas</h1><div className="animate-pulse h-64 bg-muted rounded-lg" /></div>

  if (!data) return (
    <div className="text-center py-8">
      <h1 className="text-2xl font-bold mb-4">Dashboard Wali Kelas</h1>
      <p className="text-muted-foreground mb-2">Gagal memuat data dashboard</p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button onClick={loadData} className="mt-3 text-sm text-primary hover:underline">Coba lagi</button>
    </div>
  )

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard Wali Kelas</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Siswa</p><p className="text-3xl font-bold">{data.totalStudents}</p></div><Users className="w-10 h-10 text-primary opacity-20" /></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Kehadiran Hari Ini</p><p className="text-3xl font-bold text-emerald-600">{data.attendanceRate}%</p></div><CheckCircle className="w-10 h-10 text-emerald-500 opacity-20" /></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Terlambat</p><p className="text-3xl font-bold text-amber-600">{data.todayStats.terlambat}</p></div><Clock className="w-10 h-10 text-amber-500 opacity-20" /></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Izin Pending</p><p className="text-3xl font-bold text-red-600">{data.pendingLeaves}</p></div><AlertTriangle className="w-10 h-10 text-red-500 opacity-20" /></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Tren Kehadiran 7 Hari</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.trend}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
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
        <CardHeader><CardTitle className="text-lg">Daftar Siswa</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
            {data.classes.map(cls => (
              <div key={cls.id}>
                <h3 className="font-semibold mb-2">{cls.name}</h3>
                <div className="space-y-1">
                  {cls.students.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-2 rounded border hover:bg-muted/50">
                      <span className="text-sm">{s.user.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
