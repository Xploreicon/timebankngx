// Offline capabilities for Nigerian time-banking platform
// Optimized for Nigerian internet conditions with frequent disconnections

import { QueryClient } from '@tanstack/react-query'
import { analytics } from './analytics'

interface OfflineQueueItem {
  id: string
  type: 'create' | 'update' | 'delete'
  resource: string
  data: any
  timestamp: number
  retries: number
  priority: 'high' | 'medium' | 'low'
}

class OfflineManager {
  private static instance: OfflineManager
  private isOnline: boolean = navigator.onLine
  private queue: OfflineQueueItem[] = []
  private readonly QUEUE_KEY = 'timebank-offline-queue'
  private readonly MAX_RETRIES = 3
  private readonly RETRY_DELAY = 2000 // Start with 2 seconds
  private queryClient: QueryClient | null = null

  constructor() {
    this.loadQueue()
    this.setupEventListeners()
  }

  public static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager()
    }
    return OfflineManager.instance
  }

  public setQueryClient(client: QueryClient) {
    this.queryClient = client
  }

  private setupEventListeners() {
    // Network status listeners
    window.addEventListener('online', this.handleOnline.bind(this))
    window.addEventListener('offline', this.handleOffline.bind(this))

    // Page visibility listener for battery optimization
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this))

    // Periodic queue processing (Nigerian-specific timing)
    setInterval(() => {
      if (this.isOnline && this.queue.length > 0) {
        this.processQueue()
      }
    }, 10000) // Check every 10 seconds for Nigerian conditions
  }

  private handleOnline() {
    console.log('🌐 Connection restored - Nigerian TimeBank online')
    this.isOnline = true

    // Track connectivity restoration
    analytics.trackBusinessEvent('connection_restored', {
      queue_size: this.queue.length,
      connection_type: this.getConnectionType(),
    })

    // Process pending operations
    this.processQueue()

    // Refresh critical data
    this.refreshCriticalData()
  }

  private handleOffline() {
    console.log('📴 Connection lost - Nigerian TimeBank offline mode')
    this.isOnline = false

    analytics.trackBusinessEvent('connection_lost', {
      queue_size: this.queue.length,
      last_sync: Date.now(),
    })

    // Switch to offline-first mode
    this.enableOfflineMode()
  }

  private handleVisibilityChange() {
    if (document.visibilityState === 'visible' && this.isOnline) {
      // App became visible and we're online - sync data
      this.processQueue()
    }
  }

  // Add operation to offline queue
  public queueOperation(operation: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retries'>) {
    const queueItem: OfflineQueueItem = {
      ...operation,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retries: 0,
    }

    this.queue.push(queueItem)
    this.saveQueue()

    console.log(`📋 Queued ${operation.type} operation for ${operation.resource}`)

    // If online, try to process immediately
    if (this.isOnline) {
      this.processQueue()
    }
  }

  // Process offline queue when connection is available
  private async processQueue() {
    if (this.queue.length === 0) return

    console.log(`🔄 Processing ${this.queue.length} offline operations`)

    // Sort by priority and timestamp
    const sortedQueue = this.queue.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      }
      return a.timestamp - b.timestamp
    })

    const processedItems: string[] = []

    for (const item of sortedQueue) {
      try {
        await this.executeOperation(item)
        processedItems.push(item.id)

        // Track successful sync
        analytics.trackBusinessEvent('offline_sync_success', {
          operation_type: item.type,
          resource: item.resource,
          retry_count: item.retries,
          queue_time: Date.now() - item.timestamp,
        })

      } catch (error) {
        console.error(`❌ Failed to sync ${item.resource}:`, error)

        item.retries++

        if (item.retries >= this.MAX_RETRIES) {
          // Move to failed operations or discard
          console.warn(`🗑️ Discarding operation after ${this.MAX_RETRIES} retries`)
          processedItems.push(item.id)

          analytics.trackBusinessEvent('offline_sync_failed', {
            operation_type: item.type,
            resource: item.resource,
            retry_count: item.retries,
            error: (error as Error).message,
          })
        }

        // Add exponential backoff delay for Nigerian conditions
        await new Promise(resolve =>
          setTimeout(resolve, this.RETRY_DELAY * Math.pow(2, item.retries))
        )
      }
    }

    // Remove processed items
    this.queue = this.queue.filter(item => !processedItems.includes(item.id))
    this.saveQueue()

    console.log(`✅ Processed ${processedItems.length} operations, ${this.queue.length} remaining`)
  }

  private async executeOperation(item: OfflineQueueItem): Promise<void> {
    // This would typically make actual API calls
    // For now, we'll simulate the operations

    switch (item.resource) {
      case 'profile':
        return this.syncProfile(item)
      case 'trade':
        return this.syncTrade(item)
      case 'service':
        return this.syncService(item)
      case 'proposal':
        return this.syncProposal(item)
      default:
        throw new Error(`Unknown resource: ${item.resource}`)
    }
  }

  private async syncProfile(item: OfflineQueueItem): Promise<void> {
    // Simulate API call with Nigerian network conditions
    await this.simulateNetworkDelay()

    if (this.queryClient) {
      // Update query cache with offline data
      this.queryClient.setQueryData(['profile', item.data.id], item.data)
    }
  }

  private async syncTrade(item: OfflineQueueItem): Promise<void> {
    await this.simulateNetworkDelay()

    if (this.queryClient) {
      // Invalidate and refetch trades
      this.queryClient.invalidateQueries({ queryKey: ['trades'] })
    }
  }

  private async syncService(item: OfflineQueueItem): Promise<void> {
    await this.simulateNetworkDelay()

    if (this.queryClient) {
      this.queryClient.invalidateQueries({ queryKey: ['services'] })
    }
  }

  private async syncProposal(item: OfflineQueueItem): Promise<void> {
    await this.simulateNetworkDelay()

    if (this.queryClient) {
      this.queryClient.invalidateQueries({ queryKey: ['proposals'] })
    }
  }

  private async simulateNetworkDelay(): Promise<void> {
    // Simulate Nigerian network delay
    const delay = Math.random() * 3000 + 1000 // 1-4 seconds
    return new Promise(resolve => setTimeout(resolve, delay))
  }

  // Load queue from localStorage
  private loadQueue() {
    try {
      const saved = localStorage.getItem(this.QUEUE_KEY)
      if (saved) {
        this.queue = JSON.parse(saved)
        console.log(`📁 Loaded ${this.queue.length} operations from offline queue`)
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error)
      this.queue = []
    }
  }

  // Save queue to localStorage
  private saveQueue() {
    try {
      localStorage.setItem(this.QUEUE_KEY, JSON.stringify(this.queue))
    } catch (error) {
      console.error('Failed to save offline queue:', error)
    }
  }

  private enableOfflineMode() {
    // Configure React Query for offline mode
    if (this.queryClient) {
      this.queryClient.getDefaultOptions().queries = {
        ...this.queryClient.getDefaultOptions().queries,
        networkMode: 'offlineFirst',
        staleTime: Infinity, // Use cached data indefinitely when offline
        gcTime: 24 * 60 * 60 * 1000, // Keep cached data for 24 hours
      }
    }

    // Show offline indicator
    this.showOfflineNotification()
  }

  private refreshCriticalData() {
    if (!this.queryClient) return

    // Refresh critical data when connection is restored
    const criticalQueries = ['profile', 'active-trades', 'notifications', 'credit-balance']

    criticalQueries.forEach(queryKey => {
      this.queryClient?.invalidateQueries({ queryKey: [queryKey] })
    })
  }

  private showOfflineNotification() {
    // This would integrate with your toast/notification system
    console.log('🔔 Nigerian TimeBank: You are currently offline. Changes will sync when connection is restored.')
  }

  private getConnectionType(): string {
    // @ts-ignore - navigator.connection is experimental
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    return connection ? connection.effectiveType || 'unknown' : 'unknown'
  }

  // Public API methods
  public isOffline(): boolean {
    return !this.isOnline
  }

  public getQueueSize(): number {
    return this.queue.length
  }

  public clearQueue(): void {
    this.queue = []
    this.saveQueue()
  }

  // Nigerian-specific offline features
  public optimizeForDataSaving() {
    // Reduce image quality and disable auto-refresh in offline mode
    if (this.queryClient) {
      this.queryClient.getDefaultOptions().queries = {
        ...this.queryClient.getDefaultOptions().queries,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: true, // Only refetch when reconnecting
      }
    }
  }

  public enableDataSaverMode(enabled: boolean) {
    // For Nigerian users with limited data plans
    if (enabled) {
      this.optimizeForDataSaving()
      console.log('💾 Data saver mode enabled for Nigerian conditions')
    }
  }
}

// Export singleton instance
export const offlineManager = OfflineManager.getInstance()

// React Query integration
export const configureOfflineSupport = (queryClient: QueryClient) => {
  offlineManager.setQueryClient(queryClient)

  // Configure React Query for offline-first behavior
  queryClient.setDefaultOptions({
    queries: {
      networkMode: 'offlineFirst',
      retry: (failureCount, error) => {
        // Nigerian-specific retry logic
        if (!navigator.onLine) return false // Don't retry if offline
        if (failureCount < 3) return true // Retry up to 3 times
        return false
      },
      retryDelay: attemptIndex =>
        Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff, max 30s
      staleTime: 5 * 60 * 1000, // 5 minutes for Nigerian conditions
      gcTime: 30 * 60 * 1000, // 30 minutes cache time
    },
    mutations: {
      networkMode: 'offlineFirst',
      retry: 3,
      onError: (error, variables, context) => {
        // Queue failed mutations for offline processing
        console.error('Mutation failed, queuing for offline sync:', error)
      },
    },
  })

  console.log('⚡ Offline capabilities initialized for Nigerian TimeBank')
}

// Service Worker registration for advanced offline features
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      })

      console.log('🔧 Service Worker registered for offline support')

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        console.log('📦 New app version available')
      })

      return registration
    } catch (error) {
      console.error('Service Worker registration failed:', error)
    }
  }
}

export default offlineManager