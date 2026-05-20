const CACHE_NAME = 'snt-portal-cache-v2';

// Un saare assets ki list jo offline chalne ke liye zaroori hain
const ASSETS_TO_CACHE = [
  './',
  './index.html', // Agar aapki main file ka naam index.html hai
  './SNT.jpg',
  './SNT.png',
  './result-history.html',
  './Query-box.html',
  './Fee-history.html',
  './ranking.html',
  './admin-queries.html',
  './notifications_view.html',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js'
];

// 1. Install Event: Saare zaroori assets ko cache mein save krna
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching all core assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => {
      return self.skipWaiting(); // Naye service worker ko turant activate krne ke liye
    })
  );
});

// 2. Activate Event: Purane caches ko delete krna jab version update ho
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      return self.clients.claim(); // Purane clients par control paane ke liye
    })
  );
});

// 3. Fetch Event: Network First ya Cache Fallback strategy
// Yeh baki pages aur CDNs ko offline chalane mein madad krega
self.addEventListener('fetch', (event) => {
  // Firebase ki internally managed auth/database requests ko cache nahi krna hai
  if (event.request.url.includes('firebaseio.com') || event.request.url.includes('googleapis.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Agar network sahi chal rha hai, toh nayi copy ko cache mein update krdo
        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Agar network fail hota hai (Offline mode), toh cache se resource uthao
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Agar kuch bhi nahi milta toh ek basic default offline response (Optional)
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});

// 4. Push Notification Event: Background notifications handling
// Jab app band ho ya background mein ho, tab notification display krne ke liye
self.addEventListener('push', (event) => {
  let data = { title: 'SNT Institute Update', body: 'New official announcement available.' };

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
    badge: './SNT.png',
    vibrate: [300, 100, 300],
    data: {
      url: data.url || './index.html'
    },
    actions: [
      { action: 'open', title: 'Open Portal' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 5. Notification Click Event: Notification par click krne par kya ho
self.addEventListener('notificationclick', (event) => {
  event.notification.close(); // Notification ko panel se hatayein

  // Target URL open krna ya window focus krna
  const targetUrl = event.notification.data.url;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Agar portal pehle se hi kisi tab mein khula hai, toh use focus karein
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // Agar nahi khula hai, toh naya tab kholein
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
