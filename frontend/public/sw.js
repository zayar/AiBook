const CACHE_NAME = 'aibook-v1.0.0';
const API_CACHE_NAME = 'aibook-api-v1.0.0';

// Static assets to cache
const STATIC_ASSETS = [
  '/',
  '/favicon.ico',
  '/file.svg',
  '/globe.svg',
  '/next.svg',
  '/pattern.svg',
  '/vercel.svg',
  '/window.svg'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/v1/ai/insights',
  '/api/v1/ai/agents',
  '/health'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        self.clients.claim();
      })
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests with network-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(API_CACHE_NAME)
        .then((cache) => {
          return fetch(request)
            .then((response) => {
              // Cache successful API responses for 5 minutes
              if (response.status === 200) {
                const responseClone = response.clone();
                setTimeout(() => {
                  cache.put(request, responseClone);
                }, 0);
              }
              return response;
            })
            .catch(() => {
              // Fallback to cache if network fails
              return cache.match(request);
            });
        })
    );
    return;
  }

  // Handle static assets with cache-first strategy
  event.respondWith(
    caches.match(request)
      .then((response) => {
        if (response) {
          return response;
        }
        
        return fetch(request)
          .then((response) => {
            // Cache successful responses
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseClone);
                });
            }
            return response;
          });
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'ai-command-sync') {
    event.waitUntil(
      // Handle offline AI commands when back online
      syncOfflineCommands()
    );
  }
});

// Push notifications for AI insights
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New AI insight available',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'ai-insight',
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'View Insight'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('AiBook - AI Insight', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Helper function to sync offline commands
async function syncOfflineCommands() {
  try {
    const cache = await caches.open('aibook-offline-commands');
    const requests = await cache.keys();
    
    for (const request of requests) {
      try {
        await fetch(request);
        await cache.delete(request);
      } catch (error) {
        console.log('Failed to sync command:', error);
      }
    }
  } catch (error) {
    console.log('Sync failed:', error);
  }
}