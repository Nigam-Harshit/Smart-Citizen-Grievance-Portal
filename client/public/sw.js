const CACHE_NAME = 'smart-citizen-pwa-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;
  

  const url = new URL(event.request.url);

  // Bypass service worker for cross-origin requests (e.g. Cloudflare R2 presigned URLs)
  // Guarantees presigned URLs and private assets are never intercepted or cached by the service worker
  if (url.origin !== self.location.origin) {
    return;
  }

  // Bypass service worker entirely for API requests (/api/*)
  // Ensures API calls receive genuine HTTP errors/network failures rather than index.html fallback
  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
    return;
  }

  // Bypass service worker for requests with authorization headers or presigned AWS/R2 signature parameters
  // Guarantees authenticated requests and secure presigned evidence assets are never cached
  if (
    event.request.headers.has('authorization') ||
    url.searchParams.has('X-Amz-Signature') ||
    url.searchParams.has('X-Amz-Algorithm') ||
    url.searchParams.has('X-Amz-Credential')
  ) {
    return;
  }

  // Network-First for HTML navigation requests
  // Guarantees returning users always receive the latest index.html and fresh hashed bundle references when online,
  // while seamlessly falling back to cached index.html when offline.
  const isHtmlNavigation = event.request.mode === 'navigate' ||
    (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) ||
    url.pathname === '/' ||
    url.pathname === '/index.html';

  if (isHtmlNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            }).catch(() => {});
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            return cached || caches.match('/index.html');
          });
        })
    );
    return;
  }

  // Cache-First with network fallback for other static assets (images, icons, manifest, etc.)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        // Fallback to index.html for SPA frontend routes when offline or network fails
        return caches.match('/index.html');
      });
    })
  );
});
