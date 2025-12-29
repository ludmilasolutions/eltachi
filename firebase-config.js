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

// Función para inicializar contadores
async function initializeCounters() {
    try {
        const counterRef = db.collection('counters').doc('orders');
        const counterDoc = await counterRef.get();
        
        if (!counterDoc.exists) {
            await counterRef.set({ lastNumber: 0 });
            console.log("Contador de pedidos inicializado en 0");
        } else {
            console.log("Contador de pedidos ya existe:", counterDoc.data().lastNumber);
        }
        
        // Verificar si existe la colección orders
        const ordersRef = db.collection('orders');
        const ordersSnapshot = await ordersRef.limit(1).get();
        
        // Si hay pedidos pero el contador está en 0, actualizar
        if (!ordersSnapshot.empty) {
            const orders = await ordersRef.orderBy('fecha', 'desc').limit(1).get();
            if (!orders.empty) {
                const lastOrder = orders.docs[0].data();
                const lastId = lastOrder.id_pedido;
                const lastNumber = parseInt(lastId.split('-')[1]) || 0;
                
                const currentCounter = await counterRef.get();
                const currentNumber = currentCounter.data().lastNumber || 0;
                
                if (lastNumber > currentNumber) {
                    await counterRef.update({ lastNumber: lastNumber });
                    console.log(`Contador actualizado a ${lastNumber} (basado en último pedido)`);
                }
            }
        }
        
        return true;
    } catch (error) {
        console.error("Error inicializando contadores:", error);
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
        
        // Inicializar contadores
        await initializeCounters();
        
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
        
        console.log("✅ Firebase inicializado completamente");
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

// Función para cargar todos los productos
async function loadAllProducts() {
    try {
        const snapshot = await db.collection('products').get();
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error cargando productos:', error);
        return [];
    }
}

// Función de prueba para verificar Firebase
async function testFirebaseSave() {
    try {
        const testRef = db.collection('test').doc('connection');
        await testRef.set({
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            message: 'Conexión exitosa'
        });
        
        console.log('✅ Test de escritura en Firebase exitoso');
        
        // Limpiar el test después de 5 segundos
        setTimeout(async () => {
            try {
                await testRef.delete();
                console.log('Test limpiado');
            } catch (err) {
                console.error('Error limpiando test:', err);
            }
        }, 5000);
        
        return true;
    } catch (error) {
        console.error('❌ Error en test de Firebase:', error);
        return false;
    }
}

// Función para debug del sistema
async function debugOrderSystem() {
    console.log('=== DEBUG DEL SISTEMA DE PEDIDOS ===');
    
    // 1. Verificar Firebase
    console.log('1. Firebase conectado:', firebase.apps.length > 0);
    
    // 2. Verificar colecciones
    try {
        const counters = await db.collection('counters').doc('orders').get();
        console.log('2. Contador existe:', counters.exists);
        if (counters.exists) {
            console.log('   Último número:', counters.data().lastNumber);
        }
        
        const orders = await db.collection('orders').get();
        console.log('3. Total de pedidos:', orders.size);
        if (orders.size > 0) {
            orders.forEach(doc => {
                console.log(`   - ${doc.id}: ${doc.data().nombre_cliente} - $${doc.data().total}`);
            });
        }
        
        const settings = await db.collection('settings').doc('config').get();
        console.log('4. Configuración existe:', settings.exists);
        
        const products = await db.collection('products').get();
        console.log('5. Productos cargados:', products.size);
        
    } catch (error) {
        console.error('Error en debug:', error);
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Inicializando Firebase...');
    
    // Esperar un momento para asegurar que Firebase esté listo
    setTimeout(async () => {
        await initializeFirebaseData();
        
        // Ejecutar test de conexión
        await testFirebaseSave();
        
        // Ejecutar debug
        await debugOrderSystem();
        
        // Escuchar cambios en pedidos (para debugging)
        db.collection('orders').onSnapshot((snapshot) => {
            console.log(`📦 Pedidos actualizados: ${snapshot.size} pedidos`);
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    console.log('Nuevo pedido añadido:', change.doc.id, change.doc.data().nombre_cliente);
                }
            });
        });
    }, 1000);
});

// Exportar para uso global
window.db = db;
window.auth = auth;
window.getSettings = getSettings;
window.testFirebaseConnection = testFirebaseConnection;
window.initializeFirebaseData = initializeFirebaseData;
window.initializeCounters = initializeCounters;
window.loadAllProducts = loadAllProducts;
window.testFirebaseSave = testFirebaseSave;
window.debugOrderSystem = debugOrderSystem;
