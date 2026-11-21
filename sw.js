/* Service Worker do Game Center (escopo: /game-center/ — não interfere nos SWs dos jogos).
   - Shell: cache versionado; navegação network-first (atualiza sem ficar preso).
   - games.json: network-first com fallback ao cache (RN-04: jogo novo aparece na hora).
   - Imagens e fontes: stale-while-revalidate. */
const VERSION = 'gc-v1';
const SHELL = `${VERSION}-shell`;
const RUNTIME = `${VERSION}-runtime`;
const SHELL_FILES = ['./', 'index.html', 'style.css', 'app.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('gc-') && !k.startsWith(VERSION)).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    throw err;
  }
}

async function cacheFirst(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) (await caches.open(SHELL)).put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(RUNTIME);
  const hit = await cache.match(req);
  const net = fetch(req).then((res) => {
    if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
    return res;
  }).catch(() => hit);
  return hit || net;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const scope = new URL(self.registration.scope);

  if (url.origin === location.origin && url.pathname.endsWith('/games.json')) {
    e.respondWith(networkFirst(req, RUNTIME));
  } else if (req.mode === 'navigate' && url.pathname.startsWith(scope.pathname)) {
    e.respondWith(networkFirst(req, SHELL).catch(() => caches.match('index.html')));
  } else if (url.origin === location.origin && url.pathname.startsWith(scope.pathname)) {
    e.respondWith(cacheFirst(req));
  } else if (req.destination === 'image' || req.destination === 'font' || url.hostname.endsWith('fonts.googleapis.com')) {
    e.respondWith(staleWhileRevalidate(req)); // capas dos jogos (/<jogo>/icons/…) e Google Fonts
  }
});
