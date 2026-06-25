// Service Worker requerido para cumplir criterios de instalación en dispositivos móviles
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through directo para no interferir con las llamadas multipart a la API de .NET
  event.respondWith(fetch(event.request));
});