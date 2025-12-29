// Motor de conversación con Gemini 2.5 Flash
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
        
        console.log('🚀 ConversationEngine creado');
        console.log('🏪 Local:', settings.nombre_local);
        console.log('📦 Productos cargados:', products.length);
        console.log('🔑 API Key:', apiKey ? 'Configurada' : 'No configurada');
    }
    
    // Generar prompt para Gemini
    generateSystemPrompt() {
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
"Como asistente virtual..."
"Selecciona una opción"
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

Tomas el producto estándar.

👋 PRIMER MENSAJE (OBLIGATORIO)

Cuando el cliente inicia la conversación, respondes:

Saludo
Te presentas como atención de EL TACHI
Muestras la carta completa (desde la base de datos)
Informas:
Tiempo estimado actual
Precio de envío
Opción retiro en el local
Aclaras una sola vez:
"Si necesitas cambiar algo del pedido, avísame"

⚠️ No volver a insistir con eso.

🍔 TOMA DE PEDIDOS

Cuando el cliente pide productos:
Confirmas lo que pidió, de forma corta
NO ofreces agregados
NO ofreces combos
NO ofreces cambios

IMPORTANTE: Cuando el cliente pida un producto genérico (ej: "hamburguesa", "papas", "bebida"), 
tienes que preguntarle cuál de las opciones disponibles quiere mostrando las opciones de esa categoría.

Ejemplo correcto:
Cliente: "Quiero una hamburguesa"
Tú: "Tenemos estas hamburguesas:
- Hamburguesa Clásica: $1200
- Hamburguesa Especial: $1500
¿Cuál quieres?"

SOLO después de que el cliente especifique, confirmas el producto.

🧂 CAMBIOS Y ADEREZOS (SOLO SI EL CLIENTE LOS PIDE)

Si el cliente pide un cambio:
Confirmas exactamente lo que pidió
NO ofreces otros cambios
NO preguntas "algo más para agregarle"

Ejemplo correcto:
Cliente: "Una hamburguesa sin tomate"
Tú:
"Perfecto, hamburguesa sin tomate. ¿Algo más?"

🔢 PEDIDOS MÚLTIPLES

Si el cliente pide más de una unidad y menciona cambios:
Confirmas cada unidad por separado
Detallas textualmente

Ejemplo:
"Entonces serían:
1 hamburguesa sin tomate
1 hamburguesa común
¿Está bien así?"

📄 RESUMEN FINAL (OBLIGATORIO)

Antes de cerrar el pedido, siempre muestras un resumen claro:

Pedido:
- Hamburguesa x1 (sin tomate)
- Hamburguesa x1 (común)
- Papas fritas x1

Total: $XXXX

Después preguntas:
"¿Confirmamos así?"

🧑‍💼 DATOS DEL CLIENTE (PEDIDOS COMO PERSONA)

Una vez confirmado el pedido, pides los datos de forma natural, no como formulario:

Nombre
Teléfono
¿Es para envío o retiro?

Si es envío:
Dirección completa

Luego repites todo y preguntas:
"¿Está todo correcto?"

🕒 HORARIOS (OBLIGATORIO)

Antes de tomar pedidos:
Consultas el estado del local
Si está cerrado:
Respondes el mensaje configurado
❌ NO tomas pedidos
❌ NO ofreces nada

📦 CONFIRMACIÓN FINAL

Cuando el pedido se guarda correctamente:
Informas el ID del pedido
Informas el tiempo estimado actual
Cierras con algo humano

Ejemplo:
"Listo 🙌
Tu pedido quedó registrado con el ID TACHI-000123.
El tiempo estimado es de 35 minutos.
Cualquier cosa escríbeme."

🔍 CONSULTA DE ESTADO

Si el cliente escribe algo parecido a un ID:
Detectas el ID
Consultas el pedido
Respondes solo:
Estado actual
Tiempo estimado (si existe)

Ejemplo:
"Tu pedido TACHI-000123 está en preparación.
Te avisamos cuando esté listo 👌"

❌ COSAS PROHIBIDAS ABSOLUTAMENTE

Decir que eres IA
Decir que eres bot
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
- Horarios: ${Object.entries(this.settings.horarios_por_dia || {}).map(([day, hours]) => `${day}: ${hours}`).join(', ')}

ESTADO DE LA CONVERSACIÓN: ${this.conversationStage}
${this.currentOrder.items.length > 0 ? `PEDIDO ACTUAL EN PROCESO:\n${this.generateCurrentOrderSummary()}` : 'Aún no hay pedido'}

Ahora responde al cliente de forma natural, siguiendo todas las reglas anteriores.`;
    }
    
    // Generar lista de productos
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
        console.log(`💬 Mensaje recibido: "${userMessage}"`);
        console.log(`📊 Etapa actual: ${this.conversationStage}`);
        
        // Verificar si el local está abierto
        if (!this.settings.abierto) {
            console.log('🏪 Local cerrado, mostrando mensaje de cerrado');
            return this.settings.mensaje_cerrado;
        }
        
        // Si hay una clarificación pendiente, procesarla primero
        if (this.pendingClarification) {
            console.log('🔍 Procesando clarificación pendiente');
            return this.handleProductClarification(userMessage);
        }
        
        // Verificar si es un ID de pedido
        const orderIdMatch = userMessage.match(/TACHI-\d{6}/i);
        if (orderIdMatch) {
            console.log(`🔍 Consultando estado del pedido: ${orderIdMatch[0]}`);
            return await this.handleOrderStatusQuery(orderIdMatch[0].toUpperCase());
        }
        
        // Agregar al historial ANTES de procesar
        this.conversationHistory.push({
            role: 'user',
            parts: [{ text: userMessage }]
        });
        
        // Limitar historial
        this.trimConversationHistory();
        
        // Determinar etapa de conversación
        this.updateConversationStage(userMessage);
        
        // Intentar usar Gemini si hay API Key
        if (this.apiKey && this.apiKey.trim() !== '') {
            try {
                console.log('🤖 Llamando a Gemini API...');
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
                
                console.log('✅ Respuesta generada exitosamente');
                return response;
                
            } catch (error) {
                console.error('❌ Error con Gemini API:', error.message);
                // Continuar con fallback si Gemini falla
            }
        }
        
        // Fallback: usar lógica interna
        console.log('🔄 Usando lógica interna (fallback)');
        const fallbackResponse = this.getFallbackResponse(userMessage);
        
        // Agregar al historial
        this.conversationHistory.push({
            role: 'model',
            parts: [{ text: fallbackResponse }]
        });
        
        return fallbackResponse;
    }
    
    // Llamar a Gemini API
    async callGeminiAPI(userMessage) {
        if (!this.apiKey || this.apiKey.trim() === '') {
            throw new Error('API Key de Gemini no configurada');
        }
        
        const model = 'gemini-2.5-flash';
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
        
        // Construir el historial en el formato correcto
        const contents = [];
        
        // Agregar el prompt del sistema como primer mensaje
        contents.push({
            role: "user",
            parts: [{ text: this.generateSystemPrompt() }]
        });
        
        // Agregar historial de conversación
        if (this.conversationHistory.length > 0) {
            // Tomar solo los últimos 6 intercambios para no exceder tokens
            const recentHistory = this.conversationHistory.slice(-6);
            recentHistory.forEach(msg => {
                contents.push({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.parts[0].text }]
                });
            });
        }
        
        // Agregar el mensaje actual del usuario
        contents.push({
            role: "user",
            parts: [{ text: userMessage }]
        });
        
        const payload = {
            contents: contents,
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 800,
            }
        };
        
        console.log('📤 Enviando solicitud a Gemini:', {
            model: model,
            mensajes: contents.length,
            tokensEstimados: JSON.stringify(payload).length / 4
        });
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error Gemini API:', response.status, errorText);
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            console.error('Respuesta inválida de Gemini:', data);
            throw new Error('Respuesta inválida de la API');
        }
        
        return data.candidates[0].content.parts[0].text;
    }
    
    // Verificar si necesita clarificación de producto
    checkIfNeedsClarification(userMessage, aiResponse) {
        const lowerMessage = userMessage.toLowerCase();
        
        // Buscar categorías en el mensaje del usuario
        const categories = this.getCategoriesFromMessage(lowerMessage);
        
        if (categories.length > 0) {
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
        const categoryKeywords = {
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
            'postres': 'postres',
            'entrada': 'entradas',
            'entradas': 'entradas'
        };
        
        Object.keys(categoryKeywords).forEach(keyword => {
            if (message.includes(keyword)) {
                categories.push(categoryKeywords[keyword]);
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
    
    // Procesar mensaje para extraer información del pedido
    async processOrderFromMessage(userMessage, aiResponse) {
        const lowerMessage = userMessage.toLowerCase();
        
        // Detectar productos en el mensaje
        const detectedProducts = this.detectProductsInMessage(userMessage);
        
        if (detectedProducts.length > 0) {
            console.log(`📦 Productos detectados: ${detectedProducts.length}`);
            detectedProducts.forEach(product => {
                this.addToOrder(product);
            });
        }
        
        // Detectar si el usuario confirma
        if (lowerMessage.includes('sí') || lowerMessage.includes('si') || 
            lowerMessage.includes('confirm') || lowerMessage.includes('correcto') ||
            lowerMessage.includes('dale') || lowerMessage.includes('ok')) {
            
            if (this.conversationStage === 'confirming' && this.currentOrder.items.length > 0) {
                console.log('✅ Confirmación recibida, guardando pedido...');
                try {
                    const orderId = await this.saveOrderToFirebase();
                    console.log(`📝 Pedido guardado: ${orderId}`);
                    
                    // Actualizar el historial con la confirmación
                    const confirmationMsg = `¡Perfecto! Tu pedido ha sido registrado con el ID ${orderId}. Tiempo estimado: ${this.settings.tiempo_base_estimado} minutos. ¡Gracias por tu compra!`;
                    
                    this.conversationHistory.push({
                        role: 'model',
                        parts: [{ text: confirmationMsg }]
                    });
                    
                    return confirmationMsg;
                } catch (error) {
                    console.error('❌ Error guardando pedido:', error);
                    return 'Hubo un error al guardar tu pedido. Por favor, intentá de nuevo.';
                }
            }
        }
        
        // Detectar información del cliente
        this.extractCustomerInfo(userMessage);
        
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
                
                // Buscar cantidad (ej: "2 hamburguesas")
                const quantityMatch = message.match(/(\d+)\s*[x\*]?\s*([a-zA-ZáéíóúñÁÉÍÓÚÑ\s]+)/i);
                if (quantityMatch && quantityMatch[1]) {
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
    extractCustomerInfo(userMessage) {
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
            lowerMessage.includes('casa') || lowerMessage.includes('dirección') ||
            lowerMessage.includes('entrega')) {
            this.currentOrder.deliveryType = 'envío';
            console.log('🚚 Tipo de pedido: Envío');
        } else if (lowerMessage.includes('retiro') || lowerMessage.includes('local') || 
                   lowerMessage.includes('pasar') || lowerMessage.includes('buscar') ||
                   lowerMessage.includes('voy')) {
            this.currentOrder.deliveryType = 'retiro';
            console.log('🏪 Tipo de pedido: Retiro');
        }
        
        // Detectar teléfono (búsqueda simple de números)
        const phoneMatch = userMessage.match(/(\d{8,15})/);
        if (phoneMatch) {
            this.currentOrder.customerInfo.telefono = phoneMatch[1];
            console.log('📱 Teléfono detectado:', phoneMatch[1]);
        }
        
        // Detectar nombre
        if (lowerMessage.includes('me llamo') || lowerMessage.includes('soy ') || 
            lowerMessage.includes('nombre es') || lowerMessage.includes('me llamo')) {
            const nameMatch = userMessage.match(/(?:me llamo|soy|nombre es)\s+([A-Za-zÁÉÍÓÚáéíóúÑñ\s]{2,})/i);
            if (nameMatch && nameMatch[1]) {
                this.currentOrder.customerInfo.nombre = nameMatch[1].trim();
                console.log('👤 Nombre detectado:', nameMatch[1].trim());
            }
        }
        
        // Detectar dirección (simplificado)
        if (lowerMessage.includes('calle') || lowerMessage.includes('av.') || 
            lowerMessage.includes('avenida') || lowerMessage.includes('número') ||
            lowerMessage.includes('nº') || lowerMessage.includes('nro') || 
            lowerMessage.includes('dirección')) {
            
            // Extraer posible dirección (tomar varias palabras después de la palabra clave)
            const addressKeywords = ['calle', 'av.', 'avenida', 'número', 'nº', 'nro', 'dirección'];
            for (const keyword of addressKeywords) {
                const keywordIndex = lowerMessage.indexOf(keyword);
                if (keywordIndex !== -1) {
                    const addressPart = userMessage.substring(keywordIndex);
                    if (addressPart.length > 10) {
                        this.currentOrder.customerInfo.direccion = addressPart;
                        console.log('📍 Dirección detectada:', addressPart.substring(0, 50) + '...');
                        break;
                    }
                }
            }
        }
    }
    
    // Respuesta de fallback
    getFallbackResponse(userMessage) {
        const lowerMessage = userMessage.toLowerCase();
        
        console.log(`🔄 Fallback para: "${lowerMessage.substring(0, 50)}..."`);
        
        // Primer mensaje - Mostrar menú
        if (this.conversationHistory.length <= 2 && 
            (lowerMessage.includes('hola') || lowerMessage.includes('buenas') || 
             lowerMessage.includes('buenos') || lowerMessage.includes('buen día') ||
             lowerMessage.includes('buenas tardes') || lowerMessage.includes('buenas noches'))) {
            
            const menu = this.generateSimpleMenu();
            return `¡Hola! 👋 Soy la atención de EL TACHI.\n\n${menu}\n\n⏱️ *Tiempo estimado:* ${this.settings.tiempo_base_estimado} minutos\n🚚 *Envío:* $${this.settings.precio_envio}\n🏪 *Retiro:* ${this.settings.retiro_habilitado ? 'Sí' : 'No'}\n\nSi necesitás cambiar algo del pedido, avisame.`;
        }
        
        // Pedir menú o carta
        if (lowerMessage.includes('menú') || lowerMessage.includes('carta') || 
            lowerMessage.includes('ver') || lowerMessage.includes('mostrar') ||
            lowerMessage.includes('qué tienen') || lowerMessage.includes('que tienen')) {
            return `*NUESTRA CARTA*\n\n${this.generateSimpleMenu()}\n\n¿Qué te gustaría ordenar?`;
        }
        
        // Verificar si pide un producto genérico
        const categories = this.getCategoriesFromMessage(lowerMessage);
        if (categories.length > 0) {
            for (const category of categories) {
                const productsInCategory = this.getProductsByCategory(category);
                if (productsInCategory.length > 1) {
                    let clarificationText = `¿Cuál ${category} querés? Tenemos:\n`;
                    productsInCategory.forEach(product => {
                        clarificationText += `• ${product.nombre}: $${product.precio}`;
                        if (product.descripcion) {
                            clarificationText += ` (${product.descripcion})`;
                        }
                        clarificationText += `\n`;
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
        
        // Buscar producto específico
        for (const product of this.products) {
            const productNameLower = product.nombre.toLowerCase();
            if (lowerMessage.includes(productNameLower) && product.disponible) {
                // Buscar cantidad
                let quantity = 1;
                const quantityMatch = userMessage.match(/(\d+)\s*[x\*]?\s*([a-zA-ZáéíóúñÁÉÍÓÚÑ\s]+)/i);
                if (quantityMatch && quantityMatch[1]) {
                    quantity = parseInt(quantityMatch[1]);
                }
                
                // Buscar modificaciones
                let modifications = null;
                if (product.aderezos_disponibles && product.aderezos_disponibles.length > 0) {
                    for (const aderezo of product.aderezos_disponibles) {
                        if (lowerMessage.includes(aderezo.toLowerCase())) {
                            modifications = aderezo;
                            break;
                        }
                    }
                }
                
                this.addToOrder({
                    productId: product.id,
                    nombre: product.nombre,
                    precio: product.precio,
                    cantidad: quantity,
                    modificaciones: modifications
                });
                
                if (modifications) {
                    return `Perfecto, ${quantity > 1 ? quantity + ' ' : ''}${product.nombre} ${modifications.toLowerCase()}. ¿Algo más?`;
                } else {
                    return `Perfecto, ${quantity > 1 ? quantity + ' ' : ''}${product.nombre}. ¿Algo más?`;
                }
            }
        }
        
        // Finalizar pedido
        if (lowerMessage.includes('nada más') || lowerMessage.includes('eso es todo') || 
            lowerMessage.includes('listo') || lowerMessage.includes('terminé') ||
            lowerMessage.includes('nada mas') || lowerMessage.includes('eso es')) {
            
            if (this.currentOrder.items.length === 0) {
                return 'No tengo ningún producto en tu pedido. ¿Qué te gustaría ordenar?';
            }
            
            const summary = this.generateOrderSummaryText();
            this.conversationStage = 'asking_info';
            return `*RESUMEN DE PEDIDO*\n\n${summary}\n\n¿Es para envío o retiro en el local?`;
        }
        
        // Confirmar tipo de entrega
        if (lowerMessage.includes('envío') || lowerMessage.includes('domicilio') || 
            lowerMessage.includes('casa') || lowerMessage.includes('entrega')) {
            this.currentOrder.deliveryType = 'envío';
            this.conversationStage = 'confirming';
            return 'Perfecto, para envío a domicilio. ¿Me podrías dar:\n\n1. Tu nombre\n2. Teléfono\n3. Dirección completa\n\n(Podés poner todo en un solo mensaje)';
        }
        
        if (lowerMessage.includes('retiro') || lowerMessage.includes('local') || 
            lowerMessage.includes('pasar') || lowerMessage.includes('buscar') ||
            lowerMessage.includes('voy a buscar')) {
            this.currentOrder.deliveryType = 'retiro';
            this.conversationStage = 'confirming';
            return 'Perfecto, para retiro en el local. ¿Me podrías dar:\n\n1. Tu nombre\n2. Teléfono';
        }
        
        // Confirmación final del pedido
        if ((lowerMessage.includes('sí') || lowerMessage.includes('si') || 
             lowerMessage.includes('confirm') || lowerMessage.includes('correcto') ||
             lowerMessage.includes('dale') || lowerMessage.includes('ok') ||
             lowerMessage.includes('confirmo') || lowerMessage.includes('listo')) &&
            this.conversationStage === 'confirming' && this.currentOrder.items.length > 0) {
            
            // Guardar pedido
            return this.saveOrderToFirebase().then(orderId => {
                return `¡Perfecto! Tu pedido ha sido registrado con el ID ${orderId}. Tiempo estimado: ${this.settings.tiempo_base_estimado} minutos. ¡Gracias por tu compra!`;
            }).catch(error => {
                console.error('Error guardando pedido:', error);
                return 'Hubo un error al guardar tu pedido. Por favor, intentá de nuevo.';
            });
        }
        
        // Si ya tenemos información del cliente y estamos confirmando
        if (this.conversationStage === 'confirming' && this.currentOrder.customerInfo) {
            // Verificar si tenemos información suficiente
            const hasName = this.currentOrder.customerInfo.nombre && this.currentOrder.customerInfo.nombre.length > 0;
            const hasPhone = this.currentOrder.customerInfo.telefono && this.currentOrder.customerInfo.telefono.length >= 8;
            const hasAddress = this.currentOrder.deliveryType !== 'envío' || 
                              (this.currentOrder.customerInfo.direccion && this.currentOrder.customerInfo.direccion.length > 0);
            
            if (hasName && hasPhone && hasAddress) {
                // Guardar pedido automáticamente
                return this.saveOrderToFirebase().then(orderId => {
                    return `¡Perfecto! Tu pedido ha sido registrado con el ID ${orderId}. Tiempo estimado: ${this.settings.tiempo_base_estimado} minutos. ¡Gracias por tu compra!`;
                }).catch(error => {
                    console.error('Error guardando pedido:', error);
                    return 'Hubo un error al guardar tu pedido. Por favor, intentá de nuevo.';
                });
            }
        }
        
        // Respuesta por defecto
        if (this.currentOrder.items.length > 0) {
            return '¿Algo más que quieras agregar a tu pedido? (Si ya terminaste, decime "listo")';
        } else {
            return '¿Qué te gustaría ordenar? Si querés ver nuestro menú completo, decime "menú".';
        }
    }
    
    // Generar menú simple
    generateSimpleMenu() {
        let menu = '';
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
            menu += '\n';
        }
        
        return menu;
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
        console.log(`📦 Producto agregado: ${productInfo.nombre} x${productInfo.cantidad}`);
        console.log(`💰 Total actual: $${this.currentOrder.total}`);
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
    
    // Generar ID de pedido
    async generateOrderId() {
        try {
            const counterRef = this.db.collection('counters').doc('orders');
            
            // Usar transacción para evitar duplicados
            let newNumber;
            
            await this.db.runTransaction(async (transaction) => {
                const counterDoc = await transaction.get(counterRef);
                
                if (!counterDoc.exists) {
                    // Crear el contador si no existe
                    transaction.set(counterRef, { lastNumber: 0 });
                    newNumber = 1;
                } else {
                    // Obtener el último número y aumentar
                    const lastNumber = counterDoc.data().lastNumber || 0;
                    newNumber = lastNumber + 1;
                }
                
                // Actualizar el contador
                transaction.update(counterRef, { lastNumber: newNumber });
            });
            
            const paddedNumber = newNumber.toString().padStart(6, '0');
            return `TACHI-${paddedNumber}`;
            
        } catch (error) {
            console.error('Error generando ID de pedido:', error);
            // Fallback: usar timestamp
            const timestamp = Date.now().toString().slice(-6);
            return `TACHI-${timestamp}`;
        }
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
                })),
                precio_envio: tipoPedido === 'envío' ? this.settings.precio_envio : 0,
                total_con_envio: total
            };
            
            console.log('💾 Guardando pedido en Firebase:', {
                id: orderId,
                cliente: orderData.nombre_cliente,
                total: orderData.total,
                items: orderData.items.length
            });
            
            // Guardar en Firebase
            await this.db.collection('orders').doc(orderId).set(orderData);
            
            // Enviar notificación al panel admin
            await this.sendAdminNotification(orderId, orderData.nombre_cliente, total);
            
            // Resetear el pedido actual
            this.resetOrder();
            
            console.log('✅ Pedido guardado exitosamente:', orderId);
            return orderId;
            
        } catch (error) {
            console.error('❌ Error guardando pedido:', error);
            throw error;
        }
    }
    
    // Enviar notificación al panel admin
    async sendAdminNotification(orderId, cliente, total) {
        try {
            await this.db.collection('notifications').add({
                tipo: 'nuevo_pedido',
                mensaje: `Nuevo pedido ${orderId} de ${cliente} por $${total}`,
                pedido_id: orderId,
                fecha: firebase.firestore.FieldValue.serverTimestamp(),
                leido: false
            });
            console.log('📢 Notificación enviada al panel admin');
        } catch (error) {
            console.error('Error enviando notificación:', error);
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
        
        let total = this.currentOrder.total;
        let deliveryText = '';
        
        if (this.currentOrder.deliveryType === 'envío') {
            total += this.settings.precio_envio || 0;
            deliveryText = ` + $${this.settings.precio_envio || 0} de envío`;
        }
        
        summary += `\nTotal: $${total}${deliveryText}`;
        
        return summary;
    }
    
    // Manejar consulta de estado
    async handleOrderStatusQuery(orderId) {
        try {
            console.log('🔍 Consultando estado del pedido:', orderId);
            
            const orderRef = this.db.collection('orders').doc(orderId);
            const orderDoc = await orderRef.get();
            
            if (!orderDoc.exists) {
                console.log('Pedido no encontrado:', orderId);
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
            } else if (order.estado === 'En preparación') {
                response += '\nTu pedido está en preparación. Te avisaremos cuando esté listo.';
            } else if (order.estado === 'Recibido') {
                response += '\nTu pedido ha sido recibido y será preparado pronto.';
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
            (lowerMessage.includes('hola') || lowerMessage.includes('buenas') || 
             lowerMessage.includes('buenos') || lowerMessage.includes('buen día'))) {
            this.conversationStage = 'taking_order';
            console.log('🔄 Cambio de etapa: greeting → taking_order');
        } else if (this.conversationStage === 'taking_order' && 
                  (lowerMessage.includes('nada más') || lowerMessage.includes('eso es todo') ||
                   lowerMessage.includes('listo') || lowerMessage.includes('terminé'))) {
            this.conversationStage = 'asking_info';
            console.log('🔄 Cambio de etapa: taking_order → asking_info');
        } else if (this.conversationStage === 'asking_info' &&
                  (lowerMessage.includes('envío') || lowerMessage.includes('retiro') ||
                   lowerMessage.includes('domicilio') || lowerMessage.includes('local'))) {
            this.conversationStage = 'confirming';
            console.log('🔄 Cambio de etapa: asking_info → confirming');
        }
    }
    
    // Limitar el tamaño del historial
    trimConversationHistory() {
        const maxHistory = 8; // Mantener solo los últimos 8 intercambios
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
        console.log('🔄 Pedido reiniciado');
    }
    
    // Reiniciar conversación completa
    resetConversation() {
        this.conversationHistory = [];
        this.resetOrder();
        console.log('🔄 Conversación reiniciada completamente');
    }
    
    // Obtener estadísticas del pedido actual
    getOrderStats() {
        return {
            items: this.currentOrder.items.length,
            total: this.currentOrder.total,
            stage: this.conversationStage,
            hasCustomerInfo: !!this.currentOrder.customerInfo?.nombre
        };
    }
}

// Crear instancia global
let conversationEngine = null;

// Inicializar motor de conversación
async function initConversationEngine() {
    try {
        console.log('🔄 Inicializando motor de conversación...');
        
        const settings = await getSettings();
        if (!settings) {
            console.error('❌ No se pudo cargar la configuración');
            return null;
        }
        
        const products = await loadAllProducts();
        
        conversationEngine = new ConversationEngine(
            settings.api_key_gemini,
            settings,
            products,
            window.db
        );
        
        console.log('✅ Motor de conversación inicializado correctamente');
        console.log('📊 Resumen:', {
            local: settings.nombre_local,
            productos: products.length,
            apiKey: settings.api_key_gemini ? 'Configurada' : 'No configurada',
            abierto: settings.abierto ? 'Sí' : 'No'
        });
        
        return conversationEngine;
    } catch (error) {
        console.error('❌ Error inicializando motor de conversación:', error);
        return null;
    }
}

// Función para procesar mensaje
async function processMessageWithGemini(message) {
    if (!conversationEngine) {
        console.log('🔄 Inicializando motor de conversación...');
        await initConversationEngine();
    }
    
    if (!conversationEngine) {
        return 'El sistema de conversación no está disponible en este momento. Por favor, intentá más tarde.';
    }
    
    try {
        console.log('💬 Procesando mensaje del usuario...');
        const response = await conversationEngine.processUserMessage(message);
        console.log('✅ Respuesta generada');
        return response;
    } catch (error) {
        console.error('❌ Error procesando mensaje:', error);
        return 'Hubo un error procesando tu mensaje. Por favor, intentá de nuevo.';
    }
}

// Función para obtener el resumen del pedido actual
function getCurrentOrderSummary() {
    if (!conversationEngine || conversationEngine.currentOrder.items.length === 0) {
        return null;
    }
    
    return conversationEngine.generateOrderSummaryText();
}

// Función para obtener el pedido actual (para debugging)
function getCurrentOrder() {
    if (!conversationEngine) {
        return null;
    }
    
    return conversationEngine.currentOrder;
}

// Función para obtener estadísticas
function getConversationStats() {
    if (!conversationEngine) {
        return null;
    }
    
    return conversationEngine.getOrderStats();
}

// Función para reiniciar conversación
function resetConversation() {
    if (conversationEngine) {
        conversationEngine.resetConversation();
        console.log('🔄 Conversación reiniciada');
        return true;
    }
    return false;
}

// Función para probar Gemini API
async function testGeminiAPI(apiKey, message = "Hola, ¿cómo estás?") {
    if (!apiKey || apiKey.trim() === '') {
        return { success: false, error: 'API Key no configurada' };
    }
    
    const model = 'gemini-2.5-flash';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const payload = {
        contents: [
            {
                role: "user",
                parts: [{ text: message }]
            }
        ],
        generationConfig: {
            maxOutputTokens: 100
        }
    };
    
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            return { 
                success: false, 
                error: `Error ${response.status}: ${JSON.stringify(data)}` 
            };
        }
        
        return { 
            success: true, 
            response: data.candidates[0].content.parts[0].text 
        };
        
    } catch (error) {
        return { 
            success: false, 
            error: error.message 
        };
    }
}

// Inicializar cuando Firebase esté listo
if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
    console.log('🔥 Firebase detectado, programando inicialización del motor...');
    
    // Esperar a que todo esté cargado
    setTimeout(async () => {
        try {
            await initConversationEngine();
            console.log('✅ Sistema de pedidos completamente inicializado');
        } catch (error) {
            console.error('❌ Error en inicialización:', error);
        }
    }, 2000);
}

// Exportar para uso global
window.initConversationEngine = initConversationEngine;
window.processMessageWithGemini = processMessageWithGemini;
window.getCurrentOrderSummary = getCurrentOrderSummary;
window.getCurrentOrder = getCurrentOrder;
window.getConversationStats = getConversationStats;
window.resetConversation = resetConversation;
window.testGeminiAPI = testGeminiAPI;
window.ConversationEngine = ConversationEngine;

// Exponer funciones para debugging
window.debugConversationEngine = () => {
    console.log('=== DEBUG CONVERSATION ENGINE ===');
    console.log('Motor inicializado:', conversationEngine !== null);
    
    if (conversationEngine) {
        console.log('📊 Estado actual:');
        console.log('- Etapa:', conversationEngine.conversationStage);
        console.log('- Productos en pedido:', conversationEngine.currentOrder.items.length);
        console.log('- Total:', conversationEngine.currentOrder.total);
        console.log('- Tipo entrega:', conversationEngine.currentOrder.deliveryType);
        console.log('- Cliente:', conversationEngine.currentOrder.customerInfo);
        console.log('- Historial mensajes:', conversationEngine.conversationHistory.length);
        
        // Verificar Firebase
        if (window.db) {
            window.db.collection('orders').get().then(snapshot => {
                console.log('📦 Pedidos en Firebase:', snapshot.size);
            }).catch(err => {
                console.error('Error consultando Firebase:', err);
            });
        }
    }
    
    return conversationEngine;
};

// Agregar listener para carga completa
window.addEventListener('load', () => {
    console.log('🚀 Página completamente cargada');
    console.log('💡 Usa debugConversationEngine() en la consola para ver el estado');
});
