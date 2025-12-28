// config.js - Configuración editable para Netlify
const CONFIG = {
    // IMPORTANTE: Para Netlify, siempre usar serverless endpoint
    USE_SERVERLESS_ENDPOINT: true,
    
    // Ruta relativa a la función serverless de Netlify
    SERVERLESS_ENDPOINT: "/.netlify/functions/gemini",
    
    // Número de WhatsApp (Argentina: 54 + código de área + número, sin + ni espacios)
    WHATSAPP_PHONE: "5491112345678", // Reemplazá con tu número
    
    // Configuración de precios (editables)
    PRICES: {
        WEB_CATALOG: "desde $150.000",
        WHATSAPP_BOT: "desde $80.000 + $15.000/mes",
        MARKETING_MONTHLY: "desde $45.000 por mes",
        ADS_MANAGEMENT: "desde $30.000 + inversión en anuncios",
        AUTOMATION_CUSTOM: "se cotizan según necesidad (desde $120.000)",
        QUOTES_AUTOMATIC: "desde $60.000"
    },
    
    // Nombre del negocio (se usa en el footer y títulos)
    BUSINESS_NAME: "Soluciones Digitales para Negocios Locales",
    
    // Configuración del chat (opcional)
    CHAT: {
        INITIAL_MESSAGE: "¡Hola! Soy tu asesor digital. <strong>Contame un poco de tu negocio</strong> y te digo cómo podemos ayudarte 👇",
        TYPING_DELAY: 1000,
        MAX_HISTORY: 20
    }
};

// Hacer config disponible globalmente
window.CONFIG = CONFIG;