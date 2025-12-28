// CONFIGURACIÓN FIREBASE - REEMPLAZA CON TUS DATOS
const firebaseConfig = {
    apiKey: "AIzaSyAZnd-oA7S99_w2rt8_Vw53ux8l1PqiQ-k",
    authDomain: "eltachi.firebaseapp.com",
    projectId: "eltachi",
    storageBucket: "eltachi.firebasestorage.app",
    messagingSenderId: "231676602106",
    appId: "1:231676602106:web:fde347e9caa00760b34b43"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Obtener instancias
const db = firebase.firestore();
const auth = firebase.auth();

// Configuración global
const APP_CONFIG = {
    LOCAL_NAME: "EL TACHI",
    WHATSAPP_NUMBER: "549XXXXXXXXXX", // REEMPLAZAR con tu número
    DEFAULT_DELIVERY_TIME: 40,
    DELIVERY_PRICE: 300
};

// Verificar conexión
db.collection("settings").doc("connection_test").get()
    .then(() => {
        console.log("✅ Conectado a Firestore");
        document.getElementById('connectionStatus').textContent = "● Conectado";
        document.getElementById('connectionStatus').style.color = "#34a853";
    })
    .catch((error) => {
        console.error("❌ Error conectando a Firestore:", error);
        document.getElementById('connectionStatus').textContent = "● Error de conexión";
        document.getElementById('connectionStatus').style.color = "#ea4335";
        
        // Mostrar mensaje al usuario
        showNotification("Error de conexión. Recarga la página.", "error");
    });

// Función para mostrar notificaciones
function showNotification(message, type = "info") {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.style.background = type === 'error' ? '#ea4335' : 
                                  type === 'success' ? '#34a853' : '#1a73e8';
    notification.textContent = message;
    notification.style.display = 'block';
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Exportar para usar en otros archivos
window.firebaseApp = {
    db: db,
    auth: auth,
    config: APP_CONFIG,
    showNotification: showNotification
};
