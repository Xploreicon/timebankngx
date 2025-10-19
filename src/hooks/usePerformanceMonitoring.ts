import { useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { analytics, PerformanceMonitor } from '@/lib/analytics'
import { useAppStore } from '@/store/appStore'

// Hook to track page views and performance
export const usePageTracking = () => {
  const location = useLocation()
  const { profile } = useAppStore()

  useEffect(() => {
    // Set user context when profile is available
    if (profile) {
      analytics.setUser({
        id: profile.id,
        location: profile.location,
        category: profile.category,
        trustScore: profile.trust_score,
      })
    }
  }, [profile])

  useEffect(() => {
    // Track page view with performance measurement
    const measurementName = `page_load_${location.pathname.replace(/\//g, '_')}`
    PerformanceMonitor.startMeasurement(measurementName)

    // Track the page view
    analytics.trackPageView(location.pathname, document.title)

    // Measure page load performance after a short delay
    const timeout = setTimeout(() => {
      PerformanceMonitor.endMeasurement(measurementName)
    }, 100)

    return () => {
      clearTimeout(timeout)
    }
  }, [location.pathname])
}

// Hook for business event tracking
export const useBusinessTracking = () => {
  const trackTrade = useCallback((action: 'created' | 'accepted' | 'completed' | 'cancelled', data: {
    tradeId: string
    proposerCategory?: string
    providerCategory?: string
    proposerLocation?: string
    providerLocation?: string
    estimatedValue?: number
    duration?: number
  }) => {
    analytics.trackTrade(action, data)
  }, [])

  const trackService = useCallback((action: 'created' | 'viewed' | 'contacted', data: {
    serviceId: string
    category?: string
    location?: string
    hourlyRate?: number
  }) => {
    analytics.trackService(action, data)
  }, [])

  const trackUserEngagement = useCallback((action: string, data: Record<string, any> = {}) => {
    analytics.trackEngagement(action, data)
  }, [])

  return {
    trackTrade,
    trackService,
    trackUserEngagement,
  }
}

// Hook for performance monitoring of async operations
export const useAsyncPerformance = () => {
  const measureAsync = useCallback(async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
    return PerformanceMonitor.measureAsync(name, fn)
  }, [])

  const startMeasurement = useCallback((name: string) => {
    PerformanceMonitor.startMeasurement(name)
  }, [])

  const endMeasurement = useCallback((name: string) => {
    return PerformanceMonitor.endMeasurement(name)
  }, [])

  return {
    measureAsync,
    startMeasurement,
    endMeasurement,
  }
}

// Hook for Nigerian market analytics
export const useMarketAnalytics = () => {
  const trackTimeExchange = useCallback((data: {
    category1: string
    category2: string
    hours1: number
    hours2: number
    exchangeRate: number
    location: string
  }) => {
    analytics.trackBusinessEvent('time_exchange', {
      category_1: data.category1,
      category_2: data.category2,
      hours_offered: data.hours1,
      hours_received: data.hours2,
      exchange_rate: data.exchangeRate,
      location: data.location,
    })
  }, [])

  const trackMarketTrend = useCallback((trend: string, data: Record<string, any>) => {
    analytics.trackBusinessEvent(`market_${trend}`, data)
  }, [])

  const trackRegionalActivity = useCallback((region: string, activity: string, data: Record<string, any>) => {
    analytics.trackBusinessEvent('regional_activity', {
      region,
      activity_type: activity,
      ...data,
    })
  }, [])

  return {
    trackTimeExchange,
    trackMarketTrend,
    trackRegionalActivity,
  }
}

// Hook for error boundary analytics
export const useErrorTracking = () => {
  const trackError = useCallback((error: Error, context: string = 'unknown', additionalData: Record<string, any> = {}) => {
    analytics.trackError(error.message, context)

    // Enhanced error tracking with Nigerian context
    analytics.trackBusinessEvent('application_error', {
      error_message: error.message,
      error_context: context,
      stack_trace: error.stack?.slice(0, 500), // Truncate for analytics
      ...additionalData,
    })
  }, [])

  return { trackError }
}

// Custom performance observer hook
export const usePerformanceObserver = () => {
  useEffect(() => {
    // Monitor Nigerian-specific performance issues
    if (typeof window === 'undefined') return

    // Monitor slow network requests (common in Nigeria)
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const resourceEntry = entry as PerformanceResourceTiming

        // Track slow API calls
        if (resourceEntry.duration > 5000) { // 5+ seconds
          analytics.trackPerformance('slow_api_call', resourceEntry.duration)
          analytics.trackBusinessEvent('performance_issue', {
            issue_type: 'slow_network',
            resource_name: resourceEntry.name,
            duration: resourceEntry.duration,
            connection_type: (navigator as any).connection?.effectiveType || 'unknown',
          })
        }
      }
    })

    try {
      observer.observe({ entryTypes: ['resource'] })
    } catch (e) {
      console.warn('Performance observer not supported')
    }

    return () => {
      observer.disconnect()
    }
  }, [])
}