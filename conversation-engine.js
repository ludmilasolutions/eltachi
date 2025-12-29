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
        return `Sos la persona que atiende pedidos de la rotisería EL TACHI.

⚠️ NO sos un bot.
NO mencionás inteligencia artificial.
NO usás menús automáticos.
NO ofrecés opciones si el cliente no las pide.

El cliente debe sentir que habla con una persona real del local.

🎭 PERSONALIDAD Y TONO

Cercano
Claro
Simple
Natural
Como un vendedor humano de rotisería

Ejemplos de tono correcto:
"Perfecto, dale"
"Genial, te tomo el pedido"
"Ahí te confirmo"
"Buenísimo"

❌ Prohibido:
"Como asistente virtual..."
"Seleccioná una opción"
"Paso 1 / Paso 2"
Mensajes largos innecesarios

🧠 REGLA DE ORO (CRÍTICA)

NUNCA ofrezcas cambios de aderezos ni personalización si el cliente NO lo pregunta.

Esto es obligatorio.

✔️ Solo hablar de cambios si el cliente dice cosas como:
"¿Le puedo sacar...?"
"¿Qué trae?"
"Sin cebolla"
"¿Se puede cambiar...?"

❌ Si el cliente NO pregunta:
NO menciones aderezos
NO sugieras cambios
NO digas "¿lo querés completo?"

Tomás el producto estándar.

👋 PRIMER MENSAJE (OBLIGATORIO)

Cuando el cliente inicia la conversación, respondés:

Saludo
Te presentás como atención de EL TACHI
Mostrás la carta completa (desde la base de datos)
Informás:
Tiempo estimado actual
Precio de envío
Opción retiro en el local
Aclarás una sola vez:
"Si necesitás cambiar algo del pedido, avisame"

⚠️ No volver a insistir con eso.

🍔 TOMA DE PEDIDOS

Cuando el cliente pide productos:
Confirmás lo que pidió, de forma corta
NO ofrecés agregados
NO ofrecés combos
NO ofrecés cambios

Ejemplo correcto:
"Perfecto, una hamburguesa y unas papas."

Ejemplo incorrecto:
"¿La hamburguesa la querés completa?"

🧂 CAMBIOS Y ADEREZOS (SOLO SI EL CLIENTE LOS PIDE)

Si el cliente pide un cambio:
Confirmás exactamente lo que pidió
NO ofrecés otros cambios
NO preguntás "algo más para agregarle"

Ejemplo correcto:
Cliente: "Una hamburguesa sin tomate"
Vos:
"Perfecto, hamburguesa sin tomate. ¿Algo más?"

🔢 PEDIDOS MÚLTIPLES

Si el cliente pide más de una unidad y menciona cambios:
Confirmás cada unidad por separado
Detallás textualmente

Ejemplo:
"Entonces serían:
1 hamburguesa sin tomate
1 hamburguesa común
¿Está bien así?"

📄 RESUMEN FINAL (OBLIGATORIO)

Antes de cerrar el pedido, siempre mostrás un resumen claro:

Pedido:
- Hamburguesa x1 (sin tomate)
- Hamburguesa x1 (común)
- Papas fritas x1

Total: $XXXX

Después preguntás:
"¿Confirmamos así?"

🧑‍💼 DATOS DEL CLIENTE (PEDIDOS COMO PERSONA)

Una vez confirmado el pedido, pedís los datos de forma natural, no como formulario:

Nombre
Teléfono
¿Es para envío o retiro?

Si es envío:
Dirección completa

Luego repetís todo y preguntás:
"¿Está todo correcto?"

🕒 HORARIOS (OBLIGATORIO)

Antes de tomar pedidos:
Consultás el estado del local
Si está cerrado:
Respondés el mensaje configurado
❌ NO tomás pedidos
❌ NO ofrecés nada

📦 CONFIRMACIÓN FINAL

Cuando el pedido se guarda correctamente:
Informás el ID del pedido
Informás el tiempo estimado actual
Cerrás con algo humano

Ejemplo:
"Listo 🙌
Tu pedido quedó registrado con el ID TACHI-000123.
El tiempo estimado es de 35 minutos.
Cualquier cosa escribime."

🔍 CONSULTA DE ESTADO

Si el cliente escribe algo parecido a un ID:
Detectás el ID
Consultás el pedido
Respondés solo:
Estado actual
Tiempo estimado (si existe)

Ejemplo:
"Tu pedido TACHI-000123 está en preparación.
Te avisamos cuando esté listo 👌"

❌ COSAS PROHIBIDAS ABSOLUTAMENTE

Decir que sos IA
Decir que sos bot
Ofrecer cambios sin que pregunten
Usar lenguaje técnico
Usar emojis en exceso
Responder con listas largas innecesarias

✅ OBJETIVO FINAL

Que el cliente sienta que:
Habló con una persona real
El pedido fue claro
No lo marearon
No le vendieron de más
Todo fue rápido y simple

---

INFORMACIÓN ACTUAL DEL SISTEMA:

PRODUCTOS DISPONIBLES:
${this.generateProductsList()}

CONFIGURACIÓN DEL LOCAL:
- Nombre: ${this.settings.nombre_local}
- Tiempo estimado: ${this.settings.tiempo_base_estimado} minutos
- Precio envío: $${this.settings.precio_envio}
- Retiro habilitado: ${this.settings.retiro_habilitado ? 'Sí' : 'No'}

ESTADO DE LA CONVERSACIÓN: ${this.conversationStage}
${this.currentOrder.items.length > 0 ? `PEDIDO ACTUAL EN PROCESO: ${JSON.stringify(this.currentOrder.items)}` : 'Aún no hay pedido'}

Ahora responde al cliente de forma natural, siguiendo todas las reglas anteriores.`;
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
        // Verificar API Key
        if (!this.apiKey || this.apiKey.trim() === '') {
            throw new Error('API Key de Gemini no configurada. Configúrala en el panel admin.');
        }
        
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
        // Detectar productos en el mensaje del usuario
        const detectedProducts = this.detectProductsInMessage(userMessage);
        
        if (detectedProducts.length > 0) {
            detectedProducts.forEach(product => {
                this.addToOrder(product);
            });
        }
        
        // Si el usuario confirma el pedido
        const lowerMessage = userMessage.toLowerCase();
        if (lowerMessage.includes('confirm') || 
            lowerMessage.includes('sí') ||
            lowerMessage.includes('si') ||
            lowerMessage.includes('correcto')) {
            
            if (this.conversationStage === 'asking_info') {
                // Guardar pedido en Firebase
                try {
                    const orderId = await this.saveOrderToFirebase();
                    return `Listo 🙌\nTu pedido quedó registrado con el ID *${orderId}*.\n\nEl tiempo estimado es de ${this.settings.tiempo_base_estimado} minutos.\n\n¡Gracias por tu pedido! Cualquier cosa escribime.`;
                } catch (error) {
                    console.error('Error guardando pedido:', error);
                    return 'Hubo un error guardando tu pedido. ¿Podrías intentarlo de nuevo?';
                }
            }
        }
        
        // Si el usuario pide datos de contacto
        if (this.conversationStage === 'asking_info') {
            // Extraer información del cliente de la respuesta de Gemini
            this.extractCustomerInfo(aiResponse, userMessage);
        }
        
        return aiResponse;
    }
    
    // Detectar productos en el mensaje
    detectProductsInMessage(message) {
        const lowerMessage = message.toLowerCase();
        const detected = [];
        
        this.products.forEach(product => {
            const productNameLower = product.nombre.toLowerCase();
            
            // Buscar coincidencias parciales (ej: "hamburguesa" en "quiero una hamburguesa")
            if (lowerMessage.includes(productNameLower) || 
                productNameLower.includes(lowerMessage)) {
                
                // Detectar cantidad
                const quantityMatch = message.match(/(\d+)\s+/);
                const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;
                
                // Detectar modificaciones
                let modifications = null;
                if (product.aderezos_disponibles && product.aderezos_disponibles.length > 0) {
                    product.aderezos_disponibles.forEach(aderezo => {
                        const aderezoLower = aderezo.toLowerCase();
                        if (lowerMessage.includes(aderezoLower)) {
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
    
    // Extraer información del cliente
    extractCustomerInfo(aiResponse, userMessage) {
        // Esta función intenta extraer información del cliente del mensaje
        // En una implementación real, usarías NLP o prompts específicos
        
        // Por ahora, guardamos información básica si se detecta
        const lowerMessage = userMessage.toLowerCase();
        
        if (!this.currentOrder.customerInfo) {
            this.currentOrder.customerInfo = {
                nombre: '',
                telefono: '',
                direccion: ''
            };
        }
        
        // Detectar tipo de pedido
        if (lowerMessage.includes('envío') || lowerMessage.includes('domicilio') || lowerMessage.includes('casa')) {
            this.currentOrder.deliveryType = 'envío';
        } else if (lowerMessage.includes('retiro') || lowerMessage.includes('local') || lowerMessage.includes('pasar')) {
            this.currentOrder.deliveryType = 'retiro';
        }
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
            
            // Reiniciar el pedido actual
            this.resetOrder();
            
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
            
            let lastNumber = 0;
            if (counterDoc.exists) {
                lastNumber = counterDoc.data().lastNumber || 0;
            }
            
            // Incrementar
            lastNumber++;
            
            // Actualizar contador
            await counterRef.set({ lastNumber: lastNumber }, { merge: true });
            
            // Formatear ID (ej: TACHI-000123)
            const paddedNumber = lastNumber.toString().padStart(6, '0');
            return `TACHI-${paddedNumber}`;
        } catch (error) {
            console.error('Error generando ID:', error);
            // Fallback: usar timestamp
            const timestamp = Date.now().toString().slice(-6);
            return `TACHI-${timestamp}`;
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
            summary += ` - $${item.precio * item.cantidad}\n`;
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
                   lowerMessage.includes('listo') ||
                   lowerMessage.includes('solo eso'))) {
            this.conversationStage = 'asking_info';
        } else if (this.conversationStage === 'asking_info' &&
                  (lowerMessage.includes('envío') || 
                   lowerMessage.includes('retiro') ||
                   lowerMessage.includes('domicilio'))) {
            this.conversationStage = 'confirming';
        }
    }
    
    // Reiniciar pedido (mantener historial de conversación)
    resetOrder() {
        this.currentOrder = {
            items: [],
            customerInfo: null,
            total: 0,
            deliveryType: null
        };
        this.conversationStage = 'greeting';
    }
    
    // Reiniciar conversación completa
    resetConversation() {
        this.conversationHistory = [];
        this.resetOrder();
    }
}

// Crear instancia global
let conversationEngine = null;

// Inicializar motor de conversación
async function initConversationEngine() {
    try {
        const settings = await getSettings();
        if (!settings) {
            console.error('No se pudo cargar la configuración');
            return;
        }
        
        const products = await loadAllProducts();
        
        conversationEngine = new ConversationEngine(
            settings.api_key_gemini,
            settings,
            products
        );
        
        console.log('Motor de conversación inicializado correctamente');
        return conversationEngine;
    } catch (error) {
        console.error('Error inicializando motor de conversación:', error);
        return null;
    }
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

// Función para procesar mensaje (para usar desde app.js)
async function processMessageWithGemini(message) {
    if (!conversationEngine) {
        await initConversationEngine();
    }
    
    if (!conversationEngine) {
        return 'El sistema de conversación no está disponible en este momento. Por favor, intenta más tarde.';
    }
    
    try {
        return await conversationEngine.processUserMessage(message);
    } catch (error) {
        console.error('Error procesando mensaje:', error);
        return 'Disculpá, hubo un error procesando tu mensaje. ¿Podrías intentarlo de nuevo?';
    }
}

// Función para obtener el resumen del pedido actual
function getCurrentOrderSummary() {
    if (!conversationEngine || conversationEngine.currentOrder.items.length === 0) {
        return null;
    }
    
    return conversationEngine.generateOrderSummaryText();
}

// Función para reiniciar conversación
function resetConversation() {
    if (conversationEngine) {
        conversationEngine.resetConversation();
    }
}

// Exportar para uso global
window.initConversationEngine = initConversationEngine;
window.processMessageWithGemini = processMessageWithGemini;
window.getCurrentOrderSummary = getCurrentOrderSummary;
window.resetConversation = resetConversation;
window.ConversationEngine = ConversationEngine;

// Inicializar cuando Firebase esté listo
window.addEventListener('firebaseReady', async () => {
    await initConversationEngine();
});
