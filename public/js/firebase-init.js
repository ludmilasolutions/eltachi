// firebase-init.js - Configuración de Firebase para navegador

// Verificar si Firebase ya está cargado
if (typeof firebase === 'undefined') {
    console.error('Firebase no está cargado. Asegúrate de incluir los scripts de Firebase antes de este archivo.');
}

// Configuración de Firebase - REEMPLAZA con tus propios valores
const firebaseConfig = {
  apiKey: "AIzaSyAZnd-oA7S99_w2rt8_Vw53ux8l1PqiQ-k",
  authDomain: "eltachi.firebaseapp.com",
  projectId: "eltachi",
  storageBucket: "eltachi.firebasestorage.app",
  messagingSenderId: "231676602106",
  appId: "1:231676602106:web:fde347e9caa00760b34b43"
};

// Inicializar Firebase
let app;
let db;
let auth;

try {
    app = firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    auth = firebase.auth();
    console.log('Firebase inicializado correctamente');
} catch (error) {
    console.error('Error al inicializar Firebase:', error);
    // Si ya está inicializado, usar esa instancia
    if (firebase.apps.length) {
        app = firebase.app();
        db = firebase.firestore();
        auth = firebase.auth();
    }
}

// Objeto global para acceder a Firebase
window.firebaseApp = {
    app: app,
    db: db,
    auth: auth,
    config: {
        LOCAL_NAME: "EL TACHI",
        WHATSAPP_NUMBER: "549XXXXXXXXXX",
        DEFAULT_DELIVERY_TIME: 40,
        DELIVERY_PRICE: 300
    },
    showNotification: function(message, type = "info") {
        // Crear notificación
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#ea4335' : type === 'success' ? '#34a853' : '#1a73e8'};
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            max-width: 300px;
            word-wrap: break-word;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        // Auto-ocultar después de 5 segundos
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.5s';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500);
        }, 5000);
    }
};

// Verificar conexión a Firestore
if (db) {
    db.collection("settings").doc("connection_test").get()
        .then(() => {
            console.log("Conectado a Firestore");
            if (document.getElementById('connectionStatus')) {
                document.getElementById('connectionStatus').textContent = "● Conectado";
                document.getElementById('connectionStatus').style.color = "#34a853";
            }
        })
        .catch((error) => {
            console.error("Error conectando a Firestore:", error);
            if (document.getElementById('connectionStatus')) {
                document.getElementById('connectionStatus').textContent = "● Error de conexión";
                document.getElementById('connectionStatus').style.color = "#ea4335";
            }
        });
}
