const CACHE_NAME = 'deskclock-v8';
const CORE_ASSETS = [
  './',
  'index.html',
  'manifest.json',
  'fonts/jost-var.woff2',
  'fonts/archivo-var.woff2',
  'fonts/orbitron-var.woff2',
  'fonts/anton-400.woff2',
  'vendor/three.module.js',
  'vendor/FontLoader.js',
  'vendor/TextGeometry.js',
  'vendor/helvetiker_bold.typeface.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request).catch(()=>caches.match('index.html')))
  );
});
