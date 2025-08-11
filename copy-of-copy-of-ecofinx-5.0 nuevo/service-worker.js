const CACHE_NAME = 'ecofinz-cache-v2';
const URLS_TO_CACHE = [
  './',
  './index.html',
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

self.addEventListener('fetch', event => {
  // No cacheamos las peticiones a la API de Gemini
  if (event.request.url.includes('generativelanguage.googleapis.com')) {
    return;
  }
    
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        return fetch(event.request).then(
          response => {
            // Check if we received a valid response
            if (!response || response.status !== 200) {
              return response;
            }
            
            // Si la respuesta es de una extensión de chrome, no la cacheamos
            if(event.request.url.startsWith('chrome-extension://')) {
                return response;
            }
            
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                  cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});