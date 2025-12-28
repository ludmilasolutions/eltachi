// Main Application - SIN PRODUCTOS POR DEFECTO
const App = {
    // Initialize the application
    async initialize() {
        console.log("🚀 Inicializando aplicación EL TACHI...");
        
        // Check if we're online
        this.updateOnlineStatus();
        
        // Initialize UI components
        this.initializeUI();
        
        // Wait for Firebase to be ready
        await this.waitForFirebase();
        
        // Load data from Firebase
        await this.loadDataFromFirebase();
        
        // Initialize Gemini AI (opcional)
        await this.initializeGeminiAI();
        
        console.log("✅ Aplicación inicializada correctamente");
    },
    
    // Wait for Firebase to be ready
    async waitForFirebase() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 30; // 15 seconds max
            
            const checkFirebase = () => {
                attempts++;
                if (window.appState.firebaseInitialized && window.firestoreDB) {
                    console.log("✅ Firebase listo después de " + attempts + " intentos");
                    resolve();
                } else if (attempts >= maxAttempts) {
                    console.error("❌ Firebase no se inicializó a tiempo");
                    reject(new Error("Firebase no disponible"));
                } else {
                    setTimeout(checkFirebase, 500);
                }
            };
            
            checkFirebase();
        });
    },
    
    // Load data from Firebase
    async loadDataFromFirebase() {
        try {
            // Load products
            await this.loadProducts();
            
            // Load settings
            await this.loadSettings();
            
            // Load business status
            await this.loadBusinessStatus();
            
        } catch (error) {
            console.error("❌ Error cargando datos de Firebase:", error);
            throw error;
        }
    },
    
    // Load products from Firebase (OBLIGATORIO)
    async loadProducts() {
        console.log("📦 Cargando productos desde Firebase...");
        
        try {
            if (!window.firestoreDB) {
                throw new Error("Firestore no disponible");
            }
            
            // Get products from Firestore
            const productsSnapshot = await window.firestoreDB
                .collection("products")
                .where("available", "==", true)
                .orderBy("category")
                .orderBy("name")
                .get();
            
            if (productsSnapshot.empty) {
                console.warn("⚠️ No hay productos en la base de datos");
                window.appState.products = [];
                
                // Show warning message
                this.addMessage(
                    "⚠️ El menú está vacío. Por favor, contacta al administrador para agregar productos.",
                    "system"
                );
                
                return;
            }
            
            // Map Firestore documents to products array
            window.appState.products = productsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log(`✅ ${window.appState.products.length} productos cargados desde Firebase`);
            
            // Log categories for debugging
            const categories = [...new Set(window.appState.products.map(p => p.category))];
            console.log("📊 Categorías disponibles:", categories);
            
        } catch (error) {
            console.error("❌ Error cargando productos:", error);
            window.appState.products = [];
            
            // Show error to user
            this.addMessage(
                "❌ Error cargando el menú. Por favor, intenta de nuevo más tarde.",
                "system"
            );
            
            throw error;
        }
    },
    
    // Load settings from Firebase
    async loadSettings() {
        try {
            if (!window.firestoreDB) return;
            
            console.log("⚙️ Cargando configuración desde Firebase...");
            
            const settingsDoc = await window.firestoreDB
                .collection("settings")
                .doc("business")
                .get();
            
            if (settingsDoc.exists) {
                const firebaseSettings = settingsDoc.data();
                
                // Merge with existing settings
                window.appState.settings = {
                    ...window.appState.settings,
                    ...firebaseSettings
                };
                
                console.log("✅ Configuración cargada desde Firebase");
                
                // Update WhatsApp button if number changed
                this.updateWhatsAppButton();
            }
            
        } catch (error) {
            console.warn("⚠️ Error cargando configuración:", error);
            // Continue with default settings
        }
    },
    
    // Load business status from Firebase
    async loadBusinessStatus() {
        try {
            if (!window.firestoreDB) return;
            
            const statusDoc = await window.firestoreDB
                .collection("status")
                .doc("business")
                .get();
            
            if (statusDoc.exists) {
                window.appState.businessStatus = statusDoc.data().isOpen || true;
                this.updateBusinessStatus();
            }
            
        } catch (error) {
            console.warn("⚠️ Error cargando estado del negocio:", error);
        }
    },
    
    // Update business status display
    updateBusinessStatus() {
        const statusBadge = document.getElementById("status-badge");
        if (!statusBadge) return;
        
        if (window.appState.businessStatus) {
            statusBadge.classList.remove("closed");
            statusBadge.innerHTML = '<i class="fas fa-store"></i><span>Abierto</span>';
        } else {
            statusBadge.classList.add("closed");
            statusBadge.innerHTML = '<i class="fas fa-store-slash"></i><span>Cerrado</span>';
        }
    },
    
    // Update WhatsApp button
    updateWhatsAppButton() {
        const whatsappBtn = document.getElementById("whatsapp-btn");
        if (whatsappBtn && window.appState.settings.whatsappNumber) {
            // Store number for later use
            whatsappBtn.dataset.number = window.appState.settings.whatsappNumber;
        }
    },
    
    // Initialize Gemini AI
    async initializeGeminiAI() {
        try {
            // This is optional - you can remove if not using AI
            if (window.initializeGemini) {
                // Try to get API key from Firebase
                let geminiApiKey = null;
                
                if (window.firestoreDB) {
                    try {
                        const configDoc = await window.firestoreDB
                            .collection("config")
                            .doc("api_keys")
                            .get();
                        
                        if (configDoc.exists) {
                            geminiApiKey = configDoc.data().gemini_api_key;
                        }
                    } catch (error) {
                        console.warn("⚠️ No se pudo obtener API key de Firebase:", error);
                    }
                }
                
                // Initialize Gemini
                window.appState.geminiAssistant = await window.initializeGemini(
                    geminiApiKey || "TU_API_KEY_DE_GEMINI"
                );
                
                console.log("🧠 Gemini AI:", 
                    window.appState.geminiAssistant?.isInitialized ? "Inicializado" : "No inicializado"
                );
            }
            
        } catch (error) {
            console.error("❌ Error inicializando Gemini AI:", error);
        }
    },
    
    // Initialize UI components
    initializeUI() {
        console.log("🎨 Inicializando interfaz de usuario...");
        
        // DOM Elements
        this.elements = {
            loadingScreen: document.getElementById("loading-screen"),
            appContainer: document.getElementById("app-container"),
            chatMessages: document.getElementById("chat-messages"),
            userInput: document.getElementById("user-input"),
            sendButton: document.getElementById("send-button"),
            typingIndicator: document.getElementById("typing-indicator"),
            statusBadge: document.getElementById("status-badge"),
            orderModal: document.getElementById("order-modal"),
            menuModal: document.getElementById("menu-modal"),
            orderSummaryContent: document.getElementById("order-summary-content"),
            menuCategories: document.getElementById("menu-categories"),
            whatsappBtn: document.getElementById("whatsapp-btn"),
            copyOrderBtn: document.getElementById("copy-order-btn")
        };
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initialize auto-resize for textarea
        this.initializeTextarea();
        
        console.log("✅ Interfaz de usuario inicializada");
    },
    
    // Setup event listeners
    setupEventListeners() {
        console.log("🔗 Configurando event listeners...");
        
        // Send message on button click
        this.elements.sendButton.addEventListener("click", () => this.sendMessage());
        
        // Send message on Enter key
        this.elements.userInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Quick action buttons
        document.querySelectorAll(".quick-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleQuickAction(action);
            });
        });
        
        // Menu button
        document.getElementById("menu-btn").addEventListener("click", async () => {
            try {
                // Show loading
                this.elements.menuCategories.innerHTML = `
                    <div class="empty-menu">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Cargando menú desde la base de datos...</p>
                    </div>
                `;
                
                this.elements.menuModal.classList.add("active");
                
                // Reload products to ensure fresh data
                await this.loadProducts();
                
                // Load menu data
                this.loadMenuData();
                
            } catch (error) {
                console.error("❌ Error abriendo menú:", error);
                this.elements.menuCategories.innerHTML = `
                    <div class="empty-menu">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Error cargando menú</h3>
                        <p>${error.message}</p>
                    </div>
                `;
            }
        });
        
        // Close modal buttons
        document.getElementById("close-order-modal").addEventListener("click", () => {
            this.elements.orderModal.classList.remove("active");
        });
        
        document.getElementById("close-menu-modal").addEventListener("click", () => {
            this.elements.menuModal.classList.remove("active");
        });
        
        document.getElementById("close-menu-btn").addEventListener("click", () => {
            this.elements.menuModal.classList.remove("active");
        });
        
        // WhatsApp button
        this.elements.whatsappBtn.addEventListener("click", () => this.sendOrderToWhatsApp());
        
        // Copy order button
        this.elements.copyOrderBtn.addEventListener("click", () => this.copyOrderToClipboard());
        
        // Close modals when clicking outside
        document.querySelectorAll(".modal-overlay").forEach(modal => {
            modal.addEventListener("click", (e) => {
                if (e.target === modal) {
                    modal.classList.remove("active");
                }
            });
        });
        
        // Online/offline events
        window.addEventListener("online", () => this.updateOnlineStatus());
        window.addEventListener("offline", () => this.updateOnlineStatus());
        
        console.log("✅ Event listeners configurados");
    },
    
    // Initialize textarea auto-resize
    initializeTextarea() {
        this.elements.userInput.addEventListener("input", function() {
            this.style.height = "auto";
            this.style.height = (this.scrollHeight) + "px";
        });
    },
    
    // Send message
    async sendMessage() {
        const message = this.elements.userInput.value.trim();
        
        if (!message || window.appState.isProcessing) return;
        
        // Add user message to chat
        this.addMessage(message, "user");
        
        // Clear input
        this.elements.userInput.value = "";
        this.elements.userInput.style.height = "auto";
        
        // Disable input while processing
        window.appState.isProcessing = true;
        this.elements.userInput.disabled = true;
        this.elements.sendButton.disabled = true;
        
        // Show typing indicator
        this.showTypingIndicator();
        
        try {
            // Process the message
            const response = await this.processMessage(message);
            
            // Add response to chat
            this.addMessage(response, "assistant");
            
        } catch (error) {
            console.error("❌ Error procesando mensaje:", error);
            this.addMessage("Lo siento, hubo un error procesando tu mensaje.", "assistant");
        } finally {
            // Hide typing indicator
            this.hideTypingIndicator();
            
            // Re-enable input
            window.appState.isProcessing = false;
            this.elements.userInput.disabled = false;
            this.elements.sendButton.disabled = false;
            this.elements.userInput.focus();
        }
    },
    
    // Process message with AI or rules
    async processMessage(message) {
        const lowerMessage = message.toLowerCase();
        
        // Check if we have products loaded
        if (window.appState.products.length === 0) {
            return "Lo siento, el menú no está disponible en este momento. Por favor, intenta más tarde o contacta al restaurante.";
        }
        
        // Use Gemini AI if available and initialized
        if (window.appState.geminiAssistant && window.appState.geminiAssistant.isInitialized) {
            try {
                const context = {
                    products: window.appState.products,
                    settings: window.appState.settings,
                    currentOrder: window.appState.currentOrder
                };
                
                const response = await window.appState.geminiAssistant.sendMessage(message, context);
                return response.text;
                
            } catch (error) {
                console.error("❌ Error con Gemini:", error);
                // Fallback to rule-based responses
            }
        }
        
        // Rule-based responses
        if (lowerMessage.includes("hola") || lowerMessage.includes("buenas")) {
            return `¡Hola! Soy EL TACHI 🤖. Tengo ${window.appState.products.length} productos disponibles. ¿En qué puedo ayudarte?`;
        }
        
        else if (lowerMessage.includes("menú") || lowerMessage.includes("carta")) {
            const categories = [...new Set(window.appState.products.map(p => p.category))];
            let response = "Nuestro menú incluye:<br>";
            
            categories.forEach(category => {
                const categoryProducts = window.appState.products.filter(p => p.category === category);
                response += `<br><strong>${category.toUpperCase()}:</strong><br>`;
                categoryProducts.forEach(product => {
                    response += `• ${product.name} - $${product.price}<br>`;
                });
            });
            
            response += "<br>¿Te interesa algún producto en particular?";
            return response;
        }
        
        else if (lowerMessage.includes("horario") || lowerMessage.includes("hora")) {
            return `Nuestros horarios son:<br><strong>${window.appState.settings.businessHours}</strong>`;
        }
        
        else if (lowerMessage.includes("pedido") || lowerMessage.includes("orden")) {
            return "¡Excelente! Para hacer un pedido, por favor dime qué productos te gustaría ordenar del menú.";
        }
        
        else if (lowerMessage.includes("producto") || lowerMessage.includes("precio")) {
            // Check if user mentioned a specific product
            for (const product of window.appState.products) {
                if (lowerMessage.includes(product.name.toLowerCase())) {
                    return `El ${product.name} tiene un precio de $${product.price}. ${product.description ? `<br>${product.description}` : ""}`;
                }
            }
            
            return "¿Sobre qué producto te gustaría saber el precio?";
        }
        
        else {
            // Default response
            return `Entiendo que dijiste: "${message}". Como asistente de EL TACHI, puedo ayudarte con pedidos, información del menú, horarios y precios. ¿En qué te puedo ayudar específicamente?`;
        }
    },
    
    // Add message to chat
    addMessage(text, sender) {
        const messageClass = sender === "user" ? "user" : "assistant";
        const messageHTML = `
            <div class="message ${messageClass}">
                ${sender === "assistant" ? '<div class="message-icon"><i class="fas fa-robot"></i></div>' : ""}
                ${text}
                <span class="message-time">${this.getCurrentTime()}</span>
            </div>
        `;
        
        this.elements.chatMessages.innerHTML += messageHTML;
        this.scrollToBottom();
    },
    
    // Handle quick actions
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
    },
    
    // Load menu data from Firebase products
    loadMenuData() {
        const products = window.appState.products;
        
        // Check if there are products
        if (!products || products.length === 0) {
            this.elements.menuCategories.innerHTML = `
                <div class="empty-menu">
                    <i class="fas fa-utensils"></i>
                    <h3>Menú vacío</h3>
                    <p>No hay productos cargados en la base de datos.</p>
                    <p>Por favor, contacta al administrador del sistema.</p>
                </div>
            `;
            return;
        }
        
        const categories = {};
        
        // Group products by category
        products.forEach(product => {
            if (!categories[product.category]) {
                categories[product.category] = [];
            }
            categories[product.category].push(product);
        });
        
        // Category titles
        const categoryTitles = {
            hamburguesas: "🍔 Hamburguesas",
            pizzas: "🍕 Pizzas",
            acompañamientos: "🍟 Acompañamientos",
            ensaladas: "🥗 Ensaladas",
            bebidas: "🥤 Bebidas",
            postres: "🍦 Postres",
            combos: "🎁 Combos",
            especiales: "⭐ Especiales"
        };
        
        let menuHTML = "";
        
        for (const [category, categoryProducts] of Object.entries(categories)) {
            menuHTML += `
                <div class="menu-category">
                    <div class="category-title">
                        <i class="fas ${categoryProducts[0].icon || "fa-utensils"}"></i>
                        <span>${categoryTitles[category] || category}</span>
                    </div>
                    <div class="products-list">
            `;
            
            categoryProducts.forEach(product => {
                menuHTML += `
                    <div class="product-card ${!product.available ? "product-unavailable" : ""}">
                        <div class="product-image">
                            <i class="fas ${product.icon || "fa-utensils"}"></i>
                        </div>
                        <div class="product-info">
                            <div class="product-name">${product.name}</div>
                            <div class="product-description">${product.description || ""}</div>
                            <div class="product-price">$${product.price}</div>
                        </div>
                    </div>
                `;
            });
            
            menuHTML += `
                    </div>
                </div>
            `;
        }
        
        this.elements.menuCategories.innerHTML = menuHTML;
    },
    
    // Show order summary
    showOrderSummary() {
        if (window.appState.currentOrder.length === 0) {
            this.addMessage("Tu pedido está vacío. Agrega productos primero.", "assistant");
            return;
        }
        
        let total = 0;
        let summaryHTML = "<h3>Resumen de tu Pedido</h3><div class=\"order-items\">";
        
        window.appState.currentOrder.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            
            summaryHTML += `
                <div class="order-item">
                    <div class="order-item-name">${item.quantity}x ${item.name}</div>
                    <div class="order-item-price">$${itemTotal}</div>
                </div>
            `;
        });
        
        // Add delivery fee if applicable
        if (total < window.appState.settings.minOrder) {
            summaryHTML += `
                <div class="order-item">
                    <div class="order-item-name">Envío a domicilio</div>
                    <div class="order-item-price">$${window.appState.settings.deliveryFee}</div>
                </div>
            `;
            total += window.appState.settings.deliveryFee;
        }
        
        summaryHTML += "</div>";
        summaryHTML += `
            <div class="order-total">
                <span>TOTAL</span>
                <span>$${total}</span>
            </div>
        `;
        
        if (total < window.appState.settings.minOrder) {
            summaryHTML += `<div class="mt-3" style="color: var(--warning-orange); font-size: 14px;">
                <i class="fas fa-exclamation-triangle"></i> Pedido mínimo: $${window.appState.settings.minOrder}
            </div>`;
        }
        
        this.elements.orderSummaryContent.innerHTML = summaryHTML;
        this.elements.orderModal.classList.add("active");
    },
    
    // Send order to WhatsApp
    sendOrderToWhatsApp() {
        if (window.appState.currentOrder.length === 0) {
            alert("No hay productos en tu pedido");
            return;
        }
        
        let orderText = `*NUEVO PEDIDO - EL TACHI*%0A%0A`;
        let total = 0;
        
        window.appState.currentOrder.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            orderText += `• ${item.quantity}x ${item.name}: $${itemTotal}%0A`;
        });
        
        // Add delivery fee if applicable
        if (total < window.appState.settings.minOrder) {
            orderText += `• Envío: $${window.appState.settings.deliveryFee}%0A`;
            total += window.appState.settings.deliveryFee;
        }
        
        orderText += `%0A*TOTAL: $${total}*%0A%0A`;
        orderText += `_Pedido realizado a través del Asistente IA EL TACHI_`;
        
        const whatsappNumber = window.appState.settings.whatsappNumber || "+5491122334455";
        const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${orderText}`;
        
        // Open WhatsApp in new tab
        window.open(whatsappUrl, "_blank");
        
        // Show confirmation message
        this.addMessage("¡Perfecto! He abierto WhatsApp para que confirmes tu pedido.", "assistant");
        
        // Close modal
        this.elements.orderModal.classList.remove("active");
        
        // Clear current order
        window.appState.currentOrder = [];
    },
    
    // Copy order to clipboard
    copyOrderToClipboard() {
        if (window.appState.currentOrder.length === 0) {
            alert("No hay productos en tu pedido");
            return;
        }
        
        let orderText = `NUEVO PEDIDO - EL TACHI\n\n`;
        let total = 0;
        
        window.appState.currentOrder.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            orderText += `• ${item.quantity}x ${item.name}: $${itemTotal}\n`;
        });
        
        // Add delivery fee if applicable
        if (total < window.appState.settings.minOrder) {
            orderText += `• Envío: $${window.appState.settings.deliveryFee}\n`;
            total += window.appState.settings.deliveryFee;
        }
        
        orderText += `\nTOTAL: $${total}\n\n`;
        orderText += `Pedido realizado a través del Asistente IA EL TACHI`;
        
        // Copy to clipboard
        navigator.clipboard.writeText(orderText).then(() => {
            alert("Pedido copiado al portapapeles. Puedes pegarlo en WhatsApp o donde necesites.");
        }).catch(err => {
            console.error("Error al copiar: ", err);
            alert("No se pudo copiar el pedido. Por favor, hazlo manualmente.");
        });
    },
    
    // Show typing indicator
    showTypingIndicator() {
        this.elements.typingIndicator.classList.add("active");
        this.scrollToBottom();
    },
    
    // Hide typing indicator
    hideTypingIndicator() {
        this.elements.typingIndicator.classList.remove("active");
    },
    
    // Scroll chat to bottom
    scrollToBottom() {
        setTimeout(() => {
            const chatContainer = document.getElementById("chat-container");
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }, 100);
    },
    
    // Get current time
    getCurrentTime() {
        const now = new Date();
        return now.getHours().toString().padStart(2, "0") + ":" + 
               now.getMinutes().toString().padStart(2, "0");
    },
    
    // Update online/offline status
    updateOnlineStatus() {
        const offlineIndicator = document.getElementById("offline-indicator");
        const statusBadge = document.getElementById("status-badge");
        
        if (!navigator.onLine) {
            offlineIndicator.classList.add("active");
            if (statusBadge) {
                statusBadge.classList.add("closed");
                statusBadge.innerHTML = '<i class="fas fa-wifi-slash"></i><span>Offline</span>';
            }
            window.appState.isOnline = false;
        } else {
            offlineIndicator.classList.remove("active");
            if (statusBadge) {
                statusBadge.classList.remove("closed");
                statusBadge.innerHTML = '<i class="fas fa-store"></i><span>Abierto</span>';
            }
            window.appState.isOnline = true;
        }
    }
};

// Make App available globally
window.app = App;
