import { Navigate, useLocation } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'

export const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated, isOnboarded } = useAppStore()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />
  }
  if (!isOnboarded && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }
  return children
}
