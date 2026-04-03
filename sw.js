// sw.js - SNT Official Portal
const CACHE_NAME = 'snt-portal-v1';
const assets = [
  './',
  './index.html',
  './SNT.jpg',
  './manifest.json'
];

// Install Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(assets);
    })
  );
});

// Push Notification Receive Logic
self.addEventListener('push', function(event) {
    let data = { title: 'SNT Institute', body: 'Naya Update Aaya Hai!' };
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data = { title: 'SNT Institute', body: event.data.text() };
        }
    }

const options = {
    body: data.body,
    icon: './SNT.jpg',    // Ye colored logo hai (Notification ke side mein dikhega)
    badge: './SNT.png', // Ye transparent PNG honi chahiye (Status Bar ke liye)
    vibrate: [500, 110, 500, 110, 450],
    tag: 'snt-notification',
    renotify: true,
    data: { url: data.url || './index.html' },
    requireInteraction: true,
    actions: [
        { action: 'open', title: 'Check Now' }
    ]
};


    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification Click Logic
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(windowClients => {
            for (var i = 0; i < windowClients.length; i++) {
                var client = windowClients[i];
                if (client.url === event.notification.data.url && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(event.notification.data.url);
            }
        })
    );
});
