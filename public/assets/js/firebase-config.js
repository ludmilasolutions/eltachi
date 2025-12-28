// Configuración Firebase
const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "TU_PROJECT.firebaseapp.com",
    projectId: "TU_PROJECT",
    storageBucket: "TU_PROJECT.appspot.com",
    messagingSenderId: "TU_SENDER_ID",
    appId: "TU_APP_ID"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Singleton de Firebase
const FirebaseService = {
    // Verificar si el local está abierto
    async checkBusinessStatus() {
        try {
            const settings = await db.collection('settings').doc('negocio').get();
            return settings.exists ? settings.data().abierto : true;
        } catch (error) {
            console.error('Error verificando estado:', error);
            return true;
        }
    },

    // Obtener productos disponibles
    async getProducts() {
        try {
            const snapshot = await db.collection('products')
                .where('disponible', '==', true)
                .orderBy('orden', 'asc')
                .get();
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error obteniendo productos:', error);
            return [];
        }
    },

    // Obtener configuración
    async getSettings() {
        try {
            const [horarios, envios, negocio] = await Promise.all([
                db.collection('settings').doc('horarios').get(),
                db.collection('settings').doc('envios').get(),
                db.collection('settings').doc('negocio').get()
            ]);

            return {
                horarios: horarios.exists ? horarios.data() : {},
                envios: envios.exists ? envios.data() : {},
                negocio: negocio.exists ? negocio.data() : {}
            };
        } catch (error) {
            console.error('Error obteniendo settings:', error);
            return {};
        }
    },

    // Crear nuevo pedido
    async createOrder(orderData) {
        try {
            // Generar ID único
            const counterRef = db.collection('counters').doc('orders');
            const counter = await db.runTransaction(async (transaction) => {
                const doc = await transaction.get(counterRef);
                let count = 1;
                
                if (doc.exists) {
                    count = doc.data().count + 1;
                }
                
                transaction.set(counterRef, { count: count }, { merge: true });
                return count;
            });

            const orderId = `TACHI-${counter.toString().padStart(6, '0')}`;
            const orderWithId = {
                ...orderData,
                id_pedido: orderId,
                fecha: firebase.firestore.FieldValue.serverTimestamp(),
                estado: 'Recibido'
            };

            await db.collection('orders').doc(orderId).set(orderWithId);
            return orderId;
        } catch (error) {
            console.error('Error creando pedido:', error);
            throw error;
        }
    },

    // Consultar estado de pedido
    async checkOrderStatus(orderId) {
        try {
            const cleanedId = orderId.trim().toUpperCase();
            const doc = await db.collection('orders').doc(cleanedId).get();
            
            if (doc.exists) {
                return {
                    exists: true,
                    data: doc.data()
                };
            }
            
            // Intentar buscar por ID parcial
            const snapshot = await db.collection('orders')
                .where('id_pedido', '>=', cleanedId)
                .where('id_pedido', '<=', cleanedId + '\uf8ff')
                .limit(1)
                .get();
            
            if (!snapshot.empty) {
                return {
                    exists: true,
                    data: snapshot.docs[0].data()
                };
            }
            
            return { exists: false };
        } catch (error) {
            console.error('Error consultando pedido:', error);
            return { exists: false, error: error.message };
        }
    },

    // Actualizar estado de pedido (admin)
    async updateOrderStatus(orderId, newStatus) {
        try {
            await db.collection('orders').doc(orderId).update({
                estado: newStatus,
                actualizado: firebase.firestore.FieldValue.serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error('Error actualizando pedido:', error);
            throw error;
        }
    }
};

// Exportar para uso global
window.FirebaseService = FirebaseService;
window.db = db;
window.auth = auth;