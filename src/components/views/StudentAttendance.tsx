'use client'

import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import {
  MapPin, LogIn, LogOut, Loader2, AlertTriangle,
  CheckCircle2, XCircle, Navigation, ShieldCheck, History
} from 'lucide-react'

// Dynamic import to avoid SSR issues with Leaflet
const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
      <p className="text-sm text-muted-foreground">Memuat peta...</p>
    </div>
  ),
})

interface TodayAttendance {
  id: string
  date: string
  status: string
  timeIn: string | null
  timeOut: string | null
  method: string | null
  latitude: number | null
  longitude: number | null
  notes: string | null
}

interface WeekRecord {
  id: string
  date: string
  status: string
  timeIn: string | null
  timeOut: string | null
  method: string | null
}

interface GeoLocation {
  latitude: number
  longitude: number
  accuracy: number
}

interface GeoStatus {
  loading: boolean
  supported: boolean
  error: string | null
  location: GeoLocation | null
  distance: number | null
  withinGeofence: boolean | null
  locationName: string | null
}

interface GeoFence {
  id: string
  name: string
  latitude: number
  longitude: number
  radius: number
}

const DAYS_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

export default function StudentAttendance() {
  const { currentUser } = useAppStore()
  const { toast } = useToast()

  const [studentId, setStudentId] = useState<string | null>(null)
  const [classId, setClassId] = useState<string | null>(null)
  const [academicYearId, setAcademicYearId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [todayRecord, setTodayRecord] = useState<TodayAttendance | null>(null)
  const [weekRecords, setWeekRecords] = useState<WeekRecord[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [settings, setSettings] = useState<{ timeIn: string; timeLate: string; timeOutMin: string; timeOutDeadline: string } | null>(null)
  const [geofences, setGeofences] = useState<GeoFence[]>([])

  const [geoStatus, setGeoStatus] = useState<GeoStatus>({
    loading: false,
    supported: typeof navigator !== 'undefined' && 'geolocation' in navigator,
    error: null,
    location: null,
    distance: null,
    withinGeofence: null,
    locationName: null,
  })

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Load student info
  useEffect(() => {
    if (currentUser) loadStudentInfo()
  }, [currentUser])

  async function loadStudentInfo() {
    try {
      const res = await fetch(`/api/students?userId=${currentUser!.id}`)
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        setStudentId(data[0].id)
        setClassId(data[0].classId)
        setAcademicYearId(data[0].class?.academicYearId || null)
      }
    } catch (e) {
      console.error('Failed to load student info:', e)
    }
  }

  // Load settings and today's attendance once studentId is available
  useEffect(() => {
    if (studentId) {
      loadSettings()
      loadTodayAttendance()
      loadWeekRecords()
      loadGeofences()
    }
  }, [studentId])

  async function loadSettings() {
    try {
      const res = await fetch('/api/settings')
      const data = await res.json()
      if (!data.error) setSettings(data)
    } catch (e) {
      console.error('Failed to load settings:', e)
    } finally {
      setLoading(false)
    }
  }

  async function loadGeofences() {
    try {
      const res = await fetch('/api/locations')
      const data = await res.json()
      if (Array.isArray(data)) {
        // Filter geofences relevant to this student's class
        const relevant = data.filter((loc: any) =>
          loc.locationClasses?.some((lc: any) => lc.classId === classId)
        )
        setGeofences(relevant.map((loc: any) => ({
          id: loc.id,
          name: loc.name,
          latitude: loc.latitude,
          longitude: loc.longitude,
          radius: loc.radius,
        })))
      }
    } catch (e) {
      console.error('Failed to load geofences:', e)
    }
  }

  async function loadTodayAttendance() {
    if (!studentId) return
    try {
      const today = new Date().toISOString().split('T')[0]
      const res = await fetch(`/api/attendance?studentId=${studentId}&date=${today}`)
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        setTodayRecord(data[0])
      } else {
        setTodayRecord(null)
      }
    } catch (e) {
      console.error('Failed to load today attendance:', e)
    }
  }

  async function loadWeekRecords() {
    if (!studentId) return
    try {
      const res = await fetch(`/api/attendance?studentId=${studentId}`)
      const data = await res.json()
      if (Array.isArray(data)) {
        const now = new Date()
        const startOfWeek = new Date(now)
        const day = startOfWeek.getDay()
        const diff = day === 0 ? 6 : day - 1
        startOfWeek.setDate(startOfWeek.getDate() - diff)
        startOfWeek.setHours(0, 0, 0, 0)

        const weekData = data.filter((r: WeekRecord) => new Date(r.date) >= startOfWeek)
        setWeekRecords(weekData)
      }
    } catch (e) {
      console.error('Failed to load week records:', e)
    }
  }

  // Get current geolocation
  const getGeolocation = useCallback((): Promise<GeoLocation | null> => {
    return new Promise((resolve) => {
      if (!('geolocation' in navigator)) {
        setGeoStatus(prev => ({ ...prev, supported: false, error: 'Browser Anda tidak mendukung GPS' }))
        resolve(null)
        return
      }

      setGeoStatus(prev => ({ ...prev, loading: true, error: null }))

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc: GeoLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          }
          setGeoStatus(prev => ({ ...prev, loading: false, location: loc }))
          resolve(loc)
        },
        (error) => {
          let errorMsg = 'Gagal mendapatkan lokasi GPS'
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMsg = 'Akses lokasi ditolak. Aktifkan GPS/Izin lokasi di browser Anda.'
              break
            case error.POSITION_UNAVAILABLE:
              errorMsg = 'Lokasi tidak tersedia. Pastikan GPS aktif.'
              break
            case error.TIMEOUT:
              errorMsg = 'Waktu habis saat mendapatkan lokasi. Coba lagi.'
              break
          }
          setGeoStatus(prev => ({ ...prev, loading: false, error: errorMsg }))
          toast({ title: 'GPS Error', description: errorMsg, variant: 'destructive' })
          resolve(null)
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 30000,
        }
      )
    })
  }, [toast])

  // Validate geofence on client side
  const checkGeofence = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(`/api/locations`)
      const locations = await res.json()
      if (!Array.isArray(locations) || locations.length === 0) {
        setGeoStatus(prev => ({
          ...prev,
          withinGeofence: true,
          distance: null,
          locationName: null,
        }))
        return true
      }

      let nearestDistance = Infinity
      let nearestName = ''
      let isInside = false

      for (const loc of locations) {
        const classMatch = loc.locationClasses?.some((lc: { classId: string }) => lc.classId === classId)
        if (!classMatch) continue

        const R = 6371000
        const phi1 = (lat * Math.PI) / 180
        const phi2 = (loc.latitude * Math.PI) / 180
        const dPhi = ((loc.latitude - lat) * Math.PI) / 180
        const dLambda = ((loc.longitude - lng) * Math.PI) / 180
        const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        const distance = R * c

        if (distance <= loc.radius) {
          isInside = true
          setGeoStatus(prev => ({
            ...prev,
            withinGeofence: true,
            distance: Math.round(distance),
            locationName: loc.name,
          }))
          return true
        }

        if (distance < nearestDistance) {
          nearestDistance = distance
          nearestName = loc.name
        }
      }

      if (!isInside && nearestName) {
        setGeoStatus(prev => ({
          ...prev,
          withinGeofence: false,
          distance: Math.round(nearestDistance),
          locationName: nearestName,
        }))
      } else {
        setGeoStatus(prev => ({
          ...prev,
          withinGeofence: true,
          distance: null,
          locationName: null,
        }))
      }
      return isInside
    } catch {
      return true
    }
  }, [classId])

  // Handle Clock In
  const handleClockIn = useCallback(async () => {
    if (!studentId || !academicYearId) {
      toast({ title: 'Error', description: 'Data siswa tidak ditemukan', variant: 'destructive' })
      return
    }

    const loc = await getGeolocation()
    if (!loc) return

    const insideFence = await checkGeofence(loc.latitude, loc.longitude)

    setSubmitting(true)
    try {
      const now = new Date()
      const today = now.toISOString().split('T')[0]
      const timeIn = now.toISOString()

      let status = 'hadir'
      if (settings?.timeLate) {
        const [lateH, lateM] = settings.timeLate.split(':').map(Number)
        const lateTime = new Date(now)
        lateTime.setHours(lateH, lateM, 0, 0)
        if (now > lateTime) {
          status = 'terlambat'
        }
      }

      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          academicYearId,
          date: today,
          timeIn,
          status,
          method: 'gps',
          latitude: loc.latitude,
          longitude: loc.longitude,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast({
          title: 'Absen Ditolak',
          description: data.error || 'Anda berada di luar area absensi',
          variant: 'destructive',
        })
        return
      }

      setTodayRecord(data)
      await loadWeekRecords()

      toast({
        title: status === 'terlambat' ? 'Absen Masuk (Terlambat)' : 'Absen Masuk Berhasil',
        description: insideFence
          ? `Lokasi terverifikasi${geoStatus.locationName ? ` di ${geoStatus.locationName}` : ''}`
          : 'Absen dicatat',
      })
    } catch {
      toast({ title: 'Error', description: 'Gagal menyimpan absensi', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }, [studentId, academicYearId, settings, getGeolocation, checkGeofence, toast, geoStatus.locationName])

  // Handle Clock Out
  const handleClockOut = useCallback(async () => {
    if (!todayRecord?.id) {
      toast({ title: 'Error', description: 'Belum ada record absensi masuk', variant: 'destructive' })
      return
    }

    const loc = await getGeolocation()
    if (!loc) return

    setSubmitting(true)
    try {
      const now = new Date()
      const timeOut = now.toISOString()

      const res = await fetch(`/api/attendance/${todayRecord.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeOut,
          method: 'gps',
          latitude: loc.latitude,
          longitude: loc.longitude,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast({ title: 'Error', description: data.error || 'Gagal absen pulang', variant: 'destructive' })
        return
      }

      setTodayRecord(data)
      await loadWeekRecords()

      toast({
        title: 'Absen Pulang Berhasil',
        description: `Jam keluar: ${new Date(timeOut).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`,
      })
    } catch {
      toast({ title: 'Error', description: 'Gagal menyimpan absensi pulang', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }, [todayRecord, getGeolocation, toast])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }

  const hasClockedIn = !!todayRecord?.timeIn
  const hasClockedOut = !!todayRecord?.timeOut

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Absensi GPS</h1>
        <p className="text-muted-foreground">Validasi kehadiran berbasis lokasi</p>
      </div>

      {/* Map Section - Full Width */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Peta Lokasi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 lg:h-80">
            <MapView
              userLocation={geoStatus.location ? {
                latitude: geoStatus.location.latitude,
                longitude: geoStatus.location.longitude,
                accuracy: geoStatus.location.accuracy,
              } : null}
              geofences={geofences}
              center={geoStatus.location
                ? [geoStatus.location.latitude, geoStatus.location.longitude]
                : geofences.length > 0
                  ? [geofences[0].latitude, geofences[0].longitude]
                  : [-6.2, 106.8]
              }
              zoom={16}
              className="h-full w-full"
            />
          </div>
          {!geoStatus.location && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Klik tombol absen untuk mengambil lokasi GPS dan menampilkan titik lokasi Anda
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Clock & Actions */}
        <div className="space-y-6">
          {/* Live Clock Card */}
          <Card>
            <CardContent className="p-6">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">{formatDate(currentTime)}</p>
                <p className="text-5xl font-bold tabular-nums tracking-wider">
                  {formatTime(currentTime)}
                </p>
                {settings && (
                  <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground mt-2">
                    <span>Jam Masuk: {settings.timeIn}</span>
                    <span>Telat: {settings.timeLate}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Location Status Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Navigation className="w-4 h-4" />
                Status Lokasi GPS
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!geoStatus.supported ? (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400">
                  <XCircle className="w-5 h-5 shrink-0" />
                  <p className="text-sm">Browser tidak mendukung GPS. Gunakan browser yang mendukung geolokasi.</p>
                </div>
              ) : geoStatus.loading ? (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400">
                  <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                  <p className="text-sm">Mengambil lokasi GPS...</p>
                </div>
              ) : geoStatus.error ? (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <p className="text-sm">{geoStatus.error}</p>
                </div>
              ) : geoStatus.location ? (
                <>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <p className="text-sm font-medium">Lokasi GPS aktif</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="p-2 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Latitude</p>
                      <p className="font-mono font-medium">{geoStatus.location.latitude.toFixed(6)}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Longitude</p>
                      <p className="font-mono font-medium">{geoStatus.location.longitude.toFixed(6)}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Akurasi</p>
                      <p className="font-medium">&plusmn;{Math.round(geoStatus.location.accuracy)}m</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Geofence</p>
                      {geoStatus.withinGeofence === true ? (
                        <p className="font-medium text-emerald-600 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Di Area
                        </p>
                      ) : geoStatus.withinGeofence === false ? (
                        <p className="font-medium text-red-600 flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> Di Luar
                        </p>
                      ) : (
                        <p className="font-medium text-muted-foreground">-</p>
                      )}
                    </div>
                  </div>
                  {geoStatus.distance !== null && geoStatus.locationName && (
                    <div className="p-2 rounded-lg bg-muted/50 text-sm">
                      <p className="text-xs text-muted-foreground">Jarak dari {geoStatus.locationName}</p>
                      <p className={`font-bold ${geoStatus.withinGeofence ? 'text-emerald-600' : 'text-red-600'}`}>
                        {geoStatus.distance}m {geoStatus.withinGeofence ? '(dalam radius)' : '(di luar radius)'}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted text-muted-foreground">
                  <MapPin className="w-5 h-5 shrink-0" />
                  <p className="text-sm">Klik tombol absen untuk mengambil lokasi GPS</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card>
            <CardContent className="p-6 space-y-3">
              {!hasClockedIn ? (
                <Button
                  className="w-full h-14 text-lg font-semibold"
                  onClick={handleClockIn}
                  disabled={submitting || geoStatus.loading || !academicYearId}
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <LogIn className="w-5 h-5 mr-2" />
                  )}
                  Absen Masuk
                </Button>
              ) : !hasClockedOut ? (
                <Button
                  className="w-full h-14 text-lg font-semibold"
                  variant="outline"
                  onClick={handleClockOut}
                  disabled={submitting || geoStatus.loading}
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <LogOut className="w-5 h-5 mr-2" />
                  )}
                  Absen Pulang
                </Button>
              ) : (
                <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                  <p className="font-semibold">Absensi hari ini sudah lengkap</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Today's Record & History */}
        <div className="space-y-6">
          {/* Today's Attendance Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Status Absensi Hari Ini
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todayRecord ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge
                      variant={
                        todayRecord.status === 'hadir' ? 'default' :
                        todayRecord.status === 'terlambat' ? 'secondary' :
                        todayRecord.status === 'alpha' ? 'destructive' : 'outline'
                      }
                      className="text-sm"
                    >
                      {todayRecord.status === 'hadir' ? 'Hadir' :
                       todayRecord.status === 'terlambat' ? 'Terlambat' :
                       todayRecord.status === 'alpha' ? 'Alpha' :
                       todayRecord.status === 'izin' ? 'Izin' :
                       todayRecord.status === 'sakit' ? 'Sakit' : todayRecord.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border">
                      <p className="text-xs text-muted-foreground mb-1">Jam Masuk</p>
                      <div className="flex items-center gap-2">
                        <LogIn className="w-4 h-4 text-emerald-500" />
                        <p className="text-lg font-bold">
                          {todayRecord.timeIn
                            ? new Date(todayRecord.timeIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                            : '-'}
                        </p>
                      </div>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <p className="text-xs text-muted-foreground mb-1">Jam Keluar</p>
                      <div className="flex items-center gap-2">
                        <LogOut className="w-4 h-4 text-amber-500" />
                        <p className="text-lg font-bold">
                          {todayRecord.timeOut
                            ? new Date(todayRecord.timeOut).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                            : '-'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Metode</span>
                    <div className="flex items-center gap-1">
                      {todayRecord.method === 'gps' && <Navigation className="w-3 h-3" />}
                      <span className="capitalize">{todayRecord.method || 'Manual'}</span>
                    </div>
                  </div>

                  {todayRecord.latitude && todayRecord.longitude && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Koordinat</span>
                      <span className="font-mono text-xs">
                        {Number(todayRecord.latitude).toFixed(4)}, {Number(todayRecord.longitude).toFixed(4)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MapPin className="w-12 h-12 mx-auto text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground mt-2">Belum ada absensi hari ini</p>
                  <p className="text-xs text-muted-foreground">Klik &quot;Absen Masuk&quot; untuk mulai</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* This Week's History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="w-5 h-5" />
                Riwayat Minggu Ini
              </CardTitle>
            </CardHeader>
            <CardContent>
              {weekRecords.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Belum ada riwayat absensi minggu ini</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                  {weekRecords.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div>
                        <p className="font-medium text-sm">
                          {DAYS_ID[new Date(r.date).getDay()]}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(r.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right text-xs">
                          <p>{r.timeIn ? new Date(r.timeIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'} - {r.timeOut ? new Date(r.timeOut).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</p>
                          {r.method && (
                            <p className="text-muted-foreground flex items-center justify-end gap-1">
                              {r.method === 'gps' && <Navigation className="w-3 h-3" />}
                              {r.method}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant={
                            r.status === 'hadir' ? 'default' :
                            r.status === 'terlambat' ? 'secondary' :
                            r.status === 'alpha' ? 'destructive' : 'outline'
                          }
                          className="text-xs"
                        >
                          {r.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
