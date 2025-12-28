// ============================================
// EL TACHI APP - VERSIÓN COMPLETA (con Gemini incluido)
// ============================================

// Clase GeminiAssistant - DEFINIDA AQUÍ MISMO
class GeminiAssistant {
    constructor(apiKey) {
        this.apiKey = apiKey || 'TU_API_KEY_AQUI';
        this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
        this.context = '';
        console.log('🧠 GeminiAssistant creado (inline)');
    }

    async initialize(products, settings) {
        console.log('📦 Inicializando Gemini con', products?.length || 0, 'productos');
        
        // Construir menú
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
                    if (item.aderezos_disponibles?.length > 0) {
                        menuText += ` [Aderezos: ${item.aderezos_disponibles.join(', ')}]`;
                    }
                    menuText += '\n';
                });
                menuText += '\n';
            });
        } else {
            menuText = `**MENÚ DE EJEMPLO:**\n\n` +
                      `🍔 **HAMBURGUESAS:**\n` +
                      `• Hamburguesa Clásica - $2500 (carne, queso, tomate, lechuga)\n` +
                      `• Hamburguesa Doble - $3200 (doble carne, doble queso, panceta)\n\n` +
                      `🍟 **ACOMPAÑAMIENTOS:**\n` +
                      `• Papas Fritas - $1200\n` +
                      `• Papas con Cheddar - $1800\n\n` +
                      `🥤 **BEBIDAS:**\n` +
                      `• Coca-Cola 500ml - $800\n` +
                      `• Agua Mineral - $500\n\n`;
        }

        this.context = `Eres "EL TACHI", asistente virtual de una rotisería argentina.

**TONO:**
- Amigable, vendedor, claro
- Usás emojis ocasionales 🍔👍
- Respondés en español rioplatense
- Sé conciso (2-3 líneas máximo)

**INFORMACIÓN:**
${menuText}

**HORARIOS:**
Lun-Jue: ${settings?.horarios?.lunes?.inicio || '10:00'} a ${settings?.horarios?.lunes?.cierre || '23:00'}
Vie: ${settings?.horarios?.viernes?.inicio || '10:00'} a ${settings?.horarios?.viernes?.cierre || '00:00'}
Sáb: ${settings?.horarios?.sabado?.inicio || '11:00'} a ${settings?.horarios?.sabado?.cierre || '00:00'}
Dom: ${settings?.horarios?.domingo?.inicio || '11:00'} a ${settings?.horarios?.domingo?.cierre || '22:00'}

**ENVÍOS:**
- Precio: $${settings?.envios?.precio || 300}
- Tiempo: ${settings?.envios?.tiempo_min || 30}-${settings?.envios?.tiempo_max || 45} min
- Retiro: ${settings?.envios?.retiro_habilitado ? 'SÍ' : 'NO'}

**PROTOCOLO:**
1. Saludo + menú
2. Preguntar: "¿Qué te gustaría ordenar?"
3. Por producto: cantidad y personalización
4. Confirmar resumen
5. Pedir datos (nombre, teléfono, envío/retiro, dirección)
6. Finalizar con opción WhatsApp

**NO INVENTES:** Si no sabés, decí "Consultalo por WhatsApp"`;

        console.log('✅ Contexto Gemini cargado');
        return true;
    }

    async sendMessage(userMessage, orderContext = '') {
        console.log('💬 Gemini recibió:', userMessage.substring(0, 50));
        
        // Modo fallback si no hay API key real
        if (!this.apiKey || this.apiKey.includes('TU_API_KEY')) {
            return this.getFallbackResponse(userMessage);
        }
        
        try {
            const fullPrompt = `${this.context}\n\n${orderContext}\n\nCliente: ${userMessage}\n\nAsistente EL TACHI:`;
            
            const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    contents: [{ parts: [{ text: fullPrompt }] }],
                    generationConfig: { 
                        temperature: 0.7,
                        maxOutputTokens: 200 
                    }
                })
            });

            const data = await response.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text || 
                   this.getFallbackResponse(userMessage);
                
        } catch (error) {
            console.warn('⚠️ Error Gemini, usando fallback:', error.message);
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

// ============================================
// CLASE PRINCIPAL DE LA APLICACIÓN
// ============================================

class ElTachiApp {
    constructor() {
        this.chatHistory = [];
        this.currentOrder = [];
        this.customerData = null;
        this.products = [];
        this.settings = {};
        this.geminiAssistant = null;
        this.isProcessing = false;
        this.isBusinessOpen = true;
        
        // DOM Elements
        this.elements = {
            chatMessages: document.getElementById('chat-messages'),
            userInput: document.getElementById('user-input'),
            sendButton: document.getElementById('send-button'),
            typingIndicator: document.getElementById('typing-indicator'),
            orderModal: document.getElementById('order-modal'),
            orderSummary: document.getElementById('order-summary-content'),
            whatsappBtn: document.getElementById('whatsapp-btn'),
            statusBadge: document.getElementById('status-badge'),
            menuModal: document.getElementById('menu-modal'),
            menuCategories: document.getElementById('menu-categories')
        };

        this.initialize();
    }

    async initialize() {
        console.log('🚀 Initializing EL TACHI App...');
        
        // Check online status
        this.setupOfflineDetection();
        
        // Load business status
        await this.loadBusinessStatus();
        
        // Load products and settings
        await this.loadData();
        
        // Initialize Gemini (ahora está definido arriba)
        await this.initializeGemini();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Show welcome message
        this.showWelcomeMessage();
        
        // Setup PWA
        this.setupPWA();
        
        console.log('✅ EL TACHI App initialized successfully');
    }

    async loadBusinessStatus() {
        try {
            this.isBusinessOpen = await FirebaseService.getBusinessStatus();
            this.updateStatusBadge();
        } catch (error) {
            console.error('Error loading business status:', error);
            this.isBusinessOpen = true;
        }
    }

    async loadData() {
        try {
            [this.products, this.settings] = await Promise.all([
                FirebaseService.getProducts(),
                FirebaseService.getSettings()
            ]);
            
            console.log(`✅ Loaded ${this.products.length} products and settings`);
        } catch (error) {
            console.error('Error loading data:', error);
            this.products = [];
            this.settings = {};
        }
    }

    async initializeGemini() {
        try {
            console.log('🔄 Initializing Gemini Assistant...');
            
            // GeminiAssistant ya está definido en este mismo archivo
            const apiKey = this.settings.gemini_config?.api_key || 'TU_API_KEY_AQUI';
            
            this.geminiAssistant = new GeminiAssistant(apiKey);
            await this.geminiAssistant.initialize(this.products, this.settings);
            
            console.log('✅ Gemini Assistant initialized');
        } catch (error) {
            console.error('Error initializing Gemini:', error);
            // Crear un asistente de emergencia
            this.geminiAssistant = {
                sendMessage: async (msg) => "¡Hola! Soy EL TACHI. ¿En qué puedo ayudarte?"
            };
        }
    }

    setupEventListeners() {
        // Send message on button click
        this.elements.sendButton.addEventListener('click', () => this.sendMessage());
        
        // Send message on Enter key (but allow Shift+Enter for new line)
        this.elements.userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Auto-resize textarea
        this.elements.userInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
        
        // WhatsApp button
        this.elements.whatsappBtn.addEventListener('click', () => this.sendToWhatsApp());
        
        // Copy order button
        document.getElementById('copy-order-btn')?.addEventListener('click', () => this.copyOrderToClipboard());
        
        // Quick actions
        document.querySelectorAll('.quick-btn[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleQuickAction(action);
            });
        });
        
        // Menu button
        document.getElementById('menu-btn')?.addEventListener('click', () => {
            document.getElementById('menu-modal').classList.add('active');
            this.loadMenu();
        });
        
        // Close modals
        document.getElementById('close-order-modal')?.addEventListener('click', () => {
            document.getElementById('order-modal').classList.remove('active');
        });
        
        document.getElementById('close-menu-modal')?.addEventListener('click', () => {
            document.getElementById('menu-modal').classList.remove('active');
        });
    }

    async sendMessage() {
        const message = this.elements.userInput.value.trim();
        
        if (!message || this.isProcessing) {
            return;
        }
        
        // Clear input and reset height
        this.elements.userInput.value = '';
        this.elements.userInput.style.height = 'auto';
        
        // Add user message to chat
        this.addMessage('user', message);
        
        // Show typing indicator
        this.showTyping(true);
        this.isProcessing = true;
        
        try {
            // Check if business is open
            if (!this.isBusinessOpen && this.isOrderRelated(message)) {
                const closedMessage = this.settings.horarios?.cerrado_mensaje || 
                                    'Lo siento, estamos cerrados en este momento. Por favor, vuelve durante nuestro horario de atención.';
                this.addMessage('assistant', `❌ ${closedMessage}`);
                return;
            }
            
            // Get response from Gemini
            let response;
            
            if (this.geminiAssistant) {
                const orderContext = this.currentOrder.length > 0 ? 
                    `Pedido actual: ${JSON.stringify(this.currentOrder)}` : '';
                
                response = await this.geminiAssistant.sendMessage(message, orderContext);
            } else {
                // Fallback responses
                response = "¡Hola! Soy EL TACHI. Nuestro menú incluye hamburguesas, pizzas, acompañamientos y bebidas. ¿Qué te gustaría ordenar?";
            }
            
            // Check if response contains order summary
            if (response.includes('Resumen del pedido:') || response.includes('Total: $')) {
                this.extractOrderFromSummary(response);
            }
            
            // Check if asking for customer data
            if (response.includes('nombre') || response.includes('teléfono') || response.includes('datos')) {
                this.requestCustomerData();
            }
            
            // Add assistant response
            this.addMessage('assistant', response);
            
            // Save to chat history
            this.chatHistory.push({ role: 'user', content: message });
            this.chatHistory.push({ role: 'assistant', content: response });
            
            // Limit history
            if (this.chatHistory.length > 20) {
                this.chatHistory = this.chatHistory.slice(-20);
            }
            
        } catch (error) {
            console.error('Error processing message:', error);
            this.addMessage('assistant', 'Disculpá, estoy teniendo problemas técnicos. ¿Podés repetir tu mensaje?');
        } finally {
            this.showTyping(false);
            this.isProcessing = false;
        }
    }

    addMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageDiv.innerHTML = `
            <div class="message-content">${this.formatMessage(content)}</div>
            <span class="message-time">${time}</span>
        `;
        
        this.elements.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
        
        // Add animation
        messageDiv.style.animation = 'messageAppear 0.3s ease';
    }

    formatMessage(content) {
        // Convert markdown-like syntax to HTML
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>')
            .replace(/✅/g, '<span style="color: #34a853;">✅</span>')
            .replace(/❌/g, '<span style="color: #ea4335;">❌</span>')
            .replace(/🍔/g, '<span style="font-size: 1.2em;">🍔</span>')
            .replace(/📱/g, '<span style="font-size: 1.2em;">📱</span>');
    }

    showTyping(show) {
        if (show) {
            this.elements.typingIndicator.classList.add('active');
        } else {
            this.elements.typingIndicator.classList.remove('active');
        }
    }

    scrollToBottom() {
        this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
    }

    showWelcomeMessage() {
        const welcomeMessage = `¡Hola! 👋 Soy **EL TACHI**, tu asistente virtual de pedidos.

🍔 **MENÚ PRINCIPAL:**
- Hamburguesas (desde $2500)
- Pizzas (desde $2800)
- Acompañamientos
- Bebidas

⏰ **Horario de atención:**
${this.getCurrentSchedule()}

🚚 **Envío a domicilio:** $${this.settings.envios?.precio || 300} (${this.settings.envios?.tiempo_min || 30}-${this.settings.envios?.tiempo_max || 45} min)
🏪 **Retiro en local:** ${this.settings.envios?.retiro_habilitado ? 'Sí, disponible' : 'No disponible'}

**¿Qué te gustaría ordenar hoy?** Podés personalizar cada producto a tu gusto. ¡Estoy aquí para ayudarte!`;

        this.addMessage('assistant', welcomeMessage);
    }

    getCurrentSchedule() {
        const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
        const today = days[new Date().getDay()];
        const schedule = this.settings.horarios?.[today];
        
        if (schedule && schedule.abierto) {
            return `${schedule.inicio} a ${schedule.cierre}`;
        }
        return 'Cerrado hoy';
    }

    updateStatusBadge() {
        const badge = this.elements.statusBadge;
        
        if (this.isBusinessOpen) {
            badge.innerHTML = '<i class="fas fa-store"></i><span>Abierto</span>';
            badge.classList.remove('closed');
        } else {
            badge.innerHTML = '<i class="fas fa-store-slash"></i><span>Cerrado</span>';
            badge.classList.add('closed');
        }
    }

    extractOrderFromSummary(summaryText) {
        // Simple extraction logic
        const lines = summaryText.split('\n');
        const orderLines = lines.filter(line => 
            line.includes('x') || line.includes('-') || line.includes('•')
        );
        
        this.currentOrder = orderLines.map(line => {
            return {
                text: line.trim(),
                quantity: 1
            };
        });
        
        // Show order confirmation modal if we have items
        if (this.currentOrder.length > 0) {
            setTimeout(() => {
                this.showOrderConfirmation(summaryText);
            }, 1000);
        }
    }

    showOrderConfirmation(summaryText) {
        // Parse summary for display
        const lines = summaryText.split('\n');
        const orderItems = lines.filter(line => 
            line.trim().startsWith('-') || line.trim().startsWith('•') || line.includes('x')
        );
        
        const totalLine = lines.find(line => line.includes('Total:'));
        
        let html = `
            <h3>Tu Pedido</h3>
            <div class="order-items">
        `;
        
        orderItems.forEach(item => {
            html += `
                <div class="order-item">
                    <span class="order-item-name">${item.trim().replace(/^[-•]\s*/, '')}</span>
                </div>
            `;
        });
        
        html += `</div>`;
        
        if (totalLine) {
            html += `
                <div class="order-total">
                    <span>TOTAL</span>
                    <span>${totalLine.replace('Total:', '').trim()}</span>
                </div>
            `;
        }
        
        this.elements.orderSummary.innerHTML = html;
        
        // Store for WhatsApp
        this.lastOrderSummary = summaryText;
        
        // Show modal
        this.elements.orderModal.classList.add('active');
    }

    async sendToWhatsApp() {
        if (!this.lastOrderSummary) return;
        
        const phone = this.settings.negocio?.telefono || '+5491112345678';
        const message = encodeURIComponent(
            `¡Hola EL TACHI! Quiero hacer este pedido:\n\n${this.lastOrderSummary}\n\nPor favor confirmen disponibilidad y envíen el precio final.`
        );
        
        window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
        
        // Save order to Firestore
        try {
            const orderData = {
                cliente: 'Por WhatsApp',
                telefono: 'WhatsApp',
                tipo: 'pendiente',
                direccion: '',
                pedido_detallado: this.lastOrderSummary,
                total: this.extractTotalFromSummary(this.lastOrderSummary),
                estado: 'Recibido',
                via: 'whatsapp',
                fecha: new Date().toISOString()
            };
            
            const orderId = await FirebaseService.createOrder(orderData);
            
            this.addMessage('system', 
                `✅ Pedido enviado a WhatsApp. Tu número de seguimiento es: **${orderId}**\n\nPodés consultar el estado en cualquier momento diciendo: "Estado ${orderId}"`
            );
            
        } catch (error) {
            console.error('Error saving order:', error);
            this.addMessage('system', 'Pedido enviado a WhatsApp. Si hay algún problema, contactanos directamente.');
        }
        
        this.elements.orderModal.classList.remove('active');
    }

    extractTotalFromSummary(summaryText) {
        const match = summaryText.match(/Total:.*?\$(\d+)/);
        return match ? parseInt(match[1]) : 0;
    }

    copyOrderToClipboard() {
        if (!this.lastOrderSummary) return;
        
        navigator.clipboard.writeText(this.lastOrderSummary)
            .then(() => {
                alert('Pedido copiado al portapapeles');
            })
            .catch(err => {
                console.error('Error copying text: ', err);
            });
    }

    handleQuickAction(action) {
        const messages = {
            menu: "Muéstrame el menú completo",
            hours: "¿Cuáles son los horarios de atención?",
            status: "Quiero consultar el estado de un pedido",
            order: "Quiero hacer un pedido"
        };
        
        if (messages[action]) {
            this.elements.userInput.value = messages[action];
            this.sendMessage();
        }
    }

    async loadMenu() {
        if (this.products.length === 0) {
            await this.loadData();
        }
        
        // Group products by category
        const categories = {};
        this.products.forEach(product => {
            if (!categories[product.categoria]) {
                categories[product.categoria] = [];
            }
            categories[product.categoria].push(product);
        });
        
        let html = '';
        
        for (const [categoryName, products] of Object.entries(categories)) {
            html += `
                <div class="menu-category">
                    <h3 class="category-title">
                        <i class="fas fa-${this.getCategoryIcon(categoryName)}"></i>
                        ${this.formatCategoryName(categoryName)}
                    </h3>
                    <div class="products-list">
            `;
            
            products.forEach(product => {
                const availableClass = product.disponible ? '' : 'product-unavailable';
                const icon = this.getProductIcon(product.nombre);
                
                html += `
                    <div class="product-card ${availableClass}">
                        <div class="product-image">
                            ${icon}
                        </div>
                        <div class="product-info">
                            <div class="product-name">${product.nombre}</div>
                            <div class="product-description">${product.descripcion || ''}</div>
                            <div class="product-price">$${product.precio}</div>
                            ${product.aderezos_disponibles?.length > 0 ? 
                                `<div style="font-size: 12px; color: #666; margin-top: 4px;">
                                    Aderezos: ${product.aderezos_disponibles.join(', ')}
                                </div>` : ''
                            }
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
        
        this.elements.menuCategories.innerHTML = html;
    }

    getCategoryIcon(category) {
        const icons = {
            hamburguesas: 'hamburger',
            pizzas: 'pizza-slice',
            sandwiches: 'bread-slice',
            acompañamientos: 'french-fries',
            bebidas: 'wine-bottle',
            postres: 'ice-cream'
        };
        
        return icons[category] || 'utensils';
    }

    getProductIcon(productName) {
        if (productName.toLowerCase().includes('hamburguesa')) return '🍔';
        if (productName.toLowerCase().includes('pizza')) return '🍕';
        if (productName.toLowerCase().includes('papas')) return '🍟';
        if (productName.toLowerCase().includes('gaseosa') || productName.toLowerCase().includes('coca')) return '🥤';
        if (productName.toLowerCase().includes('agua')) return '💧';
        return '🍽️';
    }

    formatCategoryName(category) {
        return category.charAt(0).toUpperCase() + category.slice(1);
    }

    requestCustomerData() {
        this.addMessage('system', 
            '📝 Para completar tu pedido, necesito los siguientes datos:\n\n' +
            '1. **Nombre completo**\n' +
            '2. **Número de teléfono**\n' +
            '3. **¿Envío a domicilio o retiro en local?**\n' +
            '4. **Dirección completa** (si es envío)\n\n' +
            'Por favor, enviá esta información en un solo mensaje.'
        );
    }

    isOrderRelated(message) {
        const orderKeywords = ['pedido', 'ordenar', 'comprar', 'quiero', 'hamburguesa', 'pizza', 'menu', 'carta'];
        return orderKeywords.some(keyword => 
            message.toLowerCase().includes(keyword.toLowerCase())
        );
    }

    setupOfflineDetection() {
        window.addEventListener('online', () => {
            document.getElementById('offline-indicator').classList.remove('active');
            this.addMessage('system', '✅ ¡Conexión restablecida! Ya podés hacer pedidos.');
        });
        
        window.addEventListener('offline', () => {
            document.getElementById('offline-indicator').classList.add('active');
            this.addMessage('system', '⚠️ Estás offline. Podés ver el menú pero no hacer pedidos.');
        });
    }

    setupPWA() {
        // Show install prompt after user interaction
        setTimeout(() => {
            if (!window.matchMedia('(display-mode: standalone)').matches) {
                const installPrompt = document.getElementById('install-prompt');
                if (installPrompt) {
                    // Only show if user hasn't dismissed it before
                    if (!localStorage.getItem('pwa_prompt_dismissed')) {
                        setTimeout(() => {
                            installPrompt.classList.add('active');
                        }, 10000);
                    }
                    
                    // Handle cancel button
                    document.getElementById('cancel-install-btn').addEventListener('click', () => {
                        installPrompt.classList.remove('active');
                        localStorage.setItem('pwa_prompt_dismissed', 'true');
                    });
                }
            }
        }, 5000);
    }
}

// Initialize app when window loads
window.addEventListener('load', () => {
    window.app = new ElTachiApp();
});
