// Mobile optimization hooks for Nigerian TimeBank
import { useState, useEffect, useCallback } from 'react'
import { analytics } from '@/lib/analytics'

export interface MobileInfo {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  screenSize: {
    width: number
    height: number
  }
  orientation: 'portrait' | 'landscape'
  touchSupport: boolean
  devicePixelRatio: number
}

// Main mobile detection and optimization hook
export const useMobile = () => {
  const [mobileInfo, setMobileInfo] = useState<MobileInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    screenSize: { width: 0, height: 0 },
    orientation: 'portrait',
    touchSupport: false,
    devicePixelRatio: 1,
  })

  const updateMobileInfo = useCallback(() => {
    const width = window.innerWidth
    const height = window.innerHeight
    const isMobile = width < 768
    const isTablet = width >= 768 && width < 1024
    const isDesktop = width >= 1024

    setMobileInfo({
      isMobile,
      isTablet,
      isDesktop,
      screenSize: { width, height },
      orientation: width > height ? 'landscape' : 'portrait',
      touchSupport: 'ontouchstart' in window,
      devicePixelRatio: window.devicePixelRatio || 1,
    })

    // Track Nigerian mobile usage patterns
    if (isMobile) {
      analytics.trackBusinessEvent('mobile_usage', {
        screen_width: width,
        screen_height: height,
        orientation: width > height ? 'landscape' : 'portrait',
        device_pixel_ratio: window.devicePixelRatio || 1,
        user_agent: navigator.userAgent,
      })
    }
  }, [])

  useEffect(() => {
    updateMobileInfo()
    window.addEventListener('resize', updateMobileInfo)
    window.addEventListener('orientationchange', updateMobileInfo)

    return () => {
      window.removeEventListener('resize', updateMobileInfo)
      window.removeEventListener('orientationchange', updateMobileInfo)
    }
  }, [updateMobileInfo])

  return mobileInfo
}

// Nigerian mobile user behavior patterns
export const useNigerianMobilePatterns = () => {
  const mobile = useMobile()
  const [preferences, setPreferences] = useState({
    dataSaverMode: false,
    reducedAnimations: false,
    highContrast: false,
    largerText: false,
  })

  useEffect(() => {
    // Detect Nigerian mobile preferences
    const mediaQueries = {
      dataSaver: window.matchMedia('(prefers-reduced-data: reduce)'),
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)'),
      highContrast: window.matchMedia('(prefers-contrast: high)'),
      // Detect slow connections (common in Nigeria)
      slowConnection: (navigator as any).connection?.effectiveType === 'slow-2g' ||
                      (navigator as any).connection?.effectiveType === '2g',
    }

    setPreferences({
      dataSaverMode: mediaQueries.dataSaver.matches || mediaQueries.slowConnection,
      reducedAnimations: mediaQueries.reducedMotion.matches,
      highContrast: mediaQueries.highContrast.matches,
      largerText: mobile.screenSize.width < 380, // Very small screens
    })

    // Listen for preference changes
    const handleDataSaverChange = () => {
      setPreferences(prev => ({
        ...prev,
        dataSaverMode: mediaQueries.dataSaver.matches
      }))
    }

    const handleMotionChange = () => {
      setPreferences(prev => ({
        ...prev,
        reducedAnimations: mediaQueries.reducedMotion.matches
      }))
    }

    mediaQueries.dataSaver.addListener?.(handleDataSaverChange)
    mediaQueries.reducedMotion.addListener?.(handleMotionChange)

    return () => {
      mediaQueries.dataSaver.removeListener?.(handleDataSaverChange)
      mediaQueries.reducedMotion.removeListener?.(handleMotionChange)
    }
  }, [mobile.screenSize.width])

  return {
    ...mobile,
    ...preferences,
    isNigerianMobileUser: mobile.isMobile && preferences.dataSaverMode,
  }
}

// PWA installation hook for Nigerian users
export const usePWAInstall = () => {
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [canInstall, setCanInstall] = useState(false)

  useEffect(() => {
    // Check if already installed
    setIsInstalled(window.matchMedia('(display-mode: standalone)').matches)

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      setInstallPrompt(e)
      setCanInstall(true)

      // Track install prompt for Nigerian users
      analytics.trackBusinessEvent('pwa_install_prompt_shown', {
        user_agent: navigator.userAgent,
        timestamp: Date.now(),
      })
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const installPWA = async () => {
    if (!installPrompt) return false

    try {
      const result = await installPrompt.prompt()
      const userChoice = await result.userChoice

      analytics.trackBusinessEvent('pwa_install_attempt', {
        user_choice: userChoice,
        outcome: userChoice === 'accepted' ? 'success' : 'declined',
      })

      if (userChoice === 'accepted') {
        setIsInstalled(true)
        setCanInstall(false)
        setInstallPrompt(null)
        return true
      }
    } catch (error) {
      console.error('PWA installation failed:', error)
      analytics.trackBusinessEvent('pwa_install_error', {
        error: (error as Error).message,
      })
    }

    return false
  }

  return {
    canInstall,
    isInstalled,
    installPWA,
    showInstallBanner: canInstall && !isInstalled,
  }
}

// Mobile keyboard and input optimizations
export const useMobileInput = () => {
  const [keyboardVisible, setKeyboardVisible] = useState(false)
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight)

  useEffect(() => {
    const handleResize = () => {
      const currentHeight = window.innerHeight
      const heightDifference = viewportHeight - currentHeight

      // Detect keyboard (significant height reduction)
      if (heightDifference > 150) {
        setKeyboardVisible(true)
      } else {
        setKeyboardVisible(false)
      }

      setViewportHeight(currentHeight)
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [viewportHeight])

  const preventZoom = useCallback((inputElement: HTMLInputElement) => {
    // Prevent iOS zoom on input focus
    inputElement.style.fontSize = '16px'
  }, [])

  return {
    keyboardVisible,
    preventZoom,
    mobileInputProps: {
      style: { fontSize: '16px' }, // Prevent zoom on iOS
      autoCapitalize: 'off' as const,
      autoComplete: 'off' as const,
      autoCorrect: 'off' as const,
    },
  }
}

// Nigerian mobile connectivity patterns
export const useNigerianMobileConnectivity = () => {
  const [connectionInfo, setConnectionInfo] = useState({
    isOnline: navigator.onLine,
    effectiveType: 'unknown',
    downlink: 0,
    rtt: 0,
    saveData: false,
  })

  const [usagePattern, setUsagePattern] = useState({
    isOffPeakHours: false,
    isPeakDataTime: false,
    recommendedDataUsage: 'normal' as 'low' | 'normal' | 'high',
  })

  useEffect(() => {
    // @ts-ignore - navigator.connection is experimental
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection

    if (connection) {
      const updateConnection = () => {
        setConnectionInfo({
          isOnline: navigator.onLine,
          effectiveType: connection.effectiveType || 'unknown',
          downlink: connection.downlink || 0,
          rtt: connection.rtt || 0,
          saveData: connection.saveData || false,
        })

        // Analyze Nigerian usage patterns
        const now = new Date()
        const hour = now.getHours()

        setUsagePattern({
          isOffPeakHours: hour < 6 || hour > 22, // 10 PM - 6 AM
          isPeakDataTime: hour >= 18 && hour <= 21, // 6 PM - 9 PM (expensive data time)
          recommendedDataUsage: connection.effectiveType === 'slow-2g' || connection.saveData
            ? 'low'
            : connection.effectiveType === '4g' && connection.downlink > 10
              ? 'high'
              : 'normal'
        })
      }

      updateConnection()
      connection.addEventListener('change', updateConnection)
      window.addEventListener('online', updateConnection)
      window.addEventListener('offline', updateConnection)

      return () => {
        connection.removeEventListener('change', updateConnection)
        window.removeEventListener('online', updateConnection)
        window.removeEventListener('offline', updateConnection)
      }
    }
  }, [])

  return {
    ...connectionInfo,
    ...usagePattern,
    isSlowConnection: connectionInfo.effectiveType === 'slow-2g' ||
                      connectionInfo.effectiveType === '2g' ||
                      connectionInfo.downlink < 1.5,
    isFastConnection: connectionInfo.effectiveType === '4g' &&
                      connectionInfo.downlink > 10,
    shouldOptimizeData: connectionInfo.saveData ||
                        connectionInfo.effectiveType === 'slow-2g' ||
                        usagePattern.isPeakDataTime,
  }
}

// Mobile touch gesture handling
export const useMobileGestures = () => {
  const [touchInfo, setTouchInfo] = useState({
    isTouch: 'ontouchstart' in window,
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
  })

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0]
    setTouchInfo(prev => ({
      ...prev,
      startX: touch.clientX,
      startY: touch.clientY,
    }))
  }, [])

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    const touch = e.changedTouches[0]
    setTouchInfo(prev => ({
      ...prev,
      endX: touch.clientX,
      endY: touch.clientY,
    }))
  }, [])

  const getSwipeDirection = useCallback(() => {
    const deltaX = touchInfo.endX - touchInfo.startX
    const deltaY = touchInfo.endY - touchInfo.startY

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      return deltaX > 0 ? 'right' : 'left'
    } else {
      return deltaY > 0 ? 'down' : 'up'
    }
  }, [touchInfo])

  return {
    touchInfo,
    handleTouchStart,
    handleTouchEnd,
    getSwipeDirection,
    isTouch: touchInfo.isTouch,
  }
}