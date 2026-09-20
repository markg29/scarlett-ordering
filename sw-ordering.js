// sw-ordering.js — OrderKo Service Worker
const CACHE = 'orderko-v4';
const API = 'https://script.google.com/macros/s/AKfycbzrKmEjPc8Xj6PRqnzkbukTk7rPoJrOgXKS1NZNT-_8oheJn_VxuxesJXpam2KrZLtF/exec';

self.addEventListener('install', e => {
  // Skip waiting immediately — don't wait for old tabs to close
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./'])));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()) // Take control of all open tabs immediately
      .then(() => {
        // Notify all clients that there's an update
        return self.clients.matchAll({includeUncontrolled:true, type:'window'});
      })
      .then(clients => clients.forEach(c => c.postMessage({type:'sw-updated'})))
  );
});

self.addEventListener('fetch', e => {
  if (!e.request.url.startsWith(self.location.origin)) return;
  const url = new URL(e.request.url);
  const isHtml = url.pathname === '/' || url.pathname.endsWith('.html') || url.pathname.endsWith('/index.html');

  if (isHtml) {
    // Network-first for HTML — always get latest version
    e.respondWith(
      fetch(e.request, {cache:'no-store'}).then(res => {
        if (res.ok) {
          const toCache = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, toCache));
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
  } else {
    // Cache-first for other assets
    e.respondWith(
      caches.match(e.request).then(cached => {
        const fetchPromise = fetch(e.request).then(res => {
          if (res.ok) {
            caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          }
          return res;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
  }
});

self.addEventListener('message', e => {
  if (e.data === 'warmup') fetch(API + '?action=ping').catch(() => {});
  if (e.data === 'skipWaiting') self.skipWaiting();
});
