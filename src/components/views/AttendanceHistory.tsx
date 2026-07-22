'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ClipboardList } from 'lucide-react'

interface AttendanceItem { id: string; date: string; status: string; timeIn: string | null; timeOut: string | null; method: string | null; notes: string | null }

export default function AttendanceHistory() {
  const { currentUser } = useAppStore()
  const [records, setRecords] = useState<AttendanceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [studentId, setStudentId] = useState<string | null>(null)

  useEffect(() => {
    if (currentUser?.role === 'student' || currentUser?.role === 'parent') {
      fetch(`/api/students?userId=${currentUser.id}`).then(r => r.json()).then(d => {
        if (Array.isArray(d) && d.length > 0) {
          setStudentId(d[0].id)
        }
      })
    }
  }, [currentUser])

  useEffect(() => {
    if (studentId) loadData()
  }, [studentId])

  async function loadData() {
    try {
      const res = await fetch(`/api/attendance?studentId=${studentId}`)
      const data = await res.json()
      if (Array.isArray(data)) setRecords(data)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    hadir: 'default', terlambat: 'secondary', izin: 'outline', sakit: 'outline', alpha: 'destructive'
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Riwayat Absensi</h1>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card border-b">
                <tr>
                  <th className="text-left py-3 px-4 font-medium">Tanggal</th>
                  <th className="text-center py-3 px-4 font-medium">Status</th>
                  <th className="text-center py-3 px-4 font-medium">Jam Masuk</th>
                  <th className="text-center py-3 px-4 font-medium">Jam Keluar</th>
                  <th className="text-left py-3 px-4 font-medium">Metode</th>
                  <th className="text-left py-3 px-4 font-medium">Catatan</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Memuat...</td></tr> :
                  records.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Belum ada data absensi</td></tr> :
                  records.map(a => (
                    <tr key={a.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium">{new Date(a.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td className="py-3 px-4 text-center"><Badge variant={statusColors[a.status]}>{a.status}</Badge></td>
                      <td className="py-3 px-4 text-center">{a.timeIn ? new Date(a.timeIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                      <td className="py-3 px-4 text-center">{a.timeOut ? new Date(a.timeOut).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                      <td className="py-3 px-4 text-xs">{a.method || '-'}</td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">{a.notes || '-'}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
