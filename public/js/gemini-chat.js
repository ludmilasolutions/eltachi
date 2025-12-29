// gemini-chat.js - Conversación 100% IA Gemini
// Sin menú por defecto, solo IA pura

class TachiChatManager {
    constructor() {
        this.conversation = [];
        this.isProcessing = false;
        this.geminiModel = null;
        this.storeSettings = null;
        this.isStoreOpen = true;
        
        this.initialize();
    }
    
    async initialize() {
        console.log("🧠 Inicializando IA pura para EL TACHI...");
        
        try {
            // 1. Configurar listeners
            this.setupEventListeners();
            
            // 2. Cargar configuración
            await this.loadConfiguration();
            
            // 3. Verificar horario
            await this.checkStoreHours();
            
            // 4. Configurar Gemini
            await this.setupGemini();
            
            // 5. Mostrar saludo inicial
            this.showInitialGreeting();
            
            console.log("✅ IA inicializada correctamente");
            
        } catch (error) {
            console.error("❌ Error inicializando IA:", error);
            this.showErrorState();
        }
    }
    
    setupEventListeners() {
        const sendButton = document.getElementById('sendButton');
        const userInput = document.getElementById('userInput');
        
        if (sendButton) {
            sendButton.addEventListener('click', () => this.processUserMessage());
        }
        
        if (userInput) {
            userInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.processUserMessage();
                }
            });
        }
    }
    
    async loadConfiguration() {
        // Configuración básica
        this.storeSettings = {
            nombre_local: "EL TACHI",
            precio_envio: 300,
            tiempo_base_estimado: 40,
            retiro_habilitado: true
        };
    }
    
    async checkStoreHours() {
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
            return true;
        }
    }
    
    async setupGemini() {
        try {
            let apiKey = "";
            
            // Intentar obtener API Key de múltiples fuentes
            if (window.firebaseApp && window.firebaseApp.db) {
                const configDoc = await window.firebaseApp.db
                    .collection('settings')
                    .doc('store_config')
                    .get();
                
                if (configDoc.exists) {
                    const config = configDoc.data();
                    this.storeSettings = { ...this.storeSettings, ...config };
                    apiKey = config.gemini_api_key;
                }
            }
            
            // Si no hay API Key en Firestore, buscar en localStorage
            if (!apiKey || apiKey === "AIzaSyBPRH8XZ0WfRMN9ZaPlVN_YaYvI9FTnkqU") {
                const savedKey = localStorage.getItem('el_tachi_gemini_key');
                if (savedKey && savedKey.length > 30) {
                    apiKey = savedKey;
                }
            }
            
            // Si no hay API Key, no podemos continuar
            if (!apiKey || apiKey.length < 30) {
                console.warn("⚠️ No se encontró API Key de Gemini");
                throw new Error("API Key no configurada");
            }
            
            // Guardar API Key
            this.geminiApiKey = apiKey;
            
            // Cargar SDK de Gemini
            await this.loadGeminiSDK();
            
            // Configurar modelo
            const genAI = new google.generativeAI(apiKey);
            this.geminiModel = genAI.getGenerativeModel({ 
                model: "gemini-1.5-pro",
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.8,
                    topK: 40,
                    maxOutputTokens: 1500,
                }
            });
            
            console.log("✅ Gemini configurado correctamente");
            
        } catch (error) {
            console.error("❌ Error configurando Gemini:", error);
            throw error;
        }
    }
    
    async loadGeminiSDK() {
        return new Promise((resolve, reject) => {
            if (typeof google !== 'undefined' && google.generativeAI) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@google/generative-ai@0.1.2/dist/index.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    showInitialGreeting() {
        const greeting = 
            "¡Hola! Soy la atención de **EL TACHI** 👋\n\n" +
            "Estoy aquí para ayudarte con tu pedido.\n\n" +
            "¿En qué puedo asistirte?";
        
        this.addMessage('ia', greeting);
        this.conversation.push({ role: 'assistant', content: greeting });
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
        
        const userInput = document.getElementById('userInput');
        const sendButton = document.getElementById('sendButton');
        
        if (userInput) userInput.disabled = true;
        if (sendButton) sendButton.disabled = true;
    }
    
    showErrorState() {
        const errorMessage = 
            "¡Hola! Soy la atención de **EL TACHI** 👋\n\n" +
            "Por el momento, nuestro sistema de IA no está disponible.\n\n" +
            "Podés contactarnos directamente:\n" +
            "📱 WhatsApp: [TU NÚMERO AQUÍ]\n" +
            "📞 Teléfono: [TU TELÉFONO AQUÍ]\n\n" +
            "¡Disculpá las molestias!";
        
        this.addMessage('ia', errorMessage);
        
        const userInput = document.getElementById('userInput');
        const sendButton = document.getElementById('sendButton');
        
        if (userInput) userInput.disabled = true;
        if (sendButton) sendButton.disabled = true;
    }
    
    async processUserMessage() {
        if (this.isProcessing || !this.isStoreOpen) return;
        
        const userInput = document.getElementById('userInput');
        const message = userInput.value.trim();
        
        if (!message) return;
        
        // Agregar mensaje del usuario
        this.addMessage('user', message);
        userInput.value = '';
        userInput.disabled = true;
        
        // Mostrar "escribiendo"
        this.showTypingIndicator();
        
        // Procesar con IA
        this.isProcessing = true;
        try {
            await this.processWithAI(message);
        } catch (error) {
            console.error("Error procesando mensaje:", error);
            this.addMessage('ia', "Uy, hubo un error. ¿Podés repetir eso?");
        } finally {
            this.isProcessing = false;
            this.removeTypingIndicator();
            userInput.disabled = false;
            userInput.focus();
        }
    }
    
    async processWithAI(userMessage) {
        if (!this.geminiModel) {
            throw new Error("Gemini no está disponible");
        }
        
        // Verificar si es consulta de estado
        if (await this.handleStatusQuery(userMessage)) {
            return;
        }
        
        // Construir contexto completo
        const context = await this.buildContext();
        
        // Construir prompt para Gemini
        const prompt = this.buildAIPrompt(userMessage, context);
        
        // Generar respuesta
        const result = await this.geminiModel.generateContent(prompt);
        const response = await result.response;
        const responseText = response.text();
        
        // Mostrar respuesta
        this.addMessage('ia', responseText);
        
        // Guardar en historial
        this.conversation.push({ role: 'user', content: userMessage });
        this.conversation.push({ role: 'assistant', content: responseText });
        
        // Guardar conversación
        this.saveConversation();
    }
    
    async handleStatusQuery(message) {
        // Detectar ID de pedido
        const orderIdMatch = message.match(/TACHI-\d+/i);
        if (orderIdMatch) {
            const orderId = orderIdMatch[0].toUpperCase();
            await this.showOrderStatus(orderId);
            return true;
        }
        
        return false;
    }
    
    async showOrderStatus(orderId) {
        this.removeTypingIndicator();
        
        try {
            let order = null;
            
            // Buscar en localStorage
            const localOrders = JSON.parse(localStorage.getItem('el_tachi_orders') || '{}');
            if (localOrders[orderId]) {
                order = localOrders[orderId];
            }
            
            // Buscar en Firestore
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
                    `Verificá el número o contactanos directamente.`
                );
            }
            
        } catch (error) {
            console.error("Error consultando pedido:", error);
            this.addMessage('ia', "Hubo un error al consultar el pedido.");
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
        
        message += `\n**Detalles del pedido:**\n\`\`\`\n${order.pedido_detallado}\n\`\`\`\n`;
        message += `💰 **Total:** $${order.total}\n\n`;
        
        this.addMessage('ia', message);
    }
    
    async buildContext() {
        const context = {
            store_info: {},
            current_time: new Date().toLocaleString('es-AR'),
            is_store_open: this.isStoreOpen
        };
        
        try {
            // Cargar configuración actualizada
            if (window.firebaseApp && window.firebaseApp.db) {
                const configDoc = await window.firebaseApp.db
                    .collection('settings')
                    .doc('store_config')
                    .get();
                
                if (configDoc.exists) {
                    context.store_info = configDoc.data();
                }
            }
        } catch (error) {
            console.warn("Error cargando contexto:", error);
        }
        
        return context;
    }
    
    buildAIPrompt(userMessage, context) {
        // PROMPT INTERNO EXACTO
        return `Eres la persona que atiende pedidos de la rotisería EL TACHI.

⚠️ NO eres un bot.
NO mencionas inteligencia artificial.
NO usas menús automáticos.
NO ofreces opciones si el cliente no las pide.

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
NO ofreces agregados
NO ofreces combos
NO ofreces cambios

Ejemplo correcto:
"Perfecto, una hamburguesa y unas papas."

Ejemplo incorrecto:
"¿La hamburguesa la querés completa?"

🧂 CAMBIOS Y ADEREZOS (SOLO SI EL CLIENTE LOS PIDE)

Si el cliente pide un cambio:
Confirmás exactamente lo que pidió
NO ofreces otros cambios
NO preguntas "algo más para agregarle"

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

**INFORMACIÓN DEL LOCAL:**
Nombre: ${context.store_info.nombre_local || "EL TACHI"}
Precio envío: $${context.store_info.precio_envio || 300}
Tiempo estimado: ${context.store_info.tiempo_base_estimado || 40} minutos
Retiro: ${context.store_info.retiro_habilitado !== false ? 'Disponible' : 'No disponible'}
Estado: ${context.is_store_open ? 'Abierto' : 'Cerrado'}

**HORA ACTUAL:**
${context.current_time}

**HISTORIAL RECIENTE:**
${this.getConversationHistory()}

**MENSAJE DEL CLIENTE:**
"${userMessage}"

**TU RESPUESTA (como vendedor humano, sigue TODAS las reglas anteriores):**`;
    }
    
    getConversationHistory() {
        if (this.conversation.length === 0) return "Sin historial previo.";
        
        return this.conversation
            .slice(-6)
            .map(msg => `${msg.role === 'user' ? 'Cliente' : 'Vendedor'}: ${msg.content}`)
            .join('\n');
    }
    
    // Métodos de UI
    addMessage(sender, text) {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const formattedText = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\`\`\`([\s\S]*?)\`\`\`/g, '<pre><code>$1</code></pre>')
            .replace(/\`(.*?)\`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
        
        messageDiv.innerHTML = formattedText;
        chatMessages.appendChild(messageDiv);
        
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    showTypingIndicator() {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;
        
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message ia-message typing-indicator';
        typingDiv.id = 'typingIndicator';
        
        typingDiv.innerHTML = '<span></span><span></span><span></span>';
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    removeTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
    
    saveConversation() {
        try {
            localStorage.setItem('el_tachi_conversation', JSON.stringify(this.conversation));
        } catch (error) {
            console.warn("Error guardando conversación:", error);
        }
    }
    
    loadSavedConversation() {
        try {
            const saved = localStorage.getItem('el_tachi_conversation');
            if (saved) {
                this.conversation = JSON.parse(saved);
                
                // Mostrar últimos 5 mensajes
                this.conversation.slice(-5).forEach(msg => {
                    this.addMessage(msg.role === 'user' ? 'user' : 'ia', msg.content);
                });
            }
        } catch (error) {
            console.warn("Error cargando conversación:", error);
        }
    }
}

// Inicializar
let chatManager;

function initializeChat() {
    chatManager = new TachiChatManager();
    window.chatManager = chatManager;
}

// Iniciar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeChat);
} else {
    initializeChat();
}
