'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ShieldCheck } from 'lucide-react'

interface AuditItem { id: string; studentName: string; changedByName: string; field: string; oldValue: string | null; newValue: string | null; createdAt: string }

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try { const res = await fetch('/api/audit-logs?limit=200'); const data = await res.json(); if (Array.isArray(data)) setLogs(data) }
    catch (e) { console.error(e) } finally { setLoading(false) }
  }

  const filtered = logs.filter(l =>
    l.studentName.toLowerCase().includes(search.toLowerCase()) ||
    l.changedByName.toLowerCase().includes(search.toLowerCase()) ||
    l.field.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="w-6 h-6" />Audit Log Siswa</h1>
      <Input placeholder="Cari audit log..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-md" />
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card border-b">
                <tr>
                  <th className="text-left py-3 px-4 font-medium">Waktu</th>
                  <th className="text-left py-3 px-4 font-medium">Siswa</th>
                  <th className="text-left py-3 px-4 font-medium">Diubah Oleh</th>
                  <th className="text-left py-3 px-4 font-medium">Field</th>
                  <th className="text-left py-3 px-4 font-medium">Nilai Lama</th>
                  <th className="text-left py-3 px-4 font-medium">Nilai Baru</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Memuat...</td></tr> :
                  filtered.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Tidak ada data</td></tr> :
                  filtered.map(l => (
                    <tr key={l.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 text-xs whitespace-nowrap">{new Date(l.createdAt).toLocaleString('id-ID')}</td>
                      <td className="py-3 px-4 font-medium">{l.studentName}</td>
                      <td className="py-3 px-4">{l.changedByName}</td>
                      <td className="py-3 px-4"><Badge variant="outline">{l.field}</Badge></td>
                      <td className="py-3 px-4 text-xs text-red-600 dark:text-red-400">{l.oldValue || '-'}</td>
                      <td className="py-3 px-4 text-xs text-emerald-600 dark:text-emerald-400">{l.newValue || '-'}</td>
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
