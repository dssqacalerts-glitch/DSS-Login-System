/* Minimal service worker: keeps the app shell available offline and makes the
 * page installable. API calls are never cached — auth must always hit the
 * network. Bump CACHE when you change index.html so clients pick it up. */
const CACHE = 'ds-portal-v3';
const SHELL = [
  './', './index.html', './station.html', './console.html',
  './pass.html', './display.html',
  './manifest.webmanifest', './station.webmanifest', './pass.webmanifest',
  './icon.svg', './icon-192.png',
  './vendor/jsQR.js', './vendor/qrcode.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // never touch the API
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;        // never touch Apps Script

  // Network first so a redeployed page is picked up straight away; fall back to
  // the cached shell when offline.
  e.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
  );
});
