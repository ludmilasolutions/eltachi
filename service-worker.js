// Service Worker para EL TACHI PWA
const CACHE_NAME = 'el-tachi-v3.0';
const APP_VERSION = '3.0';

// Archivos a cachear
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './logo.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js'
];

// Instalar Service Worker
self.addEventListener('install', event => {
  console.log('[Service Worker] Instalando versión:', APP_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Cacheando archivos');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[Service Worker] Instalación completada');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[Service Worker] Error en instalación:', error);
      })
  );
});

// Activar Service Worker
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activando versión:', APP_VERSION);
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Eliminando cache viejo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('[Service Worker] Ahora controla todos los clientes');
      return self.clients.claim();
    })
  );
});

// Estrategia: Cache First, luego Network
self.addEventListener('fetch', event => {
  // No cachear solicitudes a Firebase o APIs externas
  if (event.request.url.includes('firebase') || 
      event.request.url.includes('googleapis') ||
      event.request.url.includes('cdnjs')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // Para archivos locales: Cache First
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request)
          .then(response => {
            // Verificar si la respuesta es válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clonar la respuesta
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(error => {
            console.log('[Service Worker] Fetch falló:', error);
            
            // Si estamos offline y es una página, mostrar página offline
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
            
            return new Response('Modo offline', {
              status: 503,
              statusText: 'Sin conexión',
              headers: new Headers({
                'Content-Type': 'text/html'
              })
            });
          });
      })
  );
});

// Manejar mensajes del cliente
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  
  if (event.data === 'getVersion') {
    event.ports[0].postMessage(APP_VERSION);
  }
});

// Manejar notificaciones push (opcional para futuras implementaciones)
self.addEventListener('push', event => {
  if (!event.data) return;
  
  const data = event.data.json();
  
  const options = {
    body: data.body || 'Nueva notificación de EL TACHI',
    icon: './logo.png',
    badge: './logo.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      {
        action: 'open',
        title: 'Abrir App',
        icon: './logo.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'EL TACHI', options)
  );
});

// Manejar clics en notificaciones
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notificación clickeada');
  
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('./')
    );
  } else {
    event.waitUntil(
      clients.openWindow('./')
    );
  }
});

// Sincronización en background (opcional para futuras implementaciones)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-orders') {
    console.log('[Service Worker] Sincronizando pedidos...');
    event.waitUntil(syncOrders());
  }
});

async function syncOrders() {
  // Aquí podrías implementar lógica para sincronizar pedidos offline
  console.log('[Service Worker] Sincronización completada');
}
