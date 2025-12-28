// Sistema completo para EL TACHI

class TachiChatManager {
    constructor() {
        this.conversation = [];
        this.currentOrder = {
            id: '',
            items: [],
            subtotal: 0,
            deliveryFee: 0,
            total: 0,
            customerName: '',
            customerPhone: '',
            deliveryType: '',
            address: '',
            specialInstructions: '',
            status: 'Recibido',
            estimatedTime: 40
        };
        
        this.conversationState = {
            isTakingOrder: false,
            isGettingCustomerData: false,
            orderConfirmed: false,
            waitingForAddress: false,
            step: 'welcome' // welcome, menu, order, summary, customer_data, complete
        };
        
        this.geminiModel = null;
        this.storeSettings = null;
        this.menuData = [];
        this.isStoreOpen = true;
        
        this.initialize();
    }
    
    async initialize() {
        console.log("🔄 Inicializando chat EL TACHI...");
        
        try {
            // 1. Cargar configuración de Gemini
            await this.loadGeminiConfig();
            
            // 2. Verificar horario del local
            await this.checkStoreStatus();
            
            // 3. Cargar menú
            await this.loadMenu();
            
            // 4. Configurar event listeners
            this.setupEventListeners();
            
            // 5. Mostrar mensaje de bienvenida si el local está abierto
            if (this.isStoreOpen) {
                await this.showWelcomeMessage();
            }
            
            console.log("✅ Chat inicializado correctamente");
            
        } catch (error) {
            console.error("❌ Error inicializando chat:", error);
            this.addMessage('ia', 
                "¡Hola! Soy la atención de **EL TACHI** 👋\n\n" +
                "Estoy teniendo problemas técnicos momentáneos. Por favor, " +
                "contactanos directamente al teléfono del local. ¡Disculpá las molestias!"
            );
        }
    }
    
    async loadGeminiConfig() {
        try {
            // Obtener API Key desde Firestore
            const settingsDoc = await window.firebaseApp.db
                .collection('settings')
                .doc('store_config')
                .get();
            
            if (settingsDoc.exists) {
                const settings = settingsDoc.data();
                this.storeSettings = settings;
                
                const apiKey = settings.gemini_api_key;
                
                if (!apiKey || apiKey === "AIzaSyBPRH8XZ0WfRMN9ZaPlVN_YaYvI9FTnkqU") {
                    throw new Error("API Key de Gemini no configurada");
                }
                
                // Configurar Google Generative AI
                // Nota: En producción, usarías el modelo específico (gemini-2.5-pro)
                // Por ahora usamos el disponible en la API pública
                const genAI = new googleGenerativeAI(apiKey);
                this.geminiModel = genAI.getGenerativeModel({ 
                    model: "gemini-1.5-pro", // Cambiar a "gemini-2.5-pro" cuando esté disponible
                    generationConfig: {
                        temperature: 0.7,
                        topP: 0.8,
                        topK: 40,
                        maxOutputTokens: 1024,
                    }
                });
                
                console.log("✅ Gemini configurado correctamente");
                return true;
            } else {
                throw new Error("Configuración no encontrada");
            }
        } catch (error) {
            console.error("Error cargando configuración Gemini:", error);
            throw error;
        }
    }
    
    async checkStoreStatus() {
        try {
            const hoursDoc = await window.firebaseApp.db
                .collection('settings')
                .doc('store_hours')
                .get();
            
            if (hoursDoc.exists) {
                const hours = hoursDoc.data();
                this.isStoreOpen = hours.abierto;
                
                if (!this.isStoreOpen) {
                    this.addMessage('ia', hours.mensaje_cerrado || 
                        "¡Hola! Soy la atención de **EL TACHI** 👋\n\n" +
                        "Lamento informarte que en este momento estamos cerrados.\n" +
                        "Nuestros horarios son:\n" +
                        "• Lunes a Viernes: 10:00 - 22:00\n" +
                        "• Sábados: 11:00 - 23:00\n" +
                        "• Domingos: Cerrado\n\n" +
                        "¡Te esperamos en nuestro horario de atención!");
                    
                    // Deshabilitar input
                    document.getElementById('userInput').disabled = true;
                    document.getElementById('sendButton').disabled = true;
                }
            }
        } catch (error) {
            console.error("Error verificando horario:", error);
            this.isStoreOpen = true; // Por defecto, permitir pedidos
        }
    }
    
    async loadMenu() {
        try {
            const productsSnapshot = await window.firebaseApp.db
                .collection('products')
                .where('disponible', '==', true)
                .orderBy('categoria')
                .orderBy('nombre')
                .get();
            
            this.menuData = [];
            productsSnapshot.forEach(doc => {
                this.menuData.push({ id: doc.id, ...doc.data() });
            });
            
            console.log(`✅ Menú cargado: ${this.menuData.length} productos`);
        } catch (error) {
            console.error("Error cargando menú:", error);
            this.menuData = [];
        }
    }
    
    setupEventListeners() {
        const sendButton = document.getElementById('sendButton');
        const userInput = document.getElementById('userInput');
        
        sendButton.addEventListener('click', () => this.sendMessage());
        
        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
        
        // Cargar conversación anterior
        this.loadPreviousConversation();
    }
    
    async showWelcomeMessage() {
        if (this.conversation.length === 0) {
            await this.generateGeminiResponse("", true);
        }
    }
    
    async sendMessage() {
        if (!this.isStoreOpen) return;
        
        const userInput = document.getElementById('userInput');
        const message = userInput.value.trim();
        
        if (!message) return;
        
        // Agregar mensaje del usuario
        this.addMessage('user', message);
        userInput.value = '';
        
        // Verificar si es consulta de pedido
        if (await this.handleOrderStatusQuery(message)) {
            return;
        }
        
        // Mostrar indicador de "escribiendo"
        this.showTypingIndicator();
        
        // Obtener respuesta de Gemini
        await this.generateGeminiResponse(message);
    }
    
    async handleOrderStatusQuery(message) {
        // Detectar si es un ID de pedido (formato TACHI-XXXXXX)
        const orderIdMatch = message.match(/TACHI-\d+/i);
        if (orderIdMatch) {
            const orderId = orderIdMatch[0].toUpperCase();
            await this.checkOrderStatus(orderId);
            return true;
        }
        
        // Detectar si pregunta por estado de pedido
        const statusKeywords = ['estado', 'pedido', 'tachi', 'número', 'seguimiento'];
        const hasKeyword = statusKeywords.some(keyword => 
            message.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (hasKeyword && message.match(/\d+/)) {
            const numbers = message.match(/\d+/g);
            if (numbers) {
                for (const num of numbers) {
                    if (num.length >= 3) { // Asumir que es parte de un ID
                        await this.checkOrderStatus(`TACHI-${num.padStart(6, '0')}`);
                        return true;
                    }
                }
            }
        }
        
        return false;
    }
    
    async checkOrderStatus(orderId) {
        this.removeTypingIndicator();
        
        try {
            const ordersQuery = await window.firebaseApp.db
                .collection('orders')
                .where('id_pedido', '==', orderId)
                .limit(1)
                .get();
            
            if (ordersQuery.empty) {
                this.addMessage('ia', 
                    `No encontré ningún pedido con el código **${orderId}**.\n\n` +
                    `¿Estás seguro del número? Podés revisarlo en el mensaje de confirmación ` +
                    `que te enviamos cuando hiciste el pedido.`
                );
                return;
            }
            
            const orderDoc = ordersQuery.docs[0];
            const order = orderDoc.data();
            
            // Formatear fecha
            let fechaStr = '';
            if (order.fecha && order.fecha.toDate) {
                const fecha = order.fecha.toDate();
                fechaStr = fecha.toLocaleDateString('es-AR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
            
            // Mapear estados a emojis
            const statusEmojis = {
                'Recibido': '📥',
                'En preparación': '👨‍🍳',
                'Listo': '✅',
                'Entregado': '🚚'
            };
            
            let statusMessage = 
                `**Pedido ${order.id_pedido}**\n` +
                `📅 ${fechaStr}\n` +
                `📋 **Estado:** ${statusEmojis[order.estado] || '📝'} ${order.estado}\n`;
            
            if (order.tiempo_estimado_actual) {
                statusMessage += `⏱ **Tiempo estimado:** ${order.tiempo_estimado_actual} minutos\n`;
            }
            
            if (order.tipo_pedido === 'envio' && order.direccion) {
                statusMessage += `📍 **Dirección:** ${order.direccion}\n`;
            }
            
            statusMessage += `\n**Detalles del pedido:**\n\`\`\`\n${order.pedido_detallado}\n\`\`\`\n`;
            statusMessage += `💰 **Total:** $${order.total}\n\n`;
            
            if (order.estado === 'Recibido') {
                statusMessage += "Tu pedido fue recibido y pronto comenzaremos con la preparación. ¡Gracias!";
            } else if (order.estado === 'En preparación') {
                statusMessage += `Tu pedido está siendo preparado. Estará listo en aproximadamente ${order.tiempo_estimado_actual || 40} minutos.`;
            } else if (order.estado === 'Listo') {
                statusMessage += "¡Tu pedido está listo! ";
                if (order.tipo_pedido === 'retiro') {
                    statusMessage += "Podés pasar a retirarlo por el local.";
                } else {
                    statusMessage += "Nuestro repartidor está en camino.";
                }
            } else if (order.estado === 'Entregado') {
                statusMessage += "¡Pedido entregado! Esperamos que lo hayas disfrutado. ¡Gracias por elegirnos!";
            }
            
            this.addMessage('ia', statusMessage);
            
        } catch (error) {
            console.error("Error consultando estado:", error);
            this.addMessage('ia', 
                "Hubo un error al consultar el estado del pedido. " +
                "¿Podés verificarlo directamente por WhatsApp o teléfono? " +
                "Disculpá las molestias."
            );
        }
    }
    
    async generateGeminiResponse(userMessage, isInitial = false) {
        try {
            // Preparar contexto para Gemini
            const context = this.buildGeminiContext(userMessage, isInitial);
            
            // Generar prompt completo
            const prompt = this.buildGeminiPrompt(context);
            
            // Generar respuesta
            const result = await this.geminiModel.generateContent(prompt);
            const response = await result.response;
            const responseText = response.text();
            
            // Procesar respuesta
            await this.processGeminiResponse(responseText, userMessage);
            
        } catch (error) {
            console.error("Error generando respuesta Gemini:", error);
            this.handleGeminiError(error);
        } finally {
            this.removeTypingIndicator();
        }
    }
    
    buildGeminiContext(userMessage, isInitial) {
        // Formatear menú para Gemini
        let menuText = "";
        const categories = {};
        
        this.menuData.forEach(item => {
            if (!categories[item.categoria]) {
                categories[item.categoria] = [];
            }
            categories[item.categoria].push(item);
        });
        
        Object.keys(categories).forEach(category => {
            menuText += `\n## ${category.toUpperCase()}\n`;
            categories[category].forEach(item => {
                menuText += `- **${item.nombre}**: $${item.precio}`;
                if (item.descripcion) {
                    menuText += ` - ${item.descripcion}`;
                }
                menuText += "\n";
            });
        });
        
        // Formatear información del local
        const deliveryPrice = this.storeSettings?.precio_envio || 300;
        const estimatedTime = this.storeSettings?.tiempo_base_estimado || 40;
        const pickupEnabled = this.storeSettings?.retiro_habilitado !== false;
        
        const storeInfo = 
            `**Nombre del local:** EL TACHI\n` +
            `**Precio de envío:** $${deliveryPrice}\n` +
            `**Tiempo estimado:** ${estimatedTime} minutos\n` +
            `**Retiro en local:** ${pickupEnabled ? 'Sí, sin costo' : 'No disponible'}\n`;
        
        // Estado actual del pedido
        let orderSummary = "";
        if (this.currentOrder.items.length > 0) {
            orderSummary = "**PEDIDO ACTUAL:**\n";
            this.currentOrder.items.forEach((item, index) => {
                orderSummary += `${index + 1}. ${item.quantity}x ${item.name}`;
                if (item.modifications) {
                    orderSummary += ` (${item.modifications})`;
                }
                orderSummary += ` - $${item.price * item.quantity}\n`;
            });
            orderSummary += `\n**Subtotal:** $${this.currentOrder.subtotal}`;
            if (this.currentOrder.deliveryType === 'envio') {
                orderSummary += `\n**Envío:** $${deliveryPrice}`;
            }
            orderSummary += `\n**Total:** $${this.currentOrder.total || this.currentOrder.subtotal + (this.currentOrder.deliveryType === 'envio' ? deliveryPrice : 0)}`;
        }
        
        // Historial de conversación (últimos 5 mensajes)
        const recentHistory = this.conversation.slice(-10).map(msg => 
            `${msg.role === 'user' ? 'CLIENTE' : 'VENDEDOR'}: ${msg.content}`
        ).join('\n');
        
        return {
            userMessage,
            isInitial,
            menu: menuText,
            storeInfo,
            currentOrder: orderSummary,
            conversationState: this.conversationState,
            conversationHistory: recentHistory,
            deliveryPrice,
            estimatedTime,
            pickupEnabled
        };
    }
    
    buildGeminiPrompt(context) {
        // PROMPT INTERNAL EXACTO - tal como lo especificaste
        const systemPrompt = `Sos la persona que atiende pedidos de la rotisería EL TACHI.

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
"Como asistente virtual…"
"Seleccioná una opción"
"Paso 1 / Paso 2"
Mensajes largos innecesarios

🧠 REGLA DE ORO (CRÍTICA)

NUNCA ofrezcas cambios de aderezos ni personalización si el cliente NO lo pregunta.

Esto es obligatorio.

✔️ Solo hablar de cambios si el cliente dice cosas como:
"¿Le puedo sacar…?"
"¿Qué trae?"
"Sin cebolla"
"¿Se puede cambiar…?"

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
NO preguntés "algo más para agregarle"

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

---

**INFORMACIÓN ACTUAL DEL LOCAL:**

${context.storeInfo}

**CARTA COMPLETA:**
${context.menu}

**ESTADO ACTUAL DE LA CONVERSACIÓN:**
${context.conversationState.step === 'welcome' ? 'Recién empieza la conversación' : ''}
${context.conversationState.isTakingOrder ? 'El cliente está haciendo un pedido' : ''}
${context.conversationState.orderConfirmed ? 'El cliente confirmó el pedido' : ''}
${context.conversationState.isGettingCustomerData ? 'Necesito pedir los datos del cliente' : ''}
${context.currentOrder ? context.currentOrder : 'No hay pedido en curso'}

**HISTORIAL RECIENTE:**
${context.conversationHistory}

**MENSAJE DEL CLIENTE:**
${context.userMessage || '(Cliente recién inicia la conversación)'}

**TUS INSTRUCCIONES:**
1. Seguí TODAS las reglas del prompt inicial
2. Respondé como un vendedor humano real
3. Si el cliente pide productos, agregalos al pedido actual
4. Si el cliente dice que ya no quiere más cosas, pasa al resumen
5. Si el cliente confirma el resumen, pedí los datos del cliente
6. Si el cliente confirma los datos, guardá el pedido en la base de datos
7. Siempre usá un tono natural y cercano
8. NO uses formato markdown complejo, solo negritas (**texto**) y saltos de línea`;

        return systemPrompt;
    }
    
    async processGeminiResponse(responseText, userMessage) {
        // Guardar en historial
        this.conversation.push({ role: 'user', content: userMessage });
        this.conversation.push({ role: 'assistant', content: responseText });
        
        // Mostrar respuesta al usuario
        this.addMessage('ia', responseText);
        
        // Analizar respuesta para detectar acciones
        await this.analyzeResponseForActions(responseText, userMessage);
        
        // Guardar conversación
        this.saveConversation();
    }
    
    async analyzeResponseForActions(responseText, userMessage) {
        const lowerResponse = responseText.toLowerCase();
        const lowerUserMessage = userMessage.toLowerCase();
        
        // Detectar si Gemini está pidiendo confirmación del pedido
        if (lowerResponse.includes('confirmamos así') || 
            lowerResponse.includes('¿está bien así?') ||
            lowerResponse.includes('te parece bien')) {
            
            this.conversationState.step = 'summary';
            this.showConfirmationButtons();
        }
        
        // Detectar si Gemini está pidiendo datos del cliente
        if (lowerResponse.includes('nombre') && 
            (lowerResponse.includes('teléfono') || lowerResponse.includes('telefono'))) {
            
            this.conversationState.step = 'customer_data';
            this.conversationState.isGettingCustomerData = true;
        }
        
        // Detectar si el cliente está haciendo un pedido
        if (lowerUserMessage.includes('quiero') || 
            lowerUserMessage.includes('dame') ||
            lowerUserMessage.includes('pedir') ||
            lowerUserMessage.includes('una') || 
            lowerUserMessage.includes('un ') ||
            lowerUserMessage.includes('dos') ||
            lowerUserMessage.includes('tres')) {
            
            this.conversationState.isTakingOrder = true;
            await this.extractOrderFromMessage(userMessage);
        }
        
        // Detectar confirmación del cliente
        if (lowerUserMessage.includes('sí') || 
            lowerUserMessage.includes('si ') ||
            lowerUserMessage.includes('confirmo') ||
            lowerUserMessage === 'si') {
            
            if (this.conversationState.step === 'summary') {
                this.conversationState.orderConfirmed = true;
            } else if (this.conversationState.step === 'customer_data') {
                await this.saveOrderToFirestore();
            }
        }
        
        // Detectar tipo de entrega
        if (lowerUserMessage.includes('envío') || lowerUserMessage.includes('envio')) {
            this.currentOrder.deliveryType = 'envio';
            this.currentOrder.deliveryFee = this.storeSettings?.precio_envio || 300;
        } else if (lowerUserMessage.includes('retiro') || lowerUserMessage.includes('retirar')) {
            this.currentOrder.deliveryType = 'retiro';
            this.currentOrder.deliveryFee = 0;
        }
        
        // Extraer datos del cliente del mensaje
        if (this.conversationState.isGettingCustomerData) {
            this.extractCustomerDataFromMessage(userMessage);
        }
    }
    
    async extractOrderFromMessage(message) {
        try {
            // Aquí podrías usar Gemini para extraer structured data
            // Por ahora, hacemos una extracción simple
            
            // Buscar números y productos
            const products = this.menuData.map(p => p.nombre.toLowerCase());
            
            products.forEach(productName => {
                const regex = new RegExp(`(\\d+)\\s*${productName}|${productName}\\s*(\\d+)`, 'i');
                const match = message.match(regex);
                
                if (match) {
                    const quantity = match[1] || match[2] || 1;
                    const product = this.menuData.find(p => 
                        p.nombre.toLowerCase() === productName.toLowerCase()
                    );
                    
                    if (product) {
                        // Buscar modificaciones
                        let modifications = '';
                        if (message.includes('sin ')) {
                            const sinIndex = message.indexOf('sin ');
                            modifications = message.substring(sinIndex);
                        } else if (message.includes('con ')) {
                            const conIndex = message.indexOf('con ');
                            modifications = message.substring(conIndex);
                        }
                        
                        this.currentOrder.items.push({
                            id: product.id,
                            name: product.nombre,
                            quantity: parseInt(quantity),
                            price: product.precio,
                            modifications: modifications.trim()
                        });
                    }
                }
            });
            
            // Recalcular total
            this.recalculateOrderTotal();
            
        } catch (error) {
            console.error("Error extrayendo pedido:", error);
        }
    }
    
    extractCustomerDataFromMessage(message) {
        // Extraer nombre (asumir que lo primero que dice es el nombre)
        if (!this.currentOrder.customerName && message) {
            // Buscar "me llamo" o "soy"
            const nameMatch = message.match(/(?:me llamo|soy|nombre es)\s+([^\.,]+)/i);
            if (nameMatch) {
                this.currentOrder.customerName = nameMatch[1].trim();
            } else if (message.split(' ').length <= 3) {
                // Si el mensaje es corto, asumir que es el nombre
                this.currentOrder.customerName = message.trim();
            }
        }
        
        // Extraer teléfono
        const phoneMatch = message.match(/\b\d{8,15}\b/);
        if (phoneMatch && !this.currentOrder.customerPhone) {
            this.currentOrder.customerPhone = phoneMatch[0];
        }
        
        // Extraer dirección
        if (this.currentOrder.deliveryType === 'envio' && !this.currentOrder.address) {
            const addressKeywords = ['calle', 'avenida', 'av.', 'número', 'numero', 'nro', 'entre'];
            const hasAddressKeyword = addressKeywords.some(keyword => 
                message.toLowerCase().includes(keyword)
            );
            
            if (hasAddressKeyword || message.length > 30) {
                this.currentOrder.address = message;
            }
        }
    }
    
    recalculateOrderTotal() {
        this.currentOrder.subtotal = this.currentOrder.items.reduce(
            (sum, item) => sum + (item.price * item.quantity), 0
        );
        
        this.currentOrder.total = this.currentOrder.subtotal + this.currentOrder.deliveryFee;
    }
    
    async saveOrderToFirestore() {
        this.removeTypingIndicator();
        
        try {
            // Generar ID único
            const orderCount = await this.getOrderCount();
            const orderId = `TACHI-${(orderCount + 1).toString().padStart(6, '0')}`;
            this.currentOrder.id = orderId;
            
            // Crear texto detallado del pedido
            let orderDetails = "";
            this.currentOrder.items.forEach(item => {
                orderDetails += `${item.quantity}x ${item.name}`;
                if (item.modifications) {
                    orderDetails += ` (${item.modifications})`;
                }
                orderDetails += ` - $${item.price * item.quantity}\n`;
            });
            
            // Crear objeto del pedido
            const orderData = {
                id_pedido: orderId,
                fecha: firebase.firestore.FieldValue.serverTimestamp(),
                nombre_cliente: this.currentOrder.customerName,
                telefono: this.currentOrder.customerPhone,
                tipo_pedido: this.currentOrder.deliveryType,
                direccion: this.currentOrder.deliveryType === 'envio' ? this.currentOrder.address : '',
                pedido_detallado: orderDetails,
                subtotal: this.currentOrder.subtotal,
                envio: this.currentOrder.deliveryFee,
                total: this.currentOrder.total,
                estado: 'Recibido',
                tiempo_estimado_actual: this.storeSettings?.tiempo_base_estimado || 40,
                notas: this.currentOrder.specialInstructions
            };
            
            // Guardar en Firestore
            await window.firebaseApp.db
                .collection('orders')
                .doc(orderId)
                .set(orderData);
            
            // Mostrar confirmación
            this.addMessage('ia', 
                `**¡Pedido confirmado!** 🎉\n\n` +
                `**ID del pedido:** ${orderId}\n` +
                `**Estado:** Recibido\n` +
                `**Tiempo estimado:** ${orderData.tiempo_estimado_actual} minutos\n\n` +
                `Para consultar el estado de tu pedido, escribí: **${orderId}**\n\n` +
                `¡Gracias por elegir EL TACHI! 👨‍🍳`
            );
            
            // Reiniciar estado
            this.resetOrderState();
            
            // Enviar notificación al panel admin
            await this.notifyAdminNewOrder(orderId);
            
        } catch (error) {
            console.error("Error guardando pedido:", error);
            this.addMessage('ia', 
                "Hubo un error al guardar tu pedido. " +
                "¿Podés intentarlo de nuevo o contactarnos por teléfono? " +
                "Disculpá las molestias."
            );
        }
    }
    
    async getOrderCount() {
        try {
            const countSnapshot = await window.firebaseApp.db
                .collection('orders')
                .count()
                .get();
            
            return countSnapshot.data().count;
        } catch (error) {
            console.error("Error contando pedidos:", error);
            return 0;
        }
    }
    
    async notifyAdminNewOrder(orderId) {
        try {
            // Aquí podrías implementar notificaciones push
            // Por ahora, solo log
            console.log(`📦 Nuevo pedido: ${orderId}`);
        } catch (error) {
            console.error("Error notificando admin:", error);
        }
    }
    
    resetOrderState() {
        this.currentOrder = {
            id: '',
            items: [],
            subtotal: 0,
            deliveryFee: 0,
            total: 0,
            customerName: '',
            customerPhone: '',
            deliveryType: '',
            address: '',
            specialInstructions: '',
            status: 'Recibido',
            estimatedTime: 40
        };
        
        this.conversationState = {
            isTakingOrder: false,
            isGettingCustomerData: false,
            orderConfirmed: false,
            waitingForAddress: false,
            step: 'welcome'
        };
    }
    
    handleGeminiError(error) {
        console.error("Error de Gemini:", error);
        
        let errorMessage = 
            "Uy, hubo un problema técnico. ¿Podés repetir eso?\n\n";
        
        if (error.message.includes('API key')) {
            errorMessage += 
                "**Nota para el administrador:**\n" +
                "La API Key de Gemini no está configurada correctamente. " +
                "Por favor, configurala en el panel de administración.";
        } else if (error.message.includes('quota')) {
            errorMessage += 
                "Estamos teniendo mucha demanda en este momento. " +
                "¿Podés contactarnos por WhatsApp o teléfono?";
        } else {
            errorMessage += 
                "Si el problema persiste, contactanos por teléfono. " +
                "¡Disculpá las molestias!";
        }
        
        this.addMessage('ia', errorMessage);
    }
    
    // Métodos de UI
    addMessage(sender, text) {
        const chatMessages = document.getElementById('chatMessages');
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        // Formatear texto
        const formattedText = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\`\`\`(.*?)\`\`\`/gs, '<pre><code>$1</code></pre>')
            .replace(/\`(.*?)\`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
        
        messageDiv.innerHTML = formattedText;
        chatMessages.appendChild(messageDiv);
        
        // Scroll al final
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    showTypingIndicator() {
        const chatMessages = document.getElementById('chatMessages');
        
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message ia-message typing-indicator';
        typingDiv.id = 'typingIndicator';
        
        typingDiv.innerHTML = 
            '<div class="typing-dots">' +
            '<span></span><span></span><span></span>' +
            '</div>';
        
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    removeTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
    
    showConfirmationButtons() {
        const chatMessages = document.getElementById('chatMessages');
        
        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'confirmation-buttons';
        buttonsDiv.innerHTML = `
            <button class="confirm-btn" onclick="chatManager.userConfirmedOrder(true)">
                ✅ Sí, confirmar pedido
            </button>
            <button class="cancel-btn" onclick="chatManager.userConfirmedOrder(false)">
                ✏️ No, cambiar algo
            </button>
        `;
        
        chatMessages.appendChild(buttonsDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    userConfirmedOrder(confirmed) {
        if (confirmed) {
            this.addMessage('user', 'Sí, confirmo el pedido');
            this.conversationState.orderConfirmed = true;
            this.conversationState.step = 'customer_data';
            
            // Pedir datos del cliente
            setTimeout(() => {
                this.addMessage('ia', 
                    "¡Perfecto! Ahora necesito unos datos para terminar el pedido:\n\n" +
                    "1. ¿Cuál es tu **nombre**?\n" +
                    "2. ¿Tu **teléfono**?\n" +
                    "3. ¿Es para **envío** o **retiro** en el local?\n\n" +
                    "Si es para envío, también necesito la **dirección completa**."
                );
            }, 500);
        } else {
            this.addMessage('user', 'Quiero cambiar algo');
            this.addMessage('ia', 
                "Dale, decime qué querés cambiar. " +
                "Podés modificar cantidades, productos o pedir algo nuevo."
            );
        }
        
        // Remover botones
        const buttonsDiv = document.querySelector('.confirmation-buttons');
        if (buttonsDiv) {
            buttonsDiv.remove();
        }
    }
    
    saveConversation() {
        try {
            localStorage.setItem('tachi_chat_history', JSON.stringify(this.conversation));
            
            // Guardar también el estado actual del pedido
            localStorage.setItem('tachi_current_order', JSON.stringify({
                order: this.currentOrder,
                state: this.conversationState
            }));
        } catch (error) {
            console.error("Error guardando conversación:", error);
        }
    }
    
    loadPreviousConversation() {
        try {
            const savedConversation = localStorage.getItem('tachi_chat_history');
            if (savedConversation) {
                this.conversation = JSON.parse(savedConversation);
                
                // Mostrar últimos 10 mensajes
                this.conversation.slice(-10).forEach(msg => {
                    this.addMessage(msg.role === 'user' ? 'user' : 'ia', msg.content);
                });
            }
            
            // Cargar pedido en curso
            const savedOrder = localStorage.getItem('tachi_current_order');
            if (savedOrder) {
                const { order, state } = JSON.parse(savedOrder);
                this.currentOrder = order;
                this.conversationState = state;
            }
        } catch (error) {
            console.error("Error cargando conversación anterior:", error);
        }
    }
}

// Inicializar cuando la página cargue
let chatManager;

function initializeChat() {
    chatManager = new TachiChatManager();
    window.chatManager = chatManager;
}

// Exportar para uso global
window.TachiChatManager = TachiChatManager;
window.initializeChat = initializeChat;
