// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('Service Worker registrado:', registration);
            })
            .catch(error => {
                console.log('Error registrando Service Worker:', error);
            });
    });
}

// Install Prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Mostrar botón de instalación personalizado
    const installBtn = document.getElementById('install-btn');
    if (installBtn) {
        installBtn.style.display = 'block';
        installBtn.addEventListener('click', () => {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then(choiceResult => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('Usuario aceptó instalación');
                }
                deferredPrompt = null;
            });
        });
    }
});

// Detectar si ya está instalado
window.addEventListener('appinstalled', () => {
    console.log('PWA instalado');
    localStorage.setItem('pwa_installed', 'true');
});

// Cargar datos offline
if ('caches' in window) {
    caches.open('el-tachi-v1').then(cache => {
        return cache.addAll([
            '/',
            '/index.html',
            '/assets/css/main.css',
            '/assets/js/app.js',
            '/assets/js/firebase-config.js',
            '/assets/js/gemini.js',
            '/manifest.json',
            '/assets/icons/icon-192.png'
        ]);
    });
}