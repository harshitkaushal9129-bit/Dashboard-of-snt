// sw.js
self.addEventListener('push', function(event) {
    const data = event.data ? event.data.json() : { title: 'SNT Institute', body: 'New Update!' };
    
    const options = {
        body: data.body,
        icon: './SNT.jpg',
        badge: './SNT.jpg',
        vibrate: [200, 100, 200],
        tag: 'snt-notification', // Unique tag taaki notifications mix na ho
        renotify: true,
        data: { url: data.url || '/' },
        // Android Specific
        requireInteraction: true, 
        actions: [{ action: 'open', title: 'Check Now' }]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Jab user notification par click kare
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});
