class GeminiAssistant {
    constructor(apiKey) {
        this.apiKey = AIzaSyDP6ZuOG0TEBM973TVlIO1jrED7CJxTVAk;
        this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
        this.context = '';
    }

    async initialize(products, settings) {
        const categories = {};
        products.forEach(product => {
            if (!categories[product.categoria]) {
                categories[product.categoria] = [];
            }
            categories[product.categoria].push(product);
        });

        const menuText = Object.entries(categories).map(([category, items]) => {
            return `${category.toUpperCase()}:\n${items.map(item => `- ${item.nombre}: $${item.precio}${item.descripcion ? ` (${item.descripcion})` : ''}`).join('\n')}`;
        }).join('\n\n');

        this.context = `Eres "EL TACHI", el asistente virtual de una rotisería. 

TONO Y COMPORTAMIENTO:
- Amigable, entusiasta y vendedor
- Claro y conciso (respuestas cortas, máximo 3 líneas)
- Nunca inventes información
- Confirma siempre los pedidos personalizados
- Sé paciente con los clientes

MENÚ ACTUAL:
${menuText}

HORARIOS:
Lunes a Jueves: ${settings.horarios?.lunes?.inicio || '10:00'} a ${settings.horarios?.lunes?.cierre || '23:00'}
Viernes: ${settings.horarios?.viernes?.inicio || '10:00'} a ${settings.horarios?.viernes?.cierre || '00:00'}
Sábado: ${settings.horarios?.sabado?.inicio || '11:00'} a ${settings.horarios?.sabado?.cierre || '00:00'}
Domingo: ${settings.horarios?.domingo?.inicio || '11:00'} a ${settings.horarios?.domingo?.cierre || '22:00'}

PRECIOS ENVÍO: $${settings.envios?.precio || 300} (${settings.envios?.tiempo_min || 30}-${settings.envios?.tiempo_max || 45} min)
RETIRO: ${settings.envios?.retiro_habilitado ? 'Disponible' : 'No disponible'}

REGLAS DE PEDIDOS:
1. Al primer contacto: Saludar y mostrar menú completo
2. Preguntar: "¿Qué te gustaría ordenar?"
3. Por cada producto: preguntar cantidad y personalización
4. Hamburguesas: Preguntar "¿Cómo la querés? ¿Con todos los aderezos o alguno específico?"
5. Ejemplo: Usuario pide 2 hamburguesas: preguntar "¿Las dos iguales o diferente?" Si diferente: "Decime cómo querés cada una"
6. Confirmar resumen antes de tomar datos del cliente
7. Si preguntan por estado: pedir ID y consultar base de datos
8. Horarios: Verificar antes de aceptar pedidos
9. Envío o retiro: Preguntar preferencia

DATOS DEL CLIENTE (OBLIGATORIOS):
- Nombre completo
- Teléfono
- Envío o retiro
- Dirección (si es envío)

RESUMEN DEL PEDIDO (OBLIGATORIO):
- Listar cada item con cantidad y personalización
- Subtotal
- Costo de envío (si aplica)
- TOTAL FINAL

EJEMPLO DE RESPUESTA INICIAL:
"¡Hola! 👋 Soy EL TACHI, tu asistente de pedidos. Te muestro nuestro menú completo:

[MOSTRAR MENÚ]

¿Qué te gustaría ordenar? Podés personalizar cada producto a tu gusto. 🍔"

EJEMPLO DE RESPUESTA A PEDIDO:
"Perfecto! ¿Querés envío a domicilio ($${settings.envios?.precio || 300}) o retiro en el local?"`;

        console.log('Gemini Assistant initialized with context');
    }

    async sendMessage(userMessage, orderContext = '') {
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
                    },
                    safetySettings: [
                        {
                            category: "HARM_CATEGORY_HARASSMENT",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        },
                        {
                            category: "HARM_CATEGORY_HATE_SPEECH",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        }
                    ]
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                return data.candidates[0].content.parts[0].text;
            } else {
                throw new Error('Invalid response format from Gemini API');
            }
            
        } catch (error) {
            console.error('Error calling Gemini API:', error);
            
            // Fallback responses
            const fallbackResponses = [
                "¡Hola! Soy EL TACHI. Nuestro menú incluye hamburguesas, pizzas, acompañamientos y bebidas. ¿Qué te gustaría ordenar?",
                "Disculpá, estoy teniendo problemas técnicos. ¿Podés contarme qué te gustaría pedir?",
                "¡Bienvenido! Te ayudo con tu pedido. ¿En qué puedo asistirte?"
            ];
            
            return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
        }
    }

    async checkOrderStatus(orderId, ordersCollection) {
        // This is a simplified version - in production, you'd query Firestore
        return `Para consultar el estado de tu pedido ${orderId}, necesito acceder a la base de datos. Por favor, proporcioná el número de pedido completo (ej: TACHI-000123) y te ayudo.`;
    }
}

// Export for global use
window.GeminiAssistant = GeminiAssistant;
