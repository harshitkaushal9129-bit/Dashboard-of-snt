// sw.js - SNT Official Portal (Ultra Offline Mode & High-Priority Notifications)
const CACHE_NAME = 'snt-portal-v3';
const assets = [
    './',
    './index.html',
    './SNT.jpg',
    './SNT.png', // Transparent White Icon for Android Status Bar
    './manifest.json',
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// Install Phase
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log("SNT Cache: Premium Offline Assets Stored!");
            return cache.addAll(assets);
        })
    );
});

// Activate Phase
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
});

// Smart Fetch Strategy: Network with Cache Fallback
self.addEventListener('fetch', event => {
    // Firebase database/auth bypass karne ke liye
    if (event.request.url.includes('firebaseio.com') || event.request.url.includes('googleapis.com')) {
        return; 
    }

    event.respondWith(
        fetch(event.request)
            .then(networkResponse => {
                // Agar network sahi hai, toh naye responses ko cache mein update karte jao
                if (networkResponse && networkResponse.status === 200) {
                    const cacheCopy = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, cacheCopy));
                }
                return networkResponse;
            })
            .catch(() => {
                // Internet na hone par cache se return karo
                return caches.match(event.request).then(fallbackResponse => {
                    if (fallbackResponse) return fallbackResponse;
                    
                    // Agar koi external link click hua ho aur internet na ho
                    if (event.request.mode === 'navigate') {
                        return new Response(`
                            <div style="background:#0f172a;color:#38bdf8;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;text-align:center;padding:20px;">
                                <i class="fas fa-wifi-slash" style="font-size:3rem;margin-bottom:15px;color:#ef4444;"></i>
                                <h1 style="font-weight:900;text-transform:uppercase;">Offline Mode Active</h1>
                                <p style="color:#94a3b8;font-size:14px;max-width:300px;">Yeh feature (${event.request.url.split('/').pop()}) pehle se synced nahi tha. Offline chalane ke liye is page ko ek baar internet ke sath open karein.</p>
                                <button onclick="location.reload()" style="background:#38bdf8;color:#0f172a;border:none;padding:10px 20px;border-radius:12px;font-weight:bold;margin-top:15px;cursor:pointer;">Retry Connection</button>
                            </div>
                        `, { headers: { 'Content-Type': 'text/html' } });
                    }
                });
            })
    );
});

// Push Notification Handler (Optimized for Android Notification Bar)
self.addEventListener('push', event => {
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
        icon: './SNT.jpg',         // Large display logo inside notification drawer
        badge: './SNT.png',        // Pure White Transparent Logo for Mobile Status Bar
        vibrate: [300, 100, 300],  // Smooth vibration pattern
        tag: 'snt-alert-notification', // Overwrites old notifications instead of piling up
        renotify: true,            // Sound & vibrate for new notifications under same tag
        data: { url: data.url || './index.html' }
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification Click Handler
self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            for (const client of clientList) {
                if (client.url.includes('index.html') && 'focus' in client) return client.focus();
            }
            if (clients.openWindow) return clients.openWindow(event.notification.data.url || './index.html');
        })
    );
});
