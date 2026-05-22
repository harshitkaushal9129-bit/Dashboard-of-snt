const CACHE_NAME = 'snt-institute-v1';

// Un sabhi resources ki list jinhe offline chalane ke liye cache karna zaroori hai
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './SNT.jpg',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  // FontAwesome fonts ki offline accessibility ke liye
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/webfonts/fa-solid-900.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/webfonts/fa-brands-400.woff2',
  // Firebase Modules jinhe aapne register kiya hai
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js',
  'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg',
  'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=upi://pay?pa=mandavikaushal913@okaxis&pn=SNT%20Institute'
];

// Service Worker Install Event - Assets ko Cache mein store karna
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SNT Engine: Caching offline assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Purane caches ko saaf karna jab version update ho
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('SNT Engine: Clearing old cache');
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Network Requests ko intercept karke cached files pehle load karna (Network-First Fallback pattern)
self.addEventListener('fetch', (event) => {
  // Firebase Database aur Live Signals real-time network chahte hain, unhe cache se bypass karein
  if (event.request.url.includes('firebaseio.com') || event.request.url.includes('googleapis.com')) {
    return; 
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Agar network up hai, toh latest copy cache mein daal dein
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Agar network down hai (Offline mode), toh cache se response dein
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Agar kuch bhi nahi milta toh backup custom message ya standard failed fallback
        });
      })
  );
});
