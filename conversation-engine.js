// Motor Híbrido Inteligente - Optimizado para reconocimiento de errores y contexto
class HybridConversationEngine {
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
        
        // Estadísticas para optimizar uso de Gemini
        this.geminiUsage = {
            totalCalls: 0,
            todayCalls: 0,
            successfulCorrections: 0,
            lastReset: new Date()
        };
        
        // Palabras frecuentemente mal escritas en comida
        this.commonMisspellings = {
            // Hamburguesas
            'amburguesa': 'hamburguesa',
            'hamburgesa': 'hamburguesa',
            'hamburguesa': 'hamburguesa',
            'burguer': 'hamburguesa',
            'burger': 'hamburguesa',
            'hmaburguesa': 'hamburguesa',
            'hmaburgesa': 'hamburguesa',
            
            // Papas
            'papa': 'papas',
            'papas': 'papas',
            'pappas': 'papas',
            'papafritas': 'papas fritas',
            'papitas': 'papas fritas',
            'patatas': 'papas fritas',
            
            // Bebidas
            'coca': 'gaseosa',
            'cocacola': 'gaseosa',
            'coca cola': 'gaseosa',
            'cocacola': 'gaseosa',
            'pepsi': 'gaseosa',
            'sprite': 'gaseosa',
            'fanta': 'gaseosa',
            'gaseoza': 'gaseosa',
            'refresco': 'gaseosa',
            
            // Empanadas
            'empanada': 'empanadas',
            'empanadas': 'empanadas',
            'empaná': 'empanadas',
            'empanáda': 'empanadas',
            'empanadass': 'empanadas',
            
            // Varios
            'combo': 'combo',
            'menú': 'menu',
            'menu': 'menu',
            'postre': 'postre',
            'helado': 'postre',
            'pizza': 'pizza',
            'piza': 'pizza'
        };
        
        console.log('🚀 Motor Híbrido creado');
        console.log('🔧 Corrector ortográfico activado');
        console.log('🤖 Gemini disponible:', !!apiKey);
    }
    
    // ==================== SISTEMA DE CORRECCIÓN ORTOGRÁFICA ====================
    
    // Corregir errores comunes en tiempo real
    correctSpelling(message) {
        console.log('🔤 Corrigiendo ortografía...');
        let corrected = message.toLowerCase();
        
        // Reemplazar errores comunes
        Object.keys(this.commonMisspellings).forEach(misspelling => {
            const regex = new RegExp(`\\b${misspelling}\\b`, 'gi');
            if (regex.test(corrected)) {
                corrected = corrected.replace(regex, this.commonMisspellings[misspelling]);
                console.log(`   ✓ Corregido: ${misspelling} → ${this.commonMisspellings[misspelling]}`);
            }
        });
        
        // Buscar similitudes con productos (algoritmo de Levenshtein simplificado)
        const words = corrected.split(/\s+/);
        const correctedWords = words.map(word => {
            // Si la palabra ya está en nuestros productos, no cambiar
            const productMatch = this.products.find(p => 
                p.nombre.toLowerCase().includes(word) || 
                word.includes(p.nombre.toLowerCase())
            );
            
            if (productMatch) {
                return productMatch.nombre.toLowerCase();
            }
            
            // Buscar similitudes aproximadas
            const similarProduct = this.findSimilarProduct(word);
            if (similarProduct) {
                console.log(`   ≈ Similar: ${word} → ${similarProduct.nombre}`);
                return similarProduct.nombre.toLowerCase();
            }
            
            return word;
        });
        
        return correctedWords.join(' ');
    }
    
    // Algoritmo de similitud simple
    findSimilarProduct(word) {
        if (word.length < 3) return null;
        
        let bestMatch = null;
        let bestScore = 0;
        
        this.products.forEach(product => {
            const productName = product.nombre.toLowerCase();
            
            // Coincidencia exacta
            if (productName.includes(word) || word.includes(productName)) {
                bestMatch = product;
                bestScore = 0.9;
                return;
            }
            
            // Calcular similitud de caracteres
            const similarity = this.calculateSimilarity(word, productName);
            if (similarity > 0.7 && similarity > bestScore) {
                bestScore = similarity;
                bestMatch = product;
            }
        });
        
        return bestMatch;
    }
    
    calculateSimilarity(a, b) {
        // Distancia de Levenshtein simplificada
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;
        
        const matrix = [];
        
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i-1) === a.charAt(j-1)) {
                    matrix[i][j] = matrix[i-1][j-1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i-1][j-1] + 1,
                        matrix[i][j-1] + 1,
                        matrix[i-1][j] + 1
                    );
                }
            }
        }
        
        const distance = matrix[b.length][a.length];
        const maxLength = Math.max(a.length, b.length);
        return 1 - (distance / maxLength);
    }
    
    // ==================== GEMINI PARA CASOS DIFÍCILES ====================
    
    // Usar Gemini solo cuando nuestro corrector falla
    async useGeminiForHardCases(originalMessage, correctedMessage) {
        // Verificar si podemos usar Gemini (límites)
        if (!this.canUseGemini()) {
            console.log('⚠️  Límite Gemini alcanzado, usando corrector local');
            return correctedMessage;
        }
        
        // Solo usar Gemini para mensajes que parecen órdenes pero no fueron entendidos
        const seemsLikeOrder = this.seemsLikeFoodOrder(originalMessage);
        const understoodByCorrector = this.detectProductsInMessage(correctedMessage).length > 0;
        
        if (seemsLikeOrder && !understoodByCorrector) {
            console.log('🤖 Usando Gemini para caso difícil...');
            
            try {
                const geminiCorrected = await this.callGeminiForCorrection(originalMessage);
                this.geminiUsage.totalCalls++;
                this.geminiUsage.todayCalls++;
                
                // Verificar si Gemini ayudó
                const geminiProducts = this.detectProductsInMessage(geminiCorrected);
                if (geminiProducts.length > 0) {
                    this.geminiUsage.successfulCorrections++;
                    console.log('✅ Gemini ayudó a entender el mensaje');
                    return geminiCorrected;
                }
            } catch (error) {
                console.log('❌ Gemini falló:', error.message);
            }
        }
        
        return correctedMessage;
    }
    
    // Verificar si parece una orden de comida
    seemsLikeFoodOrder(message) {
        const lowerMsg = message.toLowerCase();
        const foodKeywords = [
            'quiero', 'dame', 'traeme', 'necesito', 'me das', 'para llevar',
            'para mí', 'orden', 'pedido', 'comida', 'comprar', 'llevar',
            'hamburguesa', 'papa', 'bebida', 'gaseosa', 'empanada', 'pizza',
            'combo', 'menú', 'postre', 'papas', 'fritas', 'con', 'sin'
        ];
        
        // Debe tener al menos 2 palabras y una palabra clave
        const words = lowerMsg.split(/\s+/).filter(w => w.length > 2);
        if (words.length < 2) return false;
        
        const hasKeyword = foodKeywords.some(keyword => lowerMsg.includes(keyword));
        const hasNumbers = /\d/.test(message); // Números suelen indicar cantidades
        
        return hasKeyword || hasNumbers;
    }
    
    // Llamar a Gemini para corrección específica
    async callGeminiForCorrection(message) {
        if (!this.apiKey) throw new Error('No API Key');
        
        const prompt = `Eres un corrector de pedidos para una rotisería. 
        El cliente escribió: "${message}"
        
        PRODUCTOS DISPONIBLES:
        ${this.products.map(p => `- ${p.nombre} (${p.descripcion || 'sin descripción'})`).join('\n')}
        
        CORRIGE el mensaje del cliente usando solo los productos disponibles.
        Si menciona algo que no tenemos, IGNÓRALO.
        Mantén el mismo tono y estilo.
        
        Solo responde con el mensaje corregido, nada más.
        
        Mensaje corregido:`;
        
        const model = 'gemini-1.5-flash'; // Modelo más barato
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
        
        const payload = {
            contents: [{
                role: "user",
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 100
            }
        };
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) throw new Error(`Error ${response.status}`);
        
        const data = await response.json();
        return data.candidates[0].content.parts[0].text.trim();
    }
    
    // Verificar si podemos usar Gemini (límites inteligentes)
    canUseGemini() {
        if (!this.apiKey) return false;
        
        // Resetear contador diario
        const today = new Date().toDateString();
        if (today !== this.geminiUsage.lastReset.toDateString()) {
            this.geminiUsage.todayCalls = 0;
            this.geminiUsage.lastReset = new Date();
        }
        
        // Límites:
        // - Máximo 10 llamadas por día (gratis)
        // - Máximo 2 llamadas por conversación
        // - Solo si la tasa de éxito es > 50%
        
        const dailyLimit = 10;
        const perConversationLimit = 2;
        const successRate = this.geminiUsage.totalCalls > 0 ? 
            this.geminiUsage.successfulCorrections / this.geminiUsage.totalCalls : 1;
        
        const underDailyLimit = this.geminiUsage.todayCalls < dailyLimit;
        const underPerConversationLimit = this.geminiUsage.todayCalls < perConversationLimit;
        const goodSuccessRate = successRate > 0.5 || this.geminiUsage.totalCalls < 3;
        
        return underDailyLimit && underPerConversationLimit && goodSuccessRate;
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
        if (detectedProducts.length === 0 && this.seemsLikeFoodOrder(userMessage)) {
            correctedMessage = await this.useGeminiForHardCases(userMessage, correctedMessage);
            
            // Volver a detectar después de Gemini
            detectedProducts = this.detectProductsInMessage(correctedMessage);
            console.log(`🤖 Después de Gemini: "${correctedMessage}"`);
        }
        
        // Paso 4: Continuar con lógica normal usando el mensaje corregido
        this.conversationHistory.push({
            role: 'user',
            parts: [{ text: userMessage }] // Guardar original para contexto
        });
        
        // Actualizar etapa de conversación
        this.updateConversationStage(correctedMessage);
        
        // Obtener respuesta
        const response = this.getResponse(correctedMessage, detectedProducts);
        
        // Guardar respuesta
        this.conversationHistory.push({
            role: 'model',
            parts: [{ text: response }]
        });
        
        return response;
    }
    
    // ==================== LÓGICA DE RESPUESTA ====================
    
    getResponse(message, detectedProducts) {
        const lowerMessage = message.toLowerCase();
        
        // SALUDO INICIAL
        if (this.conversationStage === 'greeting' && 
            (lowerMessage.includes('hola') || lowerMessage.includes('buenas'))) {
            
            this.conversationStage = 'taking_order';
            return this.generateGreetingResponse();
        }
        
        // MOSTRAR MENÚ
        if (lowerMessage.includes('menú') || lowerMessage.includes('carta') || 
            lowerMessage.includes('ver') || lowerMessage.includes('mostrar')) {
            return this.generateMenuResponse();
        }
        
        // PROCESAR PRODUCTOS DETECTADOS
        if (detectedProducts.length > 0) {
            detectedProducts.forEach(product => this.addToOrder(product));
            
            const lastProduct = detectedProducts[detectedProducts.length - 1];
            const productText = lastProduct.cantidad > 1 ? 
                `${lastProduct.cantidad} ${lastProduct.nombre}` : lastProduct.nombre;
            
            const modificationText = lastProduct.modificaciones ? 
                ` (${lastProduct.modificaciones})` : '';
            
            return `Perfecto, ${productText}${modificationText}. ¿Algo más?`;
        }
        
        // PRODUCTOS GENÉRICOS (necesitan clarificación)
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
        
        // FINALIZAR PEDIDO
        if (lowerMessage.includes('nada más') || lowerMessage.includes('listo') || 
            lowerMessage.includes('terminé') || lowerMessage.includes('eso es todo')) {
            
            if (this.currentOrder.items.length === 0) {
                return 'No tengo ningún producto en tu pedido. ¿Qué te gustaría ordenar?';
            }
            
            this.conversationStage = 'asking_delivery';
            return this.generateOrderSummary();
        }
        
        // TIPO DE ENTREGA
        if (this.conversationStage === 'asking_delivery') {
            if (lowerMessage.includes('envío') || lowerMessage.includes('domicilio')) {
                this.currentOrder.deliveryType = 'envío';
                this.conversationStage = 'collecting_info';
                return 'Perfecto, para envío a domicilio. Necesito:\n1. Tu nombre\n2. Teléfono\n3. Dirección completa';
            }
            
            if (lowerMessage.includes('retiro') || lowerMessage.includes('local')) {
                this.currentOrder.deliveryType = 'retiro';
                this.conversationStage = 'collecting_info';
                return 'Perfecto, para retiro en el local. Necesito:\n1. Tu nombre\n2. Teléfono';
            }
        }
        
        // RECOLECCIÓN DE DATOS
        if (this.conversationStage === 'collecting_info') {
            this.extractCustomerInfo(message);
            
            const hasName = this.currentOrder.customerInfo?.nombre?.length > 0;
            const hasPhone = this.currentOrder.customerInfo?.telefono?.length >= 8;
            const needsAddress = this.currentOrder.deliveryType === 'envío';
            const hasAddress = !needsAddress || this.currentOrder.customerInfo?.direccion?.length > 0;
            
            if (hasName && hasPhone && hasAddress) {
                try {
                    const orderId = this.saveOrderToFirebase();
                    return `✅ *PEDIDO CONFIRMADO*\n\n📦 ID: ${orderId}\n⏱️ Tiempo: ${this.settings.tiempo_base_estimado} min\n💰 Total: $${this.currentOrder.total + (this.currentOrder.deliveryType === 'envío' ? this.settings.precio_envio : 0)}\n\n¡Gracias por tu compra!`;
                } catch (error) {
                    return 'Error al guardar el pedido. Por favor, intentá de nuevo.';
                }
            } else {
                let missing = [];
                if (!hasName) missing.push('nombre');
                if (!hasPhone) missing.push('teléfono');
                if (needsAddress && !hasAddress) missing.push('dirección');
                
                return `Todavía necesito tu ${missing.join(', ')}.`;
            }
        }
        
        // RESPUESTA POR DEFECTO
        if (this.currentOrder.items.length > 0) {
            return '¿Algo más para agregar? (Si terminaste, decime "listo")';
        } else {
            return '¿Qué te gustaría ordenar? Decime "menú" para ver nuestra carta.';
        }
    }
    
    // ==================== FUNCIONES AUXILIARES ====================
    
    generateGreetingResponse() {
        return `¡Hola! 👋 Soy la atención de *${this.settings.nombre_local}*.\n\n` +
               `${this.generateMenuResponse()}\n\n` +
               `⏱️ *Tiempo estimado:* ${this.settings.tiempo_base_estimado} minutos\n` +
               `🚚 *Envío a domicilio:* $${this.settings.precio_envio}\n` +
               `🏪 *Retiro en local:* Sí\n\n` +
               `¿Qué te gustaría ordenar?`;
    }
    
    generateMenuResponse() {
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
        
        return menu;
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
                
                // Búsqueda flexible: palabra clave o parte del nombre
                const words = productNameLower.split(/\s+/);
                const hasMatch = words.some(word => 
                    word.length > 3 && lowerMessage.includes(word)
                ) || lowerMessage.includes(productNameLower);
                
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
            'gaseosa': 'bebidas',
            'refresco': 'bebidas',
            'empanada': 'entradas',
            'empanadas': 'entradas',
            'pizza': 'pizzas',
            'postre': 'postres',
            'helado': 'postres'
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
    
    extractCustomerInfo(message) {
        if (!this.currentOrder.customerInfo) {
            this.currentOrder.customerInfo = {
                nombre: '',
                telefono: '',
                direccion: ''
            };
        }
        
        // Extraer teléfono
        const phoneMatch = message.match(/(\d{8,15})/);
        if (phoneMatch) {
            this.currentOrder.customerInfo.telefono = phoneMatch[1];
        }
        
        // Extraer nombre (simple)
        const namePatterns = [
            /(?:me llamo|soy|nombre es|mi nombre es)\s+([A-Za-zÁÉÍÓÚáéíóúÑñ]{2,})/i,
            /([A-Za-zÁÉÍÓÚáéíóúÑñ]{2,})(?:\s+dice|soy|acá|hola)/i
        ];
        
        for (const pattern of namePatterns) {
            const match = message.match(pattern);
            if (match && match[1]) {
                this.currentOrder.customerInfo.nombre = match[1].trim();
                break;
            }
        }
        
        // Extraer dirección si es envío
        if (this.currentOrder.deliveryType === 'envío') {
            const addressKeywords = ['calle', 'av.', 'avenida', 'dirección', 'casa', 'número', 'nro'];
            for (const keyword of addressKeywords) {
                if (message.toLowerCase().includes(keyword)) {
                    const startIndex = message.toLowerCase().indexOf(keyword);
                    const addressPart = message.substring(startIndex);
                    if (addressPart.length > 10) {
                        this.currentOrder.customerInfo.direccion = addressPart;
                        break;
                    }
                }
            }
        }
    }
    
    updateConversationStage(message) {
        const lowerMessage = message.toLowerCase();
        
        switch (this.conversationStage) {
            case 'greeting':
                if (lowerMessage.includes('hola') || lowerMessage.includes('buenas')) {
                    this.conversationStage = 'taking_order';
                }
                break;
                
            case 'taking_order':
                if (lowerMessage.includes('listo') || lowerMessage.includes('nada más')) {
                    this.conversationStage = 'asking_delivery';
                }
                break;
                
            case 'asking_delivery':
                if (lowerMessage.includes('envío') || lowerMessage.includes('retiro')) {
                    this.conversationStage = 'collecting_info';
                }
                break;
        }
    }
    
    async saveOrderToFirebase() {
        try {
            // Generar ID único
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
                nombre_cliente: this.currentOrder.customerInfo?.nombre || 'Cliente',
                telefono: this.currentOrder.customerInfo?.telefono || '',
                tipo_pedido: this.currentOrder.deliveryType || 'retiro',
                direccion: this.currentOrder.customerInfo?.direccion || '',
                items: this.currentOrder.items,
                subtotal: subtotal,
                precio_envio: this.currentOrder.deliveryType === 'envío' ? this.settings.precio_envio : 0,
                total: total,
                estado: 'Recibido',
                tiempo_estimado_actual: this.settings.tiempo_base_estimado || 30
            };
            
            await this.db.collection('orders').doc(orderId).set(orderData);
            
            // Resetear pedido
            this.resetOrder();
            
            return orderId;
            
        } catch (error) {
            console.error('Error guardando pedido:', error);
            throw error;
        }
    }
    
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
    
    // ==================== FUNCIONES DE DIAGNÓSTICO ====================
    
    getDiagnostics() {
        return {
            totalProducts: this.products.length,
            currentOrder: this.currentOrder,
            conversationStage: this.conversationStage,
            geminiUsage: this.geminiUsage,
            commonMisspellings: Object.keys(this.commonMisspellings).length
        };
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
            settings.api_key_gemini || '', // Usar Gemini solo si está configurada
            settings,
            products,
            window.db
        );
        
        console.log('✅ Motor Híbrido inicializado');
        console.log('📊 Diagnóstico:', hybridEngine.getDiagnostics());
        
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
window.getHybridDiagnostics = () => hybridEngine ? hybridEngine.getDiagnostics() : null;
window.resetHybridConversation = () => {
    if (hybridEngine) hybridEngine.resetOrder();
};
