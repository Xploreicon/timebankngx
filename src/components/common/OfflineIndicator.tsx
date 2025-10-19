// Offline status indicator for Nigerian TimeBank users
import { useOfflineNotifications, useNigerianNetworkMonitoring } from '@/hooks/useOffline'
import { useEffect } from 'react'
import { WifiOff } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

export const OfflineIndicator = () => {
  const { showNotification, message, isOffline } = useOfflineNotifications()

  // Show toast notification only when going offline or coming back online
  useEffect(() => {
    if (isOffline) {
      toast({
        variant: 'destructive',
        title: 'You\'re offline',
        description: 'Changes will be saved locally and synced when you reconnect',
        duration: 5000,
      })
    } else if (showNotification && !isOffline) {
      // Coming back online
      toast({
        title: 'Back online!',
        description: 'Your changes are now being synced',
        duration: 3000,
      })
    }
  }, [isOffline, showNotification])

  // Don't render anything - we're using toasts now
  return null
}

// Connection status badge for header/navigation (minimal version)
export const ConnectionBadge = () => {
  const { isOffline, queueSize } = useOfflineNotifications()

  // Only show if actually offline or has pending items
  if (!isOffline && queueSize === 0) return null

  return (
    <div className="flex items-center gap-1">
      {isOffline && (
        <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" title="Offline" />
      )}
      {queueSize > 0 && (
        <span className="text-xs text-muted-foreground" title={`${queueSize} pending sync`}>
          ({queueSize})
        </span>
      )}
    </div>
  )
}

