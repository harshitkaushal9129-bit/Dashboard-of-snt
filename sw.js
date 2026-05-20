/* SNT Institute - Pure Offline Production Service Worker */
const CACHE_NAME = 'snt-offline-v3'; // Incremented version to clear old cache
const ASSETS = [
  './',
  './index.html',
  './SNT.jpg',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// 1. Install Event: Saare assets ko cache mein force-add karna
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // cors mode use kiya hai taaki external CDNs sahi se offline save ho sakein
      return Promise.all(
        ASSETS.map((url) => {
          return fetch(new Request(url, { mode: 'cors' }))
            .then((response) => {
              if (response.ok) {
                return cache.put(url, response);
              }
              throw new Error(`Failed to fetch asset: ${url}`);
            })
            .catch((err) => console.error('Offline caching error:', err));
        })
      );
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Purane caches ko delete karna taaki naya system apply ho
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Cache-First strategy (Pehle cache check karega, offline best workflow ke liye)
self.addEventListener('fetch', (event) => {
  // Database updates aur live streaming requests ko skip karein taaki Firebase breakdown na ho
  if (event.request.url.includes('firebaseio.com') || event.request.url.includes('googleapis.com/v1/projects')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Agar file cache mein mil gayi, toh direct wahin se uthao (No network needed)
      if (cachedResponse) {
        return cachedResponse;
      }

      // Agar cache mein nahi hai, toh network se fetch karo aur sath hi sath cache mein save karo
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        const cacheCopy = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          // 'basic' validation hata di hai taaki 'cors' responses (CDNs) bhi cache ho sakein
          cache.put(event.request, cacheCopy);
        });

        return networkResponse;
      }).catch(() => {
        // Pure Offline fallback: Agar network bilkul nahi hai aur page responsive na ho
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// 4. System Push Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url.includes('index.html') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('./index.html');
      }
    })
  );
});
