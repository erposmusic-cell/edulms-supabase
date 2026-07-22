'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ClassStats {
  id: string; name: string; major: string | null; totalStudents: number; hadir: number; terlambat: number; izin: number; sakit: number; alpha: number
}

export default function AllClassesRecap() {
  const [classStats, setClassStats] = useState<ClassStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/dashboard/guru-bk')
        const d = await res.json()
        if (d.classStats) setClassStats(d.classStats)
      } catch (e) { console.error(e) } finally { setLoading(false) }
    }
    load()
  }, [])

  if (loading) return <div className="space-y-4"><h1 className="text-2xl font-bold">Rekap Semua Kelas</h1><div className="animate-pulse h-64 bg-muted rounded-lg" /></div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Rekap Semua Kelas</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {classStats.map(cls => (
          <Card key={cls.id}>
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg mb-3">{cls.name}</h3>
              <div className="grid grid-cols-5 gap-2">
                <div className="text-center p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded"><p className="text-lg font-bold text-emerald-600">{cls.hadir}</p><p className="text-[10px]">Hadir</p></div>
                <div className="text-center p-2 bg-amber-50 dark:bg-amber-950/30 rounded"><p className="text-lg font-bold text-amber-600">{cls.terlambat}</p><p className="text-[10px]">Terlambat</p></div>
                <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/30 rounded"><p className="text-lg font-bold text-blue-600">{cls.izin}</p><p className="text-[10px]">Izin</p></div>
                <div className="text-center p-2 bg-purple-50 dark:bg-purple-950/30 rounded"><p className="text-lg font-bold text-purple-600">{cls.sakit}</p><p className="text-[10px]">Sakit</p></div>
                <div className="text-center p-2 bg-red-50 dark:bg-red-950/30 rounded"><p className="text-lg font-bold text-red-600">{cls.alpha}</p><p className="text-[10px]">Alpha</p></div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <Badge variant="outline">{cls.totalStudents} Siswa</Badge>
                <span className="text-sm text-muted-foreground">
                  Kehadiran: {cls.totalStudents > 0 ? Math.round((cls.hadir + cls.terlambat) / cls.totalStudents * 100) : 0}%
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
