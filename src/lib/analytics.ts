// Analytics and performance monitoring for Nigerian time-banking platform

import { captureMessage } from './sentry'

// Google Analytics integration
declare global {
  interface Window {
    gtag: (...args: any[]) => void
    dataLayer: any[]
  }
}

class AnalyticsService {
  private static instance: AnalyticsService
  private isEnabled: boolean
  private gaTrackingId: string
  private userId: string | null = null

  constructor() {
    this.isEnabled = import.meta.env.VITE_ENABLE_ANALYTICS === 'true'
    this.gaTrackingId = import.meta.env.VITE_GA_TRACKING_ID || ''

    if (this.isEnabled && this.gaTrackingId) {
      this.initializeGoogleAnalytics()
    }
  }

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService()
    }
    return AnalyticsService.instance
  }

  private initializeGoogleAnalytics() {
    // Load Google Analytics script
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.gaTrackingId}`
    document.head.appendChild(script)

    // Initialize dataLayer
    window.dataLayer = window.dataLayer || []
    window.gtag = function(...args) {
      window.dataLayer.push(args)
    }

    window.gtag('js', new Date())
    window.gtag('config', this.gaTrackingId, {
      // Nigerian-specific configuration
      country: 'NG',
      currency: 'NGN',
      custom_map: {
        custom_dimension_1: 'user_location',
        custom_dimension_2: 'business_category',
        custom_dimension_3: 'trust_score_level',
      },
    })

    console.log('Google Analytics initialized for Nigerian market')
  }

  // User identification
  setUser(user: {
    id: string
    location?: string
    category?: string
    trustScore?: number
  }) {
    this.userId = user.id

    if (!this.isEnabled) return

    window.gtag?.('config', this.gaTrackingId, {
      user_id: user.id,
      custom_dimension_1: user.location || 'unknown',
      custom_dimension_2: user.category || 'unknown',
      custom_dimension_3: user.trustScore && user.trustScore > 70 ? 'high'
        : user.trustScore && user.trustScore > 40 ? 'medium' : 'low',
    })
  }

  // Page view tracking
  trackPageView(page: string, title?: string) {
    if (!this.isEnabled) return

    window.gtag?.('event', 'page_view', {
      page_title: title || page,
      page_location: window.location.href,
      page_path: page,
      custom_dimension_1: this.getCurrentLocation(),
    })
  }

  // Nigerian business events
  trackBusinessEvent(event: string, parameters: {
    category?: string
    location?: string
    value?: number
    currency?: string
    [key: string]: any
  } = {}) {
    if (!this.isEnabled) return

    const eventData = {
      event_category: 'nigerian_business',
      event_label: parameters.category,
      value: parameters.value,
      currency: parameters.currency || 'NGN',
      custom_dimension_1: parameters.location || this.getCurrentLocation(),
      ...parameters,
    }

    window.gtag?.('event', event, eventData)

    // Also send to Sentry for business intelligence
    captureMessage(`Business Event: ${event}`, 'info')
  }

  // Trade-specific analytics
  trackTrade(action: 'created' | 'accepted' | 'completed' | 'cancelled', tradeData: {
    tradeId: string
    proposerCategory?: string
    providerCategory?: string
    proposerLocation?: string
    providerLocation?: string
    estimatedValue?: number
    duration?: number
  }) {
    this.trackBusinessEvent(`trade_${action}`, {
      trade_id: tradeData.tradeId,
      proposer_category: tradeData.proposerCategory,
      provider_category: tradeData.providerCategory,
      proposer_location: tradeData.proposerLocation,
      provider_location: tradeData.providerLocation,
      value: tradeData.estimatedValue,
      duration: tradeData.duration,
    })
  }

  // Service analytics
  trackService(action: 'created' | 'viewed' | 'contacted', serviceData: {
    serviceId: string
    category?: string
    location?: string
    hourlyRate?: number
  }) {
    this.trackBusinessEvent(`service_${action}`, {
      service_id: serviceData.serviceId,
      category: serviceData.category,
      location: serviceData.location,
      value: serviceData.hourlyRate,
    })
  }

  // User engagement tracking
  trackEngagement(action: string, data: Record<string, any> = {}) {
    if (!this.isEnabled) return

    window.gtag?.('event', action, {
      event_category: 'user_engagement',
      user_id: this.userId,
      ...data,
    })
  }

  // Performance tracking
  trackPerformance(metric: string, value: number, unit: string = 'ms') {
    if (!this.isEnabled) return

    window.gtag?.('event', 'timing_complete', {
      name: metric,
      value: Math.round(value),
      event_category: 'performance',
      custom_dimension_1: this.getCurrentLocation(),
    })
  }

  // Error tracking
  trackError(error: string, context: string = 'unknown') {
    if (!this.isEnabled) return

    window.gtag?.('event', 'exception', {
      description: error,
      fatal: false,
      custom_dimension_1: context,
    })
  }

  // Nigerian market insights
  trackMarketInsight(insight: string, data: Record<string, any>) {
    this.trackBusinessEvent('market_insight', {
      insight_type: insight,
      ...data,
    })
  }

  private getCurrentLocation(): string {
    // Try to get location from various sources
    return 'Lagos' // Default to Lagos for now
  }
}

// Performance monitoring utilities
export class PerformanceMonitor {
  private static measurements = new Map<string, number>()

  static startMeasurement(name: string) {
    this.measurements.set(name, performance.now())
  }

  static endMeasurement(name: string): number {
    const startTime = this.measurements.get(name)
    if (!startTime) return 0

    const duration = performance.now() - startTime
    this.measurements.delete(name)

    // Track to analytics
    analytics.trackPerformance(name, duration)

    return duration
  }

  static measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    return new Promise(async (resolve, reject) => {
      this.startMeasurement(name)
      try {
        const result = await fn()
        this.endMeasurement(name)
        resolve(result)
      } catch (error) {
        this.endMeasurement(name)
        reject(error)
      }
    })
  }

  // Core Web Vitals monitoring
  static initWebVitals() {
    if (typeof window === 'undefined') return

    // First Contentful Paint
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          analytics.trackPerformance('FCP', entry.startTime)
        }
      }
    }).observe({ entryTypes: ['paint'] })

    // Largest Contentful Paint
    new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1]
      analytics.trackPerformance('LCP', lastEntry.startTime)
    }).observe({ entryTypes: ['largest-contentful-paint'] })

    // Cumulative Layout Shift
    let clsValue = 0
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value
        }
      }
      analytics.trackPerformance('CLS', clsValue * 1000) // Convert to ms equivalent
    }).observe({ entryTypes: ['layout-shift'] })
  }
}

// Nigerian business analytics helpers
export const NigerianBusinessAnalytics = {
  // Track time-banking specific metrics
  trackTimeExchange(data: {
    category1: string
    category2: string
    hours1: number
    hours2: number
    exchangeRate: number
    location: string
  }) {
    analytics.trackBusinessEvent('time_exchange', {
      category_1: data.category1,
      category_2: data.category2,
      hours_offered: data.hours1,
      hours_received: data.hours2,
      exchange_rate: data.exchangeRate,
      location: data.location,
    })
  },

  // Track Nigerian market dynamics
  trackMarketTrend(trend: 'high_demand' | 'low_supply' | 'price_increase' | 'new_category', data: {
    category: string
    location: string
    value?: number
  }) {
    analytics.trackMarketInsight(`market_${trend}`, data)
  },

  // Track regional performance
  trackRegionalMetrics(region: string, metrics: {
    activeUsers: number
    completedTrades: number
    averageResponseTime: number
    trustScoreAverage: number
  }) {
    analytics.trackBusinessEvent('regional_metrics', {
      region,
      active_users: metrics.activeUsers,
      completed_trades: metrics.completedTrades,
      avg_response_time: metrics.averageResponseTime,
      avg_trust_score: metrics.trustScoreAverage,
    })
  },
}

// Export singleton instance
export const analytics = AnalyticsService.getInstance()

// Initialize performance monitoring
if (typeof window !== 'undefined') {
  PerformanceMonitor.initWebVitals()
}