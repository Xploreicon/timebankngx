// Error Boundary component for Nigerian TimeBank
// Provides graceful error recovery with Nigerian-specific context

import React from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { analytics } from '@/lib/analytics'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
  retryCount: number
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<ErrorBoundaryState>
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // Track error with Nigerian context
    analytics.trackBusinessEvent('application_error', {
      error_message: error.message,
      error_stack: error.stack?.slice(0, 500), // Truncate for analytics
      component_stack: errorInfo.componentStack?.slice(0, 500),
      retry_count: this.state.retryCount,
      user_agent: navigator.userAgent,
      timestamp: Date.now(),
    })

    console.error('Nigerian TimeBank Error:', error, errorInfo)
  }

  handleRetry = () => {
    const { retryCount } = this.state

    // Prevent excessive retries
    if (retryCount >= 3) {
      return
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: retryCount + 1
    })

    // Track retry attempt
    analytics.trackBusinessEvent('error_recovery_attempt', {
      retry_count: retryCount + 1,
      error_message: this.state.error?.message || 'unknown',
    })
  }

  handleGoHome = () => {
    analytics.trackBusinessEvent('error_recovery_home', {
      retry_count: this.state.retryCount,
      error_message: this.state.error?.message || 'unknown',
    })

    // Force navigation to home
    window.location.href = '/'
  }

  handleReload = () => {
    analytics.trackBusinessEvent('error_recovery_reload', {
      retry_count: this.state.retryCount,
      error_message: this.state.error?.message || 'unknown',
    })

    // Force page reload
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent {...this.state} />
      }

      return <DefaultErrorFallback {...this.state} onRetry={this.handleRetry} onGoHome={this.handleGoHome} onReload={this.handleReload} />
    }

    return this.props.children
  }
}

// Default error fallback component with Nigerian optimizations
const DefaultErrorFallback: React.FC<ErrorBoundaryState & {
  onRetry: () => void
  onGoHome: () => void
  onReload: () => void
}> = ({ error, retryCount, onRetry, onGoHome, onReload }) => {
  const canRetry = retryCount < 3

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full p-6 text-center">
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Something went wrong
        </h1>

        <p className="text-gray-600 mb-6">
          Nigerian TimeBank encountered an error. Don't worry, your data is safe
          and we're working to fix this issue.
        </p>

        {/* Error details for development */}
        {process.env.NODE_ENV === 'development' && error && (
          <details className="mb-6 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 mb-2">
              Error Details (Development)
            </summary>
            <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-32 text-red-600">
              {error.toString()}
            </pre>
          </details>
        )}

        <div className="space-y-3">
          {canRetry && (
            <Button onClick={onRetry} className="w-full" size="lg">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again ({3 - retryCount} attempts left)
            </Button>
          )}

          <Button onClick={onGoHome} variant="outline" className="w-full" size="lg">
            <Home className="h-4 w-4 mr-2" />
            Go to Dashboard
          </Button>

          <Button onClick={onReload} variant="ghost" className="w-full" size="lg">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reload Page
          </Button>
        </div>

        {/* Nigerian-specific help information */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">🇳🇬 Nigerian Support Tips</h3>
          <ul className="text-sm text-blue-700 space-y-1 text-left">
            <li>• Check your internet connection</li>
            <li>• Try refreshing if you have slow network</li>
            <li>• Clear your browser cache if issues persist</li>
            <li>• Contact support for help</li>
          </ul>
        </div>

        {!canRetry && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              Too many retry attempts. Please reload the page or go back to the dashboard.
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}

// Hook for programmatic error reporting
export const useErrorBoundary = () => {
  const [, setState] = React.useState()

  const captureError = React.useCallback((error: Error) => {
    setState(() => {
      throw error
    })
  }, [])

  return { captureError }
}

// HOC for wrapping components with error boundaries
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<ErrorBoundaryState>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  return WrappedComponent
}

// Nigerian-specific error boundary for network issues
export const NetworkErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ErrorBoundary
    fallback={(state) => (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center">
          <div className="h-16 w-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-orange-600" />
          </div>

          <h2 className="text-xl font-semibold mb-2">Connection Issue</h2>
          <p className="text-gray-600 mb-4">
            Having trouble connecting? This is common with Nigerian internet conditions.
          </p>

          <div className="space-y-3">
            <Button onClick={() => window.location.reload()} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Connection
            </Button>

            <div className="text-sm text-gray-500 space-y-1">
              <p>• Check your data connection</p>
              <p>• Try switching between WiFi and mobile data</p>
              <p>• Your progress is saved locally</p>
            </div>
          </div>
        </Card>
      </div>
    )}
  >
    {children}
  </ErrorBoundary>
)