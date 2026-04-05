// sw.js - SNT Official Portal
const CACHE_NAME = 'snt-portal-v1';
const assets = ['./', './index.html', './SNT.jpg', './manifest.json'];

self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(assets)));
});

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
        vibrate: [500, 110, 500],
        tag: 'snt-notification',
        renotify: true,
        data: { url: data.url || './index.html' },
        actions: [{ action: 'open', title: 'Check Now' }]
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url || './index.html')
    );
});
