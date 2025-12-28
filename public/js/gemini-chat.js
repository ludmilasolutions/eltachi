// gemini-chat.js - Versión corregida con API Key protegida
class TachiChatManager {
    constructor() {
        this.conversation = [];
        this.currentOrder = {
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
        
        this.geminiModel = null;
        this.storeSettings = null;
        this.menuData = [];
        this.isStoreOpen = true;
        
        // Cargar configuración inicial
        this.loadInitialConfig();
        
        // Configurar event listeners después de un breve delay
        setTimeout(() => {
            this.setupEventListeners();
            this.initializeChat();
        }, 1000);
    }
    
    loadInitialConfig() {
        // Configuración por defecto
        this.storeSettings = {
            nombre_local: "EL TACHI",
            precio_envio: 300,
            tiempo_base_estimado: 40,
            retiro_habilitado: true
        };
        
        // Cargar menú por defecto
        this.menuData = this.getDefaultMenu();
    }
    
    getDefaultMenu() {
        return [
            {
                id: "hamburguesa-clasica",
                nombre: "Hamburguesa Clásica",
                descripcion: "Carne 150g, queso, lechuga, tomate, aderezo especial",
                precio: 1200,
                disponible: true,
                categoria: "Hamburguesas"
            },
            {
                id: "hamburguesa-doble",
                nombre: "Hamburguesa Doble",
                descripcion: "Doble carne, doble queso, panceta, cebolla crispy",
                precio: 1800,
                disponible: true,
                categoria: "Hamburguesas"
            },
            {
                id: "pizza-muzzarella",
                nombre: "Pizza Muzzarella",
                descripcion: "Clásica pizza con salsa de tomate y queso muzzarella",
                precio: 1500,
                disponible: true,
                categoria: "Pizzas"
            },
            {
                id: "coca-cola-500ml",
                nombre: "Coca-Cola 500ml",
                descripcion: "Gaseosa Coca-Cola 500ml",
                precio: 400,
                disponible: true,
                categoria: "Bebidas"
            },
            {
                id: "papas-fritas",
                nombre: "Papas Fritas",
                descripcion: "Porción de papas fritas crocantes",
                precio: 600,
                disponible: true,
                categoria: "Acompañamientos"
            }
        ];
    }
    
    async initializeChat() {
        console.log("🔄 Inicializando chat EL TACHI...");
        
        try {
            // 1. Intentar cargar Firebase si está disponible
            if (window.firebaseApp && window.firebaseApp.db) {
                await this.loadFirestoreData();
            }
            
            // 2. Verificar horario del local
            await this.checkStoreStatus();
            
            // 3. Configurar Gemini (si hay API Key)
            await this.setupGemini();
            
            // 4. Mostrar mensaje de bienvenida
            this.showWelcomeMessage();
            
            console.log("✅ Chat inicializado correctamente");
            
        } catch (error) {
            console.error("❌ Error inicializando chat:", error);
            this.showWelcomeMessage(); // Mostrar welcome de todas formas
        }
    }
    
    async loadFirestoreData() {
        try {
            // Cargar menú desde Firestore (sin ordenar para evitar índice)
            const productsSnapshot = await window.firebaseApp.db
                .collection('products')
                .where('disponible', '==', true)
                .get();
            
            if (!productsSnapshot.empty) {
                this.menuData = [];
                productsSnapshot.forEach(doc => {
                    this.menuData.push({ id: doc.id, ...doc.data() });
                });
                
                // Ordenar por categoría y nombre localmente
                this.menuData.sort((a, b) => {
                    if (a.categoria < b.categoria) return -1;
                    if (a.categoria > b.categoria) return 1;
                    if (a.nombre < b.nombre) return -1;
                    if (a.nombre > b.nombre) return 1;
                    return 0;
                });
                
                console.log(`✅ Menú cargado desde Firestore: ${this.menuData.length} productos`);
            }
            
        } catch (error) {
            console.warn("⚠️ Error cargando datos de Firestore:", error);
        }
    }
    
    async checkStoreStatus() {
        try {
            if (window.firebaseApp && window.firebaseApp.db) {
                const hoursDoc = await window.firebaseApp.db
                    .collection('settings')
                    .doc('store_hours')
                    .get();
                
                if (hoursDoc.exists) {
                    const hours = hoursDoc.data();
                    this.isStoreOpen = hours.abierto;
                    
                    if (!this.isStoreOpen) {
                        this.showStoreClosedMessage(hours.mensaje_cerrado);
                        return false;
                    }
                }
            }
            return true;
        } catch (error) {
            console.warn("⚠️ Error verificando horario:", error);
            return true; // Por defecto, abierto
        }
    }
    
    async setupGemini() {
        try {
            // Intentar cargar API Key de Firestore
            if (window.firebaseApp && window.firebaseApp.db) {
                const configDoc = await window.firebaseApp.db
                    .collection('settings')
                    .doc('store_config')
                    .get();
                
                if (configDoc.exists) {
                    const config = configDoc.data();
                    this.storeSettings = { ...this.storeSettings, ...config };
                    
                    // Verificar si hay API Key válida
                    if (config.gemini_api_key && 
                        config.gemini_api_key !== "AIzaSyBPRH8XZ0WfRMN9ZaPlVN_YaYvI9FTnkqU" &&
                        config.gemini_api_key.length > 30) {
                        
                        // Cargar SDK de Gemini dinámicamente
                        await this.loadGeminiSDK();
                        
                        // Inicializar Gemini con API Key
                        const genAI = new google.generativeAI(config.gemini_api_key);
                        this.geminiModel = genAI.getGenerativeModel({ 
                            model: "gemini-1.5-pro",
                            generationConfig: {
                                temperature: 0.7,
                                topP: 0.8,
                                topK: 40,
                                maxOutputTokens: 1024,
                            }
                        });
                        
                        console.log("✅ Gemini configurado correctamente");
                        return;
                    }
                }
            }
            
            // Si no hay API Key, usar modo simulado
            console.log("ℹ️ Usando modo conversacional sin Gemini");
            this.geminiModel = null;
            
        } catch (error) {
            console.warn("⚠️ Error configurando Gemini:", error);
            this.geminiModel = null;
        }
    }
    
    async loadGeminiSDK() {
        return new Promise((resolve, reject) => {
            // Verificar si ya está cargado
            if (typeof google !== 'undefined' && google.generativeAI) {
                resolve();
                return;
            }
            
            // Cargar SDK
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@google/generative-ai@0.1.2/dist/index.min.js';
            script.onload = resolve;
            script.onerror = () => {
                console.warn("⚠️ No se pudo cargar Gemini SDK");
                resolve(); // Continuar sin Gemini
            };
            document.head.appendChild(script);
        });
    }
    
    showWelcomeMessage() {
        if (this.conversation.length > 0) return;
        
        const localName = this.storeSettings.nombre_local || "EL TACHI";
        const deliveryPrice = this.storeSettings.precio_envio || 300;
        const estimatedTime = this.storeSettings.tiempo_base_estimado || 40;
        const pickupEnabled = this.storeSettings.retiro_habilitado !== false;
        
        let message = `¡Hola! Soy la atención de **${localName}** 👋\n\n`;
        
        // Agrupar por categorías
        const categories = {};
        this.menuData.forEach(item => {
            if (!categories[item.categoria]) {
                categories[item.categoria] = [];
            }
            categories[item.categoria].push(item);
        });
        
        // Mostrar menú ordenado
        Object.keys(categories).sort().forEach(category => {
            message += `**${category}:**\n`;
            categories[category].forEach(item => {
                message += `• **${item.nombre}** - $${item.precio}`;
                if (item.descripcion) {
                    message += `\n  ${item.descripcion}`;
                }
                message += "\n";
            });
            message += "\n";
        });
        
        message += `**⏰ Tiempo estimado:** ${estimatedTime} minutos\n`;
        message += `**🚚 Envío:** $${deliveryPrice}\n`;
        message += `**📍 Retiro:** ${pickupEnabled ? 'Sí, sin costo' : 'No disponible'}\n\n`;
        
        message += "Si necesitás cambiar algo del pedido, avisame.\n";
        message += "¿Qué te gustaría pedir?";
        
        this.conversationState.isTakingOrder = true;
        this.conversationState.step = 'menu';
        
        this.addMessage('ia', message);
    }
    
    showStoreClosedMessage(customMessage) {
        const message = customMessage || 
            "¡Hola! Soy la atención de **EL TACHI** 👋\n\n" +
            "Lamento informarte que en este momento estamos cerrados.\n\n" +
            "**Nuestros horarios:**\n" +
            "• Lunes a Viernes: 10:00 - 22:00\n" +
            "• Sábados: 11:00 - 23:00\n" +
            "• Domingos: Cerrado\n\n" +
            "¡Te esperamos en nuestro horario de atención!";
        
        this.addMessage('ia', message);
        
        // Deshabilitar input
        const userInput = document.getElementById('userInput');
        const sendButton = document.getElementById('sendButton');
        
        if (userInput) userInput.disabled = true;
        if (sendButton) sendButton.disabled = true;
    }
    
    setupEventListeners() {
        const sendButton = document.getElementById('sendButton');
        const userInput = document.getElementById('userInput');
        
        if (sendButton) {
            sendButton.addEventListener('click', () => this.sendMessage());
        }
        
        if (userInput) {
            userInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendMessage();
                }
            });
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
        
        // Mostrar "escribiendo"
        this.showTypingIndicator();
        
        // Procesar mensaje
        setTimeout(() => {
            this.processUserMessage(message);
            this.removeTypingIndicator();
        }, 1000);
    }
    
    async handleOrderStatusQuery(message) {
        // Buscar ID de pedido
        const orderIdMatch = message.toUpperCase().match(/TACHI-\d+/);
        if (orderIdMatch) {
            await this.showOrderStatus(orderIdMatch[0]);
            return true;
        }
        
        // Buscar número simple
        const numberMatch = message.match(/\d{6}/);
        if (numberMatch && message.toLowerCase().includes('pedido')) {
            await this.showOrderStatus(`TACHI-${numberMatch[0]}`);
            return true;
        }
        
        return false;
    }
    
    async showOrderStatus(orderId) {
        try {
            let order = null;
            
            // Buscar en localStorage
            const localOrders = JSON.parse(localStorage.getItem('el_tachi_orders') || '{}');
            if (localOrders[orderId]) {
                order = localOrders[orderId];
            }
            
            // Buscar en Firestore si hay conexión
            if (!order && window.firebaseApp && window.firebaseApp.db) {
                const orderDoc = await window.firebaseApp.db
                    .collection('orders')
                    .doc(orderId)
                    .get();
                
                if (orderDoc.exists) {
                    order = orderDoc.data();
                }
            }
            
            if (order) {
                this.showOrderDetails(orderId, order);
            } else {
                this.addMessage('ia', 
                    `No encontré ningún pedido con el código **${orderId}**.\n\n` +
                    `Verificá el número e intentá de nuevo.`
                );
            }
            
        } catch (error) {
            console.error("Error consultando pedido:", error);
            this.addMessage('ia', 
                "Hubo un error al consultar el pedido. " +
                "¿Podés intentarlo de nuevo o contactarnos por teléfono?"
            );
        }
    }
    
    showOrderDetails(orderId, order) {
        let fechaStr = 'Fecha no disponible';
        if (order.fecha) {
            const fecha = order.fecha.toDate ? order.fecha.toDate() : new Date(order.fecha);
            fechaStr = fecha.toLocaleDateString('es-AR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        
        const statusEmojis = {
            'Recibido': '📥',
            'En preparación': '👨‍🍳',
            'Listo': '✅',
            'Entregado': '🚚'
        };
        
        let message = 
            `**Pedido ${orderId}**\n` +
            `📅 ${fechaStr}\n` +
            `📋 **Estado:** ${statusEmojis[order.estado] || '📝'} ${order.estado}\n`;
        
        if (order.tiempo_estimado_actual) {
            message += `⏱ **Tiempo estimado:** ${order.tiempo_estimado_actual} minutos\n`;
        }
        
        if (order.tipo_pedido === 'envio' && order.direccion) {
            message += `📍 **Dirección:** ${order.direccion}\n`;
        }
        
        message += `\n**Detalles del pedido:**\n\`\`\`\n${order.pedido_detallado}\n\`\`\`\n`;
        message += `💰 **Total:** $${order.total}\n\n`;
        
        if (order.estado === 'Recibido') {
            message += "Tu pedido fue recibido y pronto comenzaremos con la preparación. ¡Gracias!";
        } else if (order.estado === 'En preparación') {
            message += `Tu pedido está siendo preparado. Estará listo en aproximadamente ${order.tiempo_estimado_actual || 40} minutos.`;
        } else if (order.estado === 'Listo') {
            message += "¡Tu pedido está listo! ";
            if (order.tipo_pedido === 'retiro') {
                message += "Podés pasar a retirarlo por el local.";
            } else {
                message += "Nuestro repartidor está en camino.";
            }
        } else if (order.estado === 'Entregado') {
            message += "¡Pedido entregado! Esperamos que lo hayas disfrutado. ¡Gracias por elegirnos!";
        }
        
        this.addMessage('ia', message);
    }
    
    processUserMessage(message) {
        const lowerMessage = message.toLowerCase();
        
        // Si hay Gemini, usarlo
        if (this.geminiModel) {
            this.processWithGemini(message);
        } else {
            this.processWithoutGemini(message);
        }
    }
    
    async processWithGemini(message) {
        try {
            // Construir prompt
            const prompt = this.buildGeminiPrompt(message);
            
            // Generar respuesta
            const result = await this.geminiModel.generateContent(prompt);
            const response = await result.response;
            const responseText = response.text();
            
            // Procesar respuesta
            this.addMessage('ia', responseText);
            this.analyzeGeminiResponse(responseText, message);
            
        } catch (error) {
            console.error("Error con Gemini:", error);
            // Fallback a procesamiento simple
            this.processWithoutGemini(message);
        }
    }
    
    buildGeminiPrompt(userMessage) {
        // PROMPT INTERNO EXACTO según especificaciones
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

---

**MENÚ DE EL TACHI:**
${this.formatMenuForGemini()}

**MENSAJE DEL CLIENTE:**
"${userMessage}"

**TU RESPUESTA (sigue todas las reglas anteriores):**`;

        return systemPrompt;
    }
    
    formatMenuForGemini() {
        let menuText = "";
        const categories = {};
        
        this.menuData.forEach(item => {
            if (!categories[item.categoria]) {
                categories[item.categoria] = [];
            }
            categories[item.categoria].push(item);
        });
        
        Object.keys(categories).sort().forEach(category => {
            menuText += `\n${category}:\n`;
            categories[category].forEach(item => {
                menuText += `- ${item.nombre}: $${item.precio}`;
                if (item.descripcion) {
                    menuText += ` (${item.descripcion})`;
                }
                menuText += "\n";
            });
        });
        
        return menuText;
    }
    
    analyzeGeminiResponse(responseText, userMessage) {
        // Analizar respuesta para detectar acciones
        const lowerResponse = responseText.toLowerCase();
        const lowerUserMessage = userMessage.toLowerCase();
        
        // Detectar confirmación de pedido
        if (lowerResponse.includes('confirmamos así') || lowerResponse.includes('¿está bien así?')) {
            this.conversationState.step = 'summary';
        }
        
        // Detectar que se están pidiendo datos
        if (lowerResponse.includes('nombre') && lowerResponse.includes('teléfono')) {
            this.conversationState.step = 'customer_data';
            this.conversationState.isGettingCustomerData = true;
        }
        
        // Extraer datos del cliente
        if (this.conversationState.isGettingCustomerData) {
            this.extractCustomerData(userMessage);
        }
    }
    
    extractCustomerData(message) {
        // Extraer nombre
        if (!this.currentOrder.customerName) {
            const nameMatch = message.match(/(?:me llamo|soy|nombre es)\s+([^,\.]+)/i);
            if (nameMatch) {
                this.currentOrder.customerName = nameMatch[1].trim();
            }
        }
        
        // Extraer teléfono
        if (!this.currentOrder.customerPhone) {
            const phoneMatch = message.match(/\b\d{8,15}\b/);
            if (phoneMatch) {
                this.currentOrder.customerPhone = phoneMatch[0];
            }
        }
        
        // Extraer tipo de entrega
        if (!this.currentOrder.deliveryType) {
            if (message.toLowerCase().includes('envío') || message.toLowerCase().includes('envio')) {
                this.currentOrder.deliveryType = 'envio';
                this.currentOrder.deliveryFee = this.storeSettings.precio_envio || 300;
            } else if (message.toLowerCase().includes('retiro')) {
                this.currentOrder.deliveryType = 'retiro';
                this.currentOrder.deliveryFee = 0;
            }
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
    
    processWithoutGemini(message) {
        const lowerMessage = message.toLowerCase();
        
        // Respuestas predefinidas
        if (this.conversationState.step === 'welcome' || lowerMessage.includes('hola')) {
            this.showWelcomeMessage();
            
        } else if (this.conversationState.isTakingOrder) {
            // Procesar pedido
            if (this.isOrderMessage(lowerMessage)) {
                this.addMessage('ia', `Perfecto, ${this.getProductDescription(message)}. ¿Algo más?`);
                
                // Agregar al pedido
                this.extractProductFromMessage(message);
                
                // Si el cliente dice que no quiere más
                if (lowerMessage.includes('no') && 
                   (lowerMessage.includes('más') || lowerMessage.includes('eso es todo'))) {
                    
                    this.showOrderSummary();
                }
            }
            
        } else if (this.conversationState.step === 'summary') {
            // Confirmar pedido
            if (this.isConfirmationMessage(lowerMessage)) {
                this.conversationState.orderConfirmed = true;
                this.conversationState.step = 'customer_data';
                
                this.addMessage('ia', 
                    "¡Perfecto! Ahora necesito unos datos para terminar el pedido:\n\n" +
                    "1. ¿Cuál es tu **nombre**?\n" +
                    "2. ¿Tu **teléfono**?\n" +
                    "3. ¿Es para **envío** o **retiro** en el local?\n\n" +
                    "Podés enviarme toda la información junta."
                );
            } else {
                this.addMessage('ia', "¿Querés cambiar algo del pedido?");
            }
            
        } else if (this.conversationState.step === 'customer_data') {
            // Procesar datos del cliente
            this.extractCustomerData(message);
            
            // Verificar si tenemos todos los datos
            if (this.currentOrder.customerName && this.currentOrder.customerPhone) {
                // Confirmar datos
                let confirmationMsg = 
                    `**Para confirmar:**\n` +
                    `👤 **Nombre:** ${this.currentOrder.customerName}\n` +
                    `📞 **Teléfono:** ${this.currentOrder.customerPhone}\n` +
                    `🚚 **Tipo:** ${this.currentOrder.deliveryType || 'Retiro'}\n`;
                
                if (this.currentOrder.deliveryType === 'envio' && this.currentOrder.address) {
                    confirmationMsg += `📍 **Dirección:** ${this.currentOrder.address}\n`;
                }
                
                confirmationMsg += `\n¿Está todo correcto?`;
                
                this.addMessage('ia', confirmationMsg);
            }
        }
    }
    
    isOrderMessage(message) {
        const orderKeywords = ['quiero', 'dame', 'pedir', 'una', 'un', 'dos', 'tres'];
        return orderKeywords.some(keyword => message.includes(keyword));
    }
    
    isConfirmationMessage(message) {
        return message.includes('sí') || 
               message === 'si' || 
               message.includes('confirm') ||
               message.includes('correcto');
    }
    
    getProductDescription(message) {
        // Buscar productos en el mensaje
        let description = "anoté tu pedido";
        
        this.menuData.forEach(product => {
            if (message.toLowerCase().includes(product.nombre.toLowerCase())) {
                description = `una ${product.nombre.toLowerCase()}`;
            }
        });
        
        return description;
    }
    
    extractProductFromMessage(message) {
        // Extraer producto del mensaje (simplificado)
        this.menuData.forEach(product => {
            if (message.toLowerCase().includes(product.nombre.toLowerCase())) {
                this.currentOrder.items.push({
                    id: product.id,
                    name: product.nombre,
                    quantity: 1,
                    price: product.precio,
                    modifications: ''
                });
                
                this.currentOrder.subtotal += product.precio;
                this.currentOrder.total = this.currentOrder.subtotal + this.currentOrder.deliveryFee;
            }
        });
    }
    
    showOrderSummary() {
        if (this.currentOrder.items.length === 0) {
            this.addMessage('ia', "No hay productos en el pedido. ¿Qué te gustaría pedir?");
            return;
        }
        
        let summary = "**RESUMEN DEL PEDIDO:**\n\n";
        
        this.currentOrder.items.forEach((item, index) => {
            summary += `${index + 1}. ${item.quantity}x ${item.name}`;
            if (item.modifications) {
                summary += ` (${item.modifications})`;
            }
            summary += ` - $${item.price * item.quantity}\n`;
        });
        
        summary += `\n**Subtotal:** $${this.currentOrder.subtotal}\n`;
        
        if (this.currentOrder.deliveryType === 'envio') {
            summary += `**Envío:** $${this.currentOrder.deliveryFee}\n`;
        }
        
        summary += `**Total:** $${this.currentOrder.total}\n\n`;
        summary += "¿Confirmamos así?";
        
        this.addMessage('ia', summary);
        this.conversationState.step = 'summary';
    }
    
    // Métodos de UI
    addMessage(sender, text) {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;
        
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
        if (!chatMessages) return;
        
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
}

// Inicializar chat
let chatManager;

function initializeChat() {
    chatManager = new TachiChatManager();
    window.chatManager = chatManager;
}
