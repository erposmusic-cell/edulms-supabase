'use client'

import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Plus, Pencil, Trash2, MapPin, Crosshair } from 'lucide-react'

// Dynamic import to avoid SSR issues with Leaflet
const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
      <p className="text-sm text-muted-foreground">Memuat peta...</p>
    </div>
  ),
})

interface LocationItem {
  id: string; name: string; latitude: number; longitude: number; radius: number;
  locationClasses: Array<{ class: { id: string; name: string }; classId: string }>
}

export default function LocationSettings() {
  const [locations, setLocations] = useState<LocationItem[]>([])
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', latitude: '', longitude: '', radius: '', classIds: [] as string[] })
  const [pickMode, setPickMode] = useState(false)
  const { toast } = useToast()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const [lRes, cRes] = await Promise.all([fetch('/api/locations'), fetch('/api/classes')])
      const lData = await lRes.json(); const cData = await cRes.json()
      if (Array.isArray(lData)) setLocations(lData); if (Array.isArray(cData)) setClasses(cData)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  async function handleSubmit() {
    if (!form.name || !form.latitude || !form.longitude || !form.radius) { toast({ title: 'Error', description: 'Data wajib belum lengkap', variant: 'destructive' }); return }
    try {
      const body = { ...form, latitude: parseFloat(form.latitude), longitude: parseFloat(form.longitude), radius: parseFloat(form.radius) }
      if (editId) {
        await fetch(`/api/locations/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        toast({ title: 'Berhasil', description: 'Lokasi diperbarui' })
      } else {
        await fetch('/api/locations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        toast({ title: 'Berhasil', description: 'Lokasi ditambahkan' })
      }
      setDialogOpen(false); setEditId(null); setForm({ name: '', latitude: '', longitude: '', radius: '', classIds: [] }); setPickMode(false); loadData()
    } catch (e) { toast({ title: 'Error', description: 'Gagal menyimpan', variant: 'destructive' }) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Yakin ingin menghapus?')) return
    try { await fetch(`/api/locations/${id}`, { method: 'DELETE' }); toast({ title: 'Berhasil', description: 'Lokasi dihapus' }); loadData() }
    catch (e) { toast({ title: 'Error', description: 'Gagal menghapus', variant: 'destructive' }) }
  }

  function openEdit(loc: LocationItem) {
    setEditId(loc.id)
    setForm({ name: loc.name, latitude: String(loc.latitude), longitude: String(loc.longitude), radius: String(loc.radius), classIds: loc.locationClasses.map(lc => lc.class.id) })
    setDialogOpen(true)
  }

  function openAdd() {
    setEditId(null)
    setForm({ name: '', latitude: '', longitude: '', radius: '', classIds: [] })
    setPickMode(false)
    setDialogOpen(true)
  }

  const handleLocationSelect = useCallback((lat: number, lng: number) => {
    setForm(prev => ({ ...prev, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }))
    setPickMode(false)
    toast({ title: 'Lokasi Dipilih', description: `${lat.toFixed(6)}, ${lng.toFixed(6)}` })
  }, [toast])

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      toast({ title: 'Error', description: 'Browser tidak mendukung GPS', variant: 'destructive' })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(prev => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }))
        toast({ title: 'Berhasil', description: 'Lokasi GPS Anda telah diambil' })
      },
      (err) => {
        toast({ title: 'GPS Error', description: 'Gagal mendapatkan lokasi GPS', variant: 'destructive' })
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // Map center based on form or first location
  const mapCenter: [number, number] = form.latitude && form.longitude
    ? [parseFloat(form.latitude), parseFloat(form.longitude)]
    : locations.length > 0
      ? [locations[0].latitude, locations[0].longitude]
      : [-6.2, 106.8]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pengaturan Lokasi</h1>
          <p className="text-sm text-muted-foreground">Kelola titik lokasi & area geofence untuk absensi GPS</p>
        </div>
        <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" />Tambah Lokasi</Button>
      </div>

      {/* Overview Map - hidden when dialog is open to prevent z-index overlay */}
      {!dialogOpen && (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Peta Lokasi Geofence
            {locations.length > 0 && (
              <Badge variant="secondary" className="ml-2">{locations.length} lokasi</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 lg:h-96">
            <MapView
              geofences={locations.map(loc => ({
                id: loc.id,
                name: loc.name,
                latitude: loc.latitude,
                longitude: loc.longitude,
                radius: loc.radius,
              }))}
              center={mapCenter}
              zoom={locations.length > 0 ? 15 : 12}
              className="h-full w-full"
              pickMode={pickMode && dialogOpen}
              onLocationSelect={handleLocationSelect}
            />
          </div>
          {pickMode && dialogOpen && (
            <p className="text-xs text-blue-600 mt-2 text-center font-medium">
              Klik pada peta untuk memilih titik lokasi
            </p>
          )}
        </CardContent>
      </Card>
      )}

      {/* Location Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? [...Array(2)].map((_, i) => <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-32 bg-muted rounded" /></CardContent></Card>) :
          locations.length === 0 ? (
            <div className="col-span-2 text-center py-12">
              <MapPin className="w-16 h-16 mx-auto text-muted-foreground/20" />
              <p className="text-muted-foreground mt-3">Belum ada lokasi yang ditambahkan</p>
              <p className="text-sm text-muted-foreground">Klik &quot;Tambah Lokasi&quot; untuk membuat titik lokasi geofence</p>
            </div>
          ) : (
            locations.map(loc => (
              <Card key={loc.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{loc.name}</h3>
                        <p className="text-sm text-muted-foreground font-mono">
                          {loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(loc)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(loc.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    <Badge variant="outline">Radius: {loc.radius}m</Badge>
                    {loc.locationClasses.map(lc => <Badge key={lc.class.id} variant="secondary">{lc.class.name}</Badge>)}
                  </div>
                  {/* Mini Map for each location */}
                  <div className="mt-3 h-32 rounded-lg overflow-hidden border">
                    <MapView
                      geofences={[{
                        id: loc.id,
                        name: loc.name,
                        latitude: loc.latitude,
                        longitude: loc.longitude,
                        radius: loc.radius,
                      }]}
                      center={[loc.latitude, loc.longitude]}
                      zoom={16}
                      className="h-full w-full"
                    />
                  </div>
                </CardContent>
              </Card>
            ))
          )
        }
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open)
        if (!open) { setEditId(null); setForm({ name: '', latitude: '', longitude: '', radius: '', classIds: [] }); setPickMode(false) }
      }}>
        <DialogContent className="max-w-lg z-[9999]">
          <DialogHeader><DialogTitle>{editId ? 'Edit' : 'Tambah'} Lokasi</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nama Lokasi</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Gerbang Utama" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Latitude</Label>
                <Input type="number" step="any" value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} placeholder="-6.2" />
              </div>
              <div>
                <Label>Longitude</Label>
                <Input type="number" step="any" value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} placeholder="106.8" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setPickMode(!pickMode)} className={pickMode ? 'bg-blue-50 text-blue-600 border-blue-300' : ''}>
                <Crosshair className="w-4 h-4 mr-1" />
                {pickMode ? 'Klik Peta di Atas' : 'Pilih dari Peta'}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleUseMyLocation}>
                <MapPin className="w-4 h-4 mr-1" />
                Lokasi GPS Saya
              </Button>
            </div>
            <div><Label>Radius (meter)</Label><Input type="number" value={form.radius} onChange={e => setForm({ ...form, radius: e.target.value })} placeholder="100" /></div>
            <div><Label>Kelas yang Berlaku</Label>
              <div className="space-y-2 mt-1">
                {classes.map(c => (
                  <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.classIds.includes(c.id)} onChange={e => {
                      if (e.target.checked) setForm({ ...form, classIds: [...form.classIds, c.id] })
                      else setForm({ ...form, classIds: form.classIds.filter(id => id !== c.id) })
                    }} className="rounded" />{c.name}
                  </label>
                ))}
                {classes.length === 0 && <p className="text-xs text-muted-foreground">Belum ada kelas tersedia</p>}
              </div>
            </div>
            <Button onClick={handleSubmit} className="w-full">{editId ? 'Simpan Perubahan' : 'Tambah Lokasi'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}