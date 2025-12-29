// Estado global de la aplicación
const appState = {
    conversation: [],
    cart: [],
    currentOrder: null,
    isStoreOpen: true,
    settings: null,
    products: [],
    categories: [],
    geminiAPIKey: "",
    isProcessing: false,
    conversationEngineReady: false
};

// Elementos DOM
const chatContainer = document.getElementById('chatContainer');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const viewMenuButton = document.getElementById('viewMenuButton');
const initialLoading = document.getElementById('initialLoading');

// Inicializar aplicación
async function initializeApp() {
    try {
        // Verificar conexión Firebase
        const isConnected = await testFirebaseConnection();
        if (!isConnected) {
            showError("No se pudo conectar a la base de datos. Recarga la página.");
            return;
        }
        
        // Inicializar datos de Firebase
        await initializeFirebaseData();
        
        // Cargar configuración
        appState.settings = await getSettings();
        if (!appState.settings) {
            showError("Error cargando configuración");
            return;
        }
        
        // Verificar si el local está abierto
        appState.isStoreOpen = appState.settings.abierto;
        appState.geminiAPIKey = appState.settings.api_key_gemini;
        
        // Cargar productos y categorías
        await loadProductsAndCategories();
        
        // Inicializar motor de conversación híbrido
        await window.initHybridEngine();
        appState.conversationEngineReady = true;
        
        // Ocultar loading inicial
        if (initialLoading) {
            initialLoading.style.display = 'none';
        }
        
        // Mostrar mensaje inicial de la IA
        if (appState.isStoreOpen) {
            await showInitialIAMessage();
        } else {
            addMessageToChat('ai', appState.settings.mensaje_cerrado);
        }
        
        // Configurar eventos
        setupEventListeners();
        
        console.log("Aplicación inicializada correctamente");
    } catch (error) {
        console.error("Error inicializando app:", error);
        showError("Error al cargar la aplicación. Intenta recargar la página.");
    }
}

// Cargar productos y categorías
async function loadProductsAndCategories() {
    try {
        // Cargar productos
        const productsSnapshot = await db.collection('products')
            .where('disponible', '==', true)
            .get();
        
        appState.products = productsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // Cargar categorías
        const categoriesSnapshot = await db.collection('categories')
            .orderBy('orden')
            .get();
        
        appState.categories = categoriesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        console.log(`Cargados ${appState.products.length} productos y ${appState.categories.length} categorías`);
    } catch (error) {
        console.error("Error cargando productos:", error);
    }
}

// Mostrar mensaje inicial de la IA
async function showInitialIAMessage() {
    if (!appState.settings) return;
    
    // Usar el motor híbrido para generar el mensaje inicial
    try {
        const response = await window.processMessageHybrid("hola");
        addMessageToChat('ai', response);
        viewMenuButton.classList.add('show');
    } catch (error) {
        console.error("Error con el motor híbrido:", error);
        // Fallback a mensaje estático
        const fallbackMessage = `¡Hola! 👋 Soy la atención de *EL TACHI*.\n\n${showFullMenuText()}\n\n*Información importante:*\n⏰ Tiempo estimado: ${appState.settings.tiempo_base_estimado} minutos\n🚚 Envío a domicilio: $${appState.settings.precio_envio}\n${appState.settings.retiro_habilitado ? '🏪 Retiro en local: SIN CARGO\n' : ''}\n_Si necesitás cambiar algo del pedido, avisame_`;
        addMessageToChat('ai', fallbackMessage);
        viewMenuButton.classList.add('show');
    }
}

// Agrupar productos por categoría
function groupProductsByCategory() {
    return appState.products.reduce((acc, product) => {
        if (!acc[product.categoria]) {
            acc[product.categoria] = [];
        }
        acc[product.categoria].push(product);
        return acc;
    }, {});
}

// Configurar event listeners
function setupEventListeners() {
    // Enviar mensaje al hacer clic
    sendButton.addEventListener('click', sendMessage);
    
    // Enviar mensaje al presionar Enter
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Ver menú completo
    if (viewMenuButton) {
        viewMenuButton.addEventListener('click', showFullMenu);
    }
    
    // Auto-enfoque en el input
    messageInput.focus();
}

// Enviar mensaje del usuario
async function sendMessage() {
    const message = messageInput.value.trim();
    
    if (!message || appState.isProcessing) return;
    
    // Agregar mensaje del usuario al chat
    addMessageToChat('user', message);
    messageInput.value = '';
    
    // Procesar con la IA
    appState.isProcessing = true;
    sendButton.disabled = true;
    messageInput.disabled = true;
    
    try {
        // Detectar si es un ID de pedido (ej: TACHI-000123)
        if (message.match(/TACHI-\d{6}/i)) {
            await handleOrderStatusCheck(message.toUpperCase());
        } else {
            // Procesar con el motor híbrido
            await processWithHybrid(message);
        }
    } catch (error) {
        console.error("Error procesando mensaje:", error);
        addMessageToChat('ai', "Ups, hubo un error procesando tu mensaje. ¿Podrías intentarlo de nuevo?");
    } finally {
        appState.isProcessing = false;
        sendButton.disabled = false;
        messageInput.disabled = false;
        messageInput.focus();
    }
}

// Procesar mensaje con el motor híbrido
async function processWithHybrid(message) {
    // Verificar si el motor de conversación está listo
    if (!appState.conversationEngineReady) {
        addMessageToChat('ai', "El sistema de IA aún no está listo. Por favor, espera un momento.");
        return;
    }
    
    try {
        // Usar la función global para procesar con el motor híbrido
        const response = await window.processMessageHybrid(message);
        addMessageToChat('ai', response);
        
        // Si la respuesta incluye un resumen, mostrar botón de ver menú
        if (response.toLowerCase().includes('resumen') || response.toLowerCase().includes('pedido')) {
            viewMenuButton.classList.add('show');
        }
    } catch (error) {
        console.error("Error procesando con el motor híbrido:", error);
        
        // Fallback a respuestas básicas
        const fallbackResponse = await simulateFallbackResponse(message);
        addMessageToChat('ai', fallbackResponse);
    }
}

// Respuesta de fallback cuando el motor híbrido no funciona
async function simulateFallbackResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    // Simular delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    if (lowerMessage.includes('hola') || lowerMessage.includes('buenas')) {
        return '¡Hola! ¿En qué te puedo ayudar hoy?';
    } else if (lowerMessage.includes('menu') || lowerMessage.includes('carta')) {
        return showFullMenuText();
    } else if (lowerMessage.includes('hamburguesa')) {
        if (lowerMessage.includes('sin') || lowerMessage.includes('sin tomate') || lowerMessage.includes('sin cebolla')) {
            const change = lowerMessage.includes('sin tomate') ? 'sin tomate' : 'sin cebolla';
            return `Perfecto, hamburguesa ${change}. ¿Algo más?`;
        }
        return 'Perfecto, una hamburguesa. ¿Algo más?';
    } else if (lowerMessage.includes('papas')) {
        return 'Genial, papas fritas. ¿Algo más?';
    } else if (lowerMessage.includes('nada') || lowerMessage.includes('listo') || lowerMessage.includes('eso es todo')) {
        const summary = window.getCurrentOrderSummary ? window.getCurrentOrderSummary() : null;
        if (summary) {
            return `*RESUMEN DE PEDIDO*\n\n${summary}\n\n¿Es para envío o retiro?`;
        }
        return 'Perfecto. ¿Es para envío a domicilio o retiro en el local?';
    } else if (lowerMessage.includes('envío') || lowerMessage.includes('domicilio')) {
        return '¿Me podrías dar tu nombre, teléfono y dirección completa?';
    } else if (lowerMessage.includes('retiro') || lowerMessage.includes('local')) {
        return '¿Me podrías dar tu nombre y teléfono?';
    } else {
        return 'Entendido. ¿Algo más que quieras agregar al pedido?';
    }
}

// Mostrar menú completo como texto
function showFullMenuText() {
    if (appState.products.length === 0) {
        return '*NUESTRA CARTA*\n\nLos productos se están cargando...';
    }
    
    let menuText = '*NUESTRA CARTA COMPLETA*\n\n';
    const productsByCategory = groupProductsByCategory();
    
    // Mostrar por categorías ordenadas
    const sortedCategories = [...appState.categories].sort((a, b) => a.orden - b.orden);
    
    sortedCategories.forEach(category => {
        const products = productsByCategory[category.id];
        if (products && products.length > 0) {
            menuText += `*${category.nombre.toUpperCase()}*\n`;
            products.forEach(product => {
                menuText += `• ${product.nombre} - $${product.precio}\n`;
                if (product.descripcion) {
                    menuText += `  ${product.descripcion}\n`;
                }
            });
            menuText += `\n`;
        }
    });
    
    return menuText;
}

// Mostrar menú completo en el chat
function showFullMenu() {
    const menuText = showFullMenuText();
    addMessageToChat('ai', menuText);
    if (viewMenuButton) {
        viewMenuButton.classList.remove('show');
    }
}

// Manejar consulta de estado de pedido
async function handleOrderStatusCheck(orderId) {
    try {
        const orderRef = db.collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();
        
        if (!orderDoc.exists) {
            addMessageToChat('ai', `No encontré el pedido ${orderId}. Verificá el número e intentá de nuevo.`);
            return;
        }
        
        const order = orderDoc.data();
        let response = `*Pedido ${orderId}*\n`;
        response += `Estado: ${order.estado}\n`;
        
        if (order.tiempo_estimado_actual) {
            response += `Tiempo estimado: ${order.tiempo_estimado_actual} minutos\n`;
        }
        
        if (order.estado === 'Listo') {
            response += '\n¡Tu pedido está listo para retirar!';
        }
        
        addMessageToChat('ai', response);
    } catch (error) {
        console.error("Error consultando pedido:", error);
        addMessageToChat('ai', 'Hubo un error consultando el estado. Intentá de nuevo más tarde.');
    }
}

// Agregar mensaje al chat
function addMessageToChat(sender, text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    messageDiv.innerHTML = formatMessageText(text);
    
    if (chatContainer) {
        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    // Guardar en historial
    appState.conversation.push({ sender, text, timestamp: new Date() });
}

// Formatear texto del mensaje
function formatMessageText(text) {
    if (!text) return '';
    
    // Convertir negritas (*texto*)
    let formatted = text.replace(/\*([^*]+)\*|_([^_]+)_/g, '<strong>$1$2</strong>');
    
    // Convertir saltos de línea
    formatted = formatted.replace(/\n/g, '<br>');
    
    // Convertir guiones a listas
    formatted = formatted.replace(/^[•\-]\s+/gm, '• ');
    
    return formatted;
}

// Mostrar error
function showError(message) {
    if (!chatContainer) return;
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'message ai-message';
    errorDiv.style.background = '#fee2e2';
    errorDiv.style.color = '#991b1b';
    errorDiv.style.border = '1px solid #fca5a5';
    errorDiv.innerHTML = `⚠️ ${formatMessageText(message)}`;
    
    chatContainer.appendChild(errorDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Exportar para uso global
window.appState = appState;
window.addMessageToChat = addMessageToChat;
window.showFullMenu = showFullMenu;
window.showFullMenuText = showFullMenuText;
