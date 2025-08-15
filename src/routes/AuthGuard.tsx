import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Skeleton } from '@/components/ui/skeleton'

interface AuthGuardProps {
  children: React.ReactNode
  requireOnboarding?: boolean
}

export const AuthGuard = ({ children, requireOnboarding = false }: AuthGuardProps) => {
  const { isAuthenticated, isOnboarded, profile } = useAuth()
  const location = useLocation()

  // Show loading skeleton while checking auth state
  if (profile === undefined) {
    return (
      <div className="min-h-screen p-6 space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  // Not authenticated - redirect to auth
  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />
  }

  // Authenticated but not onboarded - redirect to onboarding
  if (requireOnboarding && !isOnboarded && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}