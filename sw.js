// Service Worker para KBA Control de Asistencia
const CACHE_NAME = 'kba-asistencia-v1';
const urlsToCache = [
  '/CONTROL-ASISTENCIA-KBA/',
  '/CONTROL-ASISTENCIA-KBA/index.html',
  '/CONTROL-ASISTENCIA-KBA/script.js',
  '/CONTROL-ASISTENCIA-KBA/styles.css',
  '/CONTROL-ASISTENCIA-KBA/imagen/logo.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});