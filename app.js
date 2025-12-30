// app.js - Lógica de la aplicación de clientes
console.log("🚀 Iniciando aplicación EL TACHI...");

// Estado global de la aplicación
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
        console.log("📋 Cargando configuración...");
        const settingsRef = db.collection('settings').doc('config');
        const doc = await settingsRef.get();
        
        if (doc.exists) {
            appState.settings = doc.data();
            console.log("✅ Configuración cargada:", appState.settings.nombre_local);
            updateStoreStatus();
            updateDeliveryInfo();
            return appState.settings;
        } else {
            console.log('⚠️ Configuración no encontrada, creando por defecto...');
            
            // Crear configuración por defecto
            const defaultSettings = {
                nombre_local: "EL TACHI Rotisería",
                horarios_por_dia: {
                    lunes: "11:00 - 23:00",
                    martes: "11:00 - 23:00",
                    miércoles: "11:00 - 23:00",
                    jueves: "11:00 - 23:00",
                    viernes: "11:00 - 00:00",
                    sábado: "11:00 - 00:00",
                    domingo: "11:00 - 23:00"
                },
                abierto: true,
                mensaje_cerrado: "Lo sentimos, estamos cerrados en este momento. Volvemos mañana a las 11:00.",
                precio_envio: 300,
                tiempo_base_estimado: 30,
                retiro_habilitado: true,
                colores_marca: {
                    azul: "#1e40af",
                    amarillo: "#f59e0b"
                },
                telefono_whatsapp: "5491122334455",
                api_key_gemini: ""
            };
            
            await settingsRef.set(defaultSettings);
            appState.settings = defaultSettings;
            
            updateStoreStatus();
            updateDeliveryInfo();
            return appState.settings;
        }
    } catch (error) {
        console.error('❌ Error cargando configuración:', error);
        return null;
    }
}

// Cargar categorías
async function loadCategories() {
    try {
        console.log("🗂️ Cargando categorías...");
        const snapshot = await db.collection('categories')
            .orderBy('orden')
            .get();
        
        appState.categories = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        console.log(`✅ ${appState.categories.length} categorías cargadas`);
        renderCategories();
        return appState.categories;
    } catch (error) {
        console.error('❌ Error cargando categorías:', error);
        return [];
    }
}

// Cargar productos
async function loadProducts() {
    try {
        console.log("🍔 Cargando productos...");
        const snapshot = await db.collection('products')
            .get();
        
        appState.products = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })).filter(product => product.disponible !== false);
        
        console.log(`✅ ${appState.products.length} productos cargados`);
        
        if (appState.currentCategory) {
            renderProducts(appState.currentCategory);
        } else if (appState.categories.length > 0) {
            selectCategory(appState.categories[0].id);
        }
        
        return appState.products;
    } catch (error) {
        console.error('❌ Error cargando productos:', error);
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
    setTimeout(() => {
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
    }, 100);
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
    if (appState.currentCategory) {
        renderProducts(appState.currentCategory);
    }
    
    // Feedback visual
    const cartButton = document.getElementById('cartButton');
    if (cartButton) {
        cartButton.style.transform = 'scale(1.1)';
        setTimeout(() => {
            cartButton.style.transform = 'scale(1)';
        }, 200);
    }
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
        if (appState.currentCategory) {
            renderProducts(appState.currentCategory);
        }
    }
}

function clearCart() {
    appState.cart = [];
    saveCart();
    updateCartUI();
    if (appState.currentCategory) {
        renderProducts(appState.currentCategory);
    }
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
    setTimeout(() => {
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
                    if (appState.currentCategory) {
                        renderProducts(appState.currentCategory);
                    }
                }
            });
        });
    }, 100);
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
            if (checkoutModal) checkoutModal.style.display = 'none';
        });
    }
    
    // Tipo de pedido (retiro/envío)
    const deliveryInputs = document.querySelectorAll('input[name="deliveryType"]');
    deliveryInputs.forEach(input => {
        input.addEventListener('change', () => {
            const addressField = document.getElementById('addressField');
            if (input.value === 'envío') {
                if (addressField) addressField.style.display = 'block';
            } else {
                if (addressField) addressField.style.display = 'none';
            }
        });
    });
    
    // Navegación checkout
    const nextToConfirm = document.getElementById('nextToConfirm');
    const backToCustomer = document.getElementById('backToCustomer');
    const confirmOrder = document.getElementById('confirmOrder');
    const whatsappButton = document.getElementById('whatsappButton');
    const newOrderBtn = document.getElementById('newOrderBtn');
    
    if (nextToConfirm) nextToConfirm.addEventListener('click', goToConfirm);
    if (backToCustomer) backToCustomer.addEventListener('click', goToCustomer);
    if (confirmOrder) confirmOrder.addEventListener('click', confirmOrderHandler);
    if (whatsappButton) whatsappButton.addEventListener('click', openWhatsApp);
    if (newOrderBtn) newOrderBtn.addEventListener('click', startNewOrder);
    
    // Configurar ayuda
    const helpButton = document.getElementById('helpButton');
    const closeHelp = document.getElementById('closeHelp');
    const helpModal = document.getElementById('helpModal');
    
    if (helpButton) {
        helpButton.addEventListener('click', () => {
            helpModal.style.display = 'flex';
        });
    }
    
    if (closeHelp) {
        closeHelp.addEventListener('click', () => {
            helpModal.style.display = 'none';
        });
    }
    
    if (helpModal) {
        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) {
                helpModal.style.display = 'none';
            }
        });
    }
}

function openCheckout() {
    const modal = document.getElementById('checkoutModal');
    if (!modal) return;
    
    // Resetear formulario
    const customerName = document.getElementById('customerName');
    const customerPhone = document.getElementById('customerPhone');
    const customerAddress = document.getElementById('customerAddress');
    const orderComments = document.getElementById('orderComments');
    const deliveryPickup = document.getElementById('deliveryPickup');
    const addressField = document.getElementById('addressField');
    
    if (customerName) customerName.value = '';
    if (customerPhone) customerPhone.value = '';
    if (customerAddress) customerAddress.value = '';
    if (orderComments) orderComments.value = '';
    if (deliveryPickup) deliveryPickup.checked = true;
    if (addressField) addressField.style.display = 'none';
    
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
            const sectionCustomer = document.getElementById('sectionCustomer');
            if (sectionCustomer) sectionCustomer.classList.add('active');
            break;
        case 2:
            const sectionConfirm = document.getElementById('sectionConfirm');
            if (sectionConfirm) sectionConfirm.classList.add('active');
            updateOrderSummary();
            break;
        case 3:
            const sectionComplete = document.getElementById('sectionComplete');
            if (sectionComplete) sectionComplete.classList.add('active');
            break;
    }
}

function goToConfirm() {
    // Validar datos básicos
    const customerName = document.getElementById('customerName');
    const customerPhone = document.getElementById('customerPhone');
    const customerAddress = document.getElementById('customerAddress');
    
    if (!customerName || !customerPhone) return;
    
    const name = customerName.value.trim();
    const phone = customerPhone.value.trim();
    const deliveryType = document.querySelector('input[name="deliveryType"]:checked');
    
    if (!deliveryType) return;
    
    const address = customerAddress ? customerAddress.value.trim() : '';
    
    if (!name) {
        alert('Por favor ingresa tu nombre');
        return;
    }
    
    if (!phone || phone.length < 8) {
        alert('Por favor ingresa un teléfono válido');
        return;
    }
    
    if (deliveryType.value === 'envío' && !address) {
        alert('Por favor ingresa tu dirección para el envío');
        return;
    }
    
    // Actualizar resumen
    const confirmCustomerName = document.getElementById('confirmCustomerName');
    const confirmCustomerPhone = document.getElementById('confirmCustomerPhone');
    const confirmDeliveryType = document.getElementById('confirmDeliveryType');
    const confirmAddressSection = document.getElementById('confirmAddressSection');
    const confirmCustomerAddress = document.getElementById('confirmCustomerAddress');
    const confirmCommentsSection = document.getElementById('confirmCommentsSection');
    const confirmOrderComments = document.getElementById('confirmOrderComments');
    const orderComments = document.getElementById('orderComments');
    
    if (confirmCustomerName) confirmCustomerName.textContent = name;
    if (confirmCustomerPhone) confirmCustomerPhone.textContent = phone;
    if (confirmDeliveryType) {
        confirmDeliveryType.textContent = 
            deliveryType.value === 'envío' ? 'Envío a domicilio' : 'Retiro en local';
    }
    
    if (deliveryType.value === 'envío') {
        if (confirmAddressSection) confirmAddressSection.style.display = 'block';
        if (confirmCustomerAddress) confirmCustomerAddress.textContent = address;
    } else {
        if (confirmAddressSection) confirmAddressSection.style.display = 'none';
    }
    
    if (orderComments) {
        const comments = orderComments.value.trim();
        if (comments) {
            if (confirmCommentsSection) confirmCommentsSection.style.display = 'block';
            if (confirmOrderComments) confirmOrderComments.textContent = comments;
        } else {
            if (confirmCommentsSection) confirmCommentsSection.style.display = 'none';
        }
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
    const deliveryType = document.querySelector('input[name="deliveryType"]:checked');
    let deliveryCost = 0;
    
    if (deliveryType && deliveryType.value === 'envío' && appState.settings) {
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

async function confirmOrderHandler() {
    try {
        // Validar que el local esté abierto
        if (!appState.settings?.abierto) {
            alert('El local está cerrado en este momento. No se pueden tomar pedidos.');
            return;
        }
        
        // Obtener datos del formulario
        const customerName = document.getElementById('customerName');
        const customerPhone = document.getElementById('customerPhone');
        const deliveryType = document.querySelector('input[name="deliveryType"]:checked');
        const customerAddress = document.getElementById('customerAddress');
        const orderComments = document.getElementById('orderComments');
        
        if (!customerName || !customerPhone || !deliveryType) {
            alert('Faltan datos del formulario');
            return;
        }
        
        const customerNameValue = customerName.value.trim();
        const customerPhoneValue = customerPhone.value.trim();
        const deliveryTypeValue = deliveryType.value;
        const customerAddressValue = customerAddress ? customerAddress.value.trim() : '';
        const orderCommentsValue = orderComments ? orderComments.value.trim() : '';
        
        // Calcular total
        let subtotal = getCartTotal();
        let deliveryCost = 0;
        
        if (deliveryTypeValue === 'envío') {
            deliveryCost = appState.settings?.precio_envio || 0;
        }
        
        const total = subtotal + deliveryCost;
        
        // Generar ID de pedido
        const orderId = await generateOrderId();
        
        // Crear pedido detallado
        const orderDetails = appState.cart.map(item => 
            `- ${item.name} x${item.quantity}: $${item.total}`
        ).join('\n');
        
        const fullOrderText = `Pedido:\n${orderDetails}\n\nSubtotal: $${subtotal}\n${deliveryTypeValue === 'envío' ? `Envío: $${deliveryCost}\n` : ''}Total: $${total}\n${orderCommentsValue ? `\nComentarios: ${orderCommentsValue}` : ''}`;
        
        // Datos del pedido para Firestore
        const orderData = {
            id_pedido: orderId,
            fecha: firebase.firestore.FieldValue.serverTimestamp(),
            nombre_cliente: customerNameValue,
            telefono: customerPhoneValue,
            tipo_pedido: deliveryTypeValue,
            direccion: deliveryTypeValue === 'envío' ? customerAddressValue : '',
            pedido_detallado: fullOrderText,
            items: appState.cart.map(item => ({
                id: item.id,
                nombre: item.name,
                precio: item.price,
                cantidad: item.quantity,
                total: item.total
            })),
            comentarios: orderCommentsValue || '',
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
        await sendAdminNotification(orderId, customerNameValue, total);
        
        // Mostrar confirmación
        const orderIdDisplay = document.getElementById('orderIdDisplay');
        const orderTimeDisplay = document.getElementById('orderTimeDisplay');
        const orderTotalDisplay = document.getElementById('orderTotalDisplay');
        
        if (orderIdDisplay) orderIdDisplay.textContent = orderId;
        if (orderTimeDisplay) {
            orderTimeDisplay.textContent = 
                `${appState.settings?.tiempo_base_estimado || 30} minutos`;
        }
        if (orderTotalDisplay) orderTotalDisplay.textContent = `$${total}`;
        
        // Guardar datos para WhatsApp
        window.lastOrderData = {
            id: orderId,
            phone: customerPhoneValue,
            name: customerNameValue,
            total: total,
            details: fullOrderText,
            deliveryType: deliveryTypeValue,
            address: customerAddressValue
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
    const whatsappNumber = appState.settings?.telefono_whatsapp || '5491122334455';
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
    
    // Limpiar carrito
    clearCart();
}

function startNewOrder() {
    const modal = document.getElementById('checkoutModal');
    if (modal) modal.style.display = 'none';
    
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
    console.log('🚀 Inicializando aplicación EL TACHI...');
    
    try {
        // Cargar configuración
        await loadSettings();
        
        // Cargar carrito
        loadCart();
        
        // Cargar categorías y productos
        await Promise.all([loadCategories(), loadProducts()]);
        
        // Configurar event listeners
        setupCheckout();
        
        console.log('✅ Aplicación lista para usar');
        
    } catch (error) {
        console.error('❌ Error inicializando app:', error);
        // Mostrar mensaje de error al usuario
        const productsGrid = document.getElementById('productsGrid');
        if (productsGrid) {
            productsGrid.innerHTML = `
                <div class="text-center" style="padding: 3rem;">
                    <h3>⚠️ Error de conexión</h3>
                    <p>No se pudieron cargar los productos. Por favor, recarga la página.</p>
                    <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--azul-primario); color: white; border: none; border-radius: 8px; cursor: pointer;">
                        Recargar página
                    </button>
                </div>
            `;
        }
    }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Exportar funciones para uso global
window.appState = appState;
window.clearCart = clearCart;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.getCartTotal = getCartTotal;
window.installPWA = window.installPWA; // Ya definido en HTML
