const CACHE = 'orderko-v1';
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
  // Warm up Apps Script immediately on activate so it's ready when user opens app
  fetch(API + '?action=getAll').catch(() => {});
});

self.addEventListener('fetch', e => {
  // Cache the HTML shell (same-origin only, not Apps Script)
  if (!e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fresh = fetch(e.request).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      }).catch(() => cached);
      return cached || fresh;
    })
  );
});

// Background sync - periodically warm up Apps Script so it stays responsive
self.addEventListener('message', e => {
  if (e.data === 'warmup') {
    fetch(API + '?action=getAll').catch(() => {});
  }
});
