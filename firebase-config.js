// firebase-config.js - VERSIÓN CORREGIDA
// NO incluir la configuración aquí, ya que se repite en app.js
// Solo inicializar servicios de Firebase

// Inicializar Firebase si no existe
try {
    if (!firebase.apps.length) {
        // La configuración debe venir de otro lado o estar en HTML
        const firebaseConfig = {
            apiKey: "AIzaSyAZnd-oA7S99_w2rt8_Vw53ux8l1PqiQ-k",
            authDomain: "eltachi.firebaseapp.com",
            projectId: "eltachi",
            storageBucket: "eltachi.firebasestorage.app",
            messagingSenderId: "231676602106",
            appId: "1:231676602106:web:fde347e9caa00760b34b43"
        };
        
        firebase.initializeApp(firebaseConfig);
        console.log("✅ Firebase inicializado correctamente");
    } else {
        console.log("✅ Firebase ya estaba inicializado");
    }
} catch (error) {
    console.error("❌ Error inicializando Firebase:", error);
}

// Inicializar servicios
let db = null;
let auth = null;

try {
    db = firebase.firestore();
    console.log("✅ Firestore inicializado");
} catch (error) {
    console.error("❌ Error inicializando Firestore:", error);
}

try {
    auth = firebase.auth();
    console.log("✅ Authentication inicializado");
} catch (error) {
    console.error("❌ Error inicializando Authentication:", error);
}

// Exportar para uso global
window.firebase = firebase;
window.db = db;
window.auth = auth;
