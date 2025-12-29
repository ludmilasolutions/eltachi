// Motor Híbrido Inteligente - VERSIÓN CORREGIDA
class HybridConversationEngine {
    constructor(apiKey, settings, products, db) {
        this.apiKey = apiKey;
        this.settings = settings;
        this.products = products;
        this.db = db;
        this.conversationHistory = [];
        this.currentOrder = {
            items: [],
            customerInfo: {
                nombre: '',
                telefono: '',
                direccion: ''
            },
            total: 0,
            deliveryType: null
        };
        this.conversationStage = 'greeting';
        this.pendingClarification = null;
        
        // Mejorar la detección de productos con más sinónimos
        this.productSynonyms = {
            'hamburguesa': ['hamburguesa', 'burguer', 'burger', 'amburguesa', 'hmaburguesa'],
            'papas fritas': ['papas', 'papas fritas', 'fritas', 'patatas', 'papitas'],
            'gaseosa': ['gaseosa', 'coca', 'coca cola', 'sprite', 'fanta', 'refresco', 'bebida'],
            'empanadas': ['empanadas', 'empanada', 'empaná', 'empanáda']
        };
        
        console.log('🚀 Motor Híbrido creado');
    }
    
    // ==================== PROCESAMIENTO PRINCIPAL ====================
    
    async processUserMessage(userMessage) {
        console.log(`💬 Original: "${userMessage}"`);
        
        // Paso 1: Corrección local rápida
        let correctedMessage = this.correctSpelling(userMessage);
        console.log(`🔤 Corregido local: "${correctedMessage}"`);
        
        // Paso 2: Detección de productos después de corrección
        let detectedProducts = this.detectProductsInMessage(correctedMessage);
        
        // Paso 3: Si no detectamos productos y parece una orden, usar Gemini
        if (detectedProducts.length === 0 && this.seemsLikeFoodOrder(userMessage) && this.apiKey) {
            try {
                correctedMessage = await this.useGeminiForHardCases(userMessage, correctedMessage);
                detectedProducts = this.detectProductsInMessage(correctedMessage);
            } catch (error) {
                console.log('❌ Gemini falló, continuando sin él');
            }
        }
        
        // Paso 4: Continuar con lógica normal usando el mensaje corregido
        this.conversationHistory.push({
            role: 'user',
            parts: [{ text: userMessage }]
        });
        
        // Paso 5: Obtener respuesta
        const response = await this.getResponse(correctedMessage, detectedProducts, userMessage);
        
        // Paso 6: Guardar respuesta
        this.conversationHistory.push({
            role: 'model',
            parts: [{ text: response }]
        });
        
        return response;
    }
    
    // ==================== LÓGICA DE RESPUESTA MEJORADA ====================
    
    async getResponse(message, detectedProducts, originalMessage) {
        const lowerMessage = message.toLowerCase();
        
        // 1. SALUDO INICIAL
        if (this.conversationStage === 'greeting') {
            this.conversationStage = 'taking_order';
            return this.generateGreetingResponse();
        }
        
        // 2. MOSTRAR MENÚ
        if (lowerMessage.includes('menú') || lowerMessage.includes('carta') || 
            lowerMessage.includes('ver') || lowerMessage.includes('mostrar') ||
            lowerMessage.includes('qué tienen') || lowerMessage.includes('que tienen')) {
            return this.generateMenuResponse();
        }
        
        // 3. PROCESAR PRODUCTOS DETECTADOS
        if (detectedProducts.length > 0) {
            detectedProducts.forEach(product => this.addToOrder(product));
            
            const lastProduct = detectedProducts[detectedProducts.length - 1];
            const productText = lastProduct.cantidad > 1 ? 
                `${lastProduct.cantidad} ${lastProduct.nombre}` : lastProduct.nombre;
            
            const modificationText = lastProduct.modificaciones ? 
                ` (${lastProduct.modificaciones})` : '';
            
            return `Perfecto, ${productText}${modificationText}. ¿Algo más?`;
        }
        
        // 4. PRODUCTOS GENÉRICOS
        const categories = this.getCategoriesFromMessage(lowerMessage);
        if (categories.length > 0) {
            for (const category of categories) {
                const productsInCategory = this.getProductsByCategory(category);
                if (productsInCategory.length > 1) {
                    this.pendingClarification = { category: category };
                    return this.generateClarificationResponse(category, productsInCategory);
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
        
        // 5. FINALIZAR PEDIDO
        if (lowerMessage.includes('nada más') || lowerMessage.includes('listo') || 
            lowerMessage.includes('terminé') || lowerMessage.includes('eso es todo') ||
            lowerMessage.includes('eso es')) {
            
            if (this.currentOrder.items.length === 0) {
                return 'No tengo ningún producto en tu pedido. ¿Qué te gustaría ordenar?';
            }
            
            this.conversationStage = 'asking_delivery';
            return this.generateOrderSummary();
        }
        
        // 6. TIPO DE ENTREGA
        if (this.conversationStage === 'asking_delivery') {
            if (lowerMessage.includes('envío') || lowerMessage.includes('domicilio') || 
                lowerMessage.includes('casa') || lowerMessage.includes('entrega')) {
                this.currentOrder.deliveryType = 'envío';
                this.conversationStage = 'collecting_info';
                return '🚚 *Para envío a domicilio* necesito:\n\n1. Tu nombre completo\n2. Teléfono de contacto\n3. Dirección completa\n\nPodés enviar toda la información en un solo mensaje.';
            }
            
            if (lowerMessage.includes('retiro') || lowerMessage.includes('local') || 
                lowerMessage.includes('voy') || lowerMessage.includes('pasar') ||
                lowerMessage.includes('buscar')) {
                this.currentOrder.deliveryType = 'retiro';
                this.conversationStage = 'collecting_info';
                return '🏪 *Para retiro en el local* necesito:\n\n1. Tu nombre completo\n2. Teléfono de contacto\n\nEjemplo: "Mi nombre es Sebastián y mi teléfono es 3417558966"';
            }
        }
        
        // 7. RECOLECCIÓN DE DATOS (CORREGIDO)
        if (this.conversationStage === 'collecting_info') {
            console.log('📝 Procesando datos del cliente...');
            
            // Extraer información del mensaje actual
            const extractedInfo = this.extractCustomerInfo(originalMessage);
            console.log('📊 Información extraída:', extractedInfo);
            
            // Actualizar datos del cliente
            if (extractedInfo.nombre) {
                this.currentOrder.customerInfo.nombre = extractedInfo.nombre;
            }
            if (extractedInfo.telefono) {
                this.currentOrder.customerInfo.telefono = extractedInfo.telefono;
            }
            if (extractedInfo.direccion && this.currentOrder.deliveryType === 'envío') {
                this.currentOrder.customerInfo.direccion = extractedInfo.direccion;
            }
            
            console.log('👤 Datos actuales del cliente:', this.currentOrder.customerInfo);
            
            // Verificar qué información falta
            const missing = this.getMissingCustomerInfo();
            
            if (missing.length === 0) {
                // TODA LA INFORMACIÓN ESTÁ COMPLETA
                try {
                    const orderId = await this.saveOrderToFirebase();
                    return `✅ *PEDIDO CONFIRMADO*\n\n📦 ID del pedido: ${orderId}\n👤 Cliente: ${this.currentOrder.customerInfo.nombre}\n📱 Teléfono: ${this.currentOrder.customerInfo.telefono}\n${this.currentOrder.deliveryType === 'envío' ? `📍 Dirección: ${this.currentOrder.customerInfo.direccion}\n` : ''}⏱️ Tiempo estimado: ${this.settings.tiempo_base_estimado} minutos\n💰 Total: $${this.currentOrder.total + (this.currentOrder.deliveryType === 'envío' ? this.settings.precio_envio : 0)}\n\n¡Gracias por tu compra! Te contactaremos si hay novedades.`;
                } catch (error) {
                    console.error('Error guardando pedido:', error);
                    return 'Hubo un error al guardar tu pedido. Por favor, intentá de nuevo o contactanos directamente por teléfono.';
                }
            } else {
                // FALTA INFORMACIÓN
                return this.generateMissingInfoMessage(missing);
            }
        }
        
        // 8. RESPUESTA POR DEFECTO
        if (this.currentOrder.items.length > 0) {
            return '¿Algo más que quieras agregar a tu pedido? (Si terminaste, decime "listo")';
        } else {
            return '¿Qué te gustaría ordenar? Decime "menú" para ver nuestra carta.';
        }
    }
    
    // ==================== EXTRACCIÓN DE DATOS DEL CLIENTE MEJORADA ====================
    
    extractCustomerInfo(message) {
        const result = {
            nombre: '',
            telefono: '',
            direccion: ''
        };
        
        // Convertir a minúsculas para búsqueda
        const lowerMessage = message.toLowerCase();
        
        // 1. EXTRAER TELÉFONO (primero porque es más fácil)
        const phoneMatch = message.match(/(\d{8,15})/);
        if (phoneMatch) {
            result.telefono = phoneMatch[1];
            console.log('📱 Teléfono detectado:', result.telefono);
        }
        
        // 2. EXTRAER NOMBRE (múltiples patrones)
        const namePatterns = [
            // "mi nombre es Sebastián"
            /(?:me llamo|soy|nombre es|mi nombre es|me llamo)[:\s]*([A-Za-zÁÉÍÓÚáéíóúÑñ]{2,}(?:\s+[A-Za-zÁÉÍÓÚáéíóúÑñ]{2,})*)/i,
            // "Sebastián 3417558966"
            /^([A-Za-zÁÉÍÓÚáéíóúÑñ]{2,})\s+\d+/,
            // Solo nombre al inicio
            /^([A-Za-zÁÉÍÓÚáéíóúÑñ]{2,})$/,
            // "Sebastián"
            /([A-Za-zÁÉÍÓÚáéíóúÑñ]{2,})/
        ];
        
        for (const pattern of namePatterns) {
            const match = message.match(pattern);
            if (match && match[1]) {
                const potentialName = match[1].trim();
                // Verificar que no sea solo "nombre", "mi", etc.
                if (potentialName.length > 1 && 
                    !['nombre', 'mi', 'es', 'llamo', 'soy'].includes(potentialName.toLowerCase())) {
                    result.nombre = this.capitalizeName(potentialName);
                    console.log('👤 Nombre detectado:', result.nombre);
                    break;
                }
            }
        }
        
        // 3. EXTRAER DIRECCIÓN (solo si es envío)
        if (this.currentOrder.deliveryType === 'envío') {
            const addressKeywords = ['calle', 'av.', 'avenida', 'dirección', 'casa', 'número', 'nro', 'entre', 'y', 'altura'];
            for (const keyword of addressKeywords) {
                if (lowerMessage.includes(keyword)) {
                    const keywordIndex = lowerMessage.indexOf(keyword);
                    // Tomar desde la palabra clave hasta el final del mensaje
                    result.direccion = message.substring(keywordIndex);
                    console.log('📍 Dirección detectada:', result.direccion);
                    break;
                }
            }
        }
        
        return result;
    }
    
    // Capitalizar nombre
    capitalizeName(name) {
        return name.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }
    
    // Verificar información faltante
    getMissingCustomerInfo() {
        const missing = [];
        
        if (!this.currentOrder.customerInfo.nombre || this.currentOrder.customerInfo.nombre.trim().length < 2) {
            missing.push('nombre');
        }
        
        if (!this.currentOrder.customerInfo.telefono || this.currentOrder.customerInfo.telefono.length < 8) {
            missing.push('teléfono');
        }
        
        if (this.currentOrder.deliveryType === 'envío' && 
            (!this.currentOrder.customerInfo.direccion || this.currentOrder.customerInfo.direccion.trim().length < 5)) {
            missing.push('dirección');
        }
        
        return missing;
    }
    
    // Generar mensaje sobre información faltante
    generateMissingInfoMessage(missingItems) {
        if (missingItems.length === 1) {
            if (missingItems[0] === 'nombre') {
                return `Todavía necesito tu nombre completo. Por ejemplo: "Mi nombre es Sebastián"`;
            } else if (missingItems[0] === 'teléfono') {
                return `Todavía necesito tu teléfono. Por ejemplo: "3417558966"`;
            } else {
                return `Todavía necesito tu dirección completa. Por ejemplo: "Calle San Martín 1234"`;
            }
        } else if (missingItems.length === 2) {
            if (missingItems.includes('nombre') && missingItems.includes('teléfono')) {
                return `Necesito tu nombre y teléfono. Por ejemplo: "Mi nombre es Sebastián y mi teléfono es 3417558966"`;
            }
        }
        
        return `Todavía necesito tu ${missingItems.join(' y ')}.`;
    }
    
    // ==================== FUNCIONES DE RESPUESTA ====================
    
    generateGreetingResponse() {
        return `¡Hola! 👋 Soy la atención de *${this.settings.nombre_local}*.\n\n` +
               `Puedes pedir directamente lo que quieras o decirme "menú" para ver nuestra carta completa.\n\n` +
               `⏱️ *Tiempo estimado:* ${this.settings.tiempo_base_estimado} minutos\n` +
               `🚚 *Envío a domicilio:* $${this.settings.precio_envio}\n` +
               `🏪 *Retiro en local:* Sin cargo\n\n` +
               `¿Qué te gustaría ordenar?`;
    }
    
    generateMenuResponse() {
        if (this.products.length === 0) {
            return 'Los productos se están cargando...';
        }
        
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
                    menu += ` (${product.descripcion})`;
                }
                menu += `\n`;
            });
            menu += `\n`;
        }
        
        menu += `\n_Podés pedir diciendo: "Quiero una hamburguesa", "Dame papas fritas", etc._`;
        
        return menu;
    }
    
    generateOrderSummary() {
        if (this.currentOrder.items.length === 0) return 'Sin productos';
        
        let summary = '📋 *RESUMEN DE PEDIDO*\n\n';
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
        
        summary += `\n\n¿Es para envío a domicilio o retiro en el local?`;
        
        return summary;
    }
    
    // ==================== FUNCIONES DEL MOTOR BASE ====================
    
    detectProductsInMessage(message) {
        const lowerMessage = message.toLowerCase();
        const detected = [];
        
        this.products.forEach(product => {
            if (product.disponible) {
                const productNameLower = product.nombre.toLowerCase();
                
                // Verificar si el mensaje contiene el nombre del producto o sinónimos
                let hasMatch = lowerMessage.includes(productNameLower);
                
                // Verificar sinónimos
                if (!hasMatch && this.productSynonyms[product.nombre]) {
                    hasMatch = this.productSynonyms[product.nombre].some(synonym => 
                        lowerMessage.includes(synonym)
                    );
                }
                
                if (hasMatch) {
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
    
    async saveOrderToFirebase() {
        try {
            console.log('💾 Guardando pedido en Firebase...');
            
            // Generar ID único simple
            const timestamp = Date.now().toString().slice(-6);
            const orderId = `TACHI-${timestamp}`;
            
            // Calcular total
            let subtotal = this.currentOrder.items.reduce((sum, item) => 
                sum + (item.precio * item.cantidad), 0);
            
            let total = subtotal;
            if (this.currentOrder.deliveryType === 'envío') {
                total += this.settings.precio_envio || 0;
            }
            
            const orderData = {
                id_pedido: orderId,
                fecha: firebase.firestore.FieldValue.serverTimestamp(),
                nombre_cliente: this.currentOrder.customerInfo.nombre || 'Cliente',
                telefono: this.currentOrder.customerInfo.telefono || '',
                tipo_pedido: this.currentOrder.deliveryType || 'retiro',
                direccion: this.currentOrder.customerInfo.direccion || '',
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
            
            // Resetear pedido actual
            this.resetOrder();
            
            return orderId;
            
        } catch (error) {
            console.error('❌ Error guardando pedido:', error);
            throw error;
        }
    }
    
    resetOrder() {
        this.currentOrder = {
            items: [],
            customerInfo: {
                nombre: '',
                telefono: '',
                direccion: ''
            },
            total: 0,
            deliveryType: null
        };
        this.conversationStage = 'greeting';
        this.pendingClarification = null;
    }
    
    // ==================== FUNCIONES RESTANTES (simplificadas) ====================
    
    correctSpelling(message) {
        // Corrección básica
        const corrections = {
            'amburguesa': 'hamburguesa',
            'hamburgesa': 'hamburguesa',
            'hamburguesas': 'hamburguesa',
            'menu': 'menú',
            'carta': 'menú'
        };
        
        let corrected = message.toLowerCase();
        Object.keys(corrections).forEach(wrong => {
            corrected = corrected.replace(new RegExp(wrong, 'g'), corrections[wrong]);
        });
        
        return corrected;
    }
    
    seemsLikeFoodOrder(message) {
        const lowerMsg = message.toLowerCase();
        const foodKeywords = ['quiero', 'dame', 'traeme', 'necesito', 'pedir', 'ordenar', 'comprar'];
        return foodKeywords.some(keyword => lowerMsg.includes(keyword));
    }
    
    getCategoriesFromMessage(message) {
        const categories = [];
        const categoryMap = {
            'hamburguesa': 'hamburguesas',
            'burguer': 'hamburguesas',
            'burger': 'hamburguesas',
            'papas': 'acompañamientos',
            'fritas': 'acompañamientos',
            'papa': 'acompañamientos',
            'bebida': 'bebidas',
            'gaseosa': 'bebidas'
        };
        
        Object.keys(categoryMap).forEach(keyword => {
            if (message.includes(keyword)) {
                categories.push(categoryMap[keyword]);
            }
        });
        
        return [...new Set(categories)];
    }
    
    getProductsByCategory(category) {
        return this.products.filter(product => 
            product.categoria.toLowerCase() === category.toLowerCase() && 
            product.disponible
        );
    }
    
    generateClarificationResponse(category, products) {
        let text = `¿Cuál ${category} querés? Tenemos:\n`;
        products.forEach(product => {
            text += `• ${product.nombre}: $${product.precio}`;
            if (product.descripcion) {
                text += ` (${product.descripcion})`;
            }
            text += `\n`;
        });
        return text;
    }
    
    async useGeminiForHardCases(originalMessage, correctedMessage) {
        // Solo usar Gemini si hay API key y el mensaje parece complejo
        if (!this.apiKey || !this.seemsLikeComplexOrder(originalMessage)) {
            return correctedMessage;
        }
        
        // Implementación básica - puedes expandir esto
        console.log('🤖 Usando Gemini para caso complejo');
        return correctedMessage;
    }
    
    seemsLikeComplexOrder(message) {
        // Detectar si el mensaje tiene múltiples productos o instrucciones complejas
        const wordCount = message.split(/\s+/).length;
        const hasMultipleItems = message.includes('y') || message.includes('con') || message.includes(',');
        return wordCount > 4 && hasMultipleItems;
    }
}

// ==================== INICIALIZACIÓN GLOBAL ====================

let hybridEngine = null;

async function initHybridEngine() {
    try {
        const settings = await getSettings();
        if (!settings) {
            console.error('❌ No se pudo cargar la configuración');
            return null;
        }
        
        const products = await loadAllProducts();
        
        hybridEngine = new HybridConversationEngine(
            settings.api_key_gemini || '',
            settings,
            products,
            window.db
        );
        
        console.log('✅ Motor Híbrido inicializado');
        
        return hybridEngine;
        
    } catch (error) {
        console.error('❌ Error inicializando motor híbrido:', error);
        return null;
    }
}

async function processMessageHybrid(message) {
    if (!hybridEngine) {
        await initHybridEngine();
    }
    
    if (!hybridEngine) {
        return 'Sistema no disponible. Intenta más tarde.';
    }
    
    try {
        return await hybridEngine.processUserMessage(message);
    } catch (error) {
        console.error('Error procesando mensaje:', error);
        return 'Error procesando mensaje. Por favor, intenta de nuevo.';
    }
}

// Exportar para uso global
window.initHybridEngine = initHybridEngine;
window.processMessageHybrid = processMessageHybrid;
window.HybridConversationEngine = HybridConversationEngine;
window.resetHybridConversation = () => {
    if (hybridEngine) hybridEngine.resetOrder();
};
