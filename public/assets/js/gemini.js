// Archivo: public/assets/js/gemini.js
class GeminiAssistant {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
        this.context = '';
    }

    async initialize(products, settings) {
        // Formatear menú
        let menuText = "MENÚ DISPONIBLE:\n\n";
        const categories = {};
        
        products.forEach(product => {
            if (!categories[product.categoria]) {
                categories[product.categoria] = [];
            }
            categories[product.categoria].push(product);
        });
        
        Object.entries(categories).forEach(([category, items]) => {
            menuText += `${category.toUpperCase()}:\n`;
            items.forEach(item => {
                menuText += `- ${item.nombre}: $${item.precio}`;
                if (item.descripcion) {
                    menuText += ` (${item.descripcion})`;
                }
                if (item.aderezos_disponibles && item.aderezos_disponibles.length > 0) {
                    menuText += ` [Aderezos: ${item.aderezos_disponibles.join(', ')}]`;
                }
                menuText += "\n";
            });
            menuText += "\n";
        });
        
        this.context = `Eres "EL TACHI", asistente virtual de una rotisería. 
        Tono: Amigable, vendedor, claro. No inventes información.
        
        ${menuText}
        
        REGLAS IMPORTANTES:
        1. Al primer contacto: saludar y mostrar menú completo
        2. Siempre preguntar: "¿Qué te gustaría ordenar?"
        3. Para hamburguesas: preguntar personalización
        4. Confirmar resumen antes de pedir datos
        5. Pedir: nombre, teléfono, tipo (envío/retiro), dirección si es envío
        6. Horarios: ${JSON.stringify(settings.horarios || {})}
        7. Envío: $${settings.envios?.precio || 300} (${settings.envios?.tiempo_min || 30}-${settings.envios?.tiempo_max || 45} min)
        8. Retiro: ${settings.envios?.retiro_habilitado ? 'Disponible' : 'No disponible'}
        
        Responde siempre en español. Sé conciso.`;
        
        return true;
    }

    async sendMessage(userMessage, orderContext = '') {
        if (!this.apiKey || this.apiKey.includes('TU_API_KEY')) {
            // Fallback si no hay API key
            return this.getFallbackResponse(userMessage);
        }
        
        const fullPrompt = `${this.context}\n\n${orderContext}\n\nCliente: ${userMessage}\nAsistente:`;
        
        try {
            const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    contents: [{
                        parts: [{text: fullPrompt}]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 150
                    }
                })
            });

            const data = await response.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text || 
                   "¡Hola! ¿En qué puedo ayudarte con tu pedido?";
        } catch (error) {
            console.error('Error Gemini:', error);
            return this.getFallbackResponse(userMessage);
        }
    }

    getFallbackResponse(userMessage) {
        const lowerMsg = userMessage.toLowerCase();
        
        if (lowerMsg.includes('hola') || lowerMsg.includes('buenas')) {
            return "¡Hola! 👋 Soy EL TACHI. Te muestro nuestro menú:\n\n🍔 Hamburguesas desde $2500\n🍕 Pizzas desde $2800\n🍟 Acompañamientos desde $1200\n🥤 Bebidas desde $500\n\n¿Qué te gustaría ordenar?";
        }
        
        if (lowerMsg.includes('menú') || lowerMsg.includes('carta')) {
            return "📋 MENÚ EL TACHI:\n\n🍔 HAMBURGUESAS:\n- Hamburguesa Clásica: $2500\n- Hamburguesa Doble: $3200\n\n🍕 PIZZAS:\n- Pizza Muzzarella: $2800\n- Pizza Napolitana: $3200\n\n🍟 ACOMPAÑAMIENTOS:\n- Papas Fritas: $1200\n- Papas con Cheddar: $1800\n\n🥤 BEBIDAS:\n- Coca-Cola 500ml: $800\n- Agua Mineral: $500\n\n¿Qué te gustaría pedir?";
        }
        
        if (lowerMsg.includes('horario') || lowerMsg.includes('hora')) {
            return "⏰ HORARIOS:\nLunes a Jueves: 10:00 a 23:00\nViernes: 10:00 a 00:00\nSábado: 11:00 a 00:00\nDomingo: 11:00 a 22:00\n\n🚚 Envío: $300 (30-45 min)\n🏪 Retiro: Disponible";
        }
        
        return "¡Hola! Soy EL TACHI, tu asistente de pedidos. ¿Te gustaría ver el menú o hacer un pedido?";
    }
}

// Exportar para uso global
window.GeminiAssistant = GeminiAssistant;
