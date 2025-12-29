// Service Worker para EL TACHI PWA
const CACHE_NAME = 'el-tachi-v1.0';
const urlsToCache = [
    '/',
    '/index.html',
    '/admin.html',
    '/styles.css',
    '/app.js',
    '/admin-app.js',
    '/firebase-config.js',
    '/conversation-engine.js',
    'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js',
    'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://img.icons8.com/color/96/000000/hamburger.png'
];

// Instalar Service Worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache abierto');
                return cache.addAll(urlsToCache);
            })
    );
});

// Activar Service Worker y limpiar caches viejos
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Eliminando cache viejo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Estrategia: Cache First, luego Network
self.addEventListener('fetch', event => {
    // Para Firebase y Google APIs, usar Network First
    if (event.request.url.includes('firebase') || 
        event.request.url.includes('googleapis')) {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    return caches.match(event.request);
                })
        );
        return;
    }
    
    // Para todo lo demás: Cache First
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                
                return fetch(event.request).then(
                    response => {
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
                    }
                );
            })
    );
});

// Manejar mensajes push (notificaciones)
self.addEventListener('push', event => {
    const options = {
        body: event.data ? event.data.text() : 'Nueva notificación de EL TACHI',
        icon: 'https://img.icons8.com/color/96/000000/hamburger.png',
        badge: 'https://img.icons8.com/color/96/000000/hamburger.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: '1'
        },
        actions: [
            {
                action: 'explore',
                title: 'Ver Pedido',
                icon: 'https://img.icons8.com/color/96/000000/hamburger.png'
            },
            {
                action: 'close',
                title: 'Cerrar',
                icon: 'https://img.icons8.com/color/96/000000/hamburger.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('EL TACHI', options)
    );
});

// Manejar clics en notificaciones
self.addEventListener('notificationclick', event => {
    console.log('Notificación clickeada:', event.notification.tag);
    event.notification.close();
    
    if (event.action === 'explore') {
        // Abrir la aplicación
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});