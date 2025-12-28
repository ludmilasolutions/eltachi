// firebase-init-simple.js - Solo lo esencial para la IA
console.log('🔥 Configurando entorno para IA...');

// Configuración mínima de Firebase (ajusta con tus datos)
const firebaseConfig = {
  apiKey: "AIzaSyAZnd-oA7S99_w2rt8_Vw53ux8l1PqiQ-k",
  authDomain: "eltachi.firebaseapp.com",
  projectId: "eltachi",
  storageBucket: "eltachi.firebasestorage.app",
  messagingSenderId: "231676602106",
  appId: "1:231676602106:web:fde347e9caa00760b34b43"
};

// Inicializar Firebase solo si no está inicializado
try {
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        
        // Objeto global mínimo
        window.firebaseApp = {
            db: firebase.firestore(),
            auth: firebase.auth(),
            config: {
                LOCAL_NAME: "EL TACHI",
                GEMINI_API_KEY: "AIzaSyBPRH8XZ0WfRMN9ZaPlVN_YaYvI9FTnkqU" // Se configurará desde el panel
            }
        };
        
        console.log('✅ Entorno configurado para IA');
    }
} catch (error) {
    console.warn('⚠️ Firebase no disponible, IA funcionará sin datos en tiempo real');
    window.firebaseApp = {
        db: null,
        auth: null,
        config: { LOCAL_NAME: "EL TACHI" }
    };
}
