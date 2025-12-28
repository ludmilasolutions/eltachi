class ElTachiApp {
    constructor() {
        this.chatHistory = [];
        this.currentOrder = [];
        this.customerData = null;
        this.geminiAssistant = null;
        this.isProcessing = false;
        
        // Elementos DOM
        this.elements = {
            chatMessages: document.getElementById('chat-messages'),
            userInput: document.getElementById('user-input'),
            sendButton: document.getElementById('send-button'),
            typingIndicator: document.getElementById('typing-indicator'),
            orderModal: document.getElementById('order-modal'),
            orderSummary: document.getElementById('order-summary'),
            whatsappBtn: document.getElementById('whatsapp-btn'),
            statusBadge: document.getElementById('status-badge'),
            quickButtons: document.querySelectorAll('.quick-btn')
        };

        this.initialize();
    }

    async initialize() {
        // Verificar conexión
        this.setupOfflineDetection();
        
        // Verificar si está abierto
        const isOpen = await FirebaseService.checkBusinessStatus();
        this.updateStatusBadge(isOpen);
        
        if (!isOpen) {
            this.showClosedMessage();
            return;
        }

        // Cargar productos y config
        const [products, settings] = await Promise.all([
            FirebaseService.getProducts(),
            FirebaseService.getSettings()
        ]);

        // Inicializar Gemini
        this.geminiAssistant = new GeminiAssistant('TU_API_KEY_GEMINI');
        await this.geminiAssistant.initialize(products, settings);

        // Mostrar mensaje inicial
        this.showInitialMessage(products, settings);

        // Configurar event listeners
        this.setupEventListeners();

        // Iniciar PWA
        this.setupPWA();
    }

    setupEventListeners() {
        // Enviar mensaje al presionar Enter o botón
        this.elements.sendButton.addEventListener('click', () => this.sendMessage());
        this.elements.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Quick actions
        this.elements.quickButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                this.handleQuickAction(action);
            });
        });

        // WhatsApp button
        this.elements.whatsappBtn.addEventListener('click', () => this.openWhatsApp());

        // Close modal
        document.getElementById('close-modal').addEventListener('click', () => {
            this.elements.orderModal.classList.remove('active');
        });
    }

    async sendMessage() {
        const message = this.elements.userInput.value.trim();
        if (!message || this.isProcessing) return;

        // Limpiar input
        this.elements.userInput.value = '';
        
        // Mostrar mensaje del usuario
        this.addMessage('user', message);
        
        // Mostrar indicador de typing
        this.showTyping(true);
        this.isProcessing = true;

        try {
            // Enviar a Gemini
            const response = await this.geminiAssistant.sendMessage(message, this.getOrderContext());
            
            // Verificar si es un resumen de pedido
            if (response.includes('Resumen del pedido:') || response.includes('Total:')) {
                this.handleOrderSummary(response);
            }
            
            // Verificar si pide datos
            if (response.includes('datos') || response.includes('nombre') || response.includes('teléfono')) {
                this.requestCustomerData();
            }
            
            // Mostrar respuesta
            this.addMessage('assistant', response);
            
            // Guardar en historial
            this.chatHistory.push({ role: 'user', content: message });
            this.chatHistory.push({ role: 'assistant', content: response });
            
            // Limitar historial
            if (this.chatHistory.length > 20) {
                this.chatHistory = this.chatHistory.slice(-20);
            }
            
        } catch (error) {
            console.error('Error procesando mensaje:', error);
            this.addMessage('assistant', 'Disculpá, hubo un error. ¿Podés repetir?');
        } finally {
            this.showTyping(false);
            this.isProcessing = false;
        }
    }

    addMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        messageDiv.textContent = content;
        
        this.elements.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
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

    showInitialMessage(products, settings) {
        let message = `¡Hola! 👋 Soy el asistente de **EL TACHI**\n\n`;
        message += `📋 **MENÚ COMPLETO:**\n`;
        
        // Agrupar por categoría
        const categories = {};
        products.forEach(product => {
            if (!categories[product.categoria]) {
                categories[product.categoria] = [];
            }
            categories[product.categoria].push(product);
        });
        
        Object.keys(categories).forEach(category => {
            message += `\n**${category.toUpperCase()}:**\n`;
            categories[category].forEach(product => {
                message += `• ${product.nombre} - $${product.precio}\n`;
                if (product.descripcion) {
                    message += `  ${product.descripcion}\n`;
                }
            });
        });
        
        message += `\n⏰ **Horario:** ${this.getCurrentSchedule(settings.horarios)}\n`;
        message += `🚚 **Envío:** $${settings.envios.precio} (${settings.envios.tiempo_min}-${settings.envios.tiempo_max} min)\n`;
        message += `🏪 **Retiro:** ${settings.envios.retiro_habilitado ? 'Sí' : 'No'}\n\n`;
        message += `¿Qué te gustaría ordenar? Podés personalizar cada producto.`;
        
        this.addMessage('assistant', message);
    }

    getCurrentSchedule(horarios) {
        const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
        const today = days[new Date().getDay()];
        const schedule = horarios[today];
        
        if (schedule && schedule.abierto) {
            return `${schedule.inicio} a ${schedule.cierre}`;
        }
        return 'Cerrado hoy';
    }

    handleOrderSummary(summaryText) {
        // Extraer items del resumen
        const lines = summaryText.split('\n');
        const items = lines.filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'));
        
        this.currentOrder = items.map(item => {
            // Parsear formato: "- Hamburguesa x1 (lechuga y tomate)"
            const match = item.match(/[•-]\s*(.+?)\s*x(\d+)\s*(?:\((.+)\))?/);
            if (match) {
                return {
                    name: match[1].trim(),
                    quantity: parseInt(match[2]),
                    customization: match[3] || '',
                    price: 0 // Se calcularía con base en productos
                };
            }
            return null;
        }).filter(Boolean);
        
        // Mostrar botón para confirmar
        this.showOrderConfirmation(summaryText);
    }

    showOrderConfirmation(summaryText) {
        this.elements.orderSummary.innerHTML = `
            <div class="summary-content">
                <pre>${summaryText}</pre>
                <p class="note">Revisá tu pedido. Si está todo bien, confirmalo por WhatsApp.</p>
            </div>
        `;
        
        // Guardar resumen para WhatsApp
        this.lastOrderSummary = summaryText;
        
        setTimeout(() => {
            this.elements.orderModal.classList.add('active');
        }, 500);
    }

    requestCustomerData() {
        // En una versión avanzada, se mostraría un formulario
        this.addMessage('system', '📝 Por favor proporcioná: Nombre, Teléfono y si es envío o retiro.');
    }

    async openWhatsApp() {
        if (!this.lastOrderSummary) return;
        
        const settings = await FirebaseService.getSettings();
        const phone = settings.negocio.telefono || '+5491112345678';
        
        const message = encodeURIComponent(
            `¡Hola EL TACHI! Quiero hacer este pedido:\n\n${this.lastOrderSummary}\n\nPor favor confirmen disponibilidad.`
        );
        
        window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
        
        // Guardar pedido en Firebase
        try {
            const orderData = {
                cliente: 'Por WhatsApp',
                telefono: 'WhatsApp',
                tipo: 'pendiente',
                direccion: '',
                pedido_detallado: this.lastOrderSummary,
                total: this.calculateTotal(this.lastOrderSummary),
                estado: 'Recibido',
                via: 'whatsapp'
            };
            
            const orderId = await FirebaseService.createOrder(orderData);
            
            this.addMessage('system', 
                `✅ Pedido enviado a WhatsApp. Tu número de seguimiento: **${orderId}**\n\nPodés consultar el estado en cualquier momento diciendo: "Estado ${orderId}"`
            );
            
        } catch (error) {
            console.error('Error guardando pedido:', error);
        }
        
        this.elements.orderModal.classList.remove('active');
    }

    calculateTotal(summaryText) {
        // Extraer total del texto
        const totalMatch = summaryText.match(/Total:.*?\$(\d+)/);
        return totalMatch ? parseInt(totalMatch[1]) : 0;
    }

    handleQuickAction(action) {
        const messages = {
            menu: '¿Podés mostrarme el menú completo?',
            status: 'Quiero consultar el estado de un pedido',
            hours: '¿Cuáles son los horarios de atención?'
        };
        
        if (messages[action]) {
            this.elements.userInput.value = messages[action];
            this.sendMessage();
        }
    }

    updateStatusBadge(isOpen) {
        if (isOpen) {
            this.elements.statusBadge.textContent = 'Abierto';
            this.elements.statusBadge.style.background = 'var(--success)';
        } else {
            this.elements.statusBadge.textContent = 'Cerrado';
            this.elements.statusBadge.style.background = 'var(--warning)';
        }
    }

    showClosedMessage() {
        FirebaseService.getSettings().then(settings => {
            const closedMessage = settings.horarios?.cerrado_mensaje || 
                                'Cerrado. Volvemos a abrir mañana.';
            this.addMessage('assistant', `❌ ${closedMessage}`);
            this.elements.userInput.disabled = true;
            this.elements.sendButton.disabled = true;
        });
    }

    setupOfflineDetection() {
        window.addEventListener('online', () => {
            document.body.classList.remove('offline');
        });
        
        window.addEventListener('offline', () => {
            document.body.classList.add('offline');
            this.addMessage('system', '⚠️ Estás offline. Podés ver el menú pero no hacer pedidos.');
        });
    }

    setupPWA() {
        // Mostrar prompt de instalación después de 30 segundos
        setTimeout(() => {
            if (!window.matchMedia('(display-mode: standalone)').matches) {
                const installPrompt = document.getElementById('install-prompt');
                if (installPrompt) {
                    installPrompt.classList.add('active');
                    
                    document.getElementById('install-btn').addEventListener('click', () => {
                        // Evento de instalación PWA
                        if (window.deferredPrompt) {
                            window.deferredPrompt.prompt();
                            window.deferredPrompt.userChoice.then(() => {
                                window.deferredPrompt = null;
                            });
                        }
                        installPrompt.classList.remove('active');
                    });
                    
                    document.getElementById('cancel-install').addEventListener('click', () => {
                        installPrompt.classList.remove('active');
                    });
                }
            }
        }, 30000);
    }

    getOrderContext() {
        if (this.currentOrder.length === 0) return '';
        return `Pedido actual: ${JSON.stringify(this.currentOrder)}`;
    }
}

// Inicializar aplicación
window.initializeApp = function() {
    window.app = new ElTachiApp();
};