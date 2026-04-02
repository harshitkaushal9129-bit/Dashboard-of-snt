// sw.js - Background Services
self.addEventListener('push', function(event) {
    let data = { title: 'SNT Institute', body: 'New student update available!' };
    try {
        if (event.data) {
            data = event.data.json();
        }
    } catch (e) {
        data = { title: 'SNT Institute', body: event.data.text() };
    }

    const options = {
        body: data.body,
        icon: './SNT.jpg',
        badge: './SNT.jpg',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/'
        },
        actions: [
            { action: 'open', title: 'View Now' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});
