class GeminiAssistant {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
        this.context = '';
    }

    async initialize(products, settings) {
        // Construir contexto inicial con menú y reglas
        this.context = `Eres "EL TACHI", asistente virtual de una rotisería. 
        Tono: Amigable, vendedor, claro. No inventes información.
        
        MENÚ DISPONIBLE:
        ${JSON.stringify(products, null, 2)}
        
        REGLAS:
        1. Al primer contacto: saludar y mostrar el menú completo.
        2. Preguntar: "¿Qué te gustaría ordenar?"
        3. Por cada producto: preguntar cantidad y personalización.
        4. Para hamburguesas: "¿Cómo la querés? ¿Con todos los aderezos o alguno específico?"
        5. Ejemplo: Usuario pide 2 hamburguesas:
           - Preguntar: "¿Las dos iguales o diferente?"
           - Si diferente: "Decime cómo querés cada una"
        6. Confirmar resumen antes de tomar datos.
        7. Si preguntan por estado: pedir ID y consultar base.
        8. Horarios: ${settings.horarios}
        9. Envío: $${settings.envios.precio} (${settings.envios.tiempo_min}-${settings.envios.tiempo_max} min)
        10. Retiro: ${settings.envios.retiro_habilitado ? 'Sí, disponible' : 'No disponible'}
        
        RESPUESTAS CORTAS. No más de 3 líneas por mensaje.`;
    }

    async sendMessage(userMessage, orderContext = '') {
        const fullContext = `${this.context}\n\n${orderContext}\n\nCliente: ${userMessage}\nAsistente:`;
        
        try {
            const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    contents: [{
                        parts: [{text: fullContext}]
                    }],
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
            return "Disculpá, estoy teniendo problemas técnicos. ¿Podés repetir?";
        }
    }

    // Método específico para consultar estado
    async checkOrderStatus(orderId, ordersCollection) {
        const context = `El cliente pregunta por el estado del pedido ${orderId}. 
        Buscá en la base de datos y respondé solo con el estado actual. 
        Si no existe: "No encontré ese número de pedido. Verificá el ID."`;
        
        const orders = ordersCollection.map(o => `${o.id}: ${o.estado}`);
        const orderInfo = orders.find(o => o.includes(orderId));
        
        if (!orderInfo) {
            return "No encontré ese número de pedido. Verificá el ID.";
        }
        
        return `Tu pedido ${orderId} está en estado: ${orderInfo.split(':')[1].trim()}`;
    }
}