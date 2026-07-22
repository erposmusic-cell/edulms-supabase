'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/lib/store'
import { ScanFace, Camera, CheckCircle, XCircle, Loader2, AlertCircle, Clock, RefreshCw, MapPin, Navigation } from 'lucide-react'

type ModelsStatus = 'loading' | 'loaded' | 'error'
type VerifyResult = {
  success: boolean
  message: string
  distance?: number
  attendance?: {
    id: string
    status: string
    timeIn: string
    date: string
    student?: { user: { name: string }; class?: { name: string } }
  }
} | null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FaceApiModule = any // face-api.js module

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

export default function FaceAttendance() {
  const { currentUser } = useAppStore()
  const [modelsStatus, setModelsStatus] = useState<ModelsStatus>('loading')
  const [modelsError, setModelsError] = useState<string>('')
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string>('')
  const [faceDetected, setFaceDetected] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<VerifyResult>(null)
  const [studentData, setStudentData] = useState<{
    id: string
    faceRegistered: boolean
    nis: string
    user: { name: string }
    class: { name: string }
  } | null>(null)
  const [classId, setClassId] = useState<string | null>(null)
  const [geofences, setGeofences] = useState<GeoFence[]>([])
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const faceApiRef = useRef<FaceApiModule | null>(null)
  const { toast } = useToast()

  const [geoStatus, setGeoStatus] = useState<GeoStatus>({
    loading: false,
    supported: typeof navigator !== 'undefined' && 'geolocation' in navigator,
    error: null,
    location: null,
    distance: null,
    withinGeofence: null,
    locationName: null,
  })

  // Load student data
  useEffect(() => {
    if (!currentUser) return
    const userId = currentUser.id
    async function loadStudent() {
      try {
        const res = await fetch(`/api/students?userId=${userId}`)
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          setStudentData(data[0])
          setClassId(data[0].classId)
        }
      } catch (err) {
        console.error('Failed to load student data:', err)
      }
    }
    loadStudent()
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

  // Load face-api.js models
  useEffect(() => {
    let cancelled = false
    async function loadModels() {
      try {
        const faceapi = await import('face-api.js')
        if (cancelled) return
        faceApiRef.current = faceapi
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        ])
        if (!cancelled) {
          setModelsStatus('loaded')
        }
      } catch (err) {
        console.error('Failed to load face-api.js models:', err)
        if (!cancelled) {
          setModelsStatus('error')
          setModelsError('Gagal memuat model AI. Pastikan file model tersedia di /public/models.')
        }
      }
    }
    loadModels()
    return () => { cancelled = true }
  }, [])

  // Start/stop camera
  const startCamera = useCallback(async () => {
    setCameraError('')
    setFaceDetected(false)
    setVerifyResult(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      })
      streamRef.current = stream
      // Set cameraActive first so the video element renders in DOM
      setCameraActive(true)
      // Wait for React to render the video element, then attach stream
      await new Promise(resolve => setTimeout(resolve, 100))
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        // Wait for video to be ready before playing
        await new Promise<void>((resolve) => {
          videoRef.current!.onloadedmetadata = () => {
            videoRef.current!.play()
              .then(() => resolve())
              .catch(() => resolve())
          }
          setTimeout(() => resolve(), 3000)
        })
      }
    } catch (err: unknown) {
      console.error('Camera access error:', err)
      const mediaError = err as DOMException
      if (mediaError.name === 'NotAllowedError' || mediaError.name === 'PermissionDeniedError') {
        setCameraError('Akses kamera ditolak. Silakan izinkan akses kamera di pengaturan browser.')
      } else if (mediaError.name === 'NotFoundError') {
        setCameraError('Kamera tidak ditemukan. Pastikan perangkat memiliki kamera.')
      } else if (mediaError.name === 'NotReadableError') {
        setCameraError('Kamera sedang digunakan oleh aplikasi lain.')
      } else {
        setCameraError('Gagal mengakses kamera. Silakan coba lagi.')
      }
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
    setFaceDetected(false)
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
      detectionIntervalRef.current = null
    }
  }, [])

  // Live face detection
  useEffect(() => {
    if (!cameraActive || !videoRef.current || modelsStatus !== 'loaded' || !faceApiRef.current) return

    const faceapi = faceApiRef.current
    let active = true

    const detectFace = async () => {
      if (!active || !videoRef.current || videoRef.current.readyState < 2) return

      try {
        const detections = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
          .withFaceLandmarks(true)

        if (!active) return

        const canvas = canvasRef.current
        if (canvas && videoRef.current) {
          canvas.width = videoRef.current.videoWidth
          canvas.height = videoRef.current.videoHeight
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            if (detections) {
              setFaceDetected(true)
              const box = detections.detection.box
              ctx.strokeStyle = '#10b981'
              ctx.lineWidth = 3
              ctx.strokeRect(box.x, box.y, box.width, box.height)

              const cornerLen = 15
              ctx.strokeStyle = '#059669'
              ctx.lineWidth = 4
              ctx.beginPath(); ctx.moveTo(box.x, box.y + cornerLen); ctx.lineTo(box.x, box.y); ctx.lineTo(box.x + cornerLen, box.y); ctx.stroke()
              ctx.beginPath(); ctx.moveTo(box.x + box.width - cornerLen, box.y); ctx.lineTo(box.x + box.width, box.y); ctx.lineTo(box.x + box.width, box.y + cornerLen); ctx.stroke()
              ctx.beginPath(); ctx.moveTo(box.x, box.y + box.height - cornerLen); ctx.lineTo(box.x, box.y + box.height); ctx.lineTo(box.x + cornerLen, box.y + box.height); ctx.stroke()
              ctx.beginPath(); ctx.moveTo(box.x + box.width - cornerLen, box.y + box.height); ctx.lineTo(box.x + box.width, box.y + box.height); ctx.lineTo(box.x + box.width, box.y + box.height - cornerLen); ctx.stroke()

              ctx.fillStyle = '#059669'
              ctx.fillRect(box.x, box.y - 24, 130, 24)
              ctx.fillStyle = '#ffffff'
              ctx.font = 'bold 13px sans-serif'
              ctx.fillText('✓ Wajah Terdeteksi', box.x + 4, box.y - 7)
            } else {
              setFaceDetected(false)
            }
          }
        }
      } catch {
        // Silently ignore
      }
    }

    detectionIntervalRef.current = setInterval(detectFace, 300)

    return () => {
      active = false
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current)
        detectionIntervalRef.current = null
      }
    }
  }, [cameraActive, modelsStatus])

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopCamera() }
  }, [stopCamera])

  async function handleFaceVerify() {
    if (!videoRef.current || !studentData || !faceApiRef.current) return

    // Check geofence before verifying
    const loc = await getGeolocation()
    if (!loc) {
      toast({
        title: 'GPS Diperlukan',
        description: 'Aktifkan GPS untuk melakukan absensi wajah',
        variant: 'destructive',
      })
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

    setVerifying(true)
    setVerifyResult(null)

    try {
      const faceapi = faceApiRef.current

      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
        .withFaceLandmarks(true)
        .withFaceDescriptor()

      if (!detection) {
        toast({
          title: 'Wajah Tidak Terdeteksi',
          description: 'Pastikan wajah Anda terlihat jelas di kamera.',
          variant: 'destructive',
        })
        setVerifying(false)
        return
      }

      const descriptorArray = Array.from(detection.descriptor) as number[]

      // Send to verify API with location
      const res = await fetch('/api/attendance/face-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: studentData.id,
          descriptor: descriptorArray,
          latitude: loc.latitude,
          longitude: loc.longitude,
        }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setVerifyResult({
          success: true,
          message: data.message,
          distance: data.distance,
          attendance: data.attendance,
        })
        stopCamera()
        toast({
          title: 'Absensi Berhasil!',
          description: data.message,
        })
      } else {
        setVerifyResult({
          success: false,
          message: data.error || 'Verifikasi wajah gagal',
          distance: data.distance,
        })
      }
    } catch (err) {
      console.error('Face verify error:', err)
      setVerifyResult({
        success: false,
        message: 'Terjadi kesalahan saat verifikasi wajah',
      })
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Absen Wajah</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Lakukan absensi menggunakan pengenalan wajah
          </p>
        </div>
        <Badge variant={modelsStatus === 'loaded' ? 'default' : modelsStatus === 'error' ? 'destructive' : 'secondary'}
          className="text-xs">
          {modelsStatus === 'loading' && 'Memuat Model AI...'}
          {modelsStatus === 'loaded' && 'Model AI Siap'}
          {modelsStatus === 'error' && 'Model AI Gagal'}
        </Badge>
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

      {/* Student info */}
      {studentData && (
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <ScanFace className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">{studentData.user.name}</p>
              <p className="text-sm text-muted-foreground">{studentData.nis} - {studentData.class.name}</p>
            </div>
            <Badge variant={studentData.faceRegistered ? 'default' : 'destructive'}>
              {studentData.faceRegistered ? 'Wajah Terdaftar' : 'Wajah Belum Terdaftar'}
            </Badge>
          </CardContent>
        </Card>
      )}

      {!studentData?.faceRegistered && studentData && (
        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">Wajah Belum Terdaftar</p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Silakan hubungi administrator untuk mendaftarkan wajah Anda sebelum dapat menggunakan fitur absensi wajah.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Model loading error */}
      {modelsStatus === 'error' && (
        <Card className="border-destructive">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-destructive">Model AI Gagal Dimuat</p>
              <p className="text-sm text-muted-foreground mt-1">{modelsError}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Camera */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Kamera
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cameraActive ? (
              <div className="space-y-4">
                <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full object-cover"
                    playsInline
                    muted
                    style={{ transform: 'scaleX(-1)' }}
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${faceDetected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                    <span className="text-xs text-white bg-black/50 px-2 py-0.5 rounded">
                      {faceDetected ? 'Wajah Terdeteksi' : 'Mencari Wajah...'}
                    </span>
                  </div>
                  {/* Verifying overlay */}
                  {verifying && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="text-center text-white">
                        <Loader2 className="w-10 h-10 animate-spin mx-auto mb-2" />
                        <p className="text-sm">Memverifikasi wajah...</p>
                      </div>
                    </div>
                  )}
                </div>

                {cameraError && (
                  <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    {cameraError}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleFaceVerify}
                    className="flex-1"
                    disabled={!faceDetected || verifying || !studentData?.faceRegistered}
                  >
                    {verifying ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Memverifikasi...
                      </>
                    ) : (
                      <>
                        <ScanFace className="w-4 h-4 mr-2" />
                        Absen Wajah
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => { stopCamera(); setVerifyResult(null) }}>
                    Tutup Kamera
                  </Button>
                </div>
              </div>
            ) : (
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  {modelsStatus === 'loading' ? (
                    <>
                      <Loader2 className="w-16 h-16 mx-auto mb-2 opacity-30 animate-spin" />
                      <p>Memuat model AI...</p>
                    </>
                  ) : modelsStatus === 'error' ? (
                    <>
                      <AlertCircle className="w-16 h-16 mx-auto mb-2 opacity-30" />
                      <p>Model AI gagal dimuat</p>
                    </>
                  ) : verifyResult?.success ? (
                    <>
                      <CheckCircle className="w-16 h-16 mx-auto mb-2 text-emerald-500" />
                      <p>Absensi berhasil!</p>
                    </>
                  ) : (
                    <>
                      <Camera className="w-16 h-16 mx-auto mb-2 opacity-30" />
                      <p>Klik tombol untuk membuka kamera</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Result / Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {verifyResult?.success ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <Clock className="w-5 h-5" />}
              {verifyResult?.success ? 'Hasil Absensi' : 'Petunjuk'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {verifyResult ? (
              <div className="space-y-4">
                {verifyResult.success ? (
                  <>
                    <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
                        <div>
                          <p className="font-semibold text-emerald-800 dark:text-emerald-200">Absensi Berhasil!</p>
                          <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">{verifyResult.message}</p>
                        </div>
                      </div>
                    </div>

                    {verifyResult.attendance && (
                      <div className="space-y-2">
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-sm text-muted-foreground">Status</span>
                          <Badge variant={verifyResult.attendance.status === 'hadir' ? 'default' : 'secondary'}>
                            {verifyResult.attendance.status === 'hadir' ? 'Hadir' : 'Terlambat'}
                          </Badge>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-sm text-muted-foreground">Waktu Masuk</span>
                          <span className="text-sm font-medium">
                            {new Date(verifyResult.attendance.timeIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-sm text-muted-foreground">Tanggal</span>
                          <span className="text-sm font-medium">
                            {new Date(verifyResult.attendance.date).toLocaleDateString('id-ID', {
                              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                            })}
                          </span>
                        </div>
                        {verifyResult.distance !== undefined && (
                          <div className="flex justify-between py-2">
                            <span className="text-sm text-muted-foreground">Skor Kecocokan</span>
                            <span className="text-sm font-medium">{((1 - verifyResult.distance) * 100).toFixed(1)}%</span>
                          </div>
                        )}
                      </div>
                    )}

                    <Button onClick={() => { setVerifyResult(null); startCamera() }} className="w-full" variant="outline">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Absen Ulang
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                      <div className="flex items-start gap-3">
                        <XCircle className="w-6 h-6 text-destructive shrink-0" />
                        <div>
                          <p className="font-semibold text-destructive">Verifikasi Gagal</p>
                          <p className="text-sm text-muted-foreground mt-1">{verifyResult.message}</p>
                        </div>
                      </div>
                    </div>

                    <Button onClick={() => { setVerifyResult(null); if (!cameraActive) startCamera() }} className="w-full">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Coba Lagi
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-3">
                  <h3 className="font-medium">Cara Menggunakan Absen Wajah:</h3>
                  <ol className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                      Pastikan Anda berada di area sekolah (GPS aktif)
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                      Klik tombol &quot;Buka Kamera&quot; di bawah
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                      Arahkan wajah ke kamera hingga muncul kotak hijau
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">4</span>
                      Klik tombol &quot;Absen Wajah&quot; untuk verifikasi
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">5</span>
                      Sistem akan mencocokkan wajah Anda dengan data yang terdaftar
                    </li>
                  </ol>
                </div>

                <div className="p-3 rounded-lg bg-muted/50 text-sm">
                  <p className="font-medium">Tips:</p>
                  <ul className="mt-1 space-y-1 text-muted-foreground">
                    <li>- Pastikan pencahayaan cukup</li>
                    <li>- Lihat langsung ke kamera</li>
                    <li>- Pastikan wajah tidak tertutup masker atau kacamata hitam</li>
                    <li>- Jaga jarak 30-60 cm dari kamera</li>
                    <li>- Aktifkan GPS di perangkat Anda</li>
                  </ul>
                </div>

                <Button
                  onClick={startCamera}
                  className="w-full"
                  disabled={modelsStatus !== 'loaded' || !studentData?.faceRegistered}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Buka Kamera
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
