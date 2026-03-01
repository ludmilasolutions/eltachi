// app.js - Lógica de la aplicación de clientes con autenticación Google
console.log("🚀 Iniciando aplicación EL TACHI...");

// Configuración de Firebase (ya debe estar inicializada en el HTML)
// Asegurar que auth y db estén disponibles globalmente
const auth = firebase.auth();
const db = firebase.firestore();
const googleProvider = new firebase.auth.GoogleAuthProvider();

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

// ==================== FUNCIONES DE AUTENTICACIÓN ====================

async function loginWithGoogle() {
    try {
        console.log("🔐 Iniciando sesión con Google...");
        const result = await auth.signInWithPopup(googleProvider);
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
        } else if (error.code === 'auth/cancelled-popup-request') {
            errorMessage = "Solicitud cancelada";
        }
        showToast(errorMessage, 'error');
        return null;
    }
}

async function logout() {
    try {
        await auth.signOut();
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
            userPhoto.onerror = () => { userPhoto.src = 'https://via.placeholder.com/32'; };
        }
        if (userEmail) {
            userEmail.textContent = appState.currentUser.email || appState.currentUser.displayName || 'Usuario';
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

    // Cerrar modales
    const closeUserOrders = document.getElementById('closeUserOrders');
    const closeUserOrderDetails = document.getElementById('closeUserOrderDetails');
    const closeUserOrderDetailsBtn = document.getElementById('closeUserOrderDetailsBtn');

    if (closeUserOrders) {
        closeUserOrders.addEventListener('click', () => {
            document.getElementById('userOrdersModal').style.display = 'none';
        });
    }

    if (closeUserOrderDetails) {
        closeUserOrderDetails.addEventListener('click', () => {
            document.getElementById('userOrderDetailsModal').style.display = 'none';
        });
    }

    if (closeUserOrderDetailsBtn) {
        closeUserOrderDetailsBtn.addEventListener('click', () => {
            document.getElementById('userOrderDetailsModal').style.display = 'none';
        });
    }

    // Cerrar modales al hacer clic fuera
    const userOrdersModal = document.getElementById('userOrdersModal');
    if (userOrdersModal) {
        userOrdersModal.addEventListener('click', (e) => {
            if (e.target === userOrdersModal) {
                userOrdersModal.style.display = 'none';
            }
        });
    }

    const userOrderDetailsModal = document.getElementById('userOrderDetailsModal');
    if (userOrderDetailsModal) {
        userOrderDetailsModal.addEventListener('click', (e) => {
            if (e.target === userOrderDetailsModal) {
                userOrderDetailsModal.style.display = 'none';
            }
        });
    }
}

// ==================== FUNCIONES DE MIS PEDIDOS ====================

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
            <div class="user-order-card" onclick="window.showUserOrderDetails('${order.id}')" style="cursor: pointer; border: 1px solid #e5e7eb; border-radius: 12px; padding: 15px; margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-weight: 600; color: #1e40af;">${order.id_pedido || order.id}</span>
                    <span class="status-badge ${statusClass}">${order.estado || 'Recibido'}</span>
                </div>
                <div style="font-size: 0.85rem; color: #6b7280;">${fechaStr}</div>
                <div style="margin-top: 8px; font-size: 0.9rem;">${itemsCount} item${itemsCount !== 1 ? 's' : ''}</div>
                <div style="margin-top: 8px; font-weight: 700; color: #1e40af;">Total: $${order.total || 0}</div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Hacer disponible globalmente para el onclick
window.showUserOrderDetails = function(orderId) {
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
            const nombre = item.nombre || item.name;
            const cantidad = item.cantidad || item.quantity;
            const totalItem = item.total || (item.price * cantidad);
            itemsHtml += `
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span>${nombre} x${cantidad}</span>
                    <span>$${totalItem}</span>
                </div>
            `;
        });
    }

    bodyEl.innerHTML = `
        <div style="margin-bottom: 15px;">
            <div style="font-weight: 600; color: #4b5563; margin-bottom: 4px;">Estado</div>
            <span class="status-badge ${statusClass}">${order.estado || 'Recibido'}</span>
        </div>
        <div style="margin-bottom: 15px;">
            <div style="font-weight: 600; color: #4b5563;">Fecha</div>
            <div>${fechaStr}</div>
        </div>
        <div style="margin-bottom: 15px;">
            <div style="font-weight: 600; color: #4b5563;">Tipo de pedido</div>
            <div>${order.tipo_pedido === 'envío' ? 'Envío a domicilio' : 'Retiro en local'}</div>
        </div>
        ${order.direccion ? `
        <div style="margin-bottom: 15px;">
            <div style="font-weight: 600; color: #4b5563;">Dirección</div>
            <div>${order.direccion}</div>
        </div>
        ` : ''}
        <div style="margin-bottom: 15px;">
            <div style="font-weight: 600; color: #4b5563;">Productos</div>
            <div style="margin-top: 5px;">${itemsHtml || '<p>Sin productos</p>'}</div>
        </div>
        <div style="margin-bottom: 15px;">
            <div style="font-weight: 600; color: #4b5563;">Total</div>
            <div style="font-size: 1.5rem; font-weight: 700; color: #f59e0b;">$${order.total || 0}</div>
        </div>
        ${order.comentarios ? `
        <div>
            <div style="font-weight: 600; color: #4b5563;">Comentarios</div>
            <div>${order.comentarios}</div>
        </div>
        ` : ''}
    `;

    titleEl.textContent = order.id_pedido || order.id;
    modal.style.display = 'flex';
};

// ==================== CARGA DE DATOS ====================

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
            // Configuración por defecto
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

async function loadProducts() {
    try {
        console.log("🍔 Cargando productos...");
        const snapshot = await db.collection('products').get();

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

// ==================== RENDERIZADO ====================

function renderCategories() {
    const container = document.getElementById('categoryTabs');
    if (!container) return;

    container.innerHTML = '';

    if (appState.categories.length === 0) {
        container.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
        return;
    }

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

function selectCategory(categoryId) {
    appState.currentCategory = categoryId;
    renderCategories();
    renderProducts(categoryId);
}

function renderProducts(categoryId) {
    const container = document.getElementById('productsGrid');
    if (!container) return;

    const filteredProducts = appState.products.filter(
        product => product.categoria === categoryId
    );

    if (filteredProducts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-utensils"></i>
                <h3>No hay productos disponibles</h3>
                <p>Prueba seleccionando otra categoría</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';

    filteredProducts.forEach(product => {
        const cartItem = appState.cart.find(item => item.id === product.id);
        const quantity = cartItem ? cartItem.quantity : 0;

        // Badges opcionales
        let badges = '';
        if (product.nuevo) badges += '<span class="badge nuevo">NUEVO</span>';
        if (product.popular) badges += '<span class="badge popular">POPULAR</span>';
        if (product.oferta) badges += '<span class="badge oferta">OFERTA</span>';

        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            ${product.destacado ? '<span class="product-badge">🔥 Destacado</span>' : ''}
            
            <div class="product-header">
                <div>
                    <h3 class="product-title">${product.nombre}</h3>
                    ${badges}
                </div>
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
                
                <button class="add-to-cart-btn ${quantity > 0 ? 'added' : ''}" 
                        data-product-id="${product.id}">
                    ${quantity > 0 ? 'Agregado' : 'Agregar al pedido'}
                </button>
            </div>
        `;

        container.appendChild(card);
    });

    // Agregar event listeners a los botones
    container.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = e.target.dataset.productId;
            const product = appState.products.find(p => p.id === productId);
            if (product) {
                addToCart(product);
                showToast(`${product.nombre} agregado al carrito`);
            }
        });
    });

    container.querySelectorAll('.quantity-btn.increase').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = e.target.dataset.productId;
            const product = appState.products.find(p => p.id === productId);
            if (product) {
                addToCart(product);
                showToast(`${product.nombre} agregado al carrito`);
            }
        });
    });

    container.querySelectorAll('.quantity-btn.decrease').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = e.target.dataset.productId;
            removeFromCart(productId);
        });
    });
}

// ==================== CARRITO ====================

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
    const cartCountFloating = document.getElementById('cartCountFloating');
    const cartTotal = document.getElementById('cartTotal');

    const totalItems = appState.cart.reduce((sum, item) => sum + item.quantity, 0);

    if (cartCount) {
        cartCount.textContent = totalItems;
        cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
    }
    if (cartCountFloating) {
        cartCountFloating.textContent = totalItems;
        cartCountFloating.style.display = totalItems > 0 ? 'flex' : 'none';
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
            <div class="empty-state">
                <i class="fas fa-shopping-basket"></i>
                <h3>Carrito vacío</h3>
                <p>Agrega productos para continuar</p>
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
                    <div class="text-muted" style="font-size: 0.85rem;">
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
    container.querySelectorAll('.cart-quantity-btn.increase').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = e.target.closest('button').dataset.productId;
            const product = appState.products.find(p => p.id === productId);
            if (product) {
                addToCart(product);
            }
        });
    });

    container.querySelectorAll('.cart-quantity-btn.decrease').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = e.target.closest('button').dataset.productId;
            removeFromCart(productId);
        });
    });

    container.querySelectorAll('.remove-item').forEach(btn => {
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
}

// ==================== CHECKOUT ====================

function setupCheckout() {
    const cartButton = document.getElementById('cartButton');
    const cartButtonFloating = document.getElementById('cartButtonFloating');
    const closeCart = document.getElementById('closeCart');
    const cartOverlay = document.getElementById('cartOverlay');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const cancelCheckout = document.getElementById('cancelCheckout');
    const checkoutModal = document.getElementById('checkoutModal');
    const nextToConfirm = document.getElementById('nextToConfirm');
    const backToCustomer = document.getElementById('backToCustomer');
    const confirmOrderBtn = document.getElementById('confirmOrder');
    const whatsappButton = document.getElementById('whatsappButton');
    const newOrderBtn = document.getElementById('newOrderBtn');

    if (cartButton) {
        cartButton.addEventListener('click', () => {
            cartOverlay.style.display = 'flex';
        });
    }
    if (cartButtonFloating) {
        cartButtonFloating.addEventListener('click', () => {
            cartOverlay.style.display = 'flex';
        });
    }

    if (closeCart) {
        closeCart.addEventListener('click', () => {
            cartOverlay.style.display = 'none';
        });
    }

    cartOverlay.addEventListener('click', (e) => {
        if (e.target === cartOverlay) {
            cartOverlay.style.display = 'none';
        }
    });

    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            if (appState.cart.length === 0) {
                showToast('Agrega productos al carrito primero', 'error');
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

    checkoutModal.addEventListener('click', (e) => {
        if (e.target === checkoutModal) {
            checkoutModal.style.display = 'none';
        }
    });

    // Tipo de pedido
    document.querySelectorAll('input[name="deliveryType"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const addressField = document.getElementById('addressField');
            if (this.value === 'envío') {
                addressField.style.display = 'block';
            } else {
                addressField.style.display = 'none';
            }
        });
    });

    if (nextToConfirm) nextToConfirm.addEventListener('click', goToConfirm);
    if (backToCustomer) backToCustomer.addEventListener('click', goToCustomer);
    if (confirmOrderBtn) confirmOrderBtn.addEventListener('click', confirmOrderHandler);
    if (whatsappButton) whatsappButton.addEventListener('click', openWhatsApp);
    if (newOrderBtn) newOrderBtn.addEventListener('click', startNewOrder);
}

function openCheckout() {
    const modal = document.getElementById('checkoutModal');
    if (!modal) return;

    // Resetear formulario
    document.getElementById('customerName').value = '';
    document.getElementById('customerPhone').value = '';
    document.getElementById('customerAddress').value = '';
    document.getElementById('orderComments').value = '';
    document.getElementById('deliveryPickup').checked = true;
    document.getElementById('addressField').style.display = 'none';

    setCheckoutStep(1);

    // Forzar redibujado
    setTimeout(() => {
        const checkoutBody = document.querySelector('.checkout-body');
        if (checkoutBody) checkoutBody.style.overflowY = 'auto';
    }, 100);

    modal.style.display = 'flex';
}

function setCheckoutStep(step) {
    document.querySelectorAll('.step').forEach(stepEl => {
        stepEl.classList.remove('active');
        if (parseInt(stepEl.dataset.step) === step) {
            stepEl.classList.add('active');
        }
    });

    document.querySelectorAll('.checkout-section').forEach(section => {
        section.classList.remove('active');
    });

    const sections = ['sectionCustomer', 'sectionConfirm', 'sectionComplete'];
    const activeSection = document.getElementById(sections[step - 1]);
    if (activeSection) activeSection.classList.add('active');

    const checkoutBody = document.querySelector('.checkout-body');
    if (checkoutBody) checkoutBody.scrollTop = 0;
}

function goToConfirm() {
    const customerName = document.getElementById('customerName').value.trim();
    const customerPhone = document.getElementById('customerPhone').value.trim();
    const deliveryType = document.querySelector('input[name="deliveryType"]:checked');

    if (!customerName) {
        showToast('Por favor ingresa tu nombre', 'error');
        return;
    }

    if (!customerPhone || customerPhone.length < 8) {
        showToast('Por favor ingresa un teléfono válido', 'error');
        return;
    }

    if (deliveryType.value === 'envío') {
        const address = document.getElementById('customerAddress').value.trim();
        if (!address) {
            showToast('Por favor ingresa tu dirección', 'error');
            return;
        }
    }

    // Actualizar resumen
    document.getElementById('confirmCustomerName').textContent = customerName;
    document.getElementById('confirmCustomerPhone').textContent = customerPhone;
    document.getElementById('confirmDeliveryType').textContent =
        deliveryType.value === 'envío' ? 'Envío a domicilio' : 'Retiro en local';

    if (deliveryType.value === 'envío') {
        const address = document.getElementById('customerAddress').value.trim();
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

    updateOrderSummary();
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
    if (totalElement) totalElement.textContent = `$${total}`;
    document.getElementById('orderTotalDisplay').textContent = `$${total}`;
}

async function confirmOrderHandler() {
    try {
        if (!appState.settings?.abierto) {
            showToast('El local está cerrado en este momento', 'error');
            return;
        }

        const customerName = document.getElementById('customerName').value.trim();
        const customerPhone = document.getElementById('customerPhone').value.trim();
        const deliveryType = document.querySelector('input[name="deliveryType"]:checked').value;
        const customerAddress = document.getElementById('customerAddress').value.trim();
        const orderComments = document.getElementById('orderComments').value.trim();

        let subtotal = getCartTotal();
        let deliveryCost = 0;
        if (deliveryType === 'envío') {
            deliveryCost = appState.settings?.precio_envio || 0;
        }
        const total = subtotal + deliveryCost;

        const orderId = await generateOrderId();

        const orderData = {
            id_pedido: orderId,
            fecha: firebase.firestore.FieldValue.serverTimestamp(),
            nombre_cliente: customerName,
            telefono: customerPhone,
            tipo_pedido: deliveryType,
            direccion: deliveryType === 'envío' ? customerAddress : '',
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

        // Asociar usuario si está logueado
        if (appState.currentUser) {
            orderData.userId = appState.currentUser.uid;
            orderData.userEmail = appState.currentUser.email;
            orderData.userName = appState.currentUser.displayName || customerName;
            orderData.userPhotoURL = appState.currentUser.photoURL || null;
            orderData.isRegisteredUser = true;
        }

        await db.collection('orders').doc(orderId).set(orderData);

        // Actualizar pantalla final
        document.getElementById('orderIdDisplay').textContent = orderId;
        document.getElementById('orderTimeDisplay').textContent =
            `${appState.settings?.tiempo_base_estimado || 30} minutos`;

        window.lastOrderData = {
            id: orderId,
            phone: customerPhone,
            name: customerName,
            total: total,
            deliveryType: deliveryType,
            address: customerAddress,
            comments: orderComments,
            items: appState.cart
        };

        setCheckoutStep(3);
    } catch (error) {
        console.error('Error confirmando pedido:', error);
        showToast('Error al procesar el pedido', 'error');
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

function openWhatsApp() {
    if (!window.lastOrderData) return;

    const { id, phone, name, total, deliveryType, address, comments, items } = window.lastOrderData;

    let message = `*NUEVO PEDIDO - EL TACHI*\n\n`;
    message += `*Pedido:* ${id}\n`;
    message += `*Cliente:* ${name}\n`;
    message += `*Teléfono:* ${phone}\n`;
    message += `*Tipo:* ${deliveryType === 'envío' ? 'Envío a domicilio' : 'Retiro en local'}\n`;

    if (deliveryType === 'envío') {
        message += `*Dirección:* ${address}\n`;
    }

    message += `\n*DETALLE DEL PEDIDO:*\n`;
    items.forEach(item => {
        message += `- ${item.name} x${item.quantity}: $${item.total}\n`;
    });

    message += `\n*Subtotal:* $${total - (appState.settings?.precio_envio || 0)}\n`;
    if (deliveryType === 'envío') {
        message += `*Envío:* $${appState.settings?.precio_envio || 0}\n`;
    }
    message += `*TOTAL:* $${total}\n`;

    if (comments) {
        message += `\n*Comentarios:* ${comments}\n`;
    }

    const encodedMessage = encodeURIComponent(message);
    const whatsappNumber = appState.settings?.telefono_whatsapp || '5491122334455';
    window.open(`https://wa.me/${whatsappNumber}?text=${encodedMessage}`, '_blank');

    // Limpiar carrito después de enviar WhatsApp
    clearCart();
}

function startNewOrder() {
    document.getElementById('checkoutModal').style.display = 'none';
    clearCart();
    if (appState.categories.length > 0) {
        selectCategory(appState.categories[0].id);
    }
}

// ==================== UI HELPER ====================

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const icon = toast.querySelector('i');
    const messageSpan = document.getElementById('toastMessage');

    toast.classList.remove('success', 'error');
    toast.classList.add(type);
    icon.className = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';
    messageSpan.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function updateStoreStatus() {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');

    if (!appState.settings) return;

    if (appState.settings.abierto) {
        if (statusDot) statusDot.style.background = '#10b981';
        if (statusText) statusText.textContent = 'Abierto ahora';
    } else {
        if (statusDot) statusDot.style.background = '#ef4444';
        if (statusText) statusText.textContent = 'Cerrado';
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

// ==================== INICIALIZACIÓN ====================

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
        setupAuthListeners();

        console.log('✅ Aplicación lista para usar');
    } catch (error) {
        console.error('❌ Error inicializando app:', error);
        const productsGrid = document.getElementById('productsGrid');
        if (productsGrid) {
            productsGrid.innerHTML = `
                <div class="empty-state">
                    <h3>⚠️ Error de conexión</h3>
                    <p>No se pudieron cargar los productos. Por favor, recarga la página.</p>
                    <button onclick="location.reload()" class="btn-primary" style="margin-top: 1rem;">Recargar</button>
                </div>
            `;
        }
    }
}

// Iniciar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Funciones globales para botones onclick
window.clearCart = clearCart;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.getCartTotal = getCartTotal;
