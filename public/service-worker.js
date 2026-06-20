// Service Worker for Eskimos Road to Glory PWA
const CACHE_NAME = 'eskimos-r2g-v1';

// Resources to cache immediately when service worker is installed
const PRECACHE_RESOURCES = [
  './',
  './index.html',
  './offline.html',
  './manifest.json',
  './assets/images/logo11.webp',
  './css/performance.css',
  './css/pwa.css',
  './css/styles.css',
  './js/script.js',
  './js/pwa-init.js',
  './js/offline-manager.js',
  './js/pwa-install-prompt.js',
  './js/fix-service-worker.js',
  './test-offline.html'
];

// Resources to cache when visited
const DYNAMIC_CACHE_RESOURCES = [
  './player-admin.html',
  './player-database.html',
  './player-signing.html',
  './career-mode.html',
  './registered-clubs.html',
  './trophy-cabinet.html',
  './manager-ranking.html',
  './career-tournament.html',
  './tournament-guide.html',
  './admin-login.html',
  './token-setup.html'
];

// Install event - precache critical resources
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing Service Worker...');
  
  // Skip waiting to activate immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Precaching files...');
        // Force cache.addAll to complete even if some resources fail
        return Promise.allSettled(
          PRECACHE_RESOURCES.map(url => 
            cache.add(url).catch(err => 
              console.error(`[Service Worker] Failed to cache ${url}:`, err)
            )
          )
        );
      })
      .catch(error => {
        console.error('[Service Worker] Installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating Service Worker...');
  
  // Claim clients immediately
  event.waitUntil(self.clients.claim());
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Fetch event with stale-while-revalidate strategy
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // For HTML navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      // Stale-while-revalidate for navigation requests
      caches.match(event.request)
        .then(cachedResponse => {
          const fetchPromise = fetch(event.request)
            .then(networkResponse => {
              // Cache the updated version
              if (networkResponse.ok) {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                  cache.put(event.request, responseToCache);
                });
              }
              return networkResponse;
            })
            .catch(() => {
              // If network fails completely, return offline page
              return caches.match('./offline.html');
            });
            
          // Return cached response immediately if available, otherwise wait for network
          return cachedResponse || fetchPromise;
        })
    );
    return;
  }

  // For all other assets - Stale-while-revalidate
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Start fetching from network in the background
        const fetchPromise = fetch(event.request)
          .then(networkResponse => {
            // Cache the new response for future use
            if (networkResponse.ok) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(error => {
            console.error('Fetch failed:', error);
            
            // For image requests that fail, return a fallback image
            if (event.request.url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
              return caches.match('./assets/images/logo11.webp');
            }
            
            throw error;
          });
          
        // Return the cached response immediately if available, otherwise wait for network
        return cachedResponse || fetchPromise;
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', event => {
  if (event.tag === 'sync-player-data') {
    event.waitUntil(syncPlayerData());
  }
});

// Message handling for debugging and control
self.addEventListener('message', event => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
  
  // Send back current cache status
  if (event.data && event.data.action === 'getCacheStatus') {
    caches.open(CACHE_NAME)
      .then(cache => cache.keys())
      .then(keys => {
        event.ports[0].postMessage({
          cached: keys.map(key => key.url)
        });
      });
  }
});

// Function to sync player data when back online
async function syncPlayerData() {
  try {
    const offlineData = await getOfflineData();
    if (offlineData.length > 0) {
      const syncResponse = await fetch('./api/sync-player-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(offlineData)
      });
      
      if (syncResponse.ok) {
        await clearOfflineData();
      }
    }
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

// Get offline data from IndexedDB
async function getOfflineData() {
  // This is just a placeholder. Actual implementation would depend on your data storage approach.
  return [];
}

// Clear offline data after sync
async function clearOfflineData() {
  // This is just a placeholder. Actual implementation would depend on your data storage approach.
} 