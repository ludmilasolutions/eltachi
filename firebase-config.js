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
try {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase inicializado correctamente");
} catch (error) {
    console.error("Error inicializando Firebase:", error);
}

// Referencias globales
const db = firebase.firestore();
const auth = firebase.auth();

// Función para verificar conexión
async function testFirebaseConnection() {
    try {
        const settingsRef = db.collection('settings').doc('config');
        const doc = await settingsRef.get();
        return doc.exists;
    } catch (error) {
        console.error("Error conectando a Firebase:", error);
        return false;
    }
}

// Configuración inicial si no existe
async function initializeFirebaseData() {
    try {
        const settingsRef = db.collection('settings').doc('config');
        const settingsDoc = await settingsRef.get();
        
        if (!settingsDoc.exists) {
            // Crear configuración inicial
            await settingsRef.set({
                nombre_local: "EL TACHI Rotisería",
                horarios_por_dia: {
                    lunes: "11:00 - 23:00",
                    martes: "11:00 - 23:00",
                    miércoles: "11:00 - 23:00",
                    jueves: "11:00 - 23:00",
                    viernes: "11:00 - 00:00",
                    sábado: "11:00 - 00:00",
                    domingo: "11:00 - 23:00"
                },
                abierto: true,
                mensaje_cerrado: "Lo sentimos, estamos cerrados en este momento. Volvemos mañana a las 11:00.",
                precio_envio: 300,
                tiempo_base_estimado: 30,
                retiro_habilitado: true,
                colores_marca: {
                    azul: "#1e40af",
                    amarillo: "#f59e0b"
                },
                telefono_whatsapp: "5491122334455",
                api_key_gemini: ""
            });
            console.log("Configuración inicial creada");
        }
        
        // Verificar si hay productos
        const productsSnapshot = await db.collection('products').get();
        if (productsSnapshot.empty) {
            // Crear productos de ejemplo
            const productosIniciales = [
                {
                    id: "hamburguesa-clasica",
                    nombre: "Hamburguesa Clásica",
                    descripcion: "Carne 150g, queso, lechuga, tomate, cebolla y aderezo especial",
                    precio: 1200,
                    disponible: true,
                    categoria: "hamburguesas",
                    aderezos_disponibles: ["Sin cebolla", "Sin tomate", "Extra queso", "Picante"],
                    precios_extra_aderezos: {
                        "Extra queso": 100,
                        "Picante": 50
                    }
                },
                {
                    id: "papas-fritas",
                    nombre: "Papas Fritas",
                    descripcion: "Porción grande con sal y perejil",
                    precio: 800,
                    disponible: true,
                    categoria: "acompañamientos",
                    aderezos_disponibles: ["Con cheddar", "Con bacon"],
                    precios_extra_aderezos: {
                        "Con cheddar": 150,
                        "Con bacon": 200
                    }
                },
                {
                    id: "empanadas",
                    nombre: "Empanadas (docena)",
                    descripcion: "12 empanadas (carne, pollo, jamón y queso)",
                    precio: 2200,
                    disponible: true,
                    categoria: "entradas",
                    aderezos_disponibles: [],
                    precios_extra_aderezos: {}
                },
                {
                    id: "gaseosa",
                    nombre: "Gaseosa 500ml",
                    descripcion: "Coca-Cola, Sprite o Fanta",
                    precio: 400,
                    disponible: true,
                    categoria: "bebidas",
                    aderezos_disponibles: [],
                    precios_extra_aderezos: {}
                }
            ];
            
            for (const producto of productosIniciales) {
                await db.collection('products').doc(producto.id).set(producto);
            }
            console.log("Productos iniciales creados");
        }
        
        // Verificar si hay categorías
        const categoriesSnapshot = await db.collection('categories').get();
        if (categoriesSnapshot.empty) {
            const categoriasIniciales = [
                { id: "hamburguesas", nombre: "Hamburguesas", orden: 1 },
                { id: "pizzas", nombre: "Pizzas", orden: 2 },
                { id: "entradas", nombre: "Entradas", orden: 3 },
                { id: "acompañamientos", nombre: "Acompañamientos", orden: 4 },
                { id: "bebidas", nombre: "Bebidas", orden: 5 },
                { id: "postres", nombre: "Postres", orden: 6 }
            ];
            
            for (const categoria of categoriasIniciales) {
                await db.collection('categories').doc(categoria.id).set(categoria);
            }
            console.log("Categorías iniciales creadas");
        }
        
        return true;
    } catch (error) {
        console.error("Error inicializando datos:", error);
        return false;
    }
}

// Función para obtener configuración
async function getSettings() {
    try {
        const settingsRef = db.collection('settings').doc('config');
        const doc = await settingsRef.get();
        return doc.exists ? doc.data() : null;
    } catch (error) {
        console.error("Error obteniendo configuración:", error);
        return null;
    }
}

// Exportar para uso global
window.db = db;
window.auth = auth;
window.getSettings = getSettings;
window.testFirebaseConnection = testFirebaseConnection;
window.initializeFirebaseData = initializeFirebaseData;
