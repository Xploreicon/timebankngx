import { describe, it, expect, vi, beforeEach } from 'vitest'
import { analytics, PerformanceMonitor } from '../analytics'

// Mock Google Analytics
const mockGtag = vi.fn()
Object.defineProperty(window, 'gtag', {
  value: mockGtag,
  writable: true,
})

// Mock environment variables
vi.mock('import.meta', () => ({
  env: {
    VITE_ENABLE_ANALYTICS: 'true',
    VITE_GA_TRACKING_ID: 'GA-TEST-ID',
  }
}))

describe('AnalyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGtag.mockClear()
  })

  it('initializes with Nigerian market configuration', () => {
    expect(analytics).toBeDefined()
  })

  it('tracks Nigerian business events correctly', () => {
    analytics.trackBusinessEvent('trade_created', {
      category: 'Technology',
      location: 'Lagos',
      value: 25000,
    })

    expect(mockGtag).toHaveBeenCalledWith('event', 'trade_created', {
      event_category: 'nigerian_business',
      event_label: 'Technology',
      value: 25000,
      currency: 'NGN',
      custom_dimension_1: 'Lagos',
      category: 'Technology',
      location: 'Lagos',
    })
  })

  it('sets user context with Nigerian business data', () => {
    analytics.setUser({
      id: 'user-123',
      location: 'Abuja',
      category: 'Healthcare',
      trustScore: 85,
    })

    expect(mockGtag).toHaveBeenCalledWith('config', 'GA-TEST-ID', {
      user_id: 'user-123',
      custom_dimension_1: 'Abuja',
      custom_dimension_2: 'Healthcare',
      custom_dimension_3: 'high',
    })
  })

  it('tracks trade events with proper Nigerian context', () => {
    analytics.trackTrade('completed', {
      tradeId: 'trade-123',
      proposerCategory: 'Technology',
      providerCategory: 'Marketing',
      proposerLocation: 'Lagos',
      providerLocation: 'Kano',
      estimatedValue: 50000,
      duration: 40,
    })

    expect(mockGtag).toHaveBeenCalledWith('event', 'trade_completed',
      expect.objectContaining({
        event_category: 'nigerian_business',
        trade_id: 'trade-123',
        proposer_category: 'Technology',
        provider_category: 'Marketing',
        proposer_location: 'Lagos',
        provider_location: 'Kano',
        value: 50000,
        duration: 40,
      })
    )
  })

  it('tracks performance metrics for Nigerian internet conditions', () => {
    analytics.trackPerformance('api_response_time', 5500)

    expect(mockGtag).toHaveBeenCalledWith('event', 'timing_complete', {
      name: 'api_response_time',
      value: 5500,
      event_category: 'performance',
      custom_dimension_1: 'Lagos',
    })
  })
})

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGtag.mockClear()
  })

  it('measures synchronous operations', () => {
    PerformanceMonitor.startMeasurement('test_operation')

    // Simulate some work
    const start = Date.now()
    while (Date.now() - start < 10) {
      // Wait 10ms
    }

    const duration = PerformanceMonitor.endMeasurement('test_operation')

    expect(duration).toBeGreaterThan(0)
    expect(mockGtag).toHaveBeenCalledWith('event', 'timing_complete',
      expect.objectContaining({
        name: 'test_operation',
        event_category: 'performance',
      })
    )
  })

  it('measures async operations', async () => {
    const testAsyncOperation = async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
      return 'completed'
    }

    const result = await PerformanceMonitor.measureAsync('async_test', testAsyncOperation)

    expect(result).toBe('completed')
    expect(mockGtag).toHaveBeenCalledWith('event', 'timing_complete',
      expect.objectContaining({
        name: 'async_test',
        event_category: 'performance',
      })
    )
  })

  it('handles measurement errors gracefully', async () => {
    const failingOperation = async () => {
      throw new Error('Test error')
    }

    await expect(
      PerformanceMonitor.measureAsync('failing_test', failingOperation)
    ).rejects.toThrow('Test error')

    // Should still track the measurement
    expect(mockGtag).toHaveBeenCalled()
  })
})