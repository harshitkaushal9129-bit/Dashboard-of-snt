const CACHE_NAME = 'snt-institute-cache-v1';

// Jin assets ko offline pehle se save rakhna hai unki optimized list
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './SNT.jpg',
  './manifest.json',
  
  // CDNs aur External CSS Stylesheets
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg',
  
  // HTML Core Sub-pages (Jo aapke system ka part hain)
  './result-history.html',
  './Query-box.html',
  './Fee-history.html',
  './ranking.html',
  './notifications_view.html',
  './admin-queries.html',

  // Firebase Modular Scripts Caching (Offline loading crash se bachne ke liye)
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js'
];

// 1. Install Event: Static assets ko cache me store karna
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SNT Cache Opened & Pre-caching Assets...');
      // cdn ke requests cors mode me fetch ho sakte hain, isliye handleAll fail na ho
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Purane caches ko clean karna
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

// 3. Fetch Event: Offline Engine (Stale-While-Revalidate + Dynamic Cache fallback)
self.addEventListener('fetch', (event) => {
  // Real-time Database REST calls aur dynamic auth apis ko cache se bypass karein
  if (
    event.request.url.includes('firebaseio.com') || 
    event.request.url.includes('googleapis.com/v1') ||
    event.request.url.includes('identitytoolkit')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Background update check (Stale-While-Revalidate)
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {/* Offline mode */});

        return cachedResponse; // Instant response data from cache
      }

      // Agar data pre-cache me nahi hai, toh network fetch karein
      return fetch(event.request).then((networkResponse) => {
        // Bad responses ya opaque errors ko control karein (CORS requests bypass response check)
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        // Naye dynamic assets (jaise user ki profile picture ya documents) cache me daalein
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Fallback agar page navigation down ho jaye offline me
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// 4. Push Notifications Handle karna (SNT Live Signals)
self.addEventListener('push', (event) => {
  let data = { title: 'SNT Official Update', body: 'New notification received.', url: './index.html' };
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

// Smart Notification Click Handling (Pehle se khule tab me open karega)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data.url, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check karein agar portal ka koi tab pehle se open hai to use focus karein
      for (let client of windowClients) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // Agar pehle se open nahi hai, to naya window kholein
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
