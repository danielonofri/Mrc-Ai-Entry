// 1. Identificador único de la versión de caché (Incrementar en cada despliegue de UI)
const CACHE_NAME = 'mrc-ai-entry-v1.0.1';

self.addEventListener('install', (event) => {
  self.skipWaiting(); 
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all([
        // Elimina versiones viejas de caché automáticamente
        ...keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Eliminando caché antigua:', key);
            return caches.delete(key);
          }
        }),
        // Reclama el control de los clientes de inmediato sin esperar a reiniciar la app
        self.clients.claim()
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Pass-through directo para no interferir con las llamadas multipart a la API de .NET
  event.respondWith(fetch(event.request));
});

// Obtener version actual del service worker
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});