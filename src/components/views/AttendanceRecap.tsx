'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Data {
  classes: Array<{ id: string; name: string; major: string | null; students: Array<{ id: string; user: { name: string } }> }>
  totalStudents: number
  todayStats: { hadir: number; terlambat: number; izin: number; sakit: number; alpha: number; total: number }
  pendingLeaves: number
  trend: Array<{ date: string; hadir: number; terlambat: number; alpha: number }>
  attendanceRate: number
}

export default function AttendanceRecap() {
  const { currentUser } = useAppStore()
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (currentUser) loadData()
  }, [currentUser])

  async function loadData() {
    try {
      const res = await fetch(`/api/dashboard/wali-kelas?userId=${currentUser!.id}`)
      const d = await res.json()
      if (!d.error) setData(d)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  if (loading || !data) return <div className="space-y-4"><h1 className="text-2xl font-bold">Rekap Kehadiran</h1><div className="animate-pulse h-64 bg-muted rounded-lg" /></div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Rekap Kehadiran</h1>

      <Card>
        <CardHeader><CardTitle className="text-lg">Tren 7 Hari Terakhir</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.trend}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="hadir" fill="#10b981" name="Hadir" />
              <Bar dataKey="terlambat" fill="#f59e0b" name="Terlambat" />
              <Bar dataKey="alpha" fill="#ef4444" name="Alpha" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {data.classes.map(cls => (
        <Card key={cls.id}>
          <CardHeader><CardTitle className="text-lg">{cls.name}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1">
              {cls.students.map(s => (
                <div key={s.id} className="flex items-center justify-between p-2 rounded border">
                  <span className="text-sm">{s.user.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
