// Firebase Configuration
const firebaseConfig = {
    apiKey: "TU_API_KEY_AQUI",
    authDomain: "TU_PROJECT.firebaseapp.com",
    projectId: "TU_PROJECT",
    storageBucket: "TU_PROJECT.appspot.com",
    messagingSenderId: "TU_SENDER_ID",
    appId: "TU_APP_ID"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();

// Firebase Service
const FirebaseService = {
    async getBusinessStatus() {
        try {
            const doc = await db.collection('settings').doc('negocio').get();
            return doc.exists ? doc.data().abierto : true;
        } catch (error) {
            console.error('Error getting business status:', error);
            return true;
        }
    },

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
            console.error('Error getting products:', error);
            return [];
        }
    },

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
            console.error('Error getting settings:', error);
            return {};
        }
    },

    async createOrder(orderData) {
        try {
            // Get next order number
            const counterRef = db.collection('counters').doc('orders');
            const counterDoc = await counterRef.get();
            let count = 1;
            
            if (counterDoc.exists) {
                count = counterDoc.data().count + 1;
            }
            
            await counterRef.set({ count: count }, { merge: true });
            
            const orderId = `TACHI-${count.toString().padStart(6, '0')}`;
            
            const orderWithId = {
                ...orderData,
                id_pedido: orderId,
                fecha: firebase.firestore.FieldValue.serverTimestamp(),
                estado: 'Recibido'
            };
            
            await db.collection('orders').doc(orderId).set(orderWithId);
            return orderId;
            
        } catch (error) {
            console.error('Error creating order:', error);
            throw error;
        }
    },

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
            
            return { exists: false };
        } catch (error) {
            console.error('Error checking order:', error);
            return { exists: false, error: error.message };
        }
    }
};

// Export for global use
window.FirebaseService = FirebaseService;
window.db = db;
window.auth = auth;
