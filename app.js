// app.js - Lógica de la aplicación de clientes
console.log("🚀 Iniciando aplicación EL TACHI...");

// Estado global de la aplicación
let appState = {
    settings: null,
    categories: [],
    products: [],
    cart: [],
    currentCategory: null,
    geminiEngine: null,
    currentUser: null,
    userOrders: []
};

// Proveedor de Google
const googleProvider = new firebase.auth.GoogleAuthProvider();

// Funciones de autenticación
async function loginWithGoogle() {
    try {
        console.log("🔐 Iniciando sesión con Google...");
        const result = await firebase.auth().signInWithPopup(googleProvider);
        const user = result.user;
        
        console.log("✅ Usuario autenticado:", user.email);
        showToast(`Bienvenido, ${user.displayName || user.email}`, 'success');
        
        return user;
    } catch (error) {
        console.error("❌ Error en login con Google:", error);
        
        let errorMessage = "Error al iniciar sesión";
        if (error.code === 'auth/popup-closed-by-user') {
            errorMessage = "Ventana cerrada antes de completar el inicio de sesión";
        } else if (error.code === 'auth/account-exists-with-different-credential') {
            errorMessage = "Ya existe una cuenta con el mismo correo electrónico";
        }
        
        showToast(errorMessage, 'error');
        return null;
    }
}

async function logout() {
    try {
        await firebase.auth().signOut();
        console.log("✅ Sesión cerrada");
        showToast("Sesión cerrada correctamente", 'success');
    } catch (error) {
        console.error("❌ Error al cerrar sesión:", error);
        showToast("Error al cerrar sesión", 'error');
    }
}

function updateUserUI() {
    const loginBtn = document.getElementById('loginBtn');
    const userInfo = document.getElementById('userInfo');
    const userPhoto = document.getElementById('userPhoto');
    const userEmail = document.getElementById('userEmail');
    const myOrdersBtn = document.getElementById('myOrdersBtn');
    
    if (!loginBtn || !userInfo) return;
    
    if (appState.currentUser) {
        // Usuario logueado
        loginBtn.style.display = 'none';
        userInfo.style.display = 'flex';
        
        if (userPhoto) {
            userPhoto.src = appState.currentUser.photoURL || 'https://via.placeholder.com/32';
        }
        if (userEmail) {
            userEmail.textContent = appState.currentUser.email || appState.currentUser.displayName;
        }
        if (myOrdersBtn) {
            myOrdersBtn.style.display = 'flex';
        }
        
        // Cargar pedidos del usuario
        loadUserOrders();
    } else {
        // Usuario no logueado
        loginBtn.style.display = 'flex';
        userInfo.style.display = 'none';
        if (myOrdersBtn) {
            myOrdersBtn.style.display = 'none';
        }
    }
}

function setupAuthListeners() {
    if (!auth) return;
    
    auth.onAuthStateChanged((user) => {
        appState.currentUser = user;
        console.log("📱 Estado de auth cambiado:", user ? user.email : "No autenticado");
        updateUserUI();
    });
    
    // Event listeners para botones de auth
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const myOrdersBtn = document.getElementById('myOrdersBtn');
    
    if (loginBtn) {
        loginBtn.addEventListener('click', loginWithGoogle);
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    if (myOrdersBtn) {
        myOrdersBtn.addEventListener('click', openUserOrdersModal);
    }
    
    // Configurar modales de pedidos
    const closeUserOrders = document.getElementById('closeUserOrders');
    const closeUserOrderDetails = document.getElementById('closeUserOrderDetails');
    const closeUserOrderDetailsBtn = document.getElementById('closeUserOrderDetailsBtn');
    
    if (closeUserOrders) {
        closeUserOrders.addEventListener('click', closeUserOrdersModal);
    }
    
    if (closeUserOrderDetails) {
        closeUserOrderDetails.addEventListener('click', closeUserOrderDetailsModal);
    }
    
    if (closeUserOrderDetailsBtn) {
        closeUserOrderDetailsBtn.addEventListener('click', closeUserOrderDetailsModal);
    }
}

// Funciones de Mis Pedidos
async function loadUserOrders() {
    if (!appState.currentUser) {
        appState.userOrders = [];
        return;
    }
    
    try {
        const snapshot = await db.collection('orders')
            .where('userId', '==', appState.currentUser.uid)
            .orderBy('fecha', 'desc')
            .get();
        
        appState.userOrders = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        console.log(`📋 ${appState.userOrders.length} pedidos cargados para usuario`);
    } catch (error) {
        console.error("❌ Error cargando pedidos del usuario:", error);
        appState.userOrders = [];
    }
}

function openUserOrdersModal() {
    const modal = document.getElementById('userOrdersModal');
    if (!modal) return;
    
    if (!appState.currentUser) {
        showToast("Debes iniciar sesión para ver tus pedidos", 'error');
        return;
    }
    
    renderUserOrders();
    modal.style.display = 'flex';
}

function closeUserOrdersModal() {
    const modal = document.getElementById('userOrdersModal');
    if (modal) modal.style.display = 'none';
}

function renderUserOrders() {
    const container = document.getElementById('userOrdersBody');
    if (!container) return;
    
    if (appState.userOrders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-list"></i>
                <h3>No tienes pedidos</h3>
                <p>Cuando realices un pedido, podrás verlo aquí</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    appState.userOrders.forEach(order => {
        const fecha = order.fecha?.toDate ? order.fecha.toDate() : new Date(order.fecha);
        const fechaStr = fecha ? fecha.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }) : '--';
        
        const statusClass = order.estado === 'Recibido' ? 'recibido' :
                          order.estado === 'En preparación' ? 'preparacion' :
                          order.estado === 'Listo' ? 'listo' : 'entregado';
        
        const itemsCount = order.items?.length || 0;
        
        html += `
            <div class="user-order-card" onclick="showUserOrderDetails('${order.id}')">
                <div class="user-order-header">
                    <span class="user-order-id">${order.id_pedido || order.id}</span>
                    <span class="user-order-status ${statusClass}">${order.estado || 'Recibido'}</span>
                </div>
                <div class="user-order-date">${fechaStr}</div>
                <div class="user-order-items">${itemsCount} item${itemsCount !== 1 ? 's' : ''}</div>
                <div class="user-order-total">$${order.total || 0}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function showUserOrderDetails(orderId) {
    const order = appState.userOrders.find(o => o.id === orderId);
    if (!order) {
        showToast("Pedido no encontrado", 'error');
        return;
    }
    
    const modal = document.getElementById('userOrderDetailsModal');
    const titleEl = document.getElementById('userOrderDetailId');
    const bodyEl = document.getElementById('userOrderDetailsBody');
    
    if (!modal || !titleEl || !bodyEl) return;
    
    const fecha = order.fecha?.toDate ? order.fecha.toDate() : new Date(order.fecha);
    const fechaStr = fecha ? fecha.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }) : '--';
    
    const statusClass = order.estado === 'Recibido' ? 'recibido' :
                      order.estado === 'En preparación' ? 'preparacion' :
                      order.estado === 'Listo' ? 'listo' : 'entregado';
    
    let itemsHtml = '';
    if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
            itemsHtml += `
                <div class="user-order-item">
                    <span>${item.nombre || item.name} x${item.cantidad || item.quantity}</span>
                    <span>$${item.total || (item.price * item.quantity)}</span>
                </div>
            `;
        });
    }
    
    bodyEl.innerHTML = `
        <div class="user-order-detail-section">
            <div class="user-order-detail-label">Estado</div>
            <span class="user-order-status ${statusClass}">${order.estado || 'Recibido'}</span>
        </div>
        <div class="user-order-detail-section">
            <div class="user-order-detail-label">Fecha</div>
            <div class="user-order-detail-value">${fechaStr}</div>
        </div>
        <div class="user-order-detail-section">
            <div class="user-order-detail-label">Tipo de pedido</div>
            <div class="user-order-detail-value">${order.tipo_pedido === 'envío' ? 'Envío a domicilio' : 'Retiro en local'}</div>
        </div>
        ${order.direccion ? `
        <div class="user-order-detail-section">
            <div class="user-order-detail-label">Dirección</div>
            <div class="user-order-detail-value">${order.direccion}</div>
        </div>
        ` : ''}
        <div class="user-order-detail-section">
            <div class="user-order-detail-label">Productos</div>
            <div class="user-order-items-list">
                ${itemsHtml || '<p>Sin productos</p>'}
            </div>
        </div>
        <div class="user-order-detail-section">
            <div class="user-order-detail-label">Total</div>
            <div class="user-order-detail-value" style="font-size: 1.5rem; color: var(--amarillo);">$${order.total || 0}</div>
        </div>
        ${order.comentarios ? `
        <div class="user-order-detail-section">
            <div class="user-order-detail-label">Comentarios</div>
            <div class="user-order-detail-value">${order.comentarios}</div>
        </div>
        ` : ''}
    `;
    
    titleEl.textContent = order.id_pedido || order.id;
    modal.style.display = 'flex';
}

function closeUserOrderDetailsModal() {
    const modal = document.getElementById('userOrderDetailsModal');
    if (modal) modal.style.display = 'none';
}

// Hacer funciones disponibles globalmente
window.showUserOrderDetails = showUserOrderDetails;
window.openUserOrdersModal = openUserOrdersModal;
window.loginWithGoogle = loginWithGoogle;
window.logout = logout;

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
                telefono_whatsapp: "54934122334455",
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
        // Validar que el local esté abierto según horarios
        if (!checkStoreIsOpen()) {
            const mensaje = appState.settings?.mensaje_cerrado || 'El local está cerrado en este momento. No se pueden tomar pedidos.';
            alert(mensaje);
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
        
        // Agregar datos del usuario si está logueado
        if (appState.currentUser) {
            orderData.userId = appState.currentUser.uid;
            orderData.userEmail = appState.currentUser.email;
            orderData.userName = appState.currentUser.displayName || customerNameValue;
            orderData.userPhotoURL = appState.currentUser.photoURL || null;
            orderData.isRegisteredUser = true;
        }
        
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
    
    const isOpen = checkStoreIsOpen();
    
    if (isOpen) {
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

function checkStoreIsOpen() {
    const settings = appState.settings;
    if (!settings || !settings.horarios_por_dia) return false;
    
    const now = new Date();
    const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const currentDay = dayNames[now.getDay()];
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    
    const schedule = settings.horarios_por_dia[currentDay];
    if (!schedule || schedule.toLowerCase() === 'cerrado') return false;
    
    const match = schedule.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
    if (!match) return false;
    
    const startHour = parseInt(match[1]);
    const startMinute = parseInt(match[2]);
    const endHour = parseInt(match[3]);
    const endMinute = parseInt(match[4]);
    
    const startTime = startHour * 60 + startMinute;
    let endTime = endHour * 60 + endMinute;
    
    if (endTime === 0) endTime = 24 * 60;
    
    return currentTime >= startTime && currentTime < endTime;
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
        
        // Configurar autenticación
        setupAuthListeners();
        
        // Verificar estado del local cada minuto
        setInterval(() => {
            updateStoreStatus();
        }, 60000);
        
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
