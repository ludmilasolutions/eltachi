// Configuración PWA para EL TACHI
class PWAInstaller {
    constructor() {
        this.deferredPrompt = null;
        this.isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        
        this.initializeServiceWorker();
        this.initializeInstallPrompt();
        this.checkDisplayMode();
    }
    
    initializeServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then(registration => {
                        console.log('✅ ServiceWorker registrado:', registration.scope);
                    })
                    .catch(error => {
                        console.log('❌ Error registrando ServiceWorker:', error);
                    });
            });
        }
    }
    
    initializeInstallPrompt() {
        // Detectar evento de instalación
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            
            // Mostrar botón de instalación
            const installButton = document.getElementById('installPWA');
            if (installButton) {
                installButton.style.display = 'block';
                installButton.addEventListener('click', () => this.installPWA());
            }
        });
        
        // Detectar si ya está instalado
        window.addEventListener('appinstalled', () => {
            console.log('✅ PWA instalado');
            this.deferredPrompt = null;
            
            const installButton = document.getElementById('installPWA');
            if (installButton) {
                installButton.style.display = 'none';
            }
        });
    }
    
    installPWA() {
        if (!this.deferredPrompt) {
            return;
        }
        
        this.deferredPrompt.prompt();
        
        this.deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('✅ Usuario aceptó instalar');
            } else {
                console.log('❌ Usuario rechazó instalar');
            }
            
            this.deferredPrompt = null;
        });
    }
    
    checkDisplayMode() {
        // Aplicar estilos específicos para modo standalone
        if (this.isStandalone) {
            document.documentElement.classList.add('standalone-mode');
            
            // Ajustar altura para evitar el notch en iOS
            const meta = document.createElement('meta');
            meta.name = 'viewport';
            meta.content = 'width=device-width, initial-scale=1, viewport-fit=cover';
            document.head.appendChild(meta);
        }
    }
}

// Inicializar PWA
document.addEventListener('DOMContentLoaded', function() {
    new PWAInstaller();
});
