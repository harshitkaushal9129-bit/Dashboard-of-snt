/**
 * SNT Institute Official Portal - Service Worker Engine
 * Core Features: Advanced Assets Caching, Offline Support, & Live Notifications
 */

const CACHE_NAME = 'snt-portal-cache-v3';

// Wo files jinhe bina internet ke bhi sahi se chalna chahiye
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './SNT.jpg',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// 1. INSTALL EVENT: App ke initial launch par static resources ko cache mein save karna
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SNT Engine] Core Shell Caching Completed.');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => {
      return self.skipWaiting(); // Naye service worker ko turant activate karne ke liye
    })
  );
});

// 2. ACTIVATE EVENT: Purane cache files ko delete karna jab app update ho
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SNT Engine] Purging Legacy Cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      return self.clients.claim(); // Sारे open tabs ko turant control mein lene ke liye
    })
  );
});

// 3. FETCH EVENT: Network-First falling back to Cache strategy
// Isse data hamesha fresh load hoga, aur network na hone par cache se khulega
self.addEventListener('fetch', (event) => {
  // Sirf GET requests ko intercept karein (Firebase write/post operations ko chhod kar)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Agar network response sahi hai, toh uski copy cache mein save karein
        if (networkResponse && networkResponse.status === 200) {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cacheCopy);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Agar internet nahi chal raha, toh cache se file return karein
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Agar file cache mein bhi nahi hai (Jaise koi naya webpage ya image)
          return new Response('Offline: SNT Portal core network connectivity lost.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain' })
          });
        });
      })
  );
});

// 4. PUSH NOTIFICATION EVENT: Firebase live_signal se notifications generate karna
self.addEventListener('push', (event) => {
  let data = { title: 'SNT Portal Alert', body: 'New update from SNT Institute!', icon: './SNT.jpg' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || './SNT.jpg',
    badge: data.icon || './SNT.jpg',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || './index.html'
    },
    actions: [
      { action: 'open', title: 'Open Portal' },
      { action: 'close', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 5. NOTIFICATION CLICK EVENT: User jab notification par click kare
self.addEventListener('notificationclick', (event) => {
  event.notification.close(); // Notification drawer ko close karein

  if (event.action === 'close') return;

  const targetUrl = event.notification.data?.url || './index.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Agar pehle se app khula hai toh us par focus karein
      for (let client of windowClients) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // Agar app nahi khula hai toh naya window/tab open karein
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
