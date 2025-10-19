import * as Sentry from '@sentry/react'

// Environment-based configuration
const environment = import.meta.env.VITE_ENVIRONMENT || 'development'
const sentryDsn = import.meta.env.VITE_SENTRY_DSN
const isErrorMonitoringEnabled = import.meta.env.VITE_ENABLE_ERROR_MONITORING === 'true'

// Initialize Sentry only in production and if DSN is provided
export const initSentry = () => {
  if (!isErrorMonitoringEnabled || !sentryDsn || environment === 'development') {
    console.log('Sentry monitoring disabled or not configured')
    return
  }

  Sentry.init({
    dsn: sentryDsn,
    environment,
    integrations: [
      Sentry.browserTracingIntegration(),
    ],

    // Performance monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,

    // Error filtering for Nigerian context
    beforeSend(event) {
      // Filter out common errors that aren't actionable
      if (event.exception) {
        const error = event.exception.values?.[0]
        if (error?.value?.includes('Network request failed') &&
            error.value.includes('Nigeria')) {
          // Common connectivity issues in Nigeria - don't spam Sentry
          return null
        }

        if (error?.value?.includes('ResizeObserver loop limit exceeded')) {
          // Common browser issue, not actionable
          return null
        }
      }

      return event
    },

    // Set user context for Nigerian users
    initialScope: {
      tags: {
        component: 'timebank-ng',
        market: 'nigeria',
      },
    },

    // Release tracking
    release: `timebank-ng@${__APP_VERSION__}`,

    // Additional configuration for production
    ...(environment === 'production' && {
      normalizeDepth: 6,
      maxBreadcrumbs: 50,
    }),
  })

  // Set additional context
  Sentry.setTag('buildTime', __BUILD_TIME__)
  Sentry.setContext('app', {
    name: 'TimeBank Nigeria',
    version: __APP_VERSION__,
    environment,
  })

  console.log('Sentry initialized for', environment, 'environment')
}

// Helper functions for manual error reporting
export const captureError = (error: Error, context?: Record<string, any>) => {
  if (!isErrorMonitoringEnabled) return

  Sentry.withScope(scope => {
    if (context) {
      scope.setContext('errorContext', context)
    }
    Sentry.captureException(error)
  })
}

export const captureMessage = (message: string, level: 'info' | 'warning' | 'error' = 'info') => {
  if (!isErrorMonitoringEnabled) return

  Sentry.captureMessage(message, level)
}

// Performance monitoring helpers
export const startTransaction = (name: string, op: string) => {
  if (!isErrorMonitoringEnabled) return null

  return Sentry.startSpan({ name, op }, () => {})
}

// User context helpers for Nigerian users
export const setSentryUser = (user: {
  id: string
  email?: string
  displayName?: string
  location?: string
  category?: string
  trustScore?: number
}) => {
  if (!isErrorMonitoringEnabled) return

  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.displayName,
    segment: `${user.category || 'unknown'}-${user.location || 'unknown'}`,
  })

  Sentry.setTag('userLocation', user.location || 'unknown')
  Sentry.setTag('userCategory', user.category || 'unknown')

  if (user.trustScore !== undefined) {
    Sentry.setTag('trustLevel', user.trustScore > 70 ? 'high' : user.trustScore > 40 ? 'medium' : 'low')
  }
}

// Business context helpers
export const setSentryBusinessContext = (context: {
  tradeId?: string
  serviceId?: string
  transactionType?: string
  nairaAmount?: number
}) => {
  if (!isErrorMonitoringEnabled) return

  Sentry.setContext('business', {
    tradeId: context.tradeId,
    serviceId: context.serviceId,
    transactionType: context.transactionType,
    nairaAmount: context.nairaAmount,
  })
}