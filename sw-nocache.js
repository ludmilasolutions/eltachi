// Service Worker SIN CACHÉ - Solo para desarrollo
const CACHE_NAME = 'eltachi-nocache-' + new Date().getTime();

self.addEventListener('install', event => {
    console.log('[Service Worker] Instalando sin caché...');
    // Saltar la fase de espera
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    console.log('[Service Worker] Activando sin caché...');
    
    // Limpiar TODOS los caches antiguos
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    console.log('[Service Worker] Eliminando cache:', cacheName);
                    return caches.delete(cacheName);
                })
            );
        })
    );
    
    // Tomar control inmediatamente
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
    console.log('[Service Worker] Fetching:', event.request.url);
    
    // NO USAR CACHÉ - Siempre ir a la red
    event.respondWith(
        fetch(event.request)
            .catch(error => {
                console.log('[Service Worker] Error fetching:', error);
                return new Response('Modo offline - Sin caché activado');
            })
    );
});

self.addEventListener('message', event => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
});
