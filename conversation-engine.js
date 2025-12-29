// Motor de conversación con Gemini Pro
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
        // Verificar si el local está abierto
        if (!this.settings.abierto) {
            return this.settings.mensaje_cerrado;
        }
        
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
        
        try {
            // Llamar a Gemini API
            const response = await this.callGeminiAPI(userMessage);
            
            // Agregar respuesta al historial
            this.conversationHistory.push({
                role: 'model',
                parts: [{ text: response }]
            });
            
            // Procesar para extraer información del pedido
            await this.processOrderFromMessage(userMessage, response);
            
            return response;
        } catch (error) {
            console.error('Error procesando mensaje con Gemini:', error);
            return this.getFallbackResponse(userMessage);
        }
    }
    
    // Llamar a Gemini API - CORRECCIÓN: Modelos correctos
    async callGeminiAPI(userMessage) {
        // Verificar API Key
        if (!this.apiKey || this.apiKey.trim() === '') {
            throw new Error('API Key de Gemini no configurada');
        }
        
        // MODELOS CORRECTOS DE GEMINI (elige uno):
        // Opción 1: Gemini 1.0 Pro (recomendado para free tier)
        const model = 'gemini-1.0-pro';
        
        // Opción 2: Gemini Pro (alias)
        // const model = 'gemini-pro';
        
        // Opción 3: Gemini 1.5 Flash (más rápido)
        // const model = 'gemini-1.5-flash';
        
        // URL CORRECTA
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
        
        // Preparar mensajes para la API
        const messages = [
            {
                role: "user",
                parts: [{
                    text: this.generateSystemPrompt() + `\n\nMensaje del cliente: "${userMessage}"\n\nTu respuesta:`
                }]
            }
        ];
        
        const requestBody = {
            contents: messages,
            generationConfig: {
                temperature: 0.8,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 800,
            },
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                }
            ]
        };
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Error Gemini API:', {
                status: response.status,
                statusText: response.statusText,
                error: errorData
            });
            
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            console.error('Respuesta inválida de Gemini:', data);
            throw new Error('Respuesta inválida de la API');
        }
        
        return data.candidates[0].content.parts[0].text;
    }
    
    // Procesar mensaje para extraer información del pedido
    async processOrderFromMessage(userMessage, aiResponse) {
        const lowerMessage = userMessage.toLowerCase();
        
        // Detectar productos en el mensaje
        const detectedProducts = this.detectProductsInMessage(userMessage);
        
        if (detectedProducts.length > 0) {
            detectedProducts.forEach(product => {
                this.addToOrder(product);
            });
        }
        
        // Detectar si el usuario confirma
        if (lowerMessage.includes('sí') || lowerMessage.includes('si') || 
            lowerMessage.includes('confirm') || lowerMessage.includes('correcto')) {
            
            if (this.conversationStage === 'confirming' && this.currentOrder.items.length > 0) {
                // Guardar pedido en Firebase
                const orderId = await this.saveOrderToFirebase();
                return orderId;
            }
        }
        
        // Detectar información del cliente
        this.extractCustomerInfo(userMessage, aiResponse);
        
        return null;
    }
    
    // Detectar productos en el mensaje
    detectProductsInMessage(message) {
        const lowerMessage = message.toLowerCase();
        const detected = [];
        
        this.products.forEach(product => {
            const productNameLower = product.nombre.toLowerCase();
            
            // Verificar si el producto está mencionado
            if (lowerMessage.includes(productNameLower)) {
                // Detectar cantidad
                let quantity = 1;
                const quantityMatch = message.match(/(\d+)\s*/);
                if (quantityMatch) {
                    quantity = parseInt(quantityMatch[1]);
                }
                
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
    
    // Extraer información del cliente
    extractCustomerInfo(userMessage, aiResponse) {
        const lowerMessage = userMessage.toLowerCase();
        
        if (!this.currentOrder.customerInfo) {
            this.currentOrder.customerInfo = {
                nombre: '',
                telefono: '',
                direccion: ''
            };
        }
        
        // Detectar tipo de pedido
        if (lowerMessage.includes('envío') || lowerMessage.includes('domicilio') || 
            lowerMessage.includes('casa') || lowerMessage.includes('dirección')) {
            this.currentOrder.deliveryType = 'envío';
        } else if (lowerMessage.includes('retiro') || lowerMessage.includes('local') || 
                   lowerMessage.includes('pasar') || lowerMessage.includes('buscar')) {
            this.currentOrder.deliveryType = 'retiro';
        }
        
        // Detectar teléfono (patrón simple)
        const phoneMatch = userMessage.match(/(\d{8,15})/);
        if (phoneMatch) {
            this.currentOrder.customerInfo.telefono = phoneMatch[1];
        }
        
        // Detectar nombre (si hay "me llamo", "soy", "nombre es")
        if (lowerMessage.includes('me llamo') || lowerMessage.includes('soy ') || 
            lowerMessage.includes('nombre es')) {
            const nameMatch = userMessage.match(/(?:me llamo|soy|nombre es)\s+([A-Za-zÁÉÍÓÚáéíóúÑñ\s]+)/i);
            if (nameMatch && nameMatch[1]) {
                this.currentOrder.customerInfo.nombre = nameMatch[1].trim();
            }
        }
    }
    
    // Respuesta de fallback cuando Gemini falla
    getFallbackResponse(userMessage) {
        const lowerMessage = userMessage.toLowerCase();
        
        // Primera vez que habla
        if (lowerMessage.includes('hola') || lowerMessage.includes('buenas')) {
            return `¡Hola! 👋 Soy la atención de EL TACHI.\n\n${this.generateSimpleMenu()}\n\nTiempo estimado: ${this.settings.tiempo_base_estimado} minutos\nEnvió: $${this.settings.precio_envio}\nRetiro: ${this.settings.retiro_habilitado ? 'Sí' : 'No'}\n\nSi necesitás cambiar algo del pedido, avisame.`;
        }
        
        // Si pide menú
        if (lowerMessage.includes('menu') || lowerMessage.includes('carta')) {
            return this.generateSimpleMenu();
        }
        
        // Si pide un producto
        const productResponse = this.getProductResponse(lowerMessage);
        if (productResponse) {
            return productResponse;
        }
        
        // Si dice que ya terminó
        if (lowerMessage.includes('nada más') || lowerMessage.includes('eso es todo') || 
            lowerMessage.includes('listo')) {
            
            if (this.currentOrder.items.length === 0) {
                return 'No tengo ningún producto en tu pedido. ¿Qué te gustaría ordenar?';
            }
            
            const summary = this.generateOrderSummaryText();
            return `*RESUMEN DE PEDIDO*\n\n${summary}\n\n¿Es para envío o retiro?`;
        }
        
        // Si da información de envío/retiro
        if (lowerMessage.includes('envío') || lowerMessage.includes('domicilio')) {
            this.currentOrder.deliveryType = 'envío';
            return 'Perfecto, para envío a domicilio. ¿Me podrías dar tu nombre, teléfono y dirección completa?';
        }
        
        if (lowerMessage.includes('retiro') || lowerMessage.includes('local')) {
            this.currentOrder.deliveryType = 'retiro';
            return 'Perfecto, para retiro en el local. ¿Me podrías dar tu nombre y teléfono?';
        }
        
        // Confirmación
        if (lowerMessage.includes('sí') || lowerMessage.includes('si') || 
            lowerMessage.includes('confirm') || lowerMessage.includes('correcto')) {
            
            if (this.conversationStage === 'confirming') {
                this.saveOrderToFirebase().then(orderId => {
                    // Esta respuesta se enviará en el próximo ciclo
                    console.log('Pedido guardado:', orderId);
                }).catch(error => {
                    console.error('Error guardando pedido:', error);
                });
                
                return `Perfecto, ya registré tu pedido. En un momento te doy el número de seguimiento.`;
            }
        }
        
        // Respuesta genérica
        return 'Entendido. ¿Algo más que quieras agregar a tu pedido?';
    }
    
    // Generar menú simple
    generateSimpleMenu() {
        let menu = '*NUESTRA CARTA*\n\n';
        
        const categories = {};
        this.products.forEach(product => {
            if (!categories[product.categoria]) {
                categories[product.categoria] = [];
            }
            categories[product.categoria].push(product);
        });
        
        for (const [category, products] of Object.entries(categories)) {
            menu += `*${category.toUpperCase()}*\n`;
            products.forEach(product => {
                menu += `• ${product.nombre} - $${product.precio}\n`;
            });
            menu += '\n';
        }
        
        return menu;
    }
    
    // Respuesta para productos específicos
    getProductResponse(message) {
        for (const product of this.products) {
            const productNameLower = product.nombre.toLowerCase();
            if (message.includes(productNameLower)) {
                
                let modifications = '';
                if (product.aderezos_disponibles && product.aderezos_disponibles.length > 0) {
                    for (const aderezo of product.aderezos_disponibles) {
                        if (message.includes(aderezo.toLowerCase())) {
                            modifications = aderezo;
                            break;
                        }
                    }
                }
                
                // Agregar al pedido
                this.addToOrder({
                    productId: product.id,
                    nombre: product.nombre,
                    precio: product.precio,
                    cantidad: 1,
                    modificaciones: modifications || null
                });
                
                if (modifications) {
                    return `Perfecto, ${product.nombre} ${modifications.toLowerCase()}. ¿Algo más?`;
                } else {
                    return `Perfecto, ${product.nombre}. ¿Algo más?`;
                }
            }
        }
        
        return null;
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
                nombre_cliente: this.currentOrder.customerInfo?.nombre || 'Cliente',
                telefono: this.currentOrder.customerInfo?.telefono || '',
                tipo_pedido: this.currentOrder.deliveryType || 'retiro',
                direccion: this.currentOrder.customerInfo?.direccion || '',
                pedido_detallado: this.generateOrderSummaryText(),
                total: this.currentOrder.total,
                estado: 'Recibido',
                tiempo_estimado_actual: this.settings.tiempo_base_estimado
            };
            
            await db.collection('orders').doc(orderId).set(orderData);
            
            // Reiniciar pedido
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
            const counterRef = db.collection('counters').doc('orders');
            const counterDoc = await counterRef.get();
            
            let lastNumber = 0;
            if (counterDoc.exists) {
                lastNumber = counterDoc.data().lastNumber || 0;
            }
            
            lastNumber++;
            
            await counterRef.set({ lastNumber: lastNumber }, { merge: true });
            
            const paddedNumber = lastNumber.toString().padStart(6, '0');
            return `TACHI-${paddedNumber}`;
        } catch (error) {
            console.error('Error generando ID:', error);
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
        
        if (this.conversationStage === 'greeting' && 
            (lowerMessage.includes('hola') || lowerMessage.includes('buenas'))) {
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
    
    // Reiniciar pedido
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
            return null;
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

// Función para procesar mensaje
async function processMessageWithGemini(message) {
    if (!conversationEngine) {
        await initConversationEngine();
    }
    
    if (!conversationEngine) {
        return 'El sistema de conversación no está disponible en este momento.';
    }
    
    try {
        return await conversationEngine.processUserMessage(message);
    } catch (error) {
        console.error('Error procesando mensaje:', error);
        return conversationEngine.getFallbackResponse(message);
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

// Función para verificar si Gemini está disponible
async function checkGeminiAvailability() {
    try {
        const settings = await getSettings();
        return !!(settings && settings.api_key_gemini && settings.api_key_gemini.trim() !== '');
    } catch (error) {
        return false;
    }
}

// Exportar para uso global
window.initConversationEngine = initConversationEngine;
window.processMessageWithGemini = processMessageWithGemini;
window.getCurrentOrderSummary = getCurrentOrderSummary;
window.resetConversation = resetConversation;
window.checkGeminiAvailability = checkGeminiAvailability;
window.ConversationEngine = ConversationEngine;

// Inicializar cuando Firebase esté listo
if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
    setTimeout(async () => {
        await initConversationEngine();
    }, 1000);
}
