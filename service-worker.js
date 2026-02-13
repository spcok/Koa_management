
const CACHE_NAME = 'koa-manager-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com?plugins=typography',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached asset or fetch from network
      return response || fetch(event.request).then(res => {
          // Cache external assets on the fly if they are from known CDNs
          if (event.request.url.includes('googleapis') || event.request.url.includes('gstatic') || event.request.url.includes('unpkg')) {
              const resClone = res.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
          }
          return res;
      });
    }).catch(() => {
        if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
        }
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)));
    })
  );
});
