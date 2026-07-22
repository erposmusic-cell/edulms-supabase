'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle } from 'lucide-react'

interface Data {
  classStats: Array<{ id: string; name: string; major: string | null; totalStudents: number; hadir: number; terlambat: number; izin: number; sakit: number; alpha: number }>
  lowAttendance: Array<{ id: string; name: string; className: string; rate: number }>
}

export default function ViolationReports() {
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/dashboard/guru-bk')
        const d = await res.json()
        if (!d.error) setData(d)
      } catch (e) { console.error(e) } finally { setLoading(false) }
    }
    load()
  }, [])

  if (loading || !data) return <div className="space-y-4"><h1 className="text-2xl font-bold">Laporan Pelanggaran</h1><div className="animate-pulse h-64 bg-muted rounded-lg" /></div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Laporan Pelanggaran</h1>

      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-500" />Siswa dengan Kehadiran Rendah</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
            {data.lowAttendance.length === 0 ? <p className="text-center text-muted-foreground py-4">Tidak ada pelanggaran</p> :
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
