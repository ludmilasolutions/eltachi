// firebase-init.js - Versión corregida sin errores de DOM
console.log('🔥 firebase-init.js cargando...');

// CONFIGURACIÓN FIREBASE - REEMPLAZA CON TUS DATOS
const firebaseConfig = {
  apiKey: "AIzaSyAZnd-oA7S99_w2rt8_Vw53ux8l1PqiQ-k",
  authDomain: "eltachi.firebaseapp.com",
  projectId: "eltachi",
  storageBucket: "eltachi.firebasestorage.app",
  messagingSenderId: "231676602106",
  appId: "1:231676602106:web:fde347e9caa00760b34b43"
};

// Variable global para almacenar las instancias
let firebaseInitialized = false;
let firebaseDb = null;
let firebaseAuth = null;

// Intentar inicializar Firebase
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    } else {
        firebase.app(); // Usar la instancia existente
    }
    
    // Obtener instancias
    firebaseDb = firebase.firestore();
    firebaseAuth = firebase.auth();
    firebaseInitialized = true;
    
    console.log('✅ Firebase inicializado correctamente');
    
    // Probar conexión (sin intentar actualizar UI que no existe)
    firebaseDb.collection("settings").doc("connection_test").get()
        .then(() => {
            console.log("✅ Conectado a Firestore");
            // Solo actualizar UI si el elemento existe
            const statusElement = document.getElementById('connectionStatus');
            if (statusElement) {
                statusElement.textContent = "● Conectado";
                statusElement.style.color = "#34a853";
            }
        })
        .catch((error) => {
            console.error("❌ Error conectando a Firestore:", error);
            const statusElement = document.getElementById('connectionStatus');
            if (statusElement) {
                statusElement.textContent = "● Error de conexión";
                statusElement.style.color = "#ea4335";
            }
        });
        
} catch (error) {
    console.error("❌ Error inicializando Firebase:", error);
    // Sin intentar actualizar elementos que no existen
}

// Configuración global
const APP_CONFIG = {
    LOCAL_NAME: "EL TACHI",
    WHATSAPP_NUMBER: "549XXXXXXXXXX",
    DEFAULT_DELIVERY_TIME: 40,
    DELIVERY_PRICE: 300
};

// Crear objeto global para acceder a Firebase
const firebaseApp = {
    db: firebaseDb,
    auth: firebaseAuth,
    config: APP_CONFIG,
    initialized: firebaseInitialized
};

// Hacer disponible globalmente
window.firebaseApp = firebaseApp;

console.log('✅ firebase-init.js listo');
