const CACHE_NAME = 'snt-institute-v1';
const ASSETS = [
  'https://harshitkaushal9129-bit.github.io/snt-institute/',
  'https://harshitkaushal9129-bit.github.io/snt-institute/index.html',
  'https://harshitkaushal9129-bit.github.io/snt-institute/manifest.json',
  'https://harshitkaushal9129-bit.github.io/snt-institute/SNT.jpg',
  'https://cdn.tailwindcss.com'
];

// Install Service Worker and Cache Assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching essential assets');
      return cache.addAll(ASSETS);
    })
  );
});

// Activate and Clean Old Caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

// Fetch Strategy: Network First, Fallback to Cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
