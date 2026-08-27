const CACHE = 'orderko-v3';
const API = 'https://script.google.com/macros/s/AKfycbzrKmEjPc8Xj6PRqnzkbukTk7rPoJrOgXKS1NZNT-_8oheJn_VxuxesJXpam2KrZLtF/exec';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(['./']))
  );
  self.skipWaiting(); // activate immediately
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => {
      // Tell all open tabs there's an update
      self.clients.matchAll({includeUncontrolled:true, type:'window'}).then(clients => {
        clients.forEach(c => c.postMessage({type:'sw-updated'}));
      });
    })
  );
  self.clients.claim();
  fetch(API + '?action=ping').catch(() => {});
});

self.addEventListener('fetch', e => {
  if (!e.request.url.startsWith(self.location.origin)) return;

  const url = new URL(e.request.url);
  const isHtml = url.pathname === '/' || url.pathname.endsWith('.html') || url.pathname.endsWith('/index.html');

  if (isHtml) {
    // Network-first for HTML — always get latest version
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) {
          const toCache = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, toCache));
        }
        return res;
      }).catch(() => caches.match(e.request)) // fallback to cache if offline
    );
  } else {
    // Cache-first for JS, CSS, images etc
    e.respondWith(
      caches.match(e.request).then(cached => {
        const fetchPromise = fetch(e.request).then(res => {
          if (res.ok && res.status < 400) {
            const toCache = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, toCache));
          }
          return res;
        }).catch(() => cached || new Response('Offline', {status: 503}));
        return cached || fetchPromise;
      })
    );
  }
});

self.addEventListener('message', e => {
  if (e.data === 'warmup') {
    fetch(API + '?action=ping').catch(() => {});
  }
});