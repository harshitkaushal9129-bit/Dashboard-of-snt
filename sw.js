
const CACHE_NAME = 'snt-arcade-master-v1';
const STATIC_ASSETS = [
    './',
    './index.html',
    './SNT.jpg',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/webfonts/fa-solid-900.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/webfonts/fa-brands-400.woff2',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js',
  'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg',
  'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=upi://pay?pa=mandavikaushal913@okaxis&pn=SNT%20Institute',     

    './SNT.png'
];

// 1. INSTALL: Core files ko cache mein daalna
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('📦 [SNT SW] Pre-caching static assets (HTML, Icons)...');
            return cache.addAll(STATIC_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

// 2. ACTIVATE: Purana cache saaf karna jab version change ho
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('🧹 [SNT SW] Removing old cache version:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 3. FETCH & DYNAMIC CACHING: Saari CSS, JS, Google Fonts aur Assets ko handle karna
self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    // 🛑 Firebase Real-time WebSockets aur Database requests ko bypass karo (Inhe cache nahi karna)
    if (requestUrl.href.includes('firebaseio.com') || 
        requestUrl.href.includes('firestore') || 
        requestUrl.href.includes('identitytoolkit')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                // Agar file pehle se cache mein hai (CSS/JS), toh turant return karo (Instant Load)
                return cachedResponse;
            }

            // Agar cache mein nahi hai, toh network se fetch karo
            return fetch(event.request).then((networkResponse) => {
                // Check karo response valid hai ya nahi
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'error') {
                    return networkResponse;
                }

                // 🌟 AUTOMATIC CACHING FOR TOPICS (CSS, JS, Fonts, Images)
                // Agar request CSS, Javascript, Images ya Google Fonts ki hai, toh use future ke liye cache kar lo
                if (
                    event.request.destination === 'style' ||      // Saari CSS Files (.css)
                    event.request.destination === 'script' ||     // Saari JavaScript Files (.js)
                    event.request.destination === 'image' ||      // Saari Images (.png, .jpg, .svg)
                    event.request.destination === 'font' ||       // Local aur External Web Fonts
                    requestUrl.hostname.includes('fonts.googleapis.com') || // Google Fonts CSS
                    requestUrl.hostname.includes('fonts.gstatic.com')       // Google Fonts WOFF2
                ) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                        console.log(`✨ [SNT SW] Auto-Cached Asset: ${requestUrl.pathname}`);
                    });
                }

                return networkResponse;
            }).catch(() => {
                // Offline fallback: Agar net nahi hai aur page navigation hai, toh main page load karo
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});

// ==========================================================================
// 🔔 SYSTEM & PUSH NOTIFICATION TOPICS INTERACTION
// ==========================================================================

// 4. Notification Click Handle: Jab user notification par click karega
self.addEventListener('notificationclick', (event) => {
    const notification = event.notification;
    notification.close(); // Notification drawer ko band karo

    // Target URL nikalna (Default aapka main page hoga)
    const targetUrl = notification.data && notification.data.url ? notification.data.url : './';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((windowClients) => {
            // Check karo agar portal pehle se kisi tab mein open hai, toh wahi le jao
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url.includes(targetUrl) && 'focus' in client) {
                    return client.focus();
                }
            }
            // Agar pehle se open nahi hai, toh naya tab open karo
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

// 5. Background Push Sync (Agar future mein admin direct payload bhejta hai)
self.addEventListener('push', (event) => {
    if (event.data) {
        try {
            const payload = event.data.json();
            const title = payload.notification.title || "SNT Official Update";
            const options = {
                body: payload.notification.body || "",
                icon: './SNT.jpg',
                badge: './SNT.png',
                vibrate: [300, 100, 300],
                tag: 'snt-live-alert',
                data: { url: './index.html' }
            };
            event.waitUntil(self.registration.showNotification(title, options));
        } catch (e) {
            console.error("🚨 [SNT SW] Push error:", e);
        }
    }
});
