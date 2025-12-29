// Motor de conversación con Gemini 2.5 Flash
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
        this.conversationStage = 'greeting';
        this.pendingClarification = null; // Para manejar clarificaciones de productos
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

IMPORTANTE: Cuando el cliente pida un producto genérico (ej: "hamburguesa", "papas", "bebida"), 
tenés que preguntarle cuál de las opciones disponibles quiere mostrando las opciones de esa categoría.

Ejemplo correcto:
Cliente: "Quiero una hamburguesa"
Vos: "Tenemos estas hamburguesas:
- Hamburguesa Clásica: $1200
- Hamburguesa Especial: $1500
¿Cuál querés?"

SOLO después de que el cliente especifique, confirmás el producto.

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
${this.currentOrder.items.length > 0 ? `PEDIDO ACTUAL EN PROCESO: ${this.generateCurrentOrderSummary()}` : 'Aún no hay pedido'}

Ahora responde al cliente de forma natural, siguiendo todas las reglas anteriores.`;
    }
    
    // Generar lista de productos
    generateProductsList() {
        let list = '';
        const categories = {};
        
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
    
    // Generar resumen del pedido actual
    generateCurrentOrderSummary() {
        if (this.currentOrder.items.length === 0) return 'Sin productos';
        
        let summary = '';
        this.currentOrder.items.forEach(item => {
            summary += `- ${item.nombre} x${item.cantidad}`;
            if (item.modificaciones) {
                summary += ` (${item.modificaciones})`;
            }
            summary += `\n`;
        });
        return summary;
    }
    
    // Procesar mensaje del usuario
    async processUserMessage(userMessage) {
        // Verificar si el local está abierto
        if (!this.settings.abierto) {
            return this.settings.mensaje_cerrado;
        }
        
        // Si hay una clarificación pendiente, procesarla primero
        if (this.pendingClarification) {
            return this.handleProductClarification(userMessage);
        }
        
        // Agregar al historial ANTES de procesar
        this.conversationHistory.push({
            role: 'user',
            parts: [{ text: userMessage }]
        });
        
        // Limitar historial
        this.trimConversationHistory();
        
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
            
            // Verificar si la respuesta indica que necesita clarificación
            const needsClarification = this.checkIfNeedsClarification(userMessage, response);
            if (needsClarification) {
                this.pendingClarification = {
                    category: needsClarification.category,
                    originalMessage: userMessage
                };
            } else {
                // Solo agregar al historial si no es clarificación
                this.conversationHistory.push({
                    role: 'model',
                    parts: [{ text: response }]
                });
            }
            
            // Procesar para extraer información del pedido
            if (!needsClarification) {
                await this.processOrderFromMessage(userMessage, response);
            }
            
            return response;
        } catch (error) {
            console.error('Error procesando mensaje con Gemini:', error);
            // Respuesta de fallback
            const fallbackResponse = this.getFallbackResponse(userMessage);
            this.conversationHistory.push({
                role: 'model',
                parts: [{ text: fallbackResponse }]
            });
            return fallbackResponse;
        }
    }
    
    // Verificar si necesita clarificación de producto
    checkIfNeedsClarification(userMessage, aiResponse) {
        const lowerMessage = userMessage.toLowerCase();
        
        // Buscar categorías en el mensaje del usuario
        const categories = this.getCategoriesFromMessage(lowerMessage);
        
        if (categories.length > 0) {
            // Para cada categoría encontrada, verificar si hay múltiples productos
            for (const category of categories) {
                const productsInCategory = this.getProductsByCategory(category);
                
                // Si hay más de un producto en la categoría y el usuario no especificó cuál
                if (productsInCategory.length > 1) {
                    // Verificar si el usuario ya especificó un producto de esa categoría
                    const specifiedProduct = this.getSpecifiedProductFromMessage(lowerMessage, productsInCategory);
                    
                    if (!specifiedProduct) {
                        return {
                            category: category,
                            products: productsInCategory
                        };
                    }
                }
            }
        }
        
        return null;
    }
    
    // Manejar clarificación de producto
    handleProductClarification(userMessage) {
        const lowerMessage = userMessage.toLowerCase();
        const category = this.pendingClarification.category;
        const products = this.getProductsByCategory(category);
        
        // Buscar si el usuario especificó un producto de la lista
        let selectedProduct = null;
        
        for (const product of products) {
            const productNameLower = product.nombre.toLowerCase();
            if (lowerMessage.includes(productNameLower)) {
                selectedProduct = product;
                break;
            }
        }
        
        // Si el usuario no especificó, preguntar de nuevo
        if (!selectedProduct) {
            let clarificationText = `¿Cuál ${category} querés? Tenemos:\n`;
            products.forEach(product => {
                clarificationText += `- ${product.nombre}: $${product.precio}`;
                if (product.descripcion) {
                    clarificationText += ` (${product.descripcion})`;
                }
                clarificationText += `\n`;
            });
            
            // Mantener la clarificación pendiente
            return clarificationText;
        }
        
        // Si el usuario especificó, agregar al pedido
        this.addToOrder({
            productId: selectedProduct.id,
            nombre: selectedProduct.nombre,
            precio: selectedProduct.precio,
            cantidad: 1,
            modificaciones: null
        });
        
        // Limpiar clarificación pendiente
        this.pendingClarification = null;
        
        // Agregar la interacción al historial
        this.conversationHistory.push({
            role: 'model',
            parts: [{ text: `Perfecto, ${selectedProduct.nombre}. ¿Algo más?` }]
        });
        
        return `Perfecto, ${selectedProduct.nombre}. ¿Algo más?`;
    }
    
    // Obtener categorías del mensaje
    getCategoriesFromMessage(message) {
        const categories = [];
        const allCategories = [...new Set(this.products.map(p => p.categoria.toLowerCase()))];
        
        allCategories.forEach(category => {
            if (message.includes(category)) {
                categories.push(category);
            }
        });
        
        return categories;
    }
    
    // Obtener productos por categoría
    getProductsByCategory(category) {
        return this.products.filter(product => 
            product.categoria.toLowerCase() === category.toLowerCase()
        );
    }
    
    // Obtener producto especificado del mensaje
    getSpecifiedProductFromMessage(message, products) {
        for (const product of products) {
            const productNameLower = product.nombre.toLowerCase();
            if (message.includes(productNameLower)) {
                return product;
            }
        }
        return null;
    }
    
    // Llamar a Gemini API - FORMATO CORRECTO según documentación
    async callGeminiAPI(userMessage) {
        // Verificar API Key
        if (!this.apiKey || this.apiKey.trim() === '') {
            throw new Error('API Key de Gemini no configurada');
        }
        
        // MODELO CORRECTO: gemini-2.5-flash
        const model = 'gemini-2.5-flash';
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        
        // Construir el historial de conversación para Gemini
        let conversationHistoryText = '';
        if (this.conversationHistory.length > 0) {
            this.conversationHistory.forEach(msg => {
                const role = msg.role === 'user' ? 'Cliente' : 'Vendedor';
                conversationHistoryText += `${role}: ${msg.parts[0].text}\n\n`;
            });
        }
        
        const systemPrompt = this.generateSystemPrompt();
        
        const fullPrompt = `${systemPrompt}

HISTORIAL DE CONVERSACIÓN ANTERIOR:
${conversationHistoryText}

ÚLTIMO MENSAJE DEL CLIENTE: "${userMessage}"

Tu respuesta como vendedor de EL TACHI (responde naturalmente, continúa la conversación donde quedó, y si el cliente pide un producto genérico, preguntale cuál de las opciones disponibles quiere):`;
        
        // FORMATO CORRECTO según documentación de Google
        const payload = {
            contents: [
                {
                    parts: [
                        { 
                            text: fullPrompt
                        }
                    ]
                }
            ],
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
                'Content-Type': 'application/json',
                'x-goog-api-key': this.apiKey
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error Gemini API:', {
                status: response.status,
                statusText: response.statusText,
                error: errorText
            });
            
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.candidates || 
            !data.candidates[0] || 
            !data.candidates[0].content ||
            !data.candidates[0].content.parts ||
            !data.candidates[0].content.parts[0]) {
            console.error('Respuesta inválida de Gemini:', data);
            throw new Error('Respuesta inválida de la API');
        }
        
        return data.candidates[0].content.parts[0].text;
    }
    
    // Procesar mensaje para extraer información del pedido
    async processOrderFromMessage(userMessage, aiResponse) {
        const lowerMessage = userMessage.toLowerCase();
        
        // Detectar productos en el mensaje (solo si son específicos)
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
            
            // Verificar si el mensaje contiene el nombre completo del producto
            if (lowerMessage.includes(productNameLower)) {
                let quantity = 1;
                const quantityMatch = message.match(/(\d+)\s*/);
                if (quantityMatch) {
                    quantity = parseInt(quantityMatch[1]);
                }
                
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
        
        // Detectar teléfono
        const phoneMatch = userMessage.match(/(\d{8,15})/);
        if (phoneMatch) {
            this.currentOrder.customerInfo.telefono = phoneMatch[1];
        }
        
        // Detectar nombre
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
        
        // Solo mostrar menú en el primer mensaje
        if (this.conversationHistory.length <= 2 && 
            (lowerMessage.includes('hola') || lowerMessage.includes('buenas'))) {
            return `¡Hola! 👋 Soy la atención de EL TACHI.\n\n${this.generateSimpleMenu()}\n\nTiempo estimado: ${this.settings.tiempo_base_estimado} minutos\nEnvío: $${this.settings.precio_envio}\nRetiro: ${this.settings.retiro_habilitado ? 'Sí' : 'No'}\n\nSi necesitás cambiar algo del pedido, avisame.`;
        }
        
        if (lowerMessage.includes('menu') || lowerMessage.includes('carta')) {
            return this.generateSimpleMenu();
        }
        
        // Verificar si pide un producto genérico
        const categories = this.getCategoriesFromMessage(lowerMessage);
        if (categories.length > 0) {
            for (const category of categories) {
                const productsInCategory = this.getProductsByCategory(category);
                if (productsInCategory.length > 1) {
                    let clarificationText = `¿Cuál ${category} querés? Tenemos:\n`;
                    productsInCategory.forEach(product => {
                        clarificationText += `- ${product.nombre}: $${product.precio}\n`;
                    });
                    this.pendingClarification = { category: category };
                    return clarificationText;
                } else if (productsInCategory.length === 1) {
                    // Si solo hay un producto en la categoría, agregarlo automáticamente
                    const product = productsInCategory[0];
                    this.addToOrder({
                        productId: product.id,
                        nombre: product.nombre,
                        precio: product.precio,
                        cantidad: 1,
                        modificaciones: null
                    });
                    return `Perfecto, ${product.nombre}. ¿Algo más?`;
                }
            }
        }
        
        const productResponse = this.getProductResponse(lowerMessage);
        if (productResponse) {
            return productResponse;
        }
        
        if (lowerMessage.includes('nada más') || lowerMessage.includes('eso es todo') || 
            lowerMessage.includes('listo')) {
            
            if (this.currentOrder.items.length === 0) {
                return 'No tengo ningún producto en tu pedido. ¿Qué te gustaría ordenar?';
            }
            
            const summary = this.generateOrderSummaryText();
            return `*RESUMEN DE PEDIDO*\n\n${summary}\n\n¿Es para envío o retiro?`;
        }
        
        if (lowerMessage.includes('envío') || lowerMessage.includes('domicilio')) {
            this.currentOrder.deliveryType = 'envío';
            return 'Perfecto, para envío a domicilio. ¿Me podrías dar tu nombre, teléfono y dirección completa?';
        }
        
        if (lowerMessage.includes('retiro') || lowerMessage.includes('local')) {
            this.currentOrder.deliveryType = 'retiro';
            return 'Perfecto, para retiro en el local. ¿Me podrías dar tu nombre y teléfono?';
        }
        
        if (lowerMessage.includes('sí') || lowerMessage.includes('si') || 
            lowerMessage.includes('confirm') || lowerMessage.includes('correcto')) {
            
            if (this.conversationStage === 'confirming') {
                this.saveOrderToFirebase().then(orderId => {
                    console.log('Pedido guardado:', orderId);
                }).catch(error => {
                    console.error('Error guardando pedido:', error);
                });
                
                return `Perfecto, ya registré tu pedido. En un momento te doy el número de seguimiento.`;
            }
        }
        
        // Respuesta genérica mejorada
        if (this.currentOrder.items.length > 0) {
            return '¿Algo más que quieras agregar a tu pedido?';
        } else {
            return '¿Qué te gustaría ordenar?';
        }
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
                menu += `• ${product.nombre} - $${product.precio}`;
                if (product.descripcion) {
                    menu += ` (${product.descripcion})`;
                }
                menu += `\n`;
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
        const orderId = await this.generateOrderId();
        
        // Calcular total con envío si corresponde
        let total = this.currentOrder.total;
        let tipoPedido = this.currentOrder.deliveryType || 'retiro';
        
        if (tipoPedido === 'envío') {
            total += this.settings.precio_envio || 0;
        }
        
        const orderData = {
            id_pedido: orderId,
            fecha: firebase.firestore.FieldValue.serverTimestamp(),
            nombre_cliente: this.currentOrder.customerInfo?.nombre || 'Cliente',
            telefono: this.currentOrder.customerInfo?.telefono || '',
            tipo_pedido: tipoPedido,
            direccion: this.currentOrder.customerInfo?.direccion || '',
            pedido_detallado: this.generateOrderSummaryText(),
            total: total,
            estado: 'Recibido',
            tiempo_estimado_actual: this.settings.tiempo_base_estimado || 30,
            items: this.currentOrder.items.map(item => ({
                productId: item.productId,
                nombre: item.nombre,
                precio: item.precio,
                cantidad: item.cantidad,
                modificaciones: item.modificaciones
            }))
        };
        
        console.log('Guardando pedido en Firebase:', orderData);
        
        await this.db.collection('orders').doc(orderId).set(orderData);
        
        // Enviar notificación al panel admin (opcional)
        await this.sendAdminNotification(orderId, orderData.nombre_cliente, total);
        
        this.resetOrder();
        
        return orderId;
    } catch (error) {
        console.error('Error guardando pedido:', error);
        throw error;
    }
}

// Agrega esta función para notificaciones (opcional)
async sendAdminNotification(orderId, cliente, total) {
    try {
        await this.db.collection('notifications').add({
            tipo: 'nuevo_pedido',
            mensaje: `Nuevo pedido ${orderId} de ${cliente} por $${total}`,
            pedido_id: orderId,
            fecha: firebase.firestore.FieldValue.serverTimestamp(),
            leido: false
        });
    } catch (error) {
        console.error('Error enviando notificación:', error);
    }
}
    
    // Generar ID de pedido
async generateOrderId() {
    try {
        const counterRef = this.db.collection('counters').doc('orders');
        
        // Usar transacción para incrementar el contador de forma segura
        const result = await this.db.runTransaction(async (transaction) => {
            const counterDoc = await transaction.get(counterRef);
            let lastNumber = 0;
            
            if (counterDoc.exists) {
                lastNumber = counterDoc.data().lastNumber || 0;
            } else {
                // Si no existe, crear con 0
                transaction.set(counterRef, { lastNumber: 0 });
            }
            
            // Incrementar
            lastNumber++;
            transaction.update(counterRef, { lastNumber: lastNumber });
            
            return lastNumber;
        });
        
        const paddedNumber = result.toString().padStart(6, '0');
        return `TACHI-${paddedNumber}`;
    } catch (error) {
        console.error('Error generando ID de pedido:', error);
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
    
    // Limitar el tamaño del historial para no exceder tokens
    trimConversationHistory() {
        const maxHistory = 10; // Mantener solo los últimos 10 intercambios
        if (this.conversationHistory.length > maxHistory * 2) {
            this.conversationHistory = this.conversationHistory.slice(-maxHistory * 2);
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
        this.pendingClarification = null;
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

// Exportar para uso global
window.initConversationEngine = initConversationEngine;
window.processMessageWithGemini = processMessageWithGemini;
window.getCurrentOrderSummary = getCurrentOrderSummary;
window.resetConversation = resetConversation;
window.ConversationEngine = ConversationEngine;

// Inicializar cuando Firebase esté listo
if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
    setTimeout(async () => {
        await initConversationEngine();
    }, 1000);
}
