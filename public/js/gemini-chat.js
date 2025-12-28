// gemini-chat.js - Conversación 100% IA Gemini Pro 2.5
// EL TACHI - Sin menú por defecto, sin lógica de bot

class TachiAIChat {
    constructor() {
        this.conversation = [];
        this.isProcessing = false;
        this.geminiModel = null;
        this.geminiApiKey = '';
        this.hasFirebase = false;
        
        this.initialize();
    }
    
    async initialize() {
        console.log("🧠 Inicializando conversación IA pura...");
        
        try {
            // 1. Configurar listeners
            this.setupEventListeners();
            
            // 2. Cargar API Key
            await this.loadAPIKey();
            
            // 3. Inicializar Gemini
            await this.initializeGemini();
            
            // 4. Esperar primer mensaje del usuario
            this.readyForInput();
            
            console.log("✅ IA lista para conversación natural");
            
        } catch (error) {
            console.error("❌ Error inicializando IA:", error);
            this.showErrorMessage();
        }
    }
    
    async loadAPIKey() {
        // Intentar cargar API Key desde múltiples fuentes
        const sources = [
            () => {
                const key = localStorage.getItem('el_tachi_gemini_key');
                return key && key.length > 30 ? key : null;
            },
            () => {
                if (window.firebaseApp && window.firebaseApp.config) {
                    return window.firebaseApp.config.GEMINI_API_KEY;
                }
                return null;
            },
            async () => {
                if (firebase.firestore) {
                    try {
                        const db = firebase.firestore();
                        const config = await db.collection('settings').doc('gemini_config').get();
                        return config.exists ? config.data().api_key : null;
                    } catch (e) {
                        return null;
                    }
                }
                return null;
            }
        ];
        
        for (const source of sources) {
            try {
                const key = await (typeof source === 'function' ? source() : source);
                if (key && key.length > 30) {
                    this.geminiApiKey = key;
                    console.log("🔑 API Key cargada");
                    return;
                }
            } catch (error) {
                continue;
            }
        }
        
        throw new Error("No se encontró API Key de Gemini");
    }
    
    async initializeGemini() {
        if (!this.geminiApiKey) {
            throw new Error("API Key no disponible");
        }
        
        // Cargar SDK de Gemini
        await this.loadGeminiSDK();
        
        // Configurar modelo
        try {
            const genAI = new google.generativeAI(this.geminiApiKey);
            this.geminiModel = genAI.getGenerativeModel({ 
                model: "gemini-1.5-pro",
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.8,
                    topK: 40,
                    maxOutputTokens: 1500,
                }
            });
            
            // Probar la conexión con un prompt simple
            const testPrompt = "Responde solo con 'OK' si estás listo.";
            const testResult = await this.geminiModel.generateContent(testPrompt);
            const response = await testResult.response;
            
            if (response.text().includes('OK')) {
                console.log("✅ Gemini conectado y funcionando");
                return true;
            }
            
        } catch (error) {
            console.error("Error conectando con Gemini:", error);
            
            // Si es error de API Key, limpiar
            if (error.message.includes('API_KEY') || error.status === 403) {
                localStorage.removeItem('el_tachi_gemini_key');
            }
            
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
            script.src = 'https://cdn.jsdelivr.net/npm/@google/generative-ai@latest/dist/index.min.js';
            script.onload = resolve;
            script.onerror = () => reject(new Error('No se pudo cargar Gemini SDK'));
            document.head.appendChild(script);
        });
    }
    
    setupEventListeners() {
        const sendButton = document.getElementById('sendButton');
        const userInput = document.getElementById('userInput');
        
        if (sendButton) {
            sendButton.addEventListener('click', () => this.handleUserMessage());
        }
        
        if (userInput) {
            userInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleUserMessage();
                }
            });
        }
    }
    
    readyForInput() {
        const userInput = document.getElementById('userInput');
        const sendButton = document.getElementById('sendButton');
        
        if (userInput) {
            userInput.disabled = false;
            userInput.placeholder = "Escribe tu mensaje aquí...";
            userInput.focus();
        }
        
        if (sendButton) {
            sendButton.disabled = false;
        }
        
        // Mostrar mensaje inicial solo si no hay conversación
        if (this.conversation.length === 0) {
            this.showInitialGreeting();
        }
    }
    
    showInitialGreeting() {
        const greeting = "¡Hola! Soy la atención de **EL TACHI** 👋\n\n" +
                       "Estoy aquí para ayudarte con tu pedido. ¿En qué puedo asistirte?";
        
        this.addMessage('ia', greeting);
        this.conversation.push({ role: 'assistant', content: greeting });
    }
    
    async handleUserMessage() {
        if (this.isProcessing) return;
        
        const userInput = document.getElementById('userInput');
        const message = userInput.value.trim();
        
        if (!message) return;
        
        // Agregar mensaje del usuario
        this.addMessage('user', message);
        userInput.value = '';
        userInput.disabled = true;
        
        // Mostrar indicador de "escribiendo"
        this.showTypingIndicator();
        
        // Procesar con IA
        this.isProcessing = true;
        try {
            await this.processWithAI(message);
        } catch (error) {
            console.error("Error procesando mensaje:", error);
            this.showErrorMessage();
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
        
        // Construir contexto para la IA
        const context = await this.buildAIContext();
        
        // Construir prompt completo
        const prompt = this.buildAIPrompt(userMessage, context);
        
        // Llamar a Gemini
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
        
        // Si la respuesta indica que se guardó un pedido, actualizar UI
        this.checkForOrderConfirmation(responseText);
    }
    
    async buildAIContext() {
        const context = {
            store_info: {},
            menu_info: "",
            store_hours: "",
            recent_orders: []
        };
        
        // Intentar cargar información del local desde Firestore
        try {
            if (firebase.firestore) {
                const db = firebase.firestore();
                
                // Cargar información del local
                const storeDoc = await db.collection('settings').doc('store_config').get();
                if (storeDoc.exists) {
                    context.store_info = storeDoc.data();
                }
                
                // Cargar horarios
                const hoursDoc = await db.collection('settings').doc('store_hours').get();
                if (hoursDoc.exists) {
                    const hours = hoursDoc.data();
                    context.store_hours = `Abierto: ${hours.abierto ? 'Sí' : 'No'}`;
                    if (!hours.abierto) {
                        context.store_hours += ` - ${hours.mensaje_cerrado || 'Cerrado'}`;
                    }
                }
                
                // Cargar productos disponibles
                const productsSnapshot = await db.collection('products')
                    .where('disponible', '==', true)
                    .limit(20)
                    .get();
                
                if (!productsSnapshot.empty) {
                    let menuText = "Productos disponibles:\n";
                    productsSnapshot.forEach(doc => {
                        const product = doc.data();
                        menuText += `• ${product.nombre} - $${product.precio}`;
                        if (product.descripcion) {
                            menuText += ` (${product.descripcion})`;
                        }
                        menuText += "\n";
                    });
                    context.menu_info = menuText;
                }
                
                // Cargar pedidos recientes del usuario (si hay sesión)
                const lastOrder = localStorage.getItem('el_tachi_last_order');
                if (lastOrder) {
                    context.recent_orders = [JSON.parse(lastOrder)];
                }
            }
        } catch (error) {
            console.warn("No se pudo cargar contexto de Firestore:", error);
            // Continuar sin contexto de Firestore
        }
        
        return context;
    }
    
    buildAIPrompt(userMessage, context) {
        // PROMPT INTERNO EXACTO como especificaste
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

**INFORMACIÓN ACTUAL DEL LOCAL:**

${JSON.stringify(context.store_info, null, 2)}

**HORARIOS:**
${context.store_hours}

**CARTA ACTUAL:**
${context.menu_info || 'Cargando menú...'}

**HISTORIAL DE CONVERSACIÓN (últimos 4 mensajes):**
${this.getConversationHistory()}

**MENSAJE DEL CLIENTE:**
"${userMessage}"

**TU RESPUESTA (sigue TODAS las reglas anteriores, especialmente la regla de oro sobre aderezos):**`;
    }
    
    getConversationHistory() {
        if (this.conversation.length === 0) return "Sin historial previo.";
        
        const lastMessages = this.conversation.slice(-6);
        return lastMessages.map(msg => 
            `${msg.role === 'user' ? 'Cliente' : 'Vendedor'}: ${msg.content}`
        ).join('\n');
    }
    
    checkForOrderConfirmation(responseText) {
        // Detectar si la IA generó un ID de pedido
        const orderIdMatch = responseText.match(/TACHI-\d+/);
        if (orderIdMatch) {
            const orderId = orderIdMatch[0];
            localStorage.setItem('el_tachi_last_order', JSON.stringify({
                id: orderId,
                timestamp: new Date().toISOString(),
                confirmed: true
            }));
            
            console.log(`✅ Pedido registrado: ${orderId}`);
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
    
    addMessage(sender, text) {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        // Formatear texto manteniendo el formato de la IA
        const formattedText = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>')
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            .replace(/`([^`]+)`/g, '<code>$1</code>');
        
        messageDiv.innerHTML = formattedText;
        chatMessages.appendChild(messageDiv);
        
        // Scroll al final
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    saveConversation() {
        try {
            // Guardar solo los últimos 50 mensajes para no sobrecargar localStorage
            const recentMessages = this.conversation.slice(-50);
            localStorage.setItem('el_tachi_ai_conversation', JSON.stringify(recentMessages));
        } catch (error) {
            console.warn("Error guardando conversación:", error);
        }
    }
    
    loadConversation() {
        try {
            const saved = localStorage.getItem('el_tachi_ai_conversation');
            if (saved) {
                this.conversation = JSON.parse(saved);
                
                // Mostrar últimos 5 mensajes
                const lastMessages = this.conversation.slice(-5);
                lastMessages.forEach(msg => {
                    this.addMessage(msg.role === 'user' ? 'user' : 'ia', msg.content);
                });
            }
        } catch (error) {
            console.warn("Error cargando conversación:", error);
        }
    }
    
    showErrorMessage() {
        const errorMessage = 
            "Disculpá, estoy teniendo problemas técnicos momentáneos.\n\n" +
            "Podés contactarnos directamente:\n" +
            "📱 WhatsApp: [TU NÚMERO AQUÍ]\n" +
            "📞 Teléfono: [TU TELÉFONO AQUÍ]\n\n" +
            "¡Gracias por tu comprensión!";
        
        this.addMessage('ia', errorMessage);
        
        // Deshabilitar input
        const userInput = document.getElementById('userInput');
        const sendButton = document.getElementById('sendButton');
        
        if (userInput) userInput.disabled = true;
        if (sendButton) sendButton.disabled = true;
    }
}

// Inicializar cuando el DOM esté listo
function initializeAIChat() {
    window.tachiAI = new TachiAIChat();
}

// Hacer disponible globalmente
window.TachiAIChat = TachiAIChat;
window.initializeAIChat = initializeAIChat;

// Auto-inicialización
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAIChat);
} else {
    initializeAIChat();
}
