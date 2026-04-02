// sw.js - SNT Official Portal (Background Enabled)
const CACHE_NAME = 'snt-portal-v2'; // Version update for changes
const assets = [
  './',
  './index.html',
  './SNT.jpg',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// 1. Install Event: Assets ko cache mein save karna
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(assets);
    })
  );
  self.skipWaiting(); // Naya SW turant active ho jaye
});

// 2. Activate Event: Purane cache ko delete karna
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// 3. Fetch Event: Offline support ke liye
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});

/**
 * BACKGROUND NOTIFICATION LOGIC
 * Ye tab chalta hai jab Firebase ya kisi Server se Push bhejte hain
 * Chahe app background mein ho ya bilkul close ho.
 */
self.addEventListener('push', function(event) {
    let data = { 
        title: 'SNT Institute Update', 
        body: 'Naya notification prapt hua hai.', 
        url: './index.html' 
    };

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
        vibrate: [500, 110, 500, 110, 450, 110, 200],
        tag: 'snt-dynamic-update', // Unique tag taaki notifications overwrite na hon
        renotify: true,
        requireInteraction: true, // Jab tak user click na kare tab tak lock screen pe rahega
        data: { url: data.url || './index.html' },
        actions: [
            { action: 'open', title: 'View Portal' },
            { action: 'close', title: 'Dismiss' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// 4. Notification Click Logic: Notification par click karne par app kholna
self.addEventListener('notificationclick', function(event) {
    event.notification.close(); // Notification ko band karo
    
    if (event.action === 'close') return;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
            // Agar pehle se app khula hai toh wahan focus karo
            for (var i = 0; i < windowClients.length; i++) {
                var client = windowClients[i];
                if (client.url.includes('index.html') && 'focus' in client) {
                    return client.focus();
                }
            }
            // Agar app band hai toh naya window open karo
            if (clients.openWindow) {
                return clients.openWindow(event.notification.data.url);
            }
        })
    );
});

// Background Sync (Optional: Connectivity aane par task poora karne ke liye)
self.addEventListener('sync', event => {
    if (event.tag === 'sync-notifications') {
        console.log('Background Syncing...');
    }
});
