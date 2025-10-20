// Service Worker for Nigerian TimeBank offline capabilities
// Optimized for Nigerian internet conditions and data constraints

const CACHE_NAME = 'timebank-v1'
const OFFLINE_URL = '/offline.html'

// Assets to cache for offline use
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico',
  // Add critical CSS and JS files
  // Note: Vite will generate specific filenames, so this would need to be updated during build
]

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /^\/api\/profile/,
  /^\/api\/trades/,
  /^\/api\/services/,
]

// Nigerian-specific optimizations
const NIGERIAN_CACHE_STRATEGY = {
  // Cache images for longer due to slow connections
  images: { maxAge: 7 * 24 * 60 * 60 * 1000 }, // 7 days
  // Cache API responses for reasonable time
  api: { maxAge: 30 * 60 * 1000 }, // 30 minutes
  // Cache static assets aggressively
  static: { maxAge: 30 * 24 * 60 * 60 * 1000 }, // 30 days
}

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing - Nigerian TimeBank')

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 Caching essential assets for offline use')
      return cache.addAll(STATIC_ASSETS)
    }).catch((error) => {
      console.error('Failed to cache assets:', error)
    })
  )

  // Force activation of new service worker
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activated - Nigerian TimeBank ready offline')

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => {
            console.log('🗑️ Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          })
      )
    })
  )

  // Take control of all pages immediately
  self.clients.claim()
})

// Fetch event - implement Nigerian-optimized caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Skip chrome-extension requests
  if (url.protocol === 'chrome-extension:') {
    return
  }

  event.respondWith(
    handleRequest(request)
  )
})

async function handleRequest(request) {
  const url = new URL(request.url)

  try {
    // API requests - Network First with Cache Fallback (Nigerian conditions)
    if (isApiRequest(url)) {
      return await handleApiRequest(request)
    }

    // Images - Cache First (save Nigerian data)
    if (isImageRequest(url)) {
      return await handleImageRequest(request)
    }

    // Static assets - Cache First
    if (isStaticAsset(url)) {
      return await handleStaticRequest(request)
    }

    // HTML pages - Network First with Offline Fallback
    return await handlePageRequest(request)

  } catch (error) {
    console.error('Request handling failed:', error)
    return await handleOfflineRequest(request)
  }
}

// Network First strategy for API calls (Nigerian conditions)
async function handleApiRequest(request) {
  const cache = await caches.open(CACHE_NAME)

  try {
    // Try network first with Nigerian timeout
    const networkResponse = await fetchWithTimeout(request, 8000) // 8 second timeout

    if (networkResponse.ok) {
      // Clone and cache successful response
      cache.put(request, networkResponse.clone())
      return networkResponse
    } else {
      throw new Error(`API request failed: ${networkResponse.status}`)
    }
  } catch (error) {
    console.log('🌐 API network failed, trying cache:', request.url)

    // Try cache fallback
    const cachedResponse = await cache.match(request)
    if (cachedResponse) {
      // Add cache indicator header
      const response = cachedResponse.clone()
      response.headers.set('X-Served-From', 'cache')
      return response
    }

    // Return minimal error response for Nigerian conditions
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'Data not available offline',
        cached: false
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

// Cache First strategy for images (save Nigerian data)
async function handleImageRequest(request) {
  const cache = await caches.open(CACHE_NAME)

  // Try cache first
  const cachedResponse = await cache.match(request)
  if (cachedResponse) {
    return cachedResponse
  }

  try {
    // Fetch from network with timeout
    const networkResponse = await fetchWithTimeout(request, 15000) // Longer timeout for images

    if (networkResponse.ok) {
      // Cache successful response
      cache.put(request, networkResponse.clone())
      return networkResponse
    }
  } catch (error) {
    console.log('🖼️ Image load failed:', request.url)
  }

  // Return placeholder image for Nigerian conditions
  return new Response('', {
    status: 200,
    statusText: 'OK',
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-cache'
    }
  })
}

// Cache First strategy for static assets
async function handleStaticRequest(request) {
  const cache = await caches.open(CACHE_NAME)

  const cachedResponse = await cache.match(request)
  if (cachedResponse) {
    return cachedResponse
  }

  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
      return networkResponse
    }
  } catch (error) {
    console.log('📁 Static asset failed:', request.url)
  }

  return new Response('Not Found', { status: 404 })
}

// Network First with Offline fallback for pages
async function handlePageRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetchWithTimeout(request, 5000)

    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, networkResponse.clone())
      return networkResponse
    }
  } catch (error) {
    console.log('📄 Page network failed, trying cache:', request.url)
  }

  // Try cache fallback
  const cache = await caches.open(CACHE_NAME)
  const cachedResponse = await cache.match(request)
  if (cachedResponse) {
    return cachedResponse
  }

  // Return offline page
  return await cache.match(OFFLINE_URL) || new Response('Offline', { status: 503 })
}

// Handle completely offline requests
async function handleOfflineRequest(request) {
  const cache = await caches.open(CACHE_NAME)

  const cachedResponse = await cache.match(request)
  if (cachedResponse) {
    return cachedResponse
  }

  return new Response('Offline - No cached version available', { status: 503 })
}

// Utility functions
function isApiRequest(url) {
  return url.pathname.startsWith('/api/') ||
         url.pathname.startsWith('/rest/') ||
         API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))
}

function isImageRequest(url) {
  return /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(url.pathname)
}

function isStaticAsset(url) {
  return /\.(js|css|woff|woff2|ttf|eot)$/i.test(url.pathname) ||
         url.pathname.includes('/_next/static/') ||
         url.pathname.includes('/static/')
}

// Fetch with timeout for Nigerian conditions
function fetchWithTimeout(request, timeout) {
  return Promise.race([
    fetch(request),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    )
  ])
}

// Background sync for Nigerian conditions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(handleBackgroundSync())
  }
})

async function handleBackgroundSync() {
  console.log('🔄 Background sync started - Nigerian TimeBank')

  // This would typically sync offline queue
  try {
    // Send message to app to process offline queue
    const clients = await self.clients.matchAll()
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC',
        timestamp: Date.now()
      })
    })
  } catch (error) {
    console.error('Background sync failed:', error)
  }
}

// Push notifications for Nigerian users
self.addEventListener('push', (event) => {
  const options = {
    body: 'New activity on Nigerian TimeBank',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    vibrate: [100, 50, 100], // Gentle vibration for Nigerian conditions
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    tag: 'timebank-notification',
    requireInteraction: false // Don't require interaction due to power constraints
  }

  if (event.data) {
    const data = event.data.json()
    options.body = data.message || options.body
    options.data = { ...options.data, ...data }
  }

  event.waitUntil(
    self.registration.showNotification('Nigerian TimeBank', options)
  )
})

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  event.waitUntil(
    clients.matchAll().then((clientList) => {
      // Focus existing tab if available
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus()
        }
      }

      // Open new tab
      if (clients.openWindow) {
        return clients.openWindow('/')
      }
    })
  )
})

console.log('🚀 Nigerian TimeBank Service Worker loaded')