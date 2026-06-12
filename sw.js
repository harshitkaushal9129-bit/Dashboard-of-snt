const CACHE_NAME = 'snt-institute-cache-v1';

// Jin assets ko offline pehle se save rakhna hai unki list
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './SNT.jpg',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  // Agar aapke folder me ye files hain toh inhe bhi cache me daal dega:
  './result-history.html',
  './Query-box.html',
  './Fee-history.html',
  './ranking.html',
  './notifications_view.html'
];

// 1. Install Event: Saare static assets ko cache me store karna
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SNT Cache Opened & Pre-caching Assets...');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Purane caches ko delete karna agar version update ho
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('SNT Clearing Old Cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Offline hone par cache se response dena (Cache-First, then Network fallback)
self.addEventListener('fetch', (event) => {
  // Firebase Database requests (WebSockets/REST) ko cache nahi karna hai, unhe bypass karein
  if (event.request.url.includes('firebaseio.com') || event.request.url.includes('googleapis.com/v1')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Background me latest version check karein (Stale-While-Revalidate pattern)
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {/* Offline mode me network error catch karein */});

        return cachedResponse; // Pehle instant cache response dein
      }

      // Agar asset cache me nahi hai, toh network se fetch karein
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        // Naye fetched assets ko dynamic cache me daalein
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Agar bilkul offline hai aur page nahi mila
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// 4. Push Notifications handle karne ke liye (SNT Live Signals)
self.addEventListener('push', (event) => {
  let data = { title: 'SNT Official Update', body: 'New notification received.' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: './SNT.jpg',
    badge: './SNT.jpg',
    vibrate: [300, 100, 300],
    data: { url: data.url || './index.html' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click par handle karein
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
