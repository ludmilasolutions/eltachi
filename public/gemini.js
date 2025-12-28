// ===============================
// CONFIGURACIÓN
// ===============================
const GEMINI_API_KEY = 'AIzaSyDP6ZuOG0TEBM973TVlIO1jrED7CJxTVAk'; // <-- PEGÁ TU KEY ACÁ


// ===============================
// CLASE GEMINI ASSISTANT
// ===============================
class GeminiAssistant {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.apiUrl =
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
        this.context = '';
    }

    async initialize(products, settings) {
        this.context = `Eres "EL TACHI", asistente virtual de una rotisería.
Tono: Amigable, vendedor, claro. No inventes información.

MENÚ DISPONIBLE:
${JSON.stringify(products, null, 2)}

REGLAS:
1. Al primer contacto: saludar y mostrar el menú completo.
2. Preguntar: "¿Qué te gustaría ordenar?"
3. Por cada producto: preguntar cantidad y personalización.
4. Para hamburguesas: "¿Cómo la querés? ¿Con todos los aderezos o alguno específico?"
5. Si pide más de una hamburguesa:
   - Preguntar: "¿Las querés iguales o diferentes?"
6. Confirmar resumen antes de tomar datos del cliente.
7. Estado del pedido: pedir ID y responder estado.
8. Horarios: ${settings.horarios}
9. Envío: $${settings.envios.precio} (${settings.envios.tiempo_min}-${settings.envios.tiempo_max} min)
10. Retiro: ${settings.envios.retiro_habilitado ? 'Sí disponible' : 'No disponible'}

RESPUESTAS CORTAS. Máximo 3 líneas.`;
    }

    async sendMessage(userMessage, orderContext = '') {
        const fullContext = `
${this.context}

PEDIDO ACTUAL:
${orderContext}

Cliente: ${userMessage}
Asistente:
        `;

        try {
            const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [{ text: fullContext }]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 150
                    }
                })
            });

            const data = await response.json();
            return data.candidates[0].content.parts[0].text;
        } catch (error) {
            console.error('Error Gemini:', error);
            return "Disculpá, tuve un problema técnico. ¿Podés repetir?";
        }
    }

    async checkOrderStatus(orderId, ordersCollection) {
        const order = ordersCollection.find(o => o.id === orderId);
        if (!order) {
            return "No encontré ese número de pedido. Verificá el ID.";
        }
        return `Tu pedido ${orderId} está en estado: ${order.estado}`;
    }
}


// ===============================
// EJEMPLO DE USO
// ===============================
(async () => {
    const assistant = new GeminiAssistant(GEMINI_API_KEY);

    const products = [
        { nombre: "Hamburguesa completa", precio: 3500 },
        { nombre: "Hamburguesa simple", precio: 3000 },
        { nombre: "Milanesa con papas", precio: 4200 }
    ];

    const settings = {
        horarios: "Todos los días de 19 a 23 hs",
        envios: {
            precio: 800,
            tiempo_min: 30,
            tiempo_max: 45,
            retiro_habilitado: true
        }
    };

    await assistant.initialize(products, settings);

    const respuesta = await assistant.sendMessage("Hola");
    console.log("EL TACHI:", respuesta);
})();
