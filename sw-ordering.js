const CACHE = 'orderko-v2';
const API = 'https://script.google.com/macros/s/AKfycbzrKmEjPc8Xj6PRqnzkbukTk7rPoJrOgXKS1NZNT-_8oheJn_VxuxesJXpam2KrZLtF/exec';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(['./']))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
  fetch(API + '?action=ping').catch(() => {});
});

self.addEventListener('fetch', e => {
  if (!e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetchPromise = fetch(e.request).then(res => {
        // Clone BEFORE returning — one copy for cache, one to respond with
        if (res.ok && res.status < 400) {
          const toCache = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, toCache));
        }
        return res;
      }).catch(() => cached || new Response('Offline', {status: 503}));
      return cached || fetchPromise;
    })
  );
});

self.addEventListener('message', e => {
  if (e.data === 'warmup') {
    fetch(API + '?action=ping').catch(() => {});
  }
});
