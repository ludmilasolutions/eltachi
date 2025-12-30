// Motor de Gemini - Solo para ayuda contextual opcional
class GeminiEngine {
    constructor(apiKey, settings, products) {
        this.apiKey = apiKey;
        this.settings = settings;
        this.products = products;
        this.isActive = apiKey && apiKey.trim() !== '';
        
        console.log('🤖 Gemini Engine:', this.isActive ? 'Activado' : 'Desactivado');
    }
    
    // Verificar si está activo
    isEnabled() {
        return this.isActive;
    }
    
    // Obtener ayuda contextual sobre productos o local
    async getContextualHelp(query) {
        if (!this.isActive) {
            return {
                available: false,
                message: 'La ayuda inteligente no está disponible en este momento.'
            };
        }
        
        try {
            const response = await this.callGeminiAPI(query);
            return {
                available: true,
                message: response,
                type: 'help'
            };
        } catch (error) {
            console.error('Error en Gemini:', error);
            return {
                available: false,
                message: 'No pude procesar tu consulta en este momento.'
            };
        }
    }
    
    // Obtener recomendaciones basadas en pedidos populares
    async getRecommendations(currentCart = []) {
        if (!this.isActive) {
            return [];
        }
        
        try {
            // Agrupar productos por categoría
            const categories = {};
            this.products.forEach(product => {
                if (product.disponible) {
                    if (!categories[product.categoria]) {
                        categories[product.categoria] = [];
                    }
                    categories[product.categoria].push(product);
                }
            });
            
            // Recomendar productos de categorías no presentes en el carrito
            const recommendations = [];
            const cartCategories = currentCart.map(item => item.categoria);
            
            Object.entries(categories).forEach(([category, products]) => {
                if (!cartCategories.includes(category) && products.length > 0) {
                    // Tomar 2 productos más populares de cada categoría
                    recommendations.push(...products.slice(0, 2));
                }
            });
            
            return recommendations.slice(0, 4); // Máximo 4 recomendaciones
            
        } catch (error) {
            console.error('Error generando recomendaciones:', error);
            return [];
        }
    }
    
    // Llamar a Gemini API
    async callGeminiAPI(query) {
        if (!this.apiKey || this.apiKey.trim() === '') {
            throw new Error('API Key no configurada');
        }
        
        const model = 'gemini-2.5-flash';
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
        
        const prompt = `Eres un asistente de ayuda para una rotisería llamada "${this.settings.nombre_local}".

Solo proporcionas información sobre:
1. Los productos disponibles (no tomas pedidos)
2. Consultas sobre horarios
3. Consultas sobre formas de pago
4. Información general del local

NO tomas pedidos.
NO preguntas datos personales.
NO simulas conversación de toma de pedidos.

Consulta del cliente: "${query}"

Información actual del local:
- Horarios: ${Object.entries(this.settings.horarios_por_dia || {}).map(([day, hours]) => `${day}: ${hours}`).join(', ')}
- Estado: ${this.settings.abierto ? 'Abierto' : 'Cerrado'}
- Tiempo estimado: ${this.settings.tiempo_base_estimado} minutos
- Envío: $${this.settings.precio_envio}
- Retiro: ${this.settings.retiro_habilitado ? 'Sí' : 'No'}

Productos disponibles (solo para referencia, NO los listes todos):
${this.generateProductsSummary()}

Responde de forma breve y útil. Si no puedes ayudar con algo, díselo amablemente.

Respuesta (máximo 3 líneas):`;
        
        const payload = {
            contents: [{
                role: "user",
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 150,
            }
        };
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`Error ${response.status}`);
        }
        
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }
    
    // Generar resumen de productos
    generateProductsSummary() {
        const categories = {};
        this.products.forEach(product => {
            if (product.disponible) {
                if (!categories[product.categoria]) {
                    categories[product.categoria] = 0;
                }
                categories[product.categoria]++;
            }
        });
        
        let summary = '';
        Object.entries(categories).forEach(([category, count]) => {
            summary += `- ${category}: ${count} productos disponibles\n`;
        });
        
        return summary;
    }
    
    // Validar API Key
    async testAPIKey() {
        if (!this.apiKey || this.apiKey.trim() === '') {
            return { valid: false, error: 'API Key vacía' };
        }
        
        try {
            await this.callGeminiAPI("Hola");
            return { valid: true };
        } catch (error) {
            return { 
                valid: false, 
                error: error.message.includes('403') ? 'API Key inválida' : 'Error de conexión'
            };
        }
    }
}

// Crear instancia global
let geminiEngine = null;

// Inicializar motor Gemini
async function initGeminiEngine(apiKey, settings, products) {
    try {
        geminiEngine = new GeminiEngine(apiKey, settings, products);
        return geminiEngine;
    } catch (error) {
        console.error('Error inicializando Gemini:', error);
        return null;
    }
}

// Obtener ayuda
async function getHelp(query) {
    if (!geminiEngine) {
        return {
            available: false,
            message: 'El servicio de ayuda no está disponible.'
        };
    }
    
    return await geminiEngine.getContextualHelp(query);
}

// Obtener recomendaciones
async function getRecommendations(currentCart = []) {
    if (!geminiEngine || !geminiEngine.isEnabled()) {
        return [];
    }
    
    return await geminiEngine.getRecommendations(currentCart);
}

// Verificar estado
function isGeminiEnabled() {
    return geminiEngine ? geminiEngine.isEnabled() : false;
}

// Exportar para uso global
window.GeminiEngine = GeminiEngine;
window.initGeminiEngine = initGeminiEngine;
window.getHelp = getHelp;
window.getRecommendations = getRecommendations;
window.isGeminiEnabled = isGeminiEnabled;
window.testGeminiAPI = async (apiKey) => {
    const testEngine = new GeminiEngine(apiKey, {}, []);
    return await testEngine.testAPIKey();
};
