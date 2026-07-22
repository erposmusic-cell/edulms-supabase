'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { ScanFace, Camera, Check, X, Loader2, AlertCircle, Trash2 } from 'lucide-react'

interface StudentItem {
  id: string
  nis: string
  user: { name: string }
  class: { name: string }
  faceRegistered: boolean
  faceDescriptorUrl: string | null
}

type ModelsStatus = 'loading' | 'loaded' | 'error'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FaceApiModule = any // face-api.js module

export default function FaceRegistration() {
  const [students, setStudents] = useState<StudentItem[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [cameraActive, setCameraActive] = useState(false)
  const [modelsStatus, setModelsStatus] = useState<ModelsStatus>('loading')
  const [modelsError, setModelsError] = useState<string>('')
  const [cameraError, setCameraError] = useState<string>('')
  const [detecting, setDetecting] = useState(false)
  const [faceDetected, setFaceDetected] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const faceApiRef = useRef<FaceApiModule | null>(null)
  const { toast } = useToast()

  useEffect(() => { loadData() }, [])

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

  // Start camera when a student is selected
  useEffect(() => {
    if (selected && modelsStatus === 'loaded') {
      startCamera()
    }
    return () => {
      stopCamera()
    }
  }, [selected, modelsStatus])

  // Live face detection loop
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
              // Draw face detection box
              ctx.strokeStyle = '#10b981'
              ctx.lineWidth = 3
              ctx.strokeRect(box.x, box.y, box.width, box.height)

              // Draw corner accents
              const cornerLen = 15
              ctx.strokeStyle = '#059669'
              ctx.lineWidth = 4
              // Top-left
              ctx.beginPath()
              ctx.moveTo(box.x, box.y + cornerLen)
              ctx.lineTo(box.x, box.y)
              ctx.lineTo(box.x + cornerLen, box.y)
              ctx.stroke()
              // Top-right
              ctx.beginPath()
              ctx.moveTo(box.x + box.width - cornerLen, box.y)
              ctx.lineTo(box.x + box.width, box.y)
              ctx.lineTo(box.x + box.width, box.y + cornerLen)
              ctx.stroke()
              // Bottom-left
              ctx.beginPath()
              ctx.moveTo(box.x, box.y + box.height - cornerLen)
              ctx.lineTo(box.x, box.y + box.height)
              ctx.lineTo(box.x + cornerLen, box.y + box.height)
              ctx.stroke()
              // Bottom-right
              ctx.beginPath()
              ctx.moveTo(box.x + box.width - cornerLen, box.y + box.height)
              ctx.lineTo(box.x + box.width, box.y + box.height)
              ctx.lineTo(box.x + box.width, box.y + box.height - cornerLen)
              ctx.stroke()

              // Draw label
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
        // Silently ignore detection errors during live feed
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

  async function loadData() {
    try {
      const res = await fetch('/api/students')
      const data = await res.json()
      if (Array.isArray(data)) setStudents(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const startCamera = useCallback(async () => {
    setCameraError('')
    setFaceDetected(false)
    setCapturedImage(null)
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
        await new Promise<void>((resolve, reject) => {
          videoRef.current!.onloadedmetadata = () => {
            videoRef.current!.play()
              .then(() => resolve())
              .catch(() => resolve()) // Don't fail if autoplay blocked
          }
          setTimeout(() => resolve(), 3000) // Timeout fallback
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
    setCapturedImage(null)
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
      detectionIntervalRef.current = null
    }
  }, [])

  async function captureAndRegister() {
    if (!selected || !videoRef.current || !faceApiRef.current) return
    setDetecting(true)

    try {
      const faceapi = faceApiRef.current

      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
        .withFaceLandmarks(true)
        .withFaceDescriptor()

      if (!detection) {
        toast({
          title: 'Wajah Tidak Terdeteksi',
          description: 'Pastikan wajah Anda terlihat jelas di kamera dengan pencahayaan yang cukup.',
          variant: 'destructive',
        })
        setDetecting(false)
        return
      }

      // Capture snapshot for preview
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = videoRef.current.videoWidth
      tempCanvas.height = videoRef.current.videoHeight
      const tempCtx = tempCanvas.getContext('2d')
      if (tempCtx) {
        tempCtx.drawImage(videoRef.current, 0, 0)
        setCapturedImage(tempCanvas.toDataURL('image/jpeg', 0.8))
      }

      // Convert descriptor to base64 for storage
      const descriptorArray = Array.from(detection.descriptor) as number[]
      const descriptorBase64 = `data:application/json;base64,${btoa(JSON.stringify(descriptorArray))}`

      // Save to API
      setRegistering(true)
      const res = await fetch(`/api/students/${selected}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          faceRegistered: true,
          faceDescriptorUrl: descriptorBase64,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Gagal menyimpan data wajah')
      }

      toast({
        title: 'Berhasil!',
        description: 'Wajah berhasil diregistrasi. Siswa kini dapat absen menggunakan pengenalan wajah.',
      })

      stopCamera()
      setSelected(null)
      loadData()
    } catch (err) {
      console.error('Face registration error:', err)
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Gagal registrasi wajah',
        variant: 'destructive',
      })
    } finally {
      setDetecting(false)
      setRegistering(false)
    }
  }

  async function deleteFaceRegistration(studentId: string) {
    try {
      const res = await fetch(`/api/students/${studentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          faceRegistered: false,
          faceDescriptorUrl: null,
        }),
      })
      if (!res.ok) throw new Error('Gagal menghapus data wajah')
      toast({ title: 'Berhasil', description: 'Data wajah berhasil dihapus' })
      loadData()
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus data wajah', variant: 'destructive' })
    }
  }

  function handleSelectStudent(studentId: string) {
    if (selected === studentId && cameraActive) {
      stopCamera()
      setSelected(null)
    } else {
      stopCamera()
      setSelected(studentId)
      setCapturedImage(null)
    }
  }

  function handleCancel() {
    stopCamera()
    setSelected(null)
    setCapturedImage(null)
  }

  const selectedStudent = students.find(s => s.id === selected)
  const unregistered = students.filter(s => !s.faceRegistered)
  const registered = students.filter(s => s.faceRegistered)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Registrasi Wajah</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Daftarkan wajah siswa untuk absensi pengenalan wajah
          </p>
        </div>
        <Badge variant={modelsStatus === 'loaded' ? 'default' : modelsStatus === 'error' ? 'destructive' : 'secondary'}
          className="text-xs">
          {modelsStatus === 'loading' && 'Memuat Model AI...'}
          {modelsStatus === 'loaded' && 'Model AI Siap'}
          {modelsStatus === 'error' && 'Model AI Gagal'}
        </Badge>
      </div>

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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold">{students.length}</p>
            <p className="text-sm text-muted-foreground">Total Siswa</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-emerald-600">{registered.length}</p>
            <p className="text-sm text-muted-foreground">Wajah Terdaftar</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-amber-600">{unregistered.length}</p>
            <p className="text-sm text-muted-foreground">Belum Terdaftar</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Student List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Siswa Belum Terdaftar</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : unregistered.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Semua siswa sudah terdaftar</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                {unregistered.map(s => (
                  <div
                    key={s.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      selected === s.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div>
                      <p className="font-medium">{s.user.name}</p>
                      <p className="text-sm text-muted-foreground">{s.nis} - {s.class.name}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleSelectStudent(s.id)}
                      disabled={modelsStatus !== 'loaded'}
                    >
                      <ScanFace className="w-4 h-4 mr-1" />
                      {selected === s.id && cameraActive ? 'Aktif' : 'Daftar'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Camera */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Kamera Registrasi
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cameraActive && selected ? (
              <div className="space-y-4">
                {/* Student info */}
                {selectedStudent && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <ScanFace className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{selectedStudent.user.name}</p>
                      <p className="text-xs text-muted-foreground">{selectedStudent.nis} - {selectedStudent.class.name}</p>
                    </div>
                  </div>
                )}

                {/* Video feed with overlay */}
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
                  {/* Status indicator */}
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${faceDetected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                    <span className="text-xs text-white bg-black/50 px-2 py-0.5 rounded">
                      {faceDetected ? 'Wajah Terdeteksi' : 'Mencari Wajah...'}
                    </span>
                  </div>
                </div>

                {/* Captured preview */}
                {capturedImage && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-emerald-600">Wajah berhasil di-capture!</p>
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-emerald-400">
                      <img src={capturedImage} alt="Captured face" className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}

                {/* Camera error */}
                {cameraError && (
                  <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    {cameraError}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={captureAndRegister}
                    className="flex-1"
                    disabled={!faceDetected || detecting || registering}
                  >
                    {detecting || registering ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {registering ? 'Menyimpan...' : 'Mendeteksi...'}
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Capture & Daftarkan Wajah
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={handleCancel}>
                    <X className="w-4 h-4 mr-1" />Batal
                  </Button>
                </div>

                {!faceDetected && cameraActive && (
                  <p className="text-xs text-muted-foreground text-center">
                    Arahkan wajah ke kamera dengan pencahayaan yang cukup
                  </p>
                )}
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
                  ) : (
                    <>
                      <ScanFace className="w-16 h-16 mx-auto mb-2 opacity-30" />
                      <p>Pilih siswa untuk mulai registrasi</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Registered students */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Siswa Terdaftar</CardTitle>
        </CardHeader>
        <CardContent>
          {registered.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Belum ada siswa yang terdaftar</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {registered.map(s => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                    <ScanFace className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{s.user.name}</p>
                    <p className="text-xs text-muted-foreground">{s.class.name}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="default" className="text-xs">Terdaftar</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => deleteFaceRegistration(s.id)}
                      title="Hapus registrasi wajah"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
