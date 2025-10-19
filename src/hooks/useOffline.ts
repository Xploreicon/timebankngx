// React hook for offline capabilities in Nigerian TimeBank
import { useState, useEffect, useCallback } from 'react'
import { offlineManager } from '@/lib/offline'
import { useQueryClient } from '@tanstack/react-query'
import { analytics } from '@/lib/analytics'

export interface OfflineStatus {
  isOffline: boolean
  queueSize: number
  isProcessing: boolean
  lastSyncTime: Date | null
  connectionType: string
}

export const useOffline = () => {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<OfflineStatus>({
    isOffline: offlineManager.isOffline(),
    queueSize: offlineManager.getQueueSize(),
    isProcessing: false,
    lastSyncTime: null,
    connectionType: 'unknown'
  })

  // Update status when network changes
  const updateStatus = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      isOffline: offlineManager.isOffline(),
      queueSize: offlineManager.getQueueSize(),
      connectionType: getConnectionType(),
    }))
  }, [])

  useEffect(() => {
    // Set up offline manager with query client
    offlineManager.setQueryClient(queryClient)

    // Initial status update
    updateStatus()

    // Listen for network changes
    const handleOnline = () => {
      updateStatus()
      setStatus(prev => ({ ...prev, lastSyncTime: new Date() }))
      analytics.trackBusinessEvent('connection_restored', {
        queue_size: offlineManager.getQueueSize()
      })
    }

    const handleOffline = () => {
      updateStatus()
      analytics.trackBusinessEvent('connection_lost', {
        queue_size: offlineManager.getQueueSize()
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Periodic status updates
    const interval = setInterval(updateStatus, 5000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [queryClient, updateStatus])

  // Queue operations for offline sync
  const queueOperation = useCallback((
    type: 'create' | 'update' | 'delete',
    resource: string,
    data: any,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ) => {
    offlineManager.queueOperation({ type, resource, data, priority })
    updateStatus()
  }, [updateStatus])

  // Clear the offline queue
  const clearQueue = useCallback(() => {
    offlineManager.clearQueue()
    updateStatus()
  }, [updateStatus])

  // Enable data saver mode for Nigerian conditions
  const enableDataSaver = useCallback((enabled: boolean) => {
    offlineManager.enableDataSaverMode(enabled)
    analytics.trackBusinessEvent('data_saver_toggled', { enabled })
  }, [])

  return {
    ...status,
    queueOperation,
    clearQueue,
    enableDataSaver,
    refresh: updateStatus,
  }
}

// Nigerian-specific offline operations
export const useNigerianOfflineFeatures = () => {
  const offline = useOffline()

  // Queue trade operations with Nigerian business context
  const queueTradeOperation = useCallback((
    action: 'create' | 'update' | 'accept' | 'complete',
    tradeData: {
      id?: string
      title?: string
      category?: string
      location?: string
      estimatedValue?: number
    }
  ) => {
    offline.queueOperation('create', 'trade', {
      action,
      ...tradeData,
      timestamp: Date.now(),
      nigerianContext: {
        currency: 'NGN',
        timezone: 'WAT',
        businessHours: isNigerianBusinessHours(),
      }
    }, 'high')
  }, [offline])

  // Queue service operations
  const queueServiceOperation = useCallback((
    action: 'create' | 'update' | 'delete',
    serviceData: {
      id?: string
      title?: string
      category?: string
      location?: string
      hourlyRate?: number
    }
  ) => {
    offline.queueOperation('create', 'service', {
      action,
      ...serviceData,
      timestamp: Date.now(),
      nigerianContext: {
        currency: 'NGN',
        ratePer: 'hour',
      }
    }, 'medium')
  }, [offline])

  // Queue profile updates
  const queueProfileUpdate = useCallback((profileData: any) => {
    offline.queueOperation('update', 'profile', {
      ...profileData,
      timestamp: Date.now(),
    }, 'high')
  }, [offline])

  return {
    ...offline,
    queueTradeOperation,
    queueServiceOperation,
    queueProfileUpdate,
    isBusinessHours: isNigerianBusinessHours(),
  }
}

// Utility functions
function getConnectionType(): string {
  // @ts-ignore - navigator.connection is experimental
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  return connection ? connection.effectiveType || 'unknown' : 'unknown'
}

function isNigerianBusinessHours(): boolean {
  const now = new Date()
  const hour = now.getHours()
  // Nigerian business hours: 8 AM to 6 PM WAT
  return hour >= 8 && hour <= 18
}

// Hook for offline notifications and user guidance
export const useOfflineNotifications = () => {
  const { isOffline, queueSize } = useOffline()
  const [showNotification, setShowNotification] = useState(false)

  useEffect(() => {
    if (isOffline && queueSize > 0) {
      setShowNotification(true)
    } else {
      setShowNotification(false)
    }
  }, [isOffline, queueSize])

  const dismissNotification = useCallback(() => {
    setShowNotification(false)
  }, [])

  return {
    showNotification,
    dismissNotification,
    isOffline,
    queueSize,
    message: isOffline
      ? `You're offline. ${queueSize} changes will sync when connected.`
      : queueSize > 0
        ? `Syncing ${queueSize} changes...`
        : 'All changes synced',
  }
}

// Hook for monitoring Nigerian internet conditions
export const useNigerianNetworkMonitoring = () => {
  const [networkInfo, setNetworkInfo] = useState({
    effectiveType: 'unknown',
    downlink: 0,
    rtt: 0,
    saveData: false,
  })

  useEffect(() => {
    // @ts-ignore - navigator.connection is experimental
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection

    if (connection) {
      const updateNetworkInfo = () => {
        setNetworkInfo({
          effectiveType: connection.effectiveType || 'unknown',
          downlink: connection.downlink || 0,
          rtt: connection.rtt || 0,
          saveData: connection.saveData || false,
        })

        // Track Nigerian network conditions
        analytics.trackBusinessEvent('network_condition', {
          connection_type: connection.effectiveType,
          downlink_mbps: connection.downlink,
          round_trip_time: connection.rtt,
          data_saver: connection.saveData,
        })
      }

      updateNetworkInfo()
      connection.addEventListener('change', updateNetworkInfo)

      return () => {
        connection.removeEventListener('change', updateNetworkInfo)
      }
    }
  }, [])

  return {
    ...networkInfo,
    isSlowConnection: networkInfo.effectiveType === 'slow-2g' ||
                      networkInfo.effectiveType === '2g' ||
                      networkInfo.downlink < 1.5,
    isFastConnection: networkInfo.effectiveType === '4g' &&
                      networkInfo.downlink > 10,
    recommendDataSaver: networkInfo.saveData ||
                        networkInfo.effectiveType === 'slow-2g' ||
                        networkInfo.effectiveType === '2g',
  }
}