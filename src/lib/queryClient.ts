import { QueryClient } from '@tanstack/react-query'
import { captureError } from './sentry'
import { configureOfflineSupport } from './offline'

// Custom error handler for React Query
const queryErrorHandler = (error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error'

  // Don't report network errors in Nigerian context (common connectivity issues)
  if (errorMessage.includes('Network request failed') ||
      errorMessage.includes('fetch')) {
    console.warn('Network error (likely connectivity):', errorMessage)
    return
  }

  // Report other errors to Sentry
  captureError(error instanceof Error ? error : new Error(errorMessage), {
    source: 'react-query',
    errorType: 'query-error'
  })
}

// Enhanced query client with production-optimized caching
export const createQueryClient = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Caching strategy for Nigerian internet conditions
        staleTime: 1000 * 60 * 5, // 5 minutes - data stays fresh
        gcTime: 1000 * 60 * 30, // 30 minutes - keep in cache

        // Retry strategy optimized for Nigerian connectivity
        retry: (failureCount, error: any) => {
          // Don't retry on authentication errors
          if (error?.status === 401 || error?.status === 403) {
            return false
          }

          // Don't retry on 4xx errors (except timeout and rate limit)
          if (error?.status >= 400 && error?.status < 500 &&
              ![408, 429].includes(error?.status)) {
            return false
          }

          // Retry network errors up to 3 times with exponential backoff
          return failureCount < 3
        },

        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

        // Background refetch settings
        refetchOnWindowFocus: false, // Reduce unnecessary requests
        refetchOnReconnect: true, // Refetch when connection restored
        refetchOnMount: true,

        // Error handling
        throwOnError: false,
        onError: queryErrorHandler,
      },
      mutations: {
        // Mutation retry strategy
        retry: (failureCount, error: any) => {
          // Don't retry client errors
          if (error?.status >= 400 && error?.status < 500) {
            return false
          }
          return failureCount < 2
        },

        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
        onError: queryErrorHandler,
      },
    },
  })

  // Configure offline support for Nigerian conditions
  configureOfflineSupport(queryClient)

  return queryClient
}

// Query key factories for consistent caching
export const queryKeys = {
  // User-related queries
  users: ['users'] as const,
  user: (id: string) => [...queryKeys.users, id] as const,
  userProfile: (id: string) => [...queryKeys.user(id), 'profile'] as const,
  userServices: (id: string) => [...queryKeys.user(id), 'services'] as const,
  userTrades: (id: string) => [...queryKeys.user(id), 'trades'] as const,
  userTransactions: (id: string) => [...queryKeys.user(id), 'transactions'] as const,

  // Service-related queries
  services: ['services'] as const,
  service: (id: string) => [...queryKeys.services, id] as const,
  servicesByCategory: (category: string) => [...queryKeys.services, 'category', category] as const,
  servicesByLocation: (location: string) => [...queryKeys.services, 'location', location] as const,
  popularServices: () => [...queryKeys.services, 'popular'] as const,

  // Trade-related queries
  trades: ['trades'] as const,
  trade: (id: string) => [...queryKeys.trades, id] as const,
  tradeMessages: (id: string) => [...queryKeys.trade(id), 'messages'] as const,
  activeTradesByUser: (userId: string) => [...queryKeys.trades, 'active', userId] as const,
  tradeHistory: (userId: string) => [...queryKeys.trades, 'history', userId] as const,

  // Nigerian business context queries
  nigerianRates: ['nigerian-rates'] as const,
  nigerianBanks: ['nigerian-banks'] as const,
  nigerianHolidays: ['nigerian-holidays'] as const,
  locationPricing: (location: string, category: string) =>
    ['location-pricing', location, category] as const,

  // Analytics and reporting
  analytics: ['analytics'] as const,
  userAnalytics: (userId: string) => [...queryKeys.analytics, userId] as const,
  marketAnalytics: () => [...queryKeys.analytics, 'market'] as const,

  // System queries
  notifications: (userId: string) => ['notifications', userId] as const,
  systemStatus: ['system-status'] as const,
} as const

// Cache invalidation helpers
export const queryInvalidation = {
  // User-related invalidations
  invalidateUser: (queryClient: QueryClient, userId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.user(userId) })
  },

  invalidateUserServices: (queryClient: QueryClient, userId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.userServices(userId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.services })
  },

  invalidateUserTrades: (queryClient: QueryClient, userId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.userTrades(userId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.trades })
  },

  // Service-related invalidations
  invalidateService: (queryClient: QueryClient, serviceId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.service(serviceId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.services })
  },

  invalidateServicesByCategory: (queryClient: QueryClient, category: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.servicesByCategory(category) })
  },

  // Trade-related invalidations
  invalidateTrade: (queryClient: QueryClient, tradeId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.trade(tradeId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.trades })
  },

  invalidateTradeMessages: (queryClient: QueryClient, tradeId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tradeMessages(tradeId) })
  },

  // Global invalidations
  invalidateAll: (queryClient: QueryClient) => {
    queryClient.invalidateQueries()
  },

  // Clear all cache (for logout)
  clearCache: (queryClient: QueryClient) => {
    queryClient.clear()
  },
}

// Cache warming functions for critical data
export const cacheWarmers = {
  // Pre-load user's essential data
  warmUserCache: async (queryClient: QueryClient, userId: string) => {
    const promises = [
      queryClient.prefetchQuery({
        queryKey: queryKeys.userProfile(userId),
        staleTime: 1000 * 60 * 10, // 10 minutes
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.userServices(userId),
        staleTime: 1000 * 60 * 5, // 5 minutes
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.activeTradesByUser(userId),
        staleTime: 1000 * 60 * 2, // 2 minutes
      }),
    ]

    await Promise.allSettled(promises)
  },

  // Pre-load popular/trending data
  warmDiscoveryCache: async (queryClient: QueryClient) => {
    const promises = [
      queryClient.prefetchQuery({
        queryKey: queryKeys.popularServices(),
        staleTime: 1000 * 60 * 15, // 15 minutes
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.nigerianRates,
        staleTime: 1000 * 60 * 60, // 1 hour
      }),
    ]

    await Promise.allSettled(promises)
  },
}