class GeminiAssistant {
    constructor(apiKey) {
        this.apiKey = apiKey || 'AIzaSyDP6ZuOG0TEBM973TVlIO1jrED7CJxTVAk';
        this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
        this.context = '';
        console.log('GeminiAssistant inicializado');
    }

    async initialize(products, settings) {
        console.log('Inicializando Gemini con productos:', products?.length || 0);
        
        let menuText = "🍔 **MENÚ EL TACHI** 🍔\n\n";
        
        if (products && products.length > 0) {
            const categories = {};
            products.forEach(product => {
                if (!categories[product.categoria]) {
                    categories[product.categoria] = [];
                }
                categories[product.categoria].push(product);
            });
            
            Object.entries(categories).forEach(([category, items]) => {
                menuText += `**${category.toUpperCase()}:**\n`;
                items.forEach(item => {
                    menuText += `• ${item.nombre} - $${item.precio}`;
                    if (item.descripcion) {
                        menuText += ` (${item.descripcion})`;
                    }
                    menuText += '\n';
                });
                menuText += '\n';
            });
        } else {
            menuText = `**MENÚ DE EJEMPLO:**\n\n` +
                      `🍔 **HAMBURGUESAS:**\n` +
                      `• Hamburguesa Clásica - $2500\n` +
                      `• Hamburguesa Doble - $3200\n\n` +
                      `🍟 **ACOMPAÑAMIENTOS:**\n` +
                      `• Papas Fritas - $1200\n` +
                      `• Papas con Cheddar - $1800\n\n` +
                      `🥤 **BEBIDAS:**\n` +
                      `• Coca-Cola 500ml - $800\n` +
                      `• Agua Mineral - $500\n\n`;
        }

        this.context = `Eres "EL TACHI", el asistente virtual de una rotisería argentina.

**TU PERSONALIDAD:**
- Amigable, entusiasta y servicial
- Hablas como un vendedor de barrio
- Usas emojis ocasionalmente 🍔👍
- Responde en español rioplatense
- Sé conciso (máximo 3 líneas por respuesta)

**INFORMACIÓN DEL NEGOCIO:**
${menuText}

**HORARIOS:**
Lunes a Jueves: ${settings?.horarios?.lunes?.inicio || '10:00'} - ${settings?.horarios?.lunes?.cierre || '23:00'}
Viernes: ${settings?.horarios?.viernes?.inicio || '10:00'} - ${settings?.horarios?.viernes?.cierre || '00:00'}
Sábado: ${settings?.horarios?.sabado?.inicio || '11:00'} - ${settings?.horarios?.sabado?.cierre || '00:00'}
Domingo: ${settings?.horarios?.domingo?.inicio || '11:00'} - ${settings?.horarios?.domingo?.cierre || '22:00'}

**ENVÍOS:**
- Precio: $${settings?.envios?.precio || 300}
- Tiempo: ${settings?.envios?.tiempo_min || 30}-${settings?.envios?.tiempo_max || 45} minutos
- Retiro: ${settings?.envios?.retiro_habilitado ? 'SÍ ✅' : 'NO ❌'}

**PROTOCOLO DE PEDIDOS:**
1. SALUDO: "¡Hola! Soy EL TACHI, tu asistente de pedidos" + mostrar menú
2. PREGUNTAR: "¿Qué te gustaría ordenar hoy?"
3. Por cada producto: preguntar cantidad y personalización
4. Hamburguesas: "¿Cómo la querés? ¿Con todos los aderezos o personalizada?"
5. Si pide 2+ hamburguesas: "¿Todas iguales o diferentes?"
6. CONFIRMAR: Mostrar resumen completo con total
7. DATOS: Pedir nombre, teléfono, envío/retiro, dirección
8. FINALIZAR: Dar opción de WhatsApp

**NO INVENTES:** Si no sabés algo, decí "Consultalo por WhatsApp"

**EJEMPLO DE RESPUESTA INICIAL:**
"¡Hola! 👋 Soy EL TACHI, tu asistente de pedidos. Te muestro nuestro menú completo:

${menuText}

¿Qué se te antoja hoy? Podés personalizar cada producto a tu gusto. 🍔"

**FORMATO DE RESUMEN:**
Resumen del pedido:
- Producto x1 (personalización)
- Otro producto x2
Total: $XXXX

¿Listo para continuar?`;

        console.log('Contexto Gemini cargado');
        return true;
    }

    async sendMessage(userMessage, orderContext = '') {
        console.log('Gemini recibió mensaje:', userMessage.substring(0, 50));
        
        // Si no hay API Key real, usar respuestas predefinidas
        if (!this.apiKey || this.apiKey.includes('TU_API_KEY')) {
            return this.getFallbackResponse(userMessage);
        }
        
        const fullPrompt = `${this.context}\n\n${orderContext}\n\nCliente: ${userMessage}\n\nAsistente EL TACHI:`;
        
        try {
            const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: fullPrompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 200,
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                return data.candidates[0].content.parts[0].text;
            } else {
                throw new Error('Respuesta inválida de Gemini');
            }
            
        } catch (error) {
            console.warn('Error en Gemini, usando fallback:', error);
            return this.getFallbackResponse(userMessage);
        }
    }

    getFallbackResponse(userMessage) {
        const msg = userMessage.toLowerCase();
        
        if (msg.includes('hola') || msg.includes('buenas')) {
            return "¡Hola! 👋 Soy EL TACHI, tu asistente de pedidos.\n\n" +
                   "🍔 **MENÚ RÁPIDO:**\n" +
                   "• Hamburguesas desde $2500\n" +
                   "• Pizzas desde $2800\n" +
                   "• Acompañamientos desde $1200\n" +
                   "• Bebidas desde $500\n\n" +
                   "¿Qué te gustaría ordenar?";
        }
        
        if (msg.includes('menú') || msg.includes('carta')) {
            return "📋 **MENÚ COMPLETO:**\n\n" +
                   "🍔 **HAMBURGUESAS:**\n" +
                   "• Clásica: $2500 (carne, queso, tomate, lechuga)\n" +
                   "• Doble: $3200 (doble carne, doble queso, panceta)\n\n" +
                   "🍕 **PIZZAS:**\n" +
                   "• Muzzarella: $2800\n" +
                   "• Napolitana: $3200\n\n" +
                   "🍟 **ACOMPAÑAMIENTOS:**\n" +
                   "• Papas Fritas: $1200\n" +
                   "• Papas con Cheddar: $1800\n\n" +
                   "🥤 **BEBIDAS:**\n" +
                   "• Coca-Cola 500ml: $800\n" +
                   "• Agua Mineral: $500\n\n" +
                   "¿Qué se te antoja?";
        }
        
        if (msg.includes('hora') || msg.includes('abierto')) {
            return "⏰ **HORARIOS:**\n" +
                   "Lunes a Jueves: 10:00 - 23:00\n" +
                   "Viernes: 10:00 - 00:00\n" +
                   "Sábado: 11:00 - 00:00\n" +
                   "Domingo: 11:00 - 22:00\n\n" +
                   "🚚 **Envío:** $300 (30-45 min)\n" +
                   "🏪 **Retiro:** Disponible";
        }
        
        if (msg.includes('pedido') || msg.includes('ordenar') || msg.includes('quiero')) {
            return "¡Perfecto! ¿Qué te gustaría pedir? Por ejemplo:\n" +
                   "- 2 hamburguesas clásicas\n" +
                   "- 1 porción de papas fritas\n" +
                   "- 1 Coca-Cola\n\n" +
                   "Podés personalizar cada producto. 🍔";
        }
        
        return "¡Hola! Soy EL TACHI. ¿Te gustaría ver el menú o hacer un pedido?";
    }
}

// Asegurar que esté disponible globalmente
if (typeof window !== 'undefined') {
    window.GeminiAssistant = GeminiAssistant;
    console.log('GeminiAssistant registrado globalmente');
}
