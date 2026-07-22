'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  QrCode, Camera, CameraOff, CheckCircle, XCircle, Clock,
  Loader2, Send, ScanLine, Keyboard, AlertCircle, MapPin, Navigation
} from 'lucide-react'

interface AttendanceResult {
  success: boolean
  message: string
  attendance?: {
    id: string
    status: string
    date: string
    timeIn: string
    student: {
      user: { name: string }
      class: { name: string }
    }
  }
}

interface GeoFence {
  id: string
  name: string
  latitude: number
  longitude: number
  radius: number
}

interface GeoStatus {
  loading: boolean
  supported: boolean
  error: string | null
  location: { latitude: number; longitude: number; accuracy: number } | null
  distance: number | null
  withinGeofence: boolean | null
  locationName: string | null
}

export default function QRAttendance() {
  const { currentUser } = useAppStore()
  const { toast } = useToast()
  const [qrCode, setQrCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<AttendanceResult | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [inputMode, setInputMode] = useState<'manual' | 'camera'>('manual')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [classId, setClassId] = useState<string | null>(null)
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

  // Fetch student profile to get studentId and classId
  useEffect(() => {
    if (currentUser?.role === 'student' && currentUser?.id) {
      fetch(`/api/students?userId=${currentUser.id}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setStudentId(data[0].id)
            setClassId(data[0].classId)
          }
        })
        .catch(console.error)
    }
  }, [currentUser])

  // Load geofences for student's class
  useEffect(() => {
    if (!classId) return
    async function loadGeofences() {
      try {
        const res = await fetch('/api/locations')
        const data = await res.json()
        if (Array.isArray(data)) {
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
    loadGeofences()
  }, [classId])

  // Get current geolocation
  const getGeolocation = useCallback((): Promise<{ latitude: number; longitude: number; accuracy: number } | null> => {
    return new Promise((resolve) => {
      if (!('geolocation' in navigator)) {
        setGeoStatus(prev => ({ ...prev, supported: false, error: 'Browser Anda tidak mendukung GPS' }))
        resolve(null)
        return
      }

      setGeoStatus(prev => ({ ...prev, loading: true, error: null }))

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
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
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
      )
    })
  }, [toast])

  // Check if user is within any geofence
  const checkGeofence = useCallback((lat: number, lng: number): boolean => {
    if (geofences.length === 0) {
      setGeoStatus(prev => ({ ...prev, withinGeofence: true, distance: null, locationName: null }))
      return true
    }

    let nearestDistance = Infinity
    let nearestName = ''
    let isInside = false

    for (const loc of geofences) {
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

    if (!isInside) {
      setGeoStatus(prev => ({
        ...prev,
        withinGeofence: false,
        distance: Math.round(nearestDistance),
        locationName: nearestName,
      }))
    }
    return isInside
  }, [geofences])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setCameraOpen(false)
    setCameraError(null)
  }, [])

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      streamRef.current = stream
      // Set cameraOpen first so the <video> element renders in the DOM
      setCameraOpen(true)
      // Wait for React to render the video element, then attach stream
      await new Promise(resolve => setTimeout(resolve, 100))
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        // Wait for video to be ready before playing
        await new Promise<void>((resolve) => {
          videoRef.current!.onloadedmetadata = () => {
            videoRef.current!.play()
              .then(() => resolve())
              .catch(() => resolve()) // Don't fail if autoplay blocked
          }
          setTimeout(() => resolve(), 3000) // Timeout fallback
        })
      }
    } catch (err) {
      console.error('Camera error:', err)
      setCameraError('Tidak dapat mengakses kamera. Pastikan izin kamera diaktifkan.')
    }
  }, [])

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const handleSubmit = async () => {
    if (!qrCode.trim()) {
      toast({ title: 'Error', description: 'Masukkan kode QR terlebih dahulu', variant: 'destructive' })
      return
    }

    if (!studentId) {
      toast({ title: 'Error', description: 'Data siswa tidak ditemukan. Silakan login ulang.', variant: 'destructive' })
      return
    }

    // Check geofence before submitting
    const loc = await getGeolocation()
    if (!loc) {
      toast({ title: 'GPS Diperlukan', description: 'Aktifkan GPS untuk melakukan absensi QR', variant: 'destructive' })
      return
    }

    const insideFence = checkGeofence(loc.latitude, loc.longitude)
    if (!insideFence) {
      toast({
        title: 'Di Luar Area Absensi',
        description: `Anda berada ${geoStatus.distance}m dari ${geoStatus.locationName}. Absensi hanya bisa dilakukan di area sekolah.`,
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    setResult(null)

    try {
      const res = await fetch('/api/attendance/qr-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: qrCode.trim().toUpperCase(),
          studentId,
          latitude: loc.latitude,
          longitude: loc.longitude,
        }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setResult(data)
        toast({
          title: 'Absensi Berhasil!',
          description: data.message,
        })
        setQrCode('')
      } else {
        setResult({
          success: false,
          message: data.error || 'Gagal melakukan absensi',
        })
        toast({
          title: 'Absensi Gagal',
          description: data.error || 'Gagal melakukan absensi',
          variant: 'destructive',
        })
      }
    } catch {
      const errorResult: AttendanceResult = {
        success: false,
        message: 'Terjadi kesalahan koneksi. Silakan coba lagi.',
      }
      setResult(errorResult)
      toast({
        title: 'Error',
        description: 'Terjadi kesalahan koneksi',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !submitting) {
      handleSubmit()
    }
  }

  const statusColorMap: Record<string, string> = {
    hadir: 'text-emerald-700 dark:text-emerald-400',
    terlambat: 'text-amber-700 dark:text-amber-400',
  }

  const statusBgMap: Record<string, string> = {
    hadir: 'bg-emerald-100 dark:bg-emerald-950/50',
    terlambat: 'bg-amber-100 dark:bg-amber-950/50',
  }

  const statusLabelMap: Record<string, string> = {
    hadir: 'Hadir',
    terlambat: 'Terlambat',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <QrCode className="w-6 h-6 text-primary" /> Absensi QR
        </h1>
        <p className="text-sm text-muted-foreground">Scan atau masukkan kode QR untuk absensi</p>
      </div>

      {/* Geofence Status Banner */}
      <Card className={geoStatus.withinGeofence === false ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/20' : geoStatus.withinGeofence === true ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20' : ''}>
        <CardContent className="p-4 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            geoStatus.withinGeofence === false ? 'bg-red-100 dark:bg-red-950/40' :
            geoStatus.withinGeofence === true ? 'bg-emerald-100 dark:bg-emerald-950/40' :
            'bg-muted'
          }`}>
            {geoStatus.loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : geoStatus.withinGeofence === false ? (
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            ) : geoStatus.withinGeofence === true ? (
              <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Navigation className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1">
            {geoStatus.loading ? (
              <p className="text-sm font-medium">Mengambil lokasi GPS...</p>
            ) : geoStatus.error ? (
              <>
                <p className="text-sm font-medium text-red-700 dark:text-red-300">GPS Error</p>
                <p className="text-xs text-red-600 dark:text-red-400">{geoStatus.error}</p>
              </>
            ) : geoStatus.withinGeofence === false ? (
              <>
                <p className="text-sm font-medium text-red-700 dark:text-red-300">Di Luar Area Absensi</p>
                <p className="text-xs text-red-600 dark:text-red-400">
                  Jarak {geoStatus.distance}m dari {geoStatus.locationName}. Anda harus berada di area sekolah.
                </p>
              </>
            ) : geoStatus.withinGeofence === true ? (
              <>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Lokasi Terverifikasi</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  {geoStatus.locationName ? `Di area ${geoStatus.locationName}` : 'Anda berada di area absensi'}
                  {geoStatus.distance !== null && ` (${geoStatus.distance}m dari titik)`}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Lokasi belum diketahui. GPS akan dicek saat absensi.</p>
            )}
          </div>
          {geoStatus.location && (
            <Badge variant="outline" className="text-xs shrink-0">
              {geoStatus.location.accuracy ? `±${Math.round(geoStatus.location.accuracy)}m` : 'GPS'}
            </Badge>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ScanLine className="w-5 h-5" /> Masukkan Kode QR
              </CardTitle>
              <CardDescription>
                Masukkan kode yang ditampilkan oleh guru atau scan QR code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mode Toggle */}
              <div className="flex gap-2">
                <Button
                  variant={inputMode === 'manual' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setInputMode('manual'); stopCamera() }}
                >
                  <Keyboard className="w-4 h-4 mr-2" /> Ketik Kode
                </Button>
                <Button
                  variant={inputMode === 'camera' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setInputMode('camera'); startCamera() }}
                >
                  <Camera className="w-4 h-4 mr-2" /> Kamera
                </Button>
              </div>

              {/* Manual Input */}
              {inputMode === 'manual' && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="qr-code">Kode QR</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="qr-code"
                        placeholder="Contoh: A1B2C3D4E5F6"
                        value={qrCode}
                        onChange={e => setQrCode(e.target.value.toUpperCase())}
                        onKeyDown={handleKeyDown}
                        className="font-mono text-lg tracking-widest"
                        disabled={submitting}
                      />
                      <Button
                        onClick={handleSubmit}
                        disabled={submitting || !qrCode.trim()}
                        className="shrink-0"
                      >
                        {submitting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4 mr-2" />
                        )}
                        {submitting ? '...' : 'Kirim'}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Masukkan 12 karakter kode yang ditampilkan di layar guru
                    </p>
                  </div>
                </div>
              )}

              {/* Camera Input */}
              {inputMode === 'camera' && (
                <div className="space-y-3">
                  <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                    {cameraOpen ? (
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                    ) : cameraError ? (
                      <div className="flex flex-col items-center justify-center h-full text-white p-4">
                        <AlertCircle className="w-10 h-10 mb-2 text-amber-400" />
                        <p className="text-sm text-center">{cameraError}</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-white">
                        <Camera className="w-10 h-10 mb-2 opacity-50" />
                        <p className="text-sm opacity-70">Memulai kamera...</p>
                      </div>
                    )}
                    {/* Scan overlay */}
                    {cameraOpen && (
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute inset-8 border-2 border-white/40 rounded-lg">
                          <div className="absolute top-0 left-0 w-6 h-6 border-t-3 border-l-3 border-primary rounded-tl" />
                          <div className="absolute top-0 right-0 w-6 h-6 border-t-3 border-r-3 border-primary rounded-tr" />
                          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-3 border-l-3 border-primary rounded-bl" />
                          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-3 border-r-3 border-primary rounded-br" />
                        </div>
                        <div className="absolute bottom-4 left-0 right-0 text-center">
                          <p className="text-white text-sm bg-black/50 inline-block px-3 py-1 rounded-full">
                            Arahkan kamera ke QR Code
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {cameraOpen && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={stopCamera}
                        className="w-full"
                      >
                        <CameraOff className="w-4 h-4 mr-2" /> Tutup Kamera
                      </Button>
                    </div>
                  )}

                  {/* Manual fallback when camera is open */}
                  {cameraOpen && (
                    <div>
                      <Label htmlFor="qr-code-fallback" className="text-xs text-muted-foreground">
                        Atau ketik kode manual:
                      </Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          id="qr-code-fallback"
                          placeholder="A1B2C3D4E5F6"
                          value={qrCode}
                          onChange={e => setQrCode(e.target.value.toUpperCase())}
                          onKeyDown={handleKeyDown}
                          className="font-mono tracking-widest"
                          disabled={submitting}
                        />
                        <Button onClick={handleSubmit} disabled={submitting || !qrCode.trim()} size="sm">
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-2">Cara Menggunakan:</h3>
              <ol className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0 h-5 w-5 p-0 text-xs flex items-center justify-center">1</Badge>
                  <span>Pastikan Anda berada di area sekolah (GPS aktif)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0 h-5 w-5 p-0 text-xs flex items-center justify-center">2</Badge>
                  <span>Guru menampilkan QR Code di layar</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0 h-5 w-5 p-0 text-xs flex items-center justify-center">3</Badge>
                  <span>Scan QR code dengan kamera atau catat kode yang ditampilkan</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0 h-5 w-5 p-0 text-xs flex items-center justify-center">4</Badge>
                  <span>Masukkan kode 12 karakter dan tekan Kirim</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0 h-5 w-5 p-0 text-xs flex items-center justify-center">5</Badge>
                  <span>Absensi berhasil dicatat secara otomatis</span>
                </li>
              </ol>
            </CardContent>
          </Card>
        </div>

        {/* Result Section */}
        <div className="space-y-4">
          {/* Success/Error Result */}
          {result && (
            <Card className={result.success ? 'border-emerald-200 dark:border-emerald-800' : 'border-red-200 dark:border-red-800'}>
              <CardContent className="p-6">
                {result.success ? (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
                      <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                        Absensi Berhasil!
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">{result.message}</p>
                    </div>
                    {result.attendance && (
                      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Nama</span>
                          <span className="text-sm font-medium">{result.attendance.student.user.name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Kelas</span>
                          <span className="text-sm font-medium">{result.attendance.student.class.name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Tanggal</span>
                          <span className="text-sm font-medium">
                            {new Date(result.attendance.date).toLocaleDateString('id-ID', {
                              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                            })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Waktu</span>
                          <span className="text-sm font-medium">
                            {new Date(result.attendance.timeIn).toLocaleTimeString('id-ID', {
                              hour: '2-digit', minute: '2-digit', second: '2-digit'
                            })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Status</span>
                          <Badge className={`${statusBgMap[result.attendance.status] || ''} ${statusColorMap[result.attendance.status] || ''}`}>
                            {statusLabelMap[result.attendance.status] || result.attendance.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Metode</span>
                          <Badge variant="outline">QR Code</Badge>
                        </div>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      className="mt-2"
                      onClick={() => setResult(null)}
                    >
                      Absensi Lagi
                    </Button>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center">
                      <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-red-700 dark:text-red-400">
                        Absensi Gagal
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">{result.message}</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setResult(null)}
                    >
                      Coba Lagi
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* No result yet - info card */}
          {!result && (
            <Card>
              <CardContent className="p-8 text-center">
                <QrCode className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="font-semibold text-lg mb-1">Belum Ada Absensi</h3>
                <p className="text-sm text-muted-foreground">
                  Masukkan kode QR yang ditampilkan oleh guru untuk melakukan absensi
                </p>
              </CardContent>
            </Card>
          )}

          {/* Current Time Display */}
          <CurrentTimeCard />
        </div>
      </div>
    </div>
  )
}

function CurrentTimeCard() {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-lg font-mono font-bold">
              {now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            <p className="text-xs text-muted-foreground">
              {now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
