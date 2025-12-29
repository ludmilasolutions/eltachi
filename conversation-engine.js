// Motor de conversación con Gemini Pro 2.5
class ConversationEngine {
    constructor(apiKey, settings, products) {
        this.apiKey = apiKey;
        this.settings = settings;
        this.products = products;
        this.conversationHistory = [];
        this.currentOrder = {
            items: [],
            customerInfo: null,
            total: 0,
            deliveryType: null
        };
        this.conversationStage = 'greeting'; // greeting, taking_order, asking_info, confirming
    }
    
    // Generar prompt para Gemini
    generateSystemPrompt() {
        return `Eres la persona que atiende pedidos de la rotisería EL TACHI.
        
IMPORTANTE: NO eres un bot. NO menciones inteligencia artificial. NO uses menús automáticos.

El cliente debe sentir que habla con una persona real del local.

PERSONALIDAD: Cercano, claro, simple, natural como un vendedor humano.

REGLA CRÍTICA: NUNCA ofrezcas cambios de aderezos ni personalización si el cliente NO lo pregunta.
Solo habla de cambios si el cliente dice cosas como:
- "¿Le puedo sacar...?"
- "¿Qué trae?"
- "Sin cebolla"
- "¿Se puede cambiar...?"

Si el cliente NO pregunta: NO menciones aderezos, NO sugieras cambios.

PRODUCTOS DISPONIBLES:
${this.generateProductsList()}

INFORMACIÓN DEL LOCAL:
- Nombre: ${this.settings.nombre_local}
- Tiempo estimado: ${this.settings.tiempo_base_estimado} minutos
- Precio envío: $${this.settings.precio_envio}
- Retiro habilitado: ${this.settings.retiro_habilitado ? 'Sí' : 'No'}

ESTADO ACTUAL DE LA CONVERSACIÓN: ${this.conversationStage}
${this.currentOrder.items.length > 0 ? `PEDIDO ACTUAL: ${JSON.stringify(this.currentOrder.items)}` : ''}

Responde siempre en español, de forma natural, como un vendedor humano.
NO uses frases robóticas como "como asistente virtual...".
NO ofrezcas opciones si no te las piden.
Sé breve pero amable.`;
    }
    
    // Generar lista de productos
    generateProductsList() {
        let list = '';
        const categories = {};
        
        // Agrupar por categoría
        this.products.forEach(product => {
            if (!categories[product.categoria]) {
                categories[product.categoria] = [];
            }
            categories[product.categoria].push(product);
        });
        
        for (const [category, products] of Object.entries(categories)) {
            list += `\n${category.toUpperCase()}:\n`;
            products.forEach(product => {
                list += `- ${product.nombre}: $${product.precio}`;
                if (product.descripcion) {
                    list += ` (${product.descripcion})`;
                }
                list += `\n`;
            });
        }
        
        return list;
    }
    
    // Procesar mensaje del usuario
    async processUserMessage(userMessage) {
        // Agregar al historial
        this.conversationHistory.push({
            role: 'user',
            parts: [{ text: userMessage }]
        });
        
        // Verificar si es un ID de pedido
        const orderIdMatch = userMessage.match(/TACHI-\d{6}/i);
        if (orderIdMatch) {
            return await this.handleOrderStatusQuery(orderIdMatch[0].toUpperCase());
        }
        
        // Determinar etapa de conversación
        this.updateConversationStage(userMessage);
        
        // Preparar mensaje para Gemini
        const messages = [
            {
                role: 'user',
                parts: [{ text: this.generateSystemPrompt() }]
            },
            ...this.conversationHistory.slice(-10) // Últimos 10 mensajes
        ];
        
        try {
            // Llamar a Gemini API
            const response = await this.callGeminiAPI(messages);
            
            // Procesar respuesta
            const processedResponse = await this.processAIResponse(response, userMessage);
            
            // Agregar respuesta al historial
            this.conversationHistory.push({
                role: 'model',
                parts: [{ text: processedResponse }]
            });
            
            return processedResponse;
        } catch (error) {
            console.error('Error procesando mensaje con Gemini:', error);
            return 'Disculpá, hubo un error procesando tu mensaje. ¿Podrías intentarlo de nuevo?';
        }
    }
    
    // Llamar a Gemini API
    async callGeminiAPI(messages) {
        // URL de la API de Gemini
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${this.apiKey}`;
        
        const requestBody = {
            contents: messages,
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
            }
        };
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0]) {
            throw new Error('Respuesta vacía de Gemini');
        }
        
        return data.candidates[0].content.parts[0].text;
    }
    
    // Procesar respuesta de la IA
    async processAIResponse(aiResponse, userMessage) {
        // Aquí podrías extraer información del pedido de la respuesta
        // Por ejemplo, detectar si el usuario pidió un producto
        
        // Detectar productos en el mensaje del usuario
        const detectedProducts = this.detectProductsInMessage(userMessage);
        
        if (detectedProducts.length > 0) {
            detectedProducts.forEach(product => {
                this.addToOrder(product);
            });
        }
        
        // Si el usuario confirma el pedido
        if (userMessage.toLowerCase().includes('confirm') || 
            userMessage.toLowerCase().includes('sí') ||
            userMessage.toLowerCase().includes('si')) {
            
            if (this.conversationStage === 'asking_info') {
                // Guardar pedido en Firebase
                const orderId = await this.saveOrderToFirebase();
                return `Perfecto! Tu pedido quedó registrado con el ID *${orderId}*.\n\nEl tiempo estimado es de ${this.settings.tiempo_base_estimado} minutos.\n\n¡Gracias por tu pedido! 🎉`;
            }
        }
        
        return aiResponse;
    }
    
    // Detectar productos en el mensaje
    detectProductsInMessage(message) {
        const lowerMessage = message.toLowerCase();
        const detected = [];
        
        this.products.forEach(product => {
            if (lowerMessage.includes(product.nombre.toLowerCase())) {
                // Detectar cantidad
                const quantityMatch = message.match(/(\d+)\s*$/);
                const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;
                
                // Detectar modificaciones
                let modifications = null;
                if (product.aderezos_disponibles && product.aderezos_disponibles.length > 0) {
                    product.aderezos_disponibles.forEach(aderezo => {
                        if (lowerMessage.includes(aderezo.toLowerCase())) {
                            modifications = aderezo;
                        }
                    });
                }
                
                detected.push({
                    productId: product.id,
                    nombre: product.nombre,
                    precio: product.precio,
                    cantidad: quantity,
                    modificaciones: modifications
                });
            }
        });
        
        return detected;
    }
    
    // Agregar producto al pedido
    addToOrder(productInfo) {
        const existingItem = this.currentOrder.items.find(
            item => item.productId === productInfo.productId && 
                   item.modificaciones === productInfo.modificaciones
        );
        
        if (existingItem) {
            existingItem.cantidad += productInfo.cantidad;
        } else {
            this.currentOrder.items.push(productInfo);
        }
        
        this.updateOrderTotal();
    }
    
    // Actualizar total del pedido
    updateOrderTotal() {
        let total = 0;
        
        this.currentOrder.items.forEach(item => {
            total += item.precio * item.cantidad;
            
            // Agregar costo de aderezos extra si corresponde
            if (item.modificaciones) {
                const product = this.products.find(p => p.id === item.productId);
                if (product && product.precios_extra_aderezos && 
                    product.precios_extra_aderezos[item.modificaciones]) {
                    total += product.precios_extra_aderezos[item.modificaciones] * item.cantidad;
                }
            }
        });
        
        this.currentOrder.total = total;
    }
    
    // Guardar pedido en Firebase
    async saveOrderToFirebase() {
        try {
            // Generar ID único
            const orderId = await this.generateOrderId();
            
            const orderData = {
                id_pedido: orderId,
                fecha: firebase.firestore.FieldValue.serverTimestamp(),
                nombre_cliente: this.currentOrder.customerInfo?.nombre || '',
                telefono: this.currentOrder.customerInfo?.telefono || '',
                tipo_pedido: this.currentOrder.deliveryType || '',
                direccion: this.currentOrder.customerInfo?.direccion || '',
                pedido_detallado: this.generateOrderSummaryText(),
                total: this.currentOrder.total,
                estado: 'Recibido',
                tiempo_estimado_actual: this.settings.tiempo_base_estimado
            };
            
            await db.collection('orders').doc(orderId).set(orderData);
            
            return orderId;
        } catch (error) {
            console.error('Error guardando pedido:', error);
            throw error;
        }
    }
    
    // Generar ID de pedido
    async generateOrderId() {
        try {
            // Obtener el último número de pedido
            const counterRef = db.collection('counters').doc('orders');
            const counterDoc = await counterRef.get();
            
            let lastNumber = 1;
            if (counterDoc.exists) {
                lastNumber = counterDoc.data().lastNumber + 1;
            }
            
            // Actualizar contador
            await counterRef.set({ lastNumber: lastNumber }, { merge: true });
            
            // Formatear ID (ej: TACHI-000123)
            const paddedNumber = lastNumber.toString().padStart(6, '0');
            return `TACHI-${paddedNumber}`;
        } catch (error) {
            console.error('Error generando ID:', error);
            // Fallback: usar timestamp
            return `TACHI-${Date.now().toString().slice(-6)}`;
        }
    }
    
    // Generar texto de resumen del pedido
    generateOrderSummaryText() {
        let summary = 'Pedido:\n';
        
        this.currentOrder.items.forEach(item => {
            summary += `- ${item.nombre} x${item.cantidad}`;
            if (item.modificaciones) {
                summary += ` (${item.modificaciones})`;
            }
            summary += `\n`;
        });
        
        summary += `\nTotal: $${this.currentOrder.total}`;
        
        if (this.currentOrder.deliveryType === 'envío') {
            summary += ` + $${this.settings.precio_envio} de envío`;
        }
        
        return summary;
    }
    
    // Manejar consulta de estado
    async handleOrderStatusQuery(orderId) {
        try {
            const orderRef = db.collection('orders').doc(orderId);
            const orderDoc = await orderRef.get();
            
            if (!orderDoc.exists) {
                return `No encontré el pedido ${orderId}. Verificá el número e intentá de nuevo.`;
            }
            
            const order = orderDoc.data();
            let response = `*Pedido ${orderId}*\n`;
            response += `Estado: ${order.estado}\n`;
            
            if (order.tiempo_estimado_actual) {
                response += `Tiempo estimado: ${order.tiempo_estimado_actual} minutos\n`;
            }
            
            if (order.estado === 'Listo') {
                response += '\n¡Tu pedido está listo para retirar! 👌';
            }
            
            return response;
        } catch (error) {
            console.error('Error consultando pedido:', error);
            return 'Hubo un error consultando el estado. Intentá de nuevo más tarde.';
        }
    }
    
    // Actualizar etapa de conversación
    updateConversationStage(userMessage) {
        const lowerMessage = userMessage.toLowerCase();
        
        if (this.conversationStage === 'greeting') {
            this.conversationStage = 'taking_order';
        } else if (this.conversationStage === 'taking_order' && 
                  (lowerMessage.includes('nada más') || 
                   lowerMessage.includes('eso es todo') ||
                   lowerMessage.includes('listo'))) {
            this.conversationStage = 'asking_info';
        } else if (this.conversationStage === 'asking_info' &&
                  (lowerMessage.includes('envío') || 
                   lowerMessage.includes('retiro') ||
                   lowerMessage.includes('domicilio'))) {
            this.conversationStage = 'confirming';
        }
    }
    
    // Reiniciar conversación
    resetConversation() {
        this.conversationHistory = [];
        this.currentOrder = {
            items: [],
            customerInfo: null,
            total: 0,
            deliveryType: null
        };
        this.conversationStage = 'greeting';
    }
}

// Crear instancia global
let conversationEngine = null;

// Inicializar motor de conversación
async function initConversationEngine() {
    const settings = await getSettings();
    const products = await loadAllProducts();
    
    conversationEngine = new ConversationEngine(
        settings.api_key_gemini,
        settings,
        products
    );
}

// Cargar todos los productos
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

// Exportar para uso global
window.initConversationEngine = initConversationEngine;
window.ConversationEngine = ConversationEngine;

// Inicializar cuando Firebase esté listo
window.addEventListener('firebaseReady', async () => {
    await initConversationEngine();
});