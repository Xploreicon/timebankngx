// PWA installation banner optimized for Nigerian mobile users
import { useState, useEffect } from 'react'
import { usePWAInstall } from '@/hooks/useMobile'
import { Download, X, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export const MobilePWABanner = () => {
  const { canInstall, installPWA, showInstallBanner } = usePWAInstall()
  const [dismissed, setDismissed] = useState(false)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Check if user previously dismissed the banner
    const isDismissed = localStorage.getItem('pwa-banner-dismissed') === 'true'
    setDismissed(isDismissed)

    // Show banner after a delay to avoid being intrusive
    const timer = setTimeout(() => {
      setShowBanner(true)
    }, 5000) // 5 seconds delay

    return () => clearTimeout(timer)
  }, [])

  const handleInstall = async () => {
    const success = await installPWA()
    if (success) {
      setShowBanner(false)
    }
  }

  const handleDismiss = () => {
    setShowBanner(false)
    setDismissed(true)
    localStorage.setItem('pwa-banner-dismissed', 'true')
  }

  if (!showInstallBanner || !showBanner || dismissed) {
    return null
  }

  return (
    <Card className="fixed bottom-20 left-4 right-4 z-40 p-4 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          <div className="h-10 w-10 bg-green-600 rounded-lg flex items-center justify-center">
            <Smartphone className="h-6 w-6 text-white" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-green-900 mb-1">
            🇳🇬 Install Nigerian TimeBank
          </h3>
          <p className="text-sm text-green-700 mb-3 leading-relaxed">
            Add to your home screen for faster access, offline support, and data-saving features
            perfect for Nigerian internet conditions.
          </p>

          <div className="flex gap-2">
            <Button
              onClick={handleInstall}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Download className="h-4 w-4 mr-1" />
              Install App
            </Button>
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="sm"
              className="text-green-600 hover:text-green-800"
            >
              <X className="h-4 w-4 mr-1" />
              Not Now
            </Button>
          </div>
        </div>
      </div>

      {/* Nigerian-specific benefits */}
      <div className="mt-3 pt-3 border-t border-green-200">
        <div className="grid grid-cols-2 gap-2 text-xs text-green-600">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
            Works offline
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
            Saves data
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
            Faster loading
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
            Less battery usage
          </div>
        </div>
      </div>
    </Card>
  )
}

// Installation success confirmation
export const PWAInstallSuccess = ({
  show,
  onClose
}: {
  show: boolean
  onClose: () => void
}) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose()
      }, 4000) // Auto-close after 4 seconds

      return () => clearTimeout(timer)
    }
  }, [show, onClose])

  if (!show) return null

  return (
    <div className="fixed top-4 left-4 right-4 z-50">
      <Card className="p-4 bg-green-50 border-green-200 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-green-600 rounded-full flex items-center justify-center">
            <Smartphone className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-green-900">
              🎉 Nigerian TimeBank Installed!
            </h3>
            <p className="text-sm text-green-700 mt-1">
              You can now access the app from your home screen. Enjoy faster loading
              and offline features optimized for Nigerian internet conditions!
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-green-600 hover:text-green-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  )
}