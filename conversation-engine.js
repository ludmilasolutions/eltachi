// Motor de conversación optimizado - Versión Final
class ConversationEngine {
    constructor(apiKey, settings, products, db) {
        this.apiKey = apiKey;
        this.settings = settings;
        this.products = products;
        this.db = db;
        this.conversationHistory = [];
        this.currentOrder = {
            items: [],
            customerInfo: null,
            total: 0,
            deliveryType: null
        };
        this.conversationStage = 'greeting';
        this.pendingClarification = null;
        this.useGemini = false; // Por defecto desactivado
        
        console.log('🚀 ConversationEngine creado');
        console.log('🏪 Local:', settings.nombre_local);
        console.log('📦 Productos cargados:', products.length);
        console.log('🔑 API Key:', apiKey ? 'Configurada (pero desactivada por cuota)' : 'No configurada');
        
        // Solo usar Gemini si hay API Key Y no hemos excedido cuota
        if (apiKey && apiKey.trim() !== '') {
            this.useGemini = true;
            console.log('⚠️ Gemini activado, pero cuidado con la cuota');
        }
    }
    
    // Generar prompt para Gemini (SIMPLIFICADO para usar menos tokens)
    generateSystemPrompt() {
        return `Eres atención al cliente de EL TACHI rotisería. Responde de forma natural como una persona.

REGLAS:
1. NO digas que eres IA/bot
2. Ofrece menú solo cuando pregunten
3. Para productos genéricos (ej: "hamburguesa") pregunta cuál quiere
4. Solo menciona modificaciones si el cliente las pide
5. Resumen final obligatorio antes de pedir datos
6. Pregunta si es envío o retiro

PRODUCTOS DISPONIBLES:
${this.generateProductsList()}

CONFIGURACIÓN:
- Tiempo estimado: ${this.settings.tiempo_base_estimado} min
- Envío: $${this.settings.precio_envio}
- Retiro: ${this.settings.retiro_habilitado ? 'Sí' : 'No'}

Responde como vendedor humano, breve y claro.`;
    }
    
    // Generar lista de productos optimizada
    generateProductsList() {
        let list = '';
        const categories = {};
        
        this.products.forEach(product => {
            if (product.disponible) {
                if (!categories[product.categoria]) {
                    categories[product.categoria] = [];
                }
                categories[product.categoria].push(product);
            }
        });
        
        for (const [category, products] of Object.entries(categories)) {
            list += `${category}:\n`;
            products.forEach(product => {
                list += `- ${product.nombre}: $${product.precio}`;
                if (product.descripcion) {
                    list += ` (${product.descripcion})`;
                }
                list += `\n`;
            });
            list += `\n`;
        }
        
        return list;
    }
    
    // Procesar mensaje del usuario - VERSIÓN OPTIMIZADA
    async processUserMessage(userMessage) {
        console.log(`💬 Mensaje: "${userMessage.substring(0, 50)}${userMessage.length > 50 ? '...' : ''}"`);
        
        // Verificar si el local está abierto
        if (!this.settings.abierto) {
            return this.settings.mensaje_cerrado;
        }
        
        // Si hay clarificación pendiente, procesarla primero
        if (this.pendingClarification) {
            return this.handleProductClarification(userMessage);
        }
        
        // Verificar si es un ID de pedido
        const orderIdMatch = userMessage.match(/TACHI-\d{6}/i);
        if (orderIdMatch) {
            return await this.handleOrderStatusQuery(orderIdMatch[0].toUpperCase());
        }
        
        // Agregar al historial
        this.conversationHistory.push({
            role: 'user',
            parts: [{ text: userMessage }]
        });
        
        // Limitar historial
        this.trimConversationHistory();
        
        // Determinar etapa
        this.updateConversationStage(userMessage);
        
        // INTENTAR USAR GEMINI SOLO SI ESTÁ ACTIVADO Y NO HEMOS TENIDO ERRORES RECIENTES
        let geminiResponse = null;
        if (this.useGemini && this.apiKey) {
            try {
                console.log('🤖 Intentando Gemini...');
                geminiResponse = await this.callGeminiAPI(userMessage);
                console.log('✅ Gemini respondió');
                
                // Verificar si necesita clarificación
                const needsClarification = this.checkIfNeedsClarification(userMessage, geminiResponse);
                if (needsClarification) {
                    this.pendingClarification = {
                        category: needsClarification.category,
                        originalMessage: userMessage
                    };
                } else {
                    this.conversationHistory.push({
                        role: 'model',
                        parts: [{ text: geminiResponse }]
                    });
                }
                
                // Procesar pedido
                if (!needsClarification) {
                    await this.processOrderFromMessage(userMessage, geminiResponse);
                }
                
                return geminiResponse;
                
            } catch (error) {
                console.log('❌ Gemini falló, usando fallback:', error.message);
                // Si Gemini falla por cuota, desactivarlo para futuras llamadas
                if (error.message.includes('429') || error.message.includes('quota')) {
                    this.useGemini = false;
                    console.log('⚠️ Gemini desactivado por cuota excedida');
                }
                // Continuar con fallback
            }
        }
        
        // FALLBACK - Lógica interna (PRINCIPAL)
        console.log('🔄 Usando lógica interna');
        const fallbackResponse = this.getFallbackResponse(userMessage);
        
        // Agregar al historial
        this.conversationHistory.push({
            role: 'model',
            parts: [{ text: fallbackResponse }]
        });
        
        return fallbackResponse;
    }
    
    // Llamar a Gemini API - OPTIMIZADO para usar menos tokens
    async callGeminiAPI(userMessage) {
        if (!this.apiKey || this.apiKey.trim() === '') {
            throw new Error('No API Key');
        }
        
        const model = 'gemini-2.5-flash';
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
        
        // Construir contenido optimizado
        const contents = [];
        
        // Solo incluir el prompt del sistema y los últimos 2 mensajes
        contents.push({
            role: "user",
            parts: [{ text: this.generateSystemPrompt() }]
        });
        
        // Agregar historial reciente (máximo 2 intercambios)
        if (this.conversationHistory.length > 0) {
            const recentHistory = this.conversationHistory.slice(-2);
            recentHistory.forEach(msg => {
                contents.push({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.parts[0].text }]
                });
            });
        }
        
        // Agregar mensaje actual
        contents.push({
            role: "user",
            parts: [{ text: userMessage }]
        });
        
        const payload = {
            contents: contents,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 500, // Reducido para ahorrar tokens
            }
        };
        
        // Timeout de 10 segundos
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                throw new Error('Respuesta inválida');
            }
            
            return data.candidates[0].content.parts[0].text;
            
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }
    
    // Respuesta de fallback mejorada
    getFallbackResponse(userMessage) {
        const lowerMessage = userMessage.toLowerCase();
        
        // PRIMER MENSAJE - Mostrar menú completo
        if (this.conversationHistory.length <= 2 && 
            (lowerMessage.includes('hola') || lowerMessage.includes('buenas') || 
             lowerMessage.includes('buen día') || lowerMessage.includes('buenos'))) {
            
            const menu = this.generateEnhancedMenu();
            return `${menu}\n\n⏱️ *Tiempo estimado:* ${this.settings.tiempo_base_estimado} minutos\n🚚 *Envío:* $${this.settings.precio_envio}\n🏪 *Retiro en local:* Sí\n\n¿Qué te gustaría ordenar?`;
        }
        
        // PEDIR MENÚ
        if (lowerMessage.includes('menú') || lowerMessage.includes('carta') || 
            lowerMessage.includes('ver') || lowerMessage.includes('mostrar') ||
            lowerMessage.includes('qué tienen') || lowerMessage.includes('que tienen')) {
            return this.generateEnhancedMenu();
        }
        
        // DETECTAR PRODUCTOS
        const detectedProducts = this.detectProductsInMessage(userMessage);
        if (detectedProducts.length > 0) {
            detectedProducts.forEach(product => {
                this.addToOrder(product);
            });
            
            const lastProduct = detectedProducts[detectedProducts.length - 1];
            const productText = lastProduct.cantidad > 1 ? 
                `${lastProduct.cantidad} ${lastProduct.nombre}` : 
                lastProduct.nombre;
                
            const modificationText = lastProduct.modificaciones ? 
                ` (${lastProduct.modificaciones})` : '';
                
            return `Perfecto, ${productText}${modificationText}. ¿Algo más?`;
        }
        
        // VERIFICAR PRODUCTOS GENÉRICOS
        const categories = this.getCategoriesFromMessage(lowerMessage);
        if (categories.length > 0) {
            for (const category of categories) {
                const productsInCategory = this.getProductsByCategory(category);
                if (productsInCategory.length > 1) {
                    let clarificationText = `¿Cuál ${category} querés? Tenemos:\n`;
                    productsInCategory.forEach(product => {
                        clarificationText += `• ${product.nombre}: $${product.precio}\n`;
                    });
                    this.pendingClarification = { category: category };
                    return clarificationText;
                } else if (productsInCategory.length === 1) {
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
        
        // FINALIZAR PEDIDO
        if (lowerMessage.includes('nada más') || lowerMessage.includes('eso es todo') || 
            lowerMessage.includes('listo') || lowerMessage.includes('terminé') ||
            lowerMessage.includes('eso es')) {
            
            if (this.currentOrder.items.length === 0) {
                return 'No tengo ningún producto en tu pedido. ¿Qué te gustaría ordenar?';
            }
            
            const summary = this.generateOrderSummary();
            this.conversationStage = 'asking_delivery';
            return `*RESUMEN DE PEDIDO*\n\n${summary}\n\n¿Es para envío a domicilio o retiro en el local?`;
        }
        
        // TIPO DE ENTREGA
        if (this.conversationStage === 'asking_delivery') {
            if (lowerMessage.includes('envío') || lowerMessage.includes('domicilio') || 
                lowerMessage.includes('casa') || lowerMessage.includes('entrega')) {
                this.currentOrder.deliveryType = 'envío';
                this.conversationStage = 'collecting_info';
                return 'Perfecto, para envío. Necesito:\n1. Tu nombre\n2. Teléfono\n3. Dirección completa\n\n(Podés poner todo junto)';
            }
            
            if (lowerMessage.includes('retiro') || lowerMessage.includes('local') || 
                lowerMessage.includes('voy') || lowerMessage.includes('pasar')) {
                this.currentOrder.deliveryType = 'retiro';
                this.conversationStage = 'collecting_info';
                return 'Perfecto, para retiro. Necesito:\n1. Tu nombre\n2. Teléfono';
            }
        }
        
        // RECOLECTAR INFORMACIÓN
        if (this.conversationStage === 'collecting_info') {
            this.extractCustomerInfo(userMessage);
            
            // Verificar si tenemos información suficiente
            const hasName = this.currentOrder.customerInfo?.nombre?.length > 0;
            const hasPhone = this.currentOrder.customerInfo?.telefono?.length >= 8;
            const needsAddress = this.currentOrder.deliveryType === 'envío';
            const hasAddress = !needsAddress || this.currentOrder.customerInfo?.direccion?.length > 0;
            
            if (hasName && hasPhone && hasAddress) {
                // Confirmar y guardar
                const orderId = this.saveOrderToFirebase();
                return `✅ *PEDIDO CONFIRMADO*\n\nID: ${orderId}\nTiempo estimado: ${this.settings.tiempo_base_estimado} minutos\n\n¡Gracias por tu compra!`;
            } else {
                // Pedir lo que falta
                let missing = [];
                if (!hasName) missing.push('nombre');
                if (!hasPhone) missing.push('teléfono');
                if (needsAddress && !hasAddress) missing.push('dirección');
                
                return `Todavía necesito tu ${missing.join(', ')}.`;
            }
        }
        
        // CONFIRMACIÓN
        if (lowerMessage.includes('sí') || lowerMessage.includes('si') || 
            lowerMessage.includes('confirm') || lowerMessage.includes('correcto') ||
            lowerMessage.includes('dale') || lowerMessage.includes('ok')) {
            
            if (this.conversationStage === 'confirming' && this.currentOrder.items.length > 0) {
                const orderId = this.saveOrderToFirebase();
                return `✅ *PEDIDO CONFIRMADO*\n\nID: ${orderId}\nTiempo estimado: ${this.settings.tiempo_base_estimado} minutos\n\n¡Gracias por tu compra!`;
            }
        }
        
        // RESPUESTA POR DEFECTO
        if (this.currentOrder.items.length > 0) {
            return '¿Algo más para agregar? (Si terminaste, decime "listo")';
        } else {
            return '¿Qué te gustaría ordenar? Decime "menú" para ver nuestra carta.';
        }
    }
    
    // Generar menú mejorado
    generateEnhancedMenu() {
        let menu = '🍔 *NUESTRO MENÚ*\n\n';
        const categories = {};
        
        this.products.forEach(product => {
            if (product.disponible) {
                if (!categories[product.categoria]) {
                    categories[product.categoria] = [];
                }
                categories[product.categoria].push(product);
            }
        });
        
        for (const [category, products] of Object.entries(categories)) {
            menu += `*${category.toUpperCase()}*\n`;
            products.forEach(product => {
                menu += `• ${product.nombre} - $${product.precio}`;
                if (product.descripcion) {
                    menu += `\n  ${product.descripcion}`;
                }
                menu += `\n`;
            });
            menu += `\n`;
        }
        
        return menu;
    }
    
    // Generar resumen del pedido
    generateOrderSummary() {
        if (this.currentOrder.items.length === 0) return 'Sin productos';
        
        let summary = '';
        let subtotal = 0;
        
        this.currentOrder.items.forEach(item => {
            const itemTotal = item.precio * item.cantidad;
            subtotal += itemTotal;
            summary += `• ${item.nombre} x${item.cantidad}`;
            if (item.modificaciones) {
                summary += ` (${item.modificaciones})`;
            }
            summary += ` - $${itemTotal}\n`;
        });
        
        summary += `\nSubtotal: $${subtotal}`;
        
        if (this.currentOrder.deliveryType === 'envío') {
            const envio = this.settings.precio_envio || 0;
            summary += `\nEnvío: $${envio}`;
            summary += `\n*Total: $${subtotal + envio}*`;
        } else {
            summary += `\n*Total: $${subtotal}*`;
        }
        
        return summary;
    }
    
    // Detectar productos en mensaje
    detectProductsInMessage(message) {
        const lowerMessage = message.toLowerCase();
        const detected = [];
        
        this.products.forEach(product => {
            if (product.disponible) {
                const productNameLower = product.nombre.toLowerCase();
                
                // Verificar coincidencia exacta
                if (lowerMessage.includes(productNameLower)) {
                    let quantity = 1;
                    const quantityMatch = message.match(/(\d+)\s*[x\*]?\s*([a-zA-ZáéíóúñÁÉÍÓÚÑ\s]+)/i);
                    if (quantityMatch && quantityMatch[1]) {
                        quantity = parseInt(quantityMatch[1]);
                    }
                    
                    let modifications = null;
                    if (product.aderezos_disponibles && product.aderezos_disponibles.length > 0) {
                        for (const aderezo of product.aderezos_disponibles) {
                            if (lowerMessage.includes(aderezo.toLowerCase())) {
                                modifications = aderezo;
                                break;
                            }
                        }
                    }
                    
                    detected.push({
                        productId: product.id,
                        nombre: product.nombre,
                        precio: product.precio,
                        cantidad: quantity,
                        modificaciones: modifications
                    });
                }
            }
        });
        
        return detected;
    }
    
    // Extraer información del cliente optimizada
    extractCustomerInfo(userMessage) {
        if (!this.currentOrder.customerInfo) {
            this.currentOrder.customerInfo = {
                nombre: '',
                telefono: '',
                direccion: ''
            };
        }
        
        // Extraer teléfono (cualquier secuencia de 8-15 números)
        const phoneMatch = userMessage.match(/(\d{8,15})/);
        if (phoneMatch) {
            this.currentOrder.customerInfo.telefono = phoneMatch[1];
        }
        
        // Extraer nombre (búsqueda simple)
        const nameKeywords = ['me llamo', 'soy', 'nombre es', 'mi nombre'];
        for (const keyword of nameKeywords) {
            if (userMessage.toLowerCase().includes(keyword)) {
                const startIndex = userMessage.toLowerCase().indexOf(keyword) + keyword.length;
                const namePart = userMessage.substring(startIndex).trim();
                if (namePart.length > 2) {
                    // Tomar primera palabra como nombre
                    const firstName = namePart.split(/\s+/)[0];
                    if (firstName.length > 1) {
                        this.currentOrder.customerInfo.nombre = firstName;
                        break;
                    }
                }
            }
        }
        
        // Extraer dirección si es envío
        if (this.currentOrder.deliveryType === 'envío') {
            const addressKeywords = ['calle', 'av.', 'avenida', 'dirección', 'casa', 'número'];
            for (const keyword of addressKeywords) {
                if (userMessage.toLowerCase().includes(keyword)) {
                    const startIndex = userMessage.toLowerCase().indexOf(keyword);
                    const addressPart = userMessage.substring(startIndex);
                    if (addressPart.length > 10) {
                        this.currentOrder.customerInfo.direccion = addressPart;
                        break;
                    }
                }
            }
        }
    }
    
    // Guardar pedido en Firebase
    async saveOrderToFirebase() {
        try {
            console.log('💾 Guardando pedido...');
            
            // Generar ID
            let orderId;
            try {
                orderId = await this.generateOrderId();
            } catch (error) {
                console.log('⚠️ Error generando ID, usando timestamp');
                orderId = `TACHI-${Date.now().toString().slice(-6)}`;
            }
            
            // Calcular total
            let subtotal = this.currentOrder.items.reduce((sum, item) => 
                sum + (item.precio * item.cantidad), 0);
            
            let total = subtotal;
            if (this.currentOrder.deliveryType === 'envío') {
                total += this.settings.precio_envio || 0;
            }
            
            // Crear datos del pedido
            const orderData = {
                id_pedido: orderId,
                fecha: firebase.firestore.FieldValue.serverTimestamp(),
                nombre_cliente: this.currentOrder.customerInfo?.nombre || 'Cliente',
                telefono: this.currentOrder.customerInfo?.telefono || '',
                tipo_pedido: this.currentOrder.deliveryType || 'retiro',
                direccion: this.currentOrder.customerInfo?.direccion || '',
                items: this.currentOrder.items.map(item => ({
                    productId: item.productId,
                    nombre: item.nombre,
                    precio: item.precio,
                    cantidad: item.cantidad,
                    modificaciones: item.modificaciones
                })),
                subtotal: subtotal,
                precio_envio: this.currentOrder.deliveryType === 'envío' ? this.settings.precio_envio : 0,
                total: total,
                estado: 'Recibido',
                tiempo_estimado_actual: this.settings.tiempo_base_estimado || 30
            };
            
            console.log('📝 Datos del pedido:', orderData);
            
            // Guardar en Firebase
            await this.db.collection('orders').doc(orderId).set(orderData);
            
            console.log('✅ Pedido guardado:', orderId);
            
            // Enviar notificación
            try {
                await this.db.collection('notifications').add({
                    tipo: 'nuevo_pedido',
                    mensaje: `Nuevo pedido ${orderId} - ${orderData.nombre_cliente} - $${total}`,
                    pedido_id: orderId,
                    fecha: firebase.firestore.FieldValue.serverTimestamp(),
                    leido: false
                });
            } catch (notifError) {
                console.log('⚠️ Error enviando notificación:', notifError);
            }
            
            // Resetear pedido
            this.resetOrder();
            
            return orderId;
            
        } catch (error) {
            console.error('❌ Error guardando pedido:', error);
            throw error;
        }
    }
    
    // Generar ID de pedido
    async generateOrderId() {
        try {
            const counterRef = this.db.collection('counters').doc('orders');
            
            // Usar transacción para evitar duplicados
            const result = await this.db.runTransaction(async (transaction) => {
                const counterDoc = await transaction.get(counterRef);
                let currentNumber = 0;
                
                if (counterDoc.exists) {
                    currentNumber = counterDoc.data().lastNumber || 0;
                } else {
                    transaction.set(counterRef, { lastNumber: 0 });
                }
                
                const newNumber = currentNumber + 1;
                transaction.update(counterRef, { lastNumber: newNumber });
                return newNumber;
            });
            
            return `TACHI-${result.toString().padStart(6, '0')}';
            
        } catch (error) {
            console.error('Error en generateOrderId:', error);
            // Fallback
            return `TACHI-${Date.now().toString().slice(-6)}`;
        }
    }
    
    // Obtener categorías del mensaje
    getCategoriesFromMessage(message) {
        const categories = [];
        const categoryMap = {
            'hamburguesa': 'hamburguesas',
            'hamburguesas': 'hamburguesas',
            'papas': 'acompañamientos',
            'fritas': 'acompañamientos',
            'empanada': 'entradas',
            'empanadas': 'entradas',
            'bebida': 'bebidas',
            'gaseosa': 'bebidas',
            'pizza': 'pizzas',
            'pizzas': 'pizzas',
            'postre': 'postres',
            'postres': 'postres'
        };
        
        Object.keys(categoryMap).forEach(keyword => {
            if (message.includes(keyword)) {
                categories.push(categoryMap[keyword]);
            }
        });
        
        return [...new Set(categories)]; // Eliminar duplicados
    }
    
    // Obtener productos por categoría
    getProductsByCategory(category) {
        return this.products.filter(product => 
            product.categoria.toLowerCase() === category.toLowerCase() && 
            product.disponible
        );
    }
    
    // Manejar clarificación de producto
    handleProductClarification(userMessage) {
        const lowerMessage = userMessage.toLowerCase();
        const category = this.pendingClarification.category;
        const products = this.getProductsByCategory(category);
        
        let selectedProduct = null;
        for (const product of products) {
            if (lowerMessage.includes(product.nombre.toLowerCase())) {
                selectedProduct = product;
                break;
            }
        }
        
        if (!selectedProduct) {
            let text = `¿Cuál ${category} querés?\n`;
            products.forEach(product => {
                text += `• ${product.nombre}: $${product.precio}\n`;
            });
            return text;
        }
        
        this.addToOrder({
            productId: selectedProduct.id,
            nombre: selectedProduct.nombre,
            precio: selectedProduct.precio,
            cantidad: 1,
            modificaciones: null
        });
        
        this.pendingClarification = null;
        return `Perfecto, ${selectedProduct.nombre}. ¿Algo más?`;
    }
    
    // Verificar si necesita clarificación
    checkIfNeedsClarification(userMessage, aiResponse) {
        const lowerMessage = userMessage.toLowerCase();
        const categories = this.getCategoriesFromMessage(lowerMessage);
        
        if (categories.length > 0) {
            for (const category of categories) {
                const productsInCategory = this.getProductsByCategory(category);
                if (productsInCategory.length > 1) {
                    // Verificar si ya especificó un producto
                    let specified = false;
                    for (const product of productsInCategory) {
                        if (lowerMessage.includes(product.nombre.toLowerCase())) {
                            specified = true;
                            break;
                        }
                    }
                    
                    if (!specified) {
                        return { category: category };
                    }
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
        
        // Actualizar total
        this.currentOrder.total = this.currentOrder.items.reduce((sum, item) => 
            sum + (item.precio * item.cantidad), 0);
    }
    
    // Manejar consulta de estado
    async handleOrderStatusQuery(orderId) {
        try {
            const orderRef = this.db.collection('orders').doc(orderId);
            const orderDoc = await orderRef.get();
            
            if (!orderDoc.exists) {
                return `No encontré el pedido ${orderId}.`;
            }
            
            const order = orderDoc.data();
            let response = `📦 *Pedido ${orderId}*\n`;
            response += `Estado: ${order.estado}\n`;
            response += `Cliente: ${order.nombre_cliente}\n`;
            
            if (order.tiempo_estimado_actual) {
                response += `Tiempo estimado: ${order.tiempo_estimado_actual} min\n`;
            }
            
            if (order.estado === 'Listo') {
                response += '\n¡Tu pedido está listo!';
            }
            
            return response;
        } catch (error) {
            console.error('Error consultando pedido:', error);
            return 'Error consultando el pedido.';
        }
    }
    
    // Actualizar etapa de conversación
    updateConversationStage(userMessage) {
        const lowerMessage = userMessage.toLowerCase();
        
        switch (this.conversationStage) {
            case 'greeting':
                if (lowerMessage.includes('hola') || lowerMessage.includes('buenas')) {
                    this.conversationStage = 'taking_order';
                }
                break;
                
            case 'taking_order':
                if (lowerMessage.includes('listo') || lowerMessage.includes('terminé') || 
                    lowerMessage.includes('nada más')) {
                    this.conversationStage = 'asking_delivery';
                }
                break;
                
            case 'asking_delivery':
                if (lowerMessage.includes('envío') || lowerMessage.includes('retiro')) {
                    this.conversationStage = 'collecting_info';
                }
                break;
                
            case 'collecting_info':
                // Ya manejado en extractCustomerInfo
                break;
        }
    }
    
    // Limitar historial
    trimConversationHistory() {
        if (this.conversationHistory.length > 10) {
            this.conversationHistory = this.conversationHistory.slice(-10);
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
        console.log('🔄 Pedido reiniciado');
    }
    
    // Reiniciar conversación
    resetConversation() {
        this.conversationHistory = [];
        this.resetOrder();
        console.log('🔄 Conversación reiniciada');
    }
}

// Función para inicializar el motor
async function initConversationEngine() {
    try {
        const settings = await getSettings();
        if (!settings) {
            console.error('❌ No se pudo cargar la configuración');
            return null;
        }
        
        const products = await loadAllProducts();
        
        // Crear motor (Gemini desactivado por defecto debido a cuota)
        conversationEngine = new ConversationEngine(
            '', // API Key vacía para desactivar Gemini
            settings,
            products,
            window.db
        );
        
        console.log('✅ Motor de conversación inicializado (modo fallback)');
        return conversationEngine;
        
    } catch (error) {
        console.error('❌ Error:', error);
        return null;
    }
}

// Función para procesar mensajes
async function processMessageWithGemini(message) {
    if (!conversationEngine) {
        await initConversationEngine();
    }
    
    if (!conversationEngine) {
        return 'Sistema no disponible. Intenta más tarde.';
    }
    
    try {
        return await conversationEngine.processUserMessage(message);
    } catch (error) {
        console.error('Error:', error);
        return 'Error procesando mensaje.';
    }
}

// Exportar funciones
window.initConversationEngine = initConversationEngine;
window.processMessageWithGemini = processMessageWithGemini;
window.resetConversation = () => {
    if (conversationEngine) conversationEngine.resetConversation();
};
window.getCurrentOrder = () => {
    return conversationEngine ? conversationEngine.currentOrder : null;
};
