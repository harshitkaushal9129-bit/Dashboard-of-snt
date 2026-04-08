// sw.js - SNT Official Portal
const CACHE_NAME = 'snt-portal-v2'; // Version update for fresh caching
const assets = [
    './',
    './index.html',
    './SNT.jpg',
    './manifest.json',
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// --- 1. INSTALLATION: Assets ko cache mein save karna ---
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log("SNT Cache: Files saved!");
            return cache.addAll(assets);
        })
    );
});

// --- 2. ACTIVATION: Purane cache ko delete karna ---
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        })
    );
});

// --- 3. FETCH: Offline mode ke liye assets provide karna ---
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});

// --- 4. PUSH: Firebase/Server se aane wali notifications ---
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
        icon: './SNT.jpg', 
        badge: './SNT.jpg', 
        vibrate: [500, 110, 500, 110, 500],
        tag: 'snt-notification',
        renotify: true,
        data: { url: data.url || './index.html' },
        actions: [
            { action: 'open', title: 'Check Now', icon: 'https://img.icons8.com/ios-filled/50/ffffff/visible.png' }
        ]
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
});

// --- 5. NOTIFICATION CLICK: Tap karne par portal khulna ---
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            // Agar pehle se tab khula hai toh uspar focus karo
            for (const client of clientList) {
                if (client.url.includes('index.html') && 'focus' in client) {
                    return client.focus();
                }
            }
            // Warna naya portal kholo
            if (clients.openWindow) {
                return clients.openWindow(event.notification.data.url || './index.html');
            }
        })
    );
});
