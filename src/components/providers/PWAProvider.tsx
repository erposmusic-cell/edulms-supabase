'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, X, WifiOff } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof window !== 'undefined') return navigator.onLine
    return true
  })
  const [showOfflineBanner, setShowOfflineBanner] = useState(false)

  // Register service worker
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered:', registration.scope)
        })
        .catch((error) => {
          console.log('SW registration failed:', error)
        })
    }
  }, [])

  // Listen for beforeinstallprompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
      // Show install banner after a short delay
      setTimeout(() => setShowInstallBanner(true), 3000)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowOfflineBanner(false)
    }
    const handleOffline = () => {
      setIsOnline(false)
      setShowOfflineBanner(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return

    installPrompt.prompt()
    const result = await installPrompt.userChoice

    if (result.outcome === 'accepted') {
      setInstallPrompt(null)
      setShowInstallBanner(false)
    }
  }

  const dismissInstallBanner = () => {
    setShowInstallBanner(false)
    setInstallPrompt(null)
  }

  return (
    <>
      {children}

      {/* Offline banner */}
      {showOfflineBanner && (
        <div className="fixed bottom-0 left-0 right-0 z-[100] bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm">
          <WifiOff className="w-4 h-4" />
          <span>Anda sedang offline. Beberapa fitur mungkin tidak tersedia.</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-white hover:bg-amber-600 ml-2"
            onClick={() => setShowOfflineBanner(false)}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}

      {/* Online recovery toast */}
      {!isOnline && !showOfflineBanner && null}

      {/* Install app banner */}
      {showInstallBanner && installPrompt && (
        <div className="fixed bottom-4 right-4 z-[100] bg-card border border-border shadow-lg rounded-xl p-4 max-w-xs animate-in slide-in-from-bottom-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <Download className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Install EduLMS</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Install aplikasi untuk akses cepat dan dukungan offline
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
              onClick={dismissInstallBanner}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
          <div className="flex gap-2 mt-3">
            <Button size="sm" className="flex-1 h-8 text-xs" onClick={handleInstall}>
              Install
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={dismissInstallBanner}>
              Nanti
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
