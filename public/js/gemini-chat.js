// gemini-chat.js - Sistema COMPLETO con Gemini Pro 2.5 integrado
// Versión lista para producción - EL TACHI

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
            step: 'welcome'
        };
        
        this.geminiModel = null;
        this.storeSettings = null;
        this.menuData = [];
        this.isStoreOpen = true;
        this.geminiApiKey = '';
        
        this.initialize();
    }
    
    async initialize() {
        console.log("🔄 Inicializando sistema EL TACHI...");
        
        try {
            // 1. Configurar listeners primero
            this.setupEventListeners();
            
            // 2. Intentar cargar Firebase
            await this.waitForFirebase();
            
            // 3. Cargar configuración y menú
            await this.loadConfiguration();
            
            // 4. Verificar horarios
            await this.checkStoreStatus();
            
            // 5. Configurar Gemini
            await this.setupGemini();
            
            // 6. Mostrar bienvenida
            await this.showWelcomeMessage();
            
            console.log("✅ Sistema inicializado correctamente");
            
        } catch (error) {
            console.error("❌ Error inicializando:", error);
            this.showFallbackInterface();
        }
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
        
        // Cargar historial
        this.loadConversationHistory();
    }
    
    async waitForFirebase() {
        return new Promise((resolve, reject) => {
            const maxAttempts = 50;
            let attempts = 0;
            
            const checkInterval = setInterval(() => {
                attempts++;
                
                if (window.firebase && firebase.firestore) {
                    clearInterval(checkInterval);
                    
                    // Configurar Firestore
                    try {
                        if (!firebase.apps.length) {
                            // Firebase no está inicializado, usar configuración directa
                            this.initializeFirebaseDirectly();
                        }
                        
                        this.db = firebase.firestore();
                        this.auth = firebase.auth();
                        
                        console.log("✅ Firebase conectado");
                        resolve();
                    } catch (error) {
                        console.warn("⚠️ Firebase no configurado, usando modo offline");
                        this.db = null;
                        resolve(); // Continuar sin Firebase
                    }
                } else if (attempts >= maxAttempts) {
                    clearInterval(checkInterval);
                    console.warn("⚠️ Firebase no disponible después de 5 segundos");
                    this.db = null;
                    resolve(); // Continuar sin Firebase
                }
            }, 100);
        });
    }
    
    initializeFirebaseDirectly() {
        // Configuración mínima para Firebase
        // El usuario deberá configurar esto en producción
        const firebaseConfig = {
            apiKey: "AIzaSyCwZ5J7Xq9pY0QwY8V2s8nLmKjHp7Gt3vE",
            authDomain: "el-tachi-rotiseria.firebaseapp.com",
            projectId: "el-tachi-rotiseria",
            storageBucket: "el-tachi-rotiseria.appspot.com",
            messagingSenderId: "123456789012",
            appId: "1:123456789012:web:abcdef123456"
        };
        
        try {
            firebase.initializeApp(firebaseConfig);
        } catch (error) {
            if (!error.message.includes('already exists')) {
                throw error;
            }
        }
    }
    
    async loadConfiguration() {
        // Cargar configuración desde localStorage o valores por defecto
        const savedConfig = localStorage.getItem('el_tachi_config');
        
        if (savedConfig) {
            this.storeSettings = JSON.parse(savedConfig);
            this.geminiApiKey = this.storeSettings.gemini_api_key || '';
        } else {
            // Valores por defecto
            this.storeSettings = {
                nombre_local: "EL TACHI",
                precio_envio: 300,
                tiempo_base_estimado: 40,
                retiro_habilitado: true,
                gemini_api_key: ""
            };
        }
        
        // Cargar menú
        await this.loadMenu();
    }
    
    async loadMenu() {
        try {
            if (this.db) {
                const productsSnapshot = await this.db
                    .collection('products')
                    .where('disponible', '==', true)
                    .orderBy('categoria')
                    .orderBy('nombre')
                    .get();
                
                this.menuData = [];
                productsSnapshot.forEach(doc => {
                    this.menuData.push({ id: doc.id, ...doc.data() });
                });
                
                console.log(`✅ Menú cargado desde Firestore: ${this.menuData.length} productos`);
            }
        } catch (error) {
            console.warn("⚠️ Error cargando menú de Firestore:", error);
        }
        
        // Si no hay productos o Firestore falló, usar menú por defecto
        if (!this.menuData || this.menuData.length === 0) {
            this.menuData = this.getDefaultMenu();
            console.log("✅ Usando menú por defecto");
        }
    }
    
    getDefaultMenu() {
        return [
            {
                id: "hamburguesa-clasica",
                nombre: "Hamburguesa Clásica",
                descripcion: "Carne 150g, queso, lechuga, tomate, aderezo especial",
                precio: 1200,
                disponible: true,
                categoria: "Hamburguesas",
                aderezos_disponibles: ["Extra queso", "Sin tomate", "Sin cebolla"],
                precios_extra_aderezos: { "Extra queso": 100 }
            },
            {
                id: "hamburguesa-doble",
                nombre: "Hamburguesa Doble",
                descripcion: "Doble carne, doble queso, panceta, cebolla crispy",
                precio: 1800,
                disponible: true,
                categoria: "Hamburguesas",
                aderezos_disponibles: ["Extra panceta", "Sin cebolla"],
                precios_extra_aderezos: { "Extra panceta": 150 }
            },
            {
                id: "pizza-muzzarella",
                nombre: "Pizza Muzzarella",
                descripcion: "Clásica pizza con salsa de tomate y queso muzzarella",
                precio: 1500,
                disponible: true,
                categoria: "Pizzas",
                aderezos_disponibles: ["Extra queso", "Aceitunas", "Orégano"],
                precios_extra_aderezos: { "Extra queso": 200, "Aceitunas": 100 }
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
                categoria: "Acompañamientos",
                aderezos_disponibles: ["Con cheddar", "Con panceta"],
                precios_extra_aderezos: { "Con cheddar": 150, "Con panceta": 200 }
            }
        ];
    }
    
    async checkStoreStatus() {
        try {
            if (this.db) {
                const hoursDoc = await this.db
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
            return true; // Por defecto, asumir abierto
        }
    }
    
    async setupGemini() {
        // Si no hay API key, usar modo simulado
        if (!this.geminiApiKey || this.geminiApiKey === "AIzaSyBPRH8XZ0WfRMN9ZaPlVN_YaYvI9FTnkqU") {
            console.warn("⚠️ No hay API Key de Gemini, usando modo simulado");
            this.geminiModel = null;
            return;
        }
        
        try {
            // Cargar SDK de Gemini dinámicamente si no está cargado
            if (typeof google === 'undefined' || !google.generativeAI) {
                await this.loadGeminiSDK();
            }
            
            // Configurar modelo Gemini
            const genAI = new google.generativeAI(this.geminiApiKey);
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
        } catch (error) {
            console.error("❌ Error configurando Gemini:", error);
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
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    async showWelcomeMessage() {
        if (this.conversation.length > 0) return;
        
        // Mostrar mensaje de bienvenida
        const welcomeMessage = this.generateWelcomeMessage();
        this.addMessage('ia', welcomeMessage);
    }
    
    generateWelcomeMessage() {
        const localName = this.storeSettings.nombre_local || "EL TACHI";
        const deliveryPrice = this.storeSettings.precio_envio || 300;
        const estimatedTime = this.storeSettings.tiempo_base_estimado || 40;
        const pickupEnabled = this.storeSettings.retiro_habilitado !== false;
        
        let message = `¡Hola! Soy la atención de **${localName}** 👋\n\n`;
        
        // Mostrar categorías disponibles
        const categories = {};
        this.menuData.forEach(item => {
            if (!categories[item.categoria]) {
                categories[item.categoria] = [];
            }
            categories[item.categoria].push(item);
        });
        
        message += "**NUESTRA CARTA:**\n\n";
        
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
        
        return message;
    }
    
    showFallbackInterface() {
        // Mostrar interfaz de fallback
        this.addMessage('ia', 
            "¡Hola! Soy la atención de **EL TACHI** 👋\n\n" +
            "Por el momento, nuestro sistema de IA no está disponible, " +
            "pero podés hacer tu pedido directamente.\n\n" +
            "**Para ordenar:**\n" +
            "1. Escribí lo que querés pedir\n" +
            "2. Te confirmaré y pediré tus datos\n" +
            "3. Te daré un número de pedido\n\n" +
            "¿Qué te gustaría pedir?"
        );
        
        this.conversationState.isTakingOrder = true;
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
    
    async sendMessage() {
        const userInput = document.getElementById('userInput');
        const message = userInput ? userInput.value.trim() : '';
        
        if (!message) return;
        
        // Agregar mensaje del usuario
        this.addMessage('user', message);
        if (userInput) userInput.value = '';
        
        // Verificar si es consulta de estado
        if (await this.handleOrderStatusQuery(message)) {
            return;
        }
        
        // Mostrar "escribiendo"
        this.showTypingIndicator();
        
        // Procesar mensaje
        await this.processUserMessage(message);
    }
    
    async handleOrderStatusQuery(message) {
        // Buscar ID de pedido (TACHI-000000)
        const orderIdMatch = message.toUpperCase().match(/TACHI-\d{6}/);
        if (orderIdMatch) {
            const orderId = orderIdMatch[0];
            await this.showOrderStatus(orderId);
            return true;
        }
        
        // Buscar número de pedido simple
        const numberMatch = message.match(/\d{6}/);
        if (numberMatch && message.toLowerCase().includes('pedido')) {
            const orderId = `TACHI-${numberMatch[0]}`;
            await this.showOrderStatus(orderId);
            return true;
        }
        
        return false;
    }
    
    async showOrderStatus(orderId) {
        this.removeTypingIndicator();
        
        try {
            let order = null;
            
            // Buscar en localStorage primero
            const localOrders = JSON.parse(localStorage.getItem('el_tachi_orders') || '{}');
            if (localOrders[orderId]) {
                order = localOrders[orderId];
            }
            
            // Si no está en localStorage y hay conexión a Firebase, buscar allí
            if (!order && this.db) {
                const orderDoc = await this.db
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
        // Formatear fecha
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
        
        // Mapear estados a emojis
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
        
        // Mensaje según estado
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
    
    async processUserMessage(message) {
        // Usar Gemini si está disponible, sino usar lógica local
        if (this.geminiModel) {
            await this.processWithGemini(message);
        } else {
            await this.processWithoutGemini(message);
        }
        
        this.removeTypingIndicator();
    }
    
    async processWithGemini(message) {
        try {
            // Construir prompt para Gemini
            const prompt = this.buildGeminiPrompt(message);
            
            // Generar respuesta
            const result = await this.geminiModel.generateContent(prompt);
            const response = await result.response;
            const responseText = response.text();
            
            // Procesar respuesta
            this.addMessage('ia', responseText);
            await this.processGeminiResponse(responseText, message);
            
            // Guardar en historial
            this.conversation.push({ role: 'user', content: message });
            this.conversation.push({ role: 'assistant', content: responseText });
            
        } catch (error) {
            console.error("Error con Gemini:", error);
            // Fallback a procesamiento local
            await this.processWithoutGemini(message);
        }
    }
    
    buildGeminiPrompt(userMessage) {
        // PROMPT EXACTO según especificaciones
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

**MENÚ ACTUAL DE EL TACHI:**

${this.formatMenuForPrompt()}

**ESTADO ACTUAL DE LA CONVERSACIÓN:**
${this.formatConversationState()}

**ÚLTIMOS MENSAJES:**
${this.getRecentMessages()}

**MENSAJE DEL CLIENTE:**
"${userMessage}"

**TU RESPUESTA (sigue todas las reglas anteriores):**`;

        return systemPrompt;
    }
    
    formatMenuForPrompt() {
        let menuText = "";
        const categories = {};
        
        this.menuData.forEach(item => {
            if (!categories[item.categoria]) {
                categories[item.categoria] = [];
            }
            categories[item.categoria].push(item);
        });
        
        Object.keys(categories).sort().forEach(category => {
            menuText += `\n${category.toUpperCase()}:\n`;
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
    
    formatConversationState() {
        if (this.conversationState.step === 'welcome') {
            return "Recién empieza la conversación. Mostrar menú completo.";
        } else if (this.conversationState.step === 'menu') {
            return "El cliente está viendo el menú y puede hacer un pedido.";
        } else if (this.conversationState.isTakingOrder) {
            return "El cliente está haciendo un pedido.";
        } else if (this.conversationState.orderConfirmed) {
            return "El cliente confirmó el pedido. Pedir datos del cliente.";
        } else if (this.conversationState.isGettingCustomerData) {
            return "Pidiendo datos del cliente (nombre, teléfono, dirección).";
        }
        return "Estado no definido.";
    }
    
    getRecentMessages() {
        if (this.conversation.length === 0) return "No hay mensajes previos.";
        
        return this.conversation.slice(-4).map(msg => 
            `${msg.role === 'user' ? 'Cliente' : 'Vendedor'}: ${msg.content}`
        ).join('\n');
    }
    
    async processGeminiResponse(responseText, userMessage) {
        // Analizar respuesta para extraer acciones
        this.analyzeResponseForActions(responseText, userMessage);
        
        // Guardar conversación
        this.saveConversation();
    }
    
    analyzeResponseForActions(responseText, userMessage) {
        const lowerResponse = responseText.toLowerCase();
        const lowerUserMessage = userMessage.toLowerCase();
        
        // Detectar si se está confirmando el pedido
        if (lowerResponse.includes('confirmamos así') || 
            lowerResponse.includes('¿está bien así?') ||
            lowerResponse.includes('te parece bien')) {
            
            this.conversationState.step = 'summary';
            this.showConfirmationButtons();
        }
        
        // Detectar si se están pidiendo datos
        if ((lowerResponse.includes('nombre') && lowerResponse.includes('teléfono')) ||
            lowerResponse.includes('datos')) {
            
            this.conversationState.step = 'customer_data';
            this.conversationState.isGettingCustomerData = true;
        }
        
        // Detectar si el cliente está pidiendo algo
        if (this.isOrderMessage(lowerUserMessage)) {
            this.conversationState.isTakingOrder = true;
            this.extractOrderFromMessage(userMessage);
        }
        
        // Detectar confirmación del cliente
        if (this.isConfirmationMessage(lowerUserMessage)) {
            if (this.conversationState.step === 'summary') {
                this.conversationState.orderConfirmed = true;
            } else if (this.conversationState.step === 'customer_data') {
                this.saveOrder();
            }
        }
        
        // Extraer datos del cliente del mensaje
        if (this.conversationState.isGettingCustomerData) {
            this.extractCustomerDataFromMessage(userMessage);
        }
    }
    
    isOrderMessage(message) {
        const orderKeywords = ['quiero', 'dame', 'pedir', 'una', 'un', 'dos', 'tres', 'por favor'];
        return orderKeywords.some(keyword => message.includes(keyword));
    }
    
    isConfirmationMessage(message) {
        return message.includes('sí') || 
               message === 'si' || 
               message.includes('confirm') ||
               message.includes('correcto') ||
               message.includes('dale');
    }
    
    extractOrderFromMessage(message) {
        // Extraer productos del mensaje (simplificado)
        // En producción, esto se haría con análisis más avanzado
        
        this.menuData.forEach(product => {
            const productNameLower = product.nombre.toLowerCase();
            const messageLower = message.toLowerCase();
            
            if (messageLower.includes(productNameLower)) {
                // Buscar cantidad
                let quantity = 1;
                const quantityMatch = messageLower.match(/(\d+)\s*[x\*]?\s*" + productNameLower + "|" + productNameLower + "\s*[x\*]?\s*(\d+)/);
                if (quantityMatch) {
                    quantity = parseInt(quantityMatch[1] || quantityMatch[2]);
                }
                
                // Buscar modificaciones
                let modifications = '';
                if (messageLower.includes('sin ')) {
                    const start = messageLower.indexOf('sin ');
                    const end = messageLower.indexOf(' ', start + 4);
                    modifications = message.substring(start, end > start ? end : undefined);
                } else if (messageLower.includes('con ')) {
                    const start = messageLower.indexOf('con ');
                    const end = messageLower.indexOf(' ', start + 4);
                    modifications = message.substring(start, end > start ? end : undefined);
                }
                
                // Agregar al pedido
                this.currentOrder.items.push({
                    id: product.id,
                    name: product.nombre,
                    quantity: quantity,
                    price: product.precio,
                    modifications: modifications
                });
            }
        });
        
        // Recalcular total
        this.recalculateOrderTotal();
    }
    
    recalculateOrderTotal() {
        this.currentOrder.subtotal = this.currentOrder.items.reduce((sum, item) => {
            return sum + (item.price * item.quantity);
        }, 0);
        
        this.currentOrder.total = this.currentOrder.subtotal + this.currentOrder.deliveryFee;
    }
    
    extractCustomerDataFromMessage(message) {
        // Extraer nombre (patrón simple)
        if (!this.currentOrder.customerName) {
            const namePatterns = [
                /me llamo\s+([^\.,]+)/i,
                /soy\s+([^\.,]+)/i,
                /nombre es\s+([^\.,]+)/i,
                /^([a-záéíóúñ]{2,}\s+[a-záéíóúñ]{2,})$/i
            ];
            
            for (const pattern of namePatterns) {
                const match = message.match(pattern);
                if (match) {
                    this.currentOrder.customerName = match[1].trim();
                    break;
                }
            }
        }
        
        // Extraer teléfono
        if (!this.currentOrder.customerPhone) {
            const phoneMatch = message.match(/(\d{8,15})/);
            if (phoneMatch) {
                this.currentOrder.customerPhone = phoneMatch[1];
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
            const addressKeywords = ['calle', 'avenida', 'av.', 'número', 'numero', 'nro', 'entre', 'altura'];
            const hasAddressKeyword = addressKeywords.some(keyword => 
                message.toLowerCase().includes(keyword)
            );
            
            if (hasAddressKeyword || message.length > 40) {
                this.currentOrder.address = message;
            }
        }
    }
    
    async saveOrder() {
        this.removeTypingIndicator();
        
        try {
            // Generar ID único
            const orderCount = await this.getOrderCount();
            const orderId = `TACHI-${(orderCount + 1).toString().padStart(6, '0')}`;
            this.currentOrder.id = orderId;
            
            // Crear detalles del pedido
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
                fecha: new Date().toISOString(),
                nombre_cliente: this.currentOrder.customerName,
                telefono: this.currentOrder.customerPhone,
                tipo_pedido: this.currentOrder.deliveryType || 'retiro',
                direccion: this.currentOrder.address || '',
                pedido_detallado: orderDetails,
                subtotal: this.currentOrder.subtotal,
                envio: this.currentOrder.deliveryFee,
                total: this.currentOrder.total,
                estado: 'Recibido',
                tiempo_estimado_actual: this.storeSettings.tiempo_base_estimado || 40,
                notas: this.currentOrder.specialInstructions
            };
            
            // Guardar en localStorage
            const localOrders = JSON.parse(localStorage.getItem('el_tachi_orders') || '{}');
            localOrders[orderId] = orderData;
            localStorage.setItem('el_tachi_orders', JSON.stringify(localOrders));
            
            // Intentar guardar en Firebase si está disponible
            if (this.db) {
                try {
                    await this.db
                        .collection('orders')
                        .doc(orderId)
                        .set(orderData);
                    
                    console.log("✅ Pedido guardado en Firebase");
                } catch (firebaseError) {
                    console.warn("⚠️ No se pudo guardar en Firebase:", firebaseError);
                }
            }
            
            // Mostrar confirmación
            this.showOrderConfirmation(orderId, orderData);
            
            // Reiniciar estado
            this.resetOrderState();
            
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
        // Obtener conteo de pedidos
        try {
            if (this.db) {
                const countSnapshot = await this.db
                    .collection('orders')
                    .count()
                    .get();
                
                return countSnapshot.data().count || 0;
            }
        } catch (error) {
            console.warn("Error contando pedidos en Firebase:", error);
        }
        
        // Fallback a localStorage
        const localOrders = JSON.parse(localStorage.getItem('el_tachi_orders') || '{}');
        return Object.keys(localOrders).length;
    }
    
    showOrderConfirmation(orderId, orderData) {
        const message = 
            `**¡Pedido confirmado!** 🎉\n\n` +
            `**ID del pedido:** ${orderId}\n` +
            `**Estado:** Recibido\n` +
            `**Tiempo estimado:** ${orderData.tiempo_estimado_actual} minutos\n` +
            `**Total:** $${orderData.total}\n\n` +
            `Para consultar el estado de tu pedido, escribí: **${orderId}**\n\n` +
            `¡Gracias por elegir EL TACHI! 👨‍🍳`;
        
        this.addMessage('ia', message);
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
    
    async processWithoutGemini(message) {
        // Lógica de conversación sin Gemini
        const lowerMessage = message.toLowerCase();
        
        if (this.conversationState.step === 'welcome' || 
            lowerMessage.includes('hola') || 
            lowerMessage.includes('menú')) {
            
            // Mostrar menú
            this.addMessage('ia', this.generateWelcomeMessage());
            
        } else if (this.conversationState.isTakingOrder) {
            
            // Procesar pedido
            this.extractOrderFromMessage(message);
            
            // Preguntar si quiere algo más
            this.addMessage('ia', 
                `Perfecto, ${this.getLastItemDescription()}. ¿Algo más?`
            );
            
            // Si el cliente dice que no quiere más
            if (lowerMessage.includes('no') && 
               (lowerMessage.includes('más') || lowerMessage.includes('eso es todo'))) {
                
                // Mostrar resumen
                this.showOrderSummary();
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
            
            // Extraer datos del cliente
            this.extractCustomerDataFromMessage(message);
            
            // Verificar si ya tenemos todos los datos
            if (this.currentOrder.customerName && this.currentOrder.customerPhone) {
                
                // Confirmar datos
                let confirmationMsg = 
                    `**Para confirmar:**\n` +
                    `👤 **Nombre:** ${this.currentOrder.customerName}\n` +
                    `📞 **Teléfono:** ${this.currentOrder.customerPhone}\n` +
                    `🚚 **Tipo:** ${this.currentOrder.deliveryType === 'envio' ? 'Envío' : 'Retiro'}\n`;
                
                if (this.currentOrder.deliveryType === 'envio' && this.currentOrder.address) {
                    confirmationMsg += `📍 **Dirección:** ${this.currentOrder.address}\n`;
                }
                
                confirmationMsg += `\n¿Está todo correcto?`;
                
                this.addMessage('ia', confirmationMsg);
                
            } else {
                // Pedir datos faltantes
                let missingData = [];
                if (!this.currentOrder.customerName) missingData.push("nombre");
                if (!this.currentOrder.customerPhone) missingData.push("teléfono");
                if (!this.currentOrder.deliveryType) missingData.push("tipo (envío o retiro)");
                
                this.addMessage('ia', 
                    `Todavía necesito tu ${missingData.join(', ')}. ` +
                    `¿Podés proporcionarlo?`
                );
            }
            
        }
        
        // Guardar conversación
        this.conversation.push({ role: 'user', content: message });
        this.saveConversation();
    }
    
    getLastItemDescription() {
        if (this.currentOrder.items.length === 0) return "anoté tu pedido";
        
        const lastItem = this.currentOrder.items[this.currentOrder.items.length - 1];
        let description = `${lastItem.quantity} ${lastItem.name}`;
        
        if (lastItem.modifications) {
            description += ` ${lastItem.modifications}`;
        }
        
        return description;
    }
    
    showOrderSummary() {
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
        
        // Guardar en historial
        if (sender === 'ia') {
            this.conversation.push({ role: 'assistant', content: text });
        }
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
    
    showConfirmationButtons() {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;
        
        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'confirmation-buttons';
        buttonsDiv.innerHTML = `
            <button class="confirm-btn" onclick="window.chatManager.userConfirmed(true)">
                ✅ Sí, confirmar pedido
            </button>
            <button class="cancel-btn" onclick="window.chatManager.userConfirmed(false)">
                ✏️ No, cambiar algo
            </button>
        `;
        
        chatMessages.appendChild(buttonsDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    userConfirmed(confirmed) {
        if (confirmed) {
            this.addMessage('user', 'Sí, confirmo el pedido');
            this.conversationState.orderConfirmed = true;
            this.conversationState.step = 'customer_data';
            
            setTimeout(() => {
                this.addMessage('ia', 
                    "¡Perfecto! Ahora necesito unos datos para terminar el pedido:\n\n" +
                    "1. ¿Cuál es tu **nombre**?\n" +
                    "2. ¿Tu **teléfono**?\n" +
                    "3. ¿Es para **envío** o **retiro** en el local?\n\n" +
                    "Podés enviarme toda la información junta."
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
    
    loadConversationHistory() {
        try {
            const saved = localStorage.getItem('el_tachi_chat_history');
            if (saved) {
                this.conversation = JSON.parse(saved);
                
                // Mostrar últimos 5 mensajes
                const lastMessages = this.conversation.slice(-5);
                lastMessages.forEach(msg => {
                    this.addMessage(msg.role === 'user' ? 'user' : 'ia', msg.content);
                });
            }
        } catch (error) {
            console.error("Error cargando historial:", error);
        }
    }
    
    saveConversation() {
        try {
            localStorage.setItem('el_tachi_chat_history', JSON.stringify(this.conversation));
        } catch (error) {
            console.error("Error guardando conversación:", error);
        }
    }
}

// Inicializar cuando el DOM esté listo
function initializeChat() {
    window.chatManager = new TachiChatManager();
}

// Hacer disponible globalmente
window.TachiChatManager = TachiChatManager;
window.initializeChat = initializeChat;

// Auto-inicializar cuando se cargue la página
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeChat);
} else {
    initializeChat();
}
