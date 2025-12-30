// Configuración Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAZnd-oA7S99_w2rt8_Vw53ux8l1PqiQ-k",
    authDomain: "eltachi.firebaseapp.com",
    projectId: "eltachi",
    storageBucket: "eltachi.firebasestorage.app",
    messagingSenderId: "231676602106",
    appId: "1:231676602106:web:fde347e9caa00760b34b43"
};

// Inicializar Firebase
try {
    firebase.initializeApp(firebaseConfig);
    console.log("✅ Firebase inicializado");
} catch (error) {
    console.error("❌ Error inicializando Firebase:", error);
}

// Referencias globales
const db = firebase.firestore();
let appState = {
    settings: null,
    categories: [],
    products: [],
    cart: [],
    currentCategory: null,
    geminiEngine: null
};

// Cargar configuración del local
async function loadSettings() {
    try {
        const settingsRef = db.collection('settings').doc('config');
        const doc = await settingsRef.get();
        
        if (doc.exists) {
            appState.settings = doc.data();
            updateStoreStatus();
            updateDeliveryInfo();
            return appState.settings;
        } else {
            console.error('Configuración no encontrada');
            return null;
        }
    } catch (error) {
        console.error('Error cargando configuración:', error);
        return null;
    }
}

// Cargar categorías
async function loadCategories() {
    try {
        const snapshot = await db.collection('categories')
            .orderBy('orden')
            .get();
        
        appState.categories = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        renderCategories();
        return appState.categories;
    } catch (error) {
        console.error('Error cargando categorías:', error);
        return [];
    }
}

// Cargar productos
async function loadProducts() {
    try {
        const snapshot = await db.collection('products')
            .where('disponible', '==', true)
            .get();
        
        appState.products = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        if (appState.currentCategory) {
            renderProducts(appState.currentCategory);
        } else if (appState.categories.length > 0) {
            selectCategory(appState.categories[0].id);
        }
        
        return appState.products;
    } catch (error) {
        console.error('Error cargando productos:', error);
        return [];
    }
}

// Renderizar categorías
function renderCategories() {
    const container = document.getElementById('categoryTabs');
    if (!container) return;
    
    container.innerHTML = '';
    
    appState.categories.forEach(category => {
        const button = document.createElement('button');
        button.className = `category-tab ${appState.currentCategory === category.id ? 'active' : ''}`;
        button.textContent = category.nombre;
        button.dataset.categoryId = category.id;
        
        button.addEventListener('click', () => {
            selectCategory(category.id);
        });
        
        container.appendChild(button);
    });
}

// Seleccionar categoría
function selectCategory(categoryId) {
    appState.currentCategory = categoryId;
    renderCategories();
    renderProducts(categoryId);
}

// Renderizar productos
function renderProducts(categoryId) {
    const container = document.getElementById('productsGrid');
    if (!container) return;
    
    const filteredProducts = appState.products.filter(
        product => product.categoria === categoryId
    );
    
    if (filteredProducts.length === 0) {
        container.innerHTML = `
            <div class="text-center" style="padding: 3rem;">
                <p>No hay productos disponibles en esta categoría</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    filteredProducts.forEach(product => {
        const cartItem = appState.cart.find(item => item.id === product.id);
        const quantity = cartItem ? cartItem.quantity : 0;
        
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="product-image">
                ${getProductEmoji(product.categoria)}
            </div>
            <div class="product-content">
                <div class="product-header">
                    <h3 class="product-title">${product.nombre}</h3>
                    <div class="product-price">$${product.precio}</div>
                </div>
                
                ${product.descripcion ? `
                    <p class="product-description">${product.descripcion}</p>
                ` : ''}
                
                ${product.aderezos_disponibles && product.aderezos_disponibles.length > 0 ? `
                    <div class="product-includes">
                        <div class="includes-label">Incluye:</div>
                        <div class="includes-items">${product.aderezos_disponibles.join(', ')}</div>
                    </div>
                ` : ''}
                
                <div class="product-actions">
                    ${quantity > 0 ? `
                        <div class="quantity-controls">
                            <button class="quantity-btn decrease" data-product-id="${product.id}">-</button>
                            <span class="quantity-display">${quantity}</span>
                            <button class="quantity-btn increase" data-product-id="${product.id}">+</button>
                        </div>
                    ` : ''}
                    
                    <button class="add-to-cart-btn ${quantity > 0 ? 'hidden' : ''}" 
                            data-product-id="${product.id}"
                            data-product-name="${product.nombre}"
                            data-product-price="${product.precio}"
                            data-product-category="${product.categoria}">
                        ${quantity > 0 ? 'Agregado' : 'Agregar al pedido'}
                    </button>
                </div>
            </div>
        `;
        
        container.appendChild(card);
    });
    
    // Agregar event listeners
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = e.target.dataset.productId;
            const product = appState.products.find(p => p.id === productId);
            if (product) {
                addToCart(product);
            }
        });
    });
    
    document.querySelectorAll('.quantity-btn.increase').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = e.target.dataset.productId;
            const product = appState.products.find(p => p.id === productId);
            if (product) {
                addToCart(product);
            }
        });
    });
    
    document.querySelectorAll('.quantity-btn.decrease').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = e.target.dataset.productId;
            const product = appState.products.find(p => p.id === productId);
            if (product) {
                removeFromCart(product.id);
            }
        });
    });
}

// Obtener emoji por categoría
function getProductEmoji(category) {
    const emojis = {
        'hamburguesas': '🍔',
        'pizzas': '🍕',
        'entradas': '🥟',
        'acompañamientos': '🍟',
        'bebidas': '🥤',
        'postres': '🍰',
        'asado': '🥩',
        'empanadas': '🥟'
    };
    
    return emojis[category] || '🍽️';
}

// CARRITO
function loadCart() {
    try {
        const savedCart = localStorage.getItem('eltachi_cart');
        if (savedCart) {
            appState.cart = JSON.parse(savedCart);
            updateCartUI();
        }
    } catch (error) {
        console.error('Error cargando carrito:', error);
        appState.cart = [];
    }
}

function saveCart() {
    try {
        localStorage.setItem('eltachi_cart', JSON.stringify(appState.cart));
    } catch (error) {
        console.error('Error guardando carrito:', error);
    }
}

function addToCart(product) {
    const existingItem = appState.cart.find(item => item.id === product.id);
    
    if (existingItem) {
        existingItem.quantity += 1;
        existingItem.total = existingItem.quantity * existingItem.price;
    } else {
        appState.cart.push({
            id: product.id,
            name: product.nombre,
            price: product.precio,
            quantity: 1,
            total: product.precio,
            category: product.categoria,
            includes: product.aderezos_disponibles || []
        });
    }
    
    saveCart();
    updateCartUI();
    renderProducts(appState.currentCategory);
}

function removeFromCart(productId) {
    const itemIndex = appState.cart.findIndex(item => item.id === productId);
    
    if (itemIndex !== -1) {
        if (appState.cart[itemIndex].quantity > 1) {
            appState.cart[itemIndex].quantity -= 1;
            appState.cart[itemIndex].total = appState.cart[itemIndex].quantity * appState.cart[itemIndex].price;
        } else {
            appState.cart.splice(itemIndex, 1);
        }
        
        saveCart();
        updateCartUI();
        renderProducts(appState.currentCategory);
    }
}

function clearCart() {
    appState.cart = [];
    saveCart();
    updateCartUI();
    renderProducts(appState.currentCategory);
}

function getCartTotal() {
    return appState.cart.reduce((total, item) => total + item.total, 0);
}

function updateCartUI() {
    const cartCount = document.getElementById('cartCount');
    const cartTotal = document.getElementById('cartTotal');
    
    if (cartCount) {
        const totalItems = appState.cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;
        cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
    }
    
    if (cartTotal) {
        cartTotal.textContent = `$${getCartTotal()}`;
    }
    
    renderCartItems();
}

function renderCartItems() {
    const container = document.getElementById('cartItems');
    if (!container) return;
    
    if (appState.cart.length === 0) {
        container.innerHTML = `
            <div class="text-center mt-3">
                <p>El carrito está vacío</p>
                <p class="text-muted mt-1">Agrega productos de las categorías</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    appState.cart.forEach(item => {
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div class="cart-item-content">
                <div class="cart-item-header">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">$${item.total}</div>
                </div>
                
                ${item.includes.length > 0 ? `
                    <div class="text-small text-muted">
                        Incluye: ${item.includes.join(', ')}
                    </div>
                ` : ''}
                
                <div class="cart-item-actions">
                    <div class="cart-item-quantity">
                        <button class="cart-quantity-btn decrease" data-product-id="${item.id}">-</button>
                        <span class="cart-item-quantity-display">${item.quantity}</span>
                        <button class="cart-quantity-btn increase" data-product-id="${item.id}">+</button>
                    </div>
                    <button class="remove-item" data-product-id="${item.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        
        container.appendChild(cartItem);
    });
    
    // Agregar event listeners
    document.querySelectorAll('.cart-quantity-btn.increase').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = e.target.closest('button').dataset.productId;
            const product = appState.products.find(p => p.id === productId);
            if (product) {
                addToCart(product);
            }
        });
    });
    
    document.querySelectorAll('.cart-quantity-btn.decrease').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = e.target.closest('button').dataset.productId;
            removeFromCart(productId);
        });
    });
    
    document.querySelectorAll('.remove-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = e.target.closest('button').dataset.productId;
            const itemIndex = appState.cart.findIndex(item => item.id === productId);
            if (itemIndex !== -1) {
                appState.cart.splice(itemIndex, 1);
                saveCart();
                updateCartUI();
                renderProducts(appState.currentCategory);
            }
        });
    });
}

// CHECKOUT
function setupCheckout() {
    const cartButton = document.getElementById('cartButton');
    const closeCart = document.getElementById('closeCart');
    const cartOverlay = document.getElementById('cartOverlay');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const cancelCheckout = document.getElementById('cancelCheckout');
    const checkoutModal = document.getElementById('checkoutModal');
    
    if (cartButton) {
        cartButton.addEventListener('click', () => {
            cartOverlay.style.display = 'flex';
        });
    }
    
    if (closeCart) {
        closeCart.addEventListener('click', () => {
            cartOverlay.style.display = 'none';
        });
    }
    
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            if (appState.cart.length === 0) {
                alert('Agrega productos al carrito primero');
                return;
            }
            
            cartOverlay.style.display = 'none';
            openCheckout();
        });
    }
    
    if (cancelCheckout) {
        cancelCheckout.addEventListener('click', () => {
            checkoutModal.style.display = 'none';
        });
    }
    
    // Tipo de pedido (retiro/envío)
    const deliveryInputs = document.querySelectorAll('input[name="deliveryType"]');
    deliveryInputs.forEach(input => {
        input.addEventListener('change', () => {
            const addressField = document.getElementById('addressField');
            if (input.value === 'envío') {
                addressField.style.display = 'block';
            } else {
                addressField.style.display = 'none';
            }
        });
    });
    
    // Navegación checkout
    document.getElementById('nextToConfirm')?.addEventListener('click', goToConfirm);
    document.getElementById('backToCustomer')?.addEventListener('click', goToCustomer);
    document.getElementById('confirmOrder')?.addEventListener('click', confirmOrder);
    document.getElementById('whatsappButton')?.addEventListener('click', openWhatsApp);
    document.getElementById('newOrderBtn')?.addEventListener('click', startNewOrder);
}

function openCheckout() {
    const modal = document.getElementById('checkoutModal');
    const sectionCustomer = document.getElementById('sectionCustomer');
    
    // Resetear formulario
    document.getElementById('customerName').value = '';
    document.getElementById('customerPhone').value = '';
    document.getElementById('customerAddress').value = '';
    document.getElementById('orderComments').value = '';
    document.getElementById('deliveryPickup').checked = true;
    document.getElementById('addressField').style.display = 'none';
    
    // Ir a primera sección
    setCheckoutStep(1);
    
    modal.style.display = 'flex';
}

function setCheckoutStep(step) {
    // Actualizar pasos
    document.querySelectorAll('.step').forEach(stepEl => {
        stepEl.classList.remove('active');
        if (parseInt(stepEl.dataset.step) === step) {
            stepEl.classList.add('active');
        }
    });
    
    // Mostrar sección correspondiente
    document.querySelectorAll('.checkout-section').forEach(section => {
        section.classList.remove('active');
    });
    
    switch(step) {
        case 1:
            document.getElementById('sectionCustomer').classList.add('active');
            break;
        case 2:
            document.getElementById('sectionConfirm').classList.add('active');
            updateOrderSummary();
            break;
        case 3:
            document.getElementById('sectionComplete').classList.add('active');
            break;
    }
}

function goToConfirm() {
    // Validar datos básicos
    const name = document.getElementById('customerName').value.trim();
    const phone = document.getElementById('customerPhone').value.trim();
    const deliveryType = document.querySelector('input[name="deliveryType"]:checked').value;
    const address = document.getElementById('customerAddress').value.trim();
    
    if (!name) {
        alert('Por favor ingresa tu nombre');
        return;
    }
    
    if (!phone || phone.length < 8) {
        alert('Por favor ingresa un teléfono válido');
        return;
    }
    
    if (deliveryType === 'envío' && !address) {
        alert('Por favor ingresa tu dirección para el envío');
        return;
    }
    
    // Actualizar resumen
    document.getElementById('confirmCustomerName').textContent = name;
    document.getElementById('confirmCustomerPhone').textContent = phone;
    document.getElementById('confirmDeliveryType').textContent = 
        deliveryType === 'envío' ? 'Envío a domicilio' : 'Retiro en local';
    
    if (deliveryType === 'envío') {
        document.getElementById('confirmAddressSection').style.display = 'block';
        document.getElementById('confirmCustomerAddress').textContent = address;
    } else {
        document.getElementById('confirmAddressSection').style.display = 'none';
    }
    
    const comments = document.getElementById('orderComments').value.trim();
    if (comments) {
        document.getElementById('confirmCommentsSection').style.display = 'block';
        document.getElementById('confirmOrderComments').textContent = comments;
    } else {
        document.getElementById('confirmCommentsSection').style.display = 'none';
    }
    
    setCheckoutStep(2);
}

function goToCustomer() {
    setCheckoutStep(1);
}

function updateOrderSummary() {
    const container = document.getElementById('orderSummaryItems');
    const totalElement = document.getElementById('orderSummaryTotal');
    
    if (!container) return;
    
    let html = '';
    let subtotal = 0;
    
    appState.cart.forEach(item => {
        html += `
            <div class="summary-item">
                <span>${item.name} x${item.quantity}</span>
                <span>$${item.total}</span>
            </div>
        `;
        subtotal += item.total;
    });
    
    // Calcular envío si corresponde
    const deliveryType = document.querySelector('input[name="deliveryType"]:checked').value;
    let deliveryCost = 0;
    
    if (deliveryType === 'envío' && appState.settings) {
        deliveryCost = appState.settings.precio_envio || 0;
        html += `
            <div class="summary-item">
                <span>Costo de envío</span>
                <span>$${deliveryCost}</span>
            </div>
        `;
    }
    
    const total = subtotal + deliveryCost;
    
    container.innerHTML = html;
    if (totalElement) {
        totalElement.textContent = `$${total}`;
    }
}

async function confirmOrder() {
    try {
        // Validar que el local esté abierto
        if (!appState.settings?.abierto) {
            alert('El local está cerrado en este momento. No se pueden tomar pedidos.');
            return;
        }
        
        // Obtener datos del formulario
        const customerName = document.getElementById('customerName').value.trim();
        const customerPhone = document.getElementById('customerPhone').value.trim();
        const deliveryType = document.querySelector('input[name="deliveryType"]:checked').value;
        const customerAddress = document.getElementById('customerAddress').value.trim();
        const orderComments = document.getElementById('orderComments').value.trim();
        
        // Calcular total
        let subtotal = getCartTotal();
        let deliveryCost = 0;
        
        if (deliveryType === 'envío') {
            deliveryCost = appState.settings?.precio_envio || 0;
        }
        
        const total = subtotal + deliveryCost;
        
        // Generar ID de pedido
        const orderId = await generateOrderId();
        
        // Crear pedido detallado
        const orderDetails = appState.cart.map(item => 
            `- ${item.name} x${item.quantity}: $${item.total}`
        ).join('\n');
        
        const fullOrderText = `Pedido:\n${orderDetails}\n\nSubtotal: $${subtotal}\n${deliveryType === 'envío' ? `Envío: $${deliveryCost}\n` : ''}Total: $${total}\n${orderComments ? `\nComentarios: ${orderComments}` : ''}`;
        
        // Datos del pedido para Firestore
        const orderData = {
            id_pedido: orderId,
            fecha: firebase.firestore.FieldValue.serverTimestamp(),
            nombre_cliente: customerName,
            telefono: customerPhone,
            tipo_pedido: deliveryType,
            direccion: deliveryType === 'envío' ? customerAddress : '',
            pedido_detallado: fullOrderText,
            items: appState.cart.map(item => ({
                id: item.id,
                nombre: item.name,
                precio: item.price,
                cantidad: item.quantity,
                total: item.total
            })),
            comentarios: orderComments || '',
            subtotal: subtotal,
            precio_envio: deliveryCost,
            total: total,
            estado: 'Recibido',
            tiempo_estimado_actual: appState.settings?.tiempo_base_estimado || 30,
            fecha_actualizacion: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Guardar en Firestore
        await db.collection('orders').doc(orderId).set(orderData);
        
        // Enviar notificación al panel admin
        await sendAdminNotification(orderId, customerName, total);
        
        // Mostrar confirmación
        document.getElementById('orderIdDisplay').textContent = orderId;
        document.getElementById('orderTimeDisplay').textContent = 
            `${appState.settings?.tiempo_base_estimado || 30} minutos`;
        document.getElementById('orderTotalDisplay').textContent = `$${total}`;
        
        // Guardar datos para WhatsApp
        window.lastOrderData = {
            id: orderId,
            phone: customerPhone,
            name: customerName,
            total: total,
            details: fullOrderText,
            deliveryType: deliveryType,
            address: customerAddress
        };
        
        setCheckoutStep(3);
        
    } catch (error) {
        console.error('Error confirmando pedido:', error);
        alert('Hubo un error al procesar tu pedido. Por favor, intentá de nuevo.');
    }
}

async function generateOrderId() {
    try {
        const counterRef = db.collection('counters').doc('orders');
        
        return await db.runTransaction(async (transaction) => {
            const counterDoc = await transaction.get(counterRef);
            
            let newNumber;
            if (!counterDoc.exists) {
                newNumber = 1;
                transaction.set(counterRef, { lastNumber: newNumber });
            } else {
                newNumber = (counterDoc.data().lastNumber || 0) + 1;
                transaction.update(counterRef, { lastNumber: newNumber });
            }
            
            const paddedNumber = newNumber.toString().padStart(6, '0');
            return `TACHI-${paddedNumber}`;
        });
        
    } catch (error) {
        console.error('Error generando ID:', error);
        const timestamp = Date.now().toString().slice(-6);
        return `TACHI-${timestamp}`;
    }
}

async function sendAdminNotification(orderId, customerName, total) {
    try {
        await db.collection('notifications').add({
            tipo: 'nuevo_pedido',
            mensaje: `Nuevo pedido ${orderId} de ${customerName} por $${total}`,
            pedido_id: orderId,
            fecha: firebase.firestore.FieldValue.serverTimestamp(),
            leido: false
        });
        console.log('📢 Notificación enviada al panel admin');
    } catch (error) {
        console.error('Error enviando notificación:', error);
    }
}

function openWhatsApp() {
    if (!window.lastOrderData) return;
    
    const { id, phone, name, total, details, deliveryType, address } = window.lastOrderData;
    
    let message = `Hola ${name}! 👋\n\n`;
    message += `Confirmamos tu pedido en EL TACHI:\n\n`;
    message += `*Pedido:* ${id}\n`;
    message += `*Cliente:* ${name}\n`;
    message += `*Tipo:* ${deliveryType === 'envío' ? 'Envío a domicilio' : 'Retiro en local'}\n`;
    
    if (deliveryType === 'envío' && address) {
        message += `*Dirección:* ${address}\n`;
    }
    
    message += `\n*Detalle del pedido:*\n${details}\n\n`;
    message += `*Tiempo estimado:* ${appState.settings?.tiempo_base_estimado || 30} minutos\n\n`;
    message += `¡Gracias por tu compra! 🍔`;
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${appState.settings?.telefono_whatsapp || '5491122334455'}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
    
    // Limpiar carrito
    clearCart();
}

function startNewOrder() {
    const modal = document.getElementById('checkoutModal');
    modal.style.display = 'none';
    
    // Limpiar carrito
    clearCart();
    
    // Ir a primera categoría
    if (appState.categories.length > 0) {
        selectCategory(appState.categories[0].id);
    }
}

// UI HELPER FUNCTIONS
function updateStoreStatus() {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    
    if (!appState.settings) return;
    
    if (appState.settings.abierto) {
        if (statusDot) {
            statusDot.style.background = '#10b981';
        }
        if (statusText) {
            statusText.textContent = 'Abierto ahora';
        }
    } else {
        if (statusDot) {
            statusDot.style.background = '#ef4444';
        }
        if (statusText) {
            statusText.textContent = 'Cerrado';
        }
    }
}

function updateDeliveryInfo() {
    const element = document.getElementById('deliveryInfo');
    if (!element || !appState.settings) return;
    
    element.innerHTML = `
        <span>${appState.settings.tiempo_base_estimado || 30} min</span>
        <span style="margin: 0 0.5rem;">•</span>
        <span>Envío $${appState.settings.precio_envio || 0}</span>
    `;
}

// INICIALIZAR APP
async function initApp() {
    console.log('🚀 Inicializando aplicación...');
    
    try {
        // Cargar configuración
        await loadSettings();
        
        // Cargar carrito
        loadCart();
        
        // Cargar categorías y productos
        await Promise.all([loadCategories(), loadProducts()]);
        
        // Configurar event listeners
        setupCheckout();
        
        // Inicializar Gemini si hay API Key
        if (appState.settings?.api_key_gemini) {
            const { initGeminiEngine } = await import('./gemini-engine.js');
            appState.geminiEngine = await initGeminiEngine(
                appState.settings.api_key_gemini,
                appState.settings,
                appState.products
            );
        }
        
        console.log('✅ Aplicación lista');
        
    } catch (error) {
        console.error('❌ Error inicializando aplicación:', error);
        alert('Error cargando la aplicación. Por favor, recarga la página.');
    }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Exportar para uso global
window.appState = appState;
window.clearCart = clearCart;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.getCartTotal = getCartTotal;
