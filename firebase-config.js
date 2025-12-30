// Configuración Firebase para EL TACHI
// Solo inicializa Firebase, NO define funciones globales aquí

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAZnd-oA7S99_w2rt8_Vw53ux8l1PqiQ-k",
    authDomain: "eltachi.firebaseapp.com",
    projectId: "eltachi",
    storageBucket: "eltachi.firebasestorage.app",
    messagingSenderId: "231676602106",
    appId: "1:231676602106:web:fde347e9caa00760b34b43"
};

// Solo inicializar Firebase aquí, sin definir funciones globales
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log("✅ Firebase inicializado correctamente");
    } else {
        console.log("✅ Firebase ya estaba inicializado");
    }
} catch (error) {
    console.error("❌ Error inicializando Firebase:", error);
}

// Inicialización de servicios de Firebase - Solo referencias
let db = null;
let auth = null;

try {
    db = firebase.firestore();
    console.log("✅ Firestore inicializado");
    
    // Configuración de Firestore para desarrollo
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        db.settings({
            host: "localhost:8080",
            ssl: false
        });
        console.log("🔄 Modo desarrollo: usando Firestore emulator");
    }
} catch (error) {
    console.error("❌ Error inicializando Firestore:", error);
}

try {
    auth = firebase.auth();
    console.log("✅ Authentication inicializado");
} catch (error) {
    console.error("❌ Error inicializando Authentication:", error);
}

// Solo exponer las referencias básicas
window.firebase = firebase;
window.db = db;
window.auth = auth;

// Función para verificar conexión
async function testFirebaseConnection() {
    try {
        if (!db) {
            console.error("❌ Firestore no está inicializado");
            return false;
        }
        
        const settingsRef = db.collection('settings').doc('config');
        const doc = await settingsRef.get();
        return doc.exists;
    } catch (error) {
        console.error("Error conectando a Firebase:", error);
        return false;
    }
}

// Función de prueba para verificar Firebase
async function testFirebaseSave() {
    try {
        if (!db) {
            console.error("❌ Firestore no está inicializado");
            return false;
        }
        
        const testRef = db.collection('test').doc('connection');
        await testRef.set({
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            message: 'Conexión exitosa'
        });
        
        console.log('✅ Test de escritura en Firebase exitoso');
        return true;
        
    } catch (error) {
        console.error('❌ Error en test de Firebase:', error);
        return false;
    }
}

// Solo exponer estas funciones
window.testFirebaseConnection = testFirebaseConnection;
window.testFirebaseSave = testFirebaseSave;
