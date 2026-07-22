'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollText } from 'lucide-react'

interface LogItem { id: string; userName: string; userRole: string; action: string; details: string | null; createdAt: string }

export default function ActivityLogs() {
  const [logs, setLogs] = useState<LogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try { const res = await fetch('/api/activity-logs?limit=200'); const data = await res.json(); if (Array.isArray(data)) setLogs(data) }
    catch (e) { console.error(e) } finally { setLoading(false) }
  }

  const filtered = logs.filter(l =>
    l.userName.toLowerCase().includes(search.toLowerCase()) ||
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    (l.details || '').toLowerCase().includes(search.toLowerCase())
  )

  const actionColors: Record<string, string> = { LOGIN: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300', SEED_DB: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Log Aktivitas</h1>
      <Input placeholder="Cari log..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-md" />
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card border-b">
                <tr>
                  <th className="text-left py-3 px-4 font-medium">Waktu</th>
                  <th className="text-left py-3 px-4 font-medium">User</th>
                  <th className="text-left py-3 px-4 font-medium">Role</th>
                  <th className="text-left py-3 px-4 font-medium">Aksi</th>
                  <th className="text-left py-3 px-4 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Memuat...</td></tr> :
                  filtered.map(l => (
                    <tr key={l.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 text-xs whitespace-nowrap">{new Date(l.createdAt).toLocaleString('id-ID')}</td>
                      <td className="py-3 px-4 font-medium">{l.userName}</td>
                      <td className="py-3 px-4"><Badge variant="outline" className="capitalize">{l.userRole.replace('_', ' ')}</Badge></td>
                      <td className="py-3 px-4"><Badge className={actionColors[l.action] || ''}>{l.action}</Badge></td>
                      <td className="py-3 px-4 text-xs text-muted-foreground max-w-48 truncate">{l.details || '-'}</td>
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
