'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { QrCode, Copy, RefreshCw, Clock, Download, Trash2 } from 'lucide-react'
import QRCodeReact from 'react-qr-code'

interface QRItem { id: string; code: string; validFrom: string; validUntil: string; isActive: boolean; createdAt: string }

export default function QRCodeGenerator() {
  const [qrCodes, setQRCodes] = useState<QRItem[]>([])
  const [loading, setLoading] = useState(true)
  const [validFrom, setValidFrom] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [generating, setGenerating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { toast } = useToast()
  const qrRefs = useRef<Record<string, SVGSVGElement | null>>({})

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const res = await fetch('/api/qr-codes')
      const data = await res.json()
      if (Array.isArray(data)) setQRCodes(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function generateQR() {
    setGenerating(true)
    try {
      const now = new Date()
      const from = validFrom || now.toISOString()
      const until = validUntil || new Date(now.getTime() + 3600000).toISOString()
      const res = await fetch('/api/qr-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ validFrom: from, validUntil: until }),
      })
      if (res.ok) {
        toast({ title: 'Berhasil', description: 'QR Code berhasil digenerate' })
        loadData()
      } else {
        toast({ title: 'Error', description: 'Gagal generate QR', variant: 'destructive' })
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Gagal generate QR', variant: 'destructive' })
    } finally {
      setGenerating(false)
    }
  }

  async function deleteQR(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/qr-codes/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'Berhasil', description: 'QR Code berhasil dihapus' })
        loadData()
      } else {
        toast({ title: 'Error', description: 'Gagal menghapus QR Code', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus QR Code', variant: 'destructive' })
    } finally {
      setDeletingId(null)
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
    toast({ title: 'Disalin', description: 'Kode QR disalin ke clipboard' })
  }

  function isExpired(validUntil: string) {
    return new Date(validUntil) < new Date()
  }

  const downloadQR = useCallback((code: string) => {
    const svg = qrRefs.current[code]
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      const size = 400
      const padding = 40
      canvas.width = size + padding * 2
      canvas.height = size + padding * 2

      if (ctx) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, padding, padding, size, size)
      }

      const pngUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = `qr-code-${code}.png`
      link.href = pngUrl
      link.click()
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Generate QR Code</h1>

      <Card>
        <CardHeader><CardTitle className="text-lg">Generate QR Code Baru</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div><Label>Berlaku Dari</Label><Input type="datetime-local" value={validFrom} onChange={e => setValidFrom(e.target.value)} /></div>
            <div><Label>Berlaku Sampai</Label><Input type="datetime-local" value={validUntil} onChange={e => setValidUntil(e.target.value)} /></div>
            <Button onClick={generateQR} disabled={generating}>
              {generating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <QrCode className="w-4 h-4 mr-2" />}
              Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? [...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-40 bg-muted rounded" />
            </CardContent>
          </Card>
        )) :
          qrCodes.map(qr => {
            const expired = isExpired(qr.validUntil)
            return (
              <Card key={qr.id} className={expired ? 'opacity-60' : ''}>
                <CardContent className="p-6 text-center">
                  <div className="w-48 h-48 mx-auto bg-white rounded-lg flex items-center justify-center mb-4 p-3">
                    <QRCodeReact
                      value={qr.code}
                      size={180}
                      level="M"
                      ref={(el) => { qrRefs.current[qr.code] = el }}
                    />
                  </div>
                  <p className="font-mono text-lg font-bold tracking-wider">{qr.code}</p>
                  <div className="mt-2 space-y-1">
                    <Badge variant={expired ? 'destructive' : 'default'}>{expired ? 'Expired' : 'Aktif'}</Badge>
                    <p className="text-xs text-muted-foreground">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {new Date(qr.validFrom).toLocaleString('id-ID')} - {new Date(qr.validUntil).toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <Button variant="outline" size="sm" onClick={() => copyCode(qr.code)}>
                      <Copy className="w-4 h-4 mr-1" />Salin Kode
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => downloadQR(qr.code)}>
                      <Download className="w-4 h-4 mr-1" />Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteQR(qr.id)}
                      disabled={deletingId === qr.id}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })
        }
      </div>

      {!loading && qrCodes.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <QrCode className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Belum ada QR Code. Generate baru untuk memulai.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
