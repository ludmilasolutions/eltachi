const CACHE_NAME = 'el-tachi-v2';
const urlsToCache = [
    '/',
    '/index.html',
    '/assets/css/main.css',
    '/assets/js/app.js',
    '/assets/js/firebase-config.js',
    '/assets/js/pwa.js',
    '/manifest.json',
    '/assets/icons/icon-192.png',
    '/assets/icons/icon-512.png'
];

// Install Service Worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache abierto');
                return cache.addAll(urlsToCache);
            })
    );
});

// Activate Service Worker
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Borrando cache viejo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch Strategy: Cache First, then Network
self.addEventListener('fetch', event => {
    // Ignorar requests a Firebase y Gemini
    if (event.request.url.includes('firebase') || 
        event.request.url.includes('googleapis')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                
                return fetch(event.request).then(response => {
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    
                    return response;
                });
            })
    );
});

// Background Sync para pedidos offline
self.addEventListener('sync', event => {
    if (event.tag === 'sync-orders') {
        event.waitUntil(syncOrders());
    }
});

async function syncOrders() {
    const orders = await getOfflineOrders();
    
    for (const order of orders) {
        try {
            await sendOrderToServer(order);
            await removeOfflineOrder(order.id);
        } catch (error) {
            console.error('Error sincronizando pedido:', error);
        }
    }
}

function getOfflineOrders() {
    return new Promise(resolve => {
        const request = indexedDB.open('el-tachi-orders', 1);
        
        request.onsuccess = event => {
            const db = event.target.result;
            const transaction = db.transaction(['orders'], 'readonly');
            const store = transaction.objectStore('orders');
            const getAllRequest = store.getAll();
            
            getAllRequest.onsuccess = () => {
                resolve(getAllRequest.result || []);
            };
        };
    });
}