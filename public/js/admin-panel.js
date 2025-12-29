// ============================================
// admin-panel.js - PANEL DE ADMINISTRACIÓN EL TACHI
// ============================================

const adminPanel = {
    currentUser: null,
    currentSection: 'dashboard',
    
    // Inicialización
    init: function(user) {
        this.currentUser = user;
        this.showSection('dashboard');
        this.loadDashboard();
        this.setupEventListeners();
        console.log('✅ Panel admin inicializado');
    },
    
    // Cambiar sección
    showSection: function(sectionId) {
        // Ocultar todas las secciones
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Remover clase active de todos los botones
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Mostrar sección seleccionada
        const section = document.getElementById(sectionId);
        if (section) {
            section.classList.add('active');
        }
        
        // Activar botón correspondiente
        const activeBtn = document.querySelector(`[data-section="${sectionId}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        this.currentSection = sectionId;
        
        // Cargar datos según la sección
        switch(sectionId) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'orders':
                this.loadOrders();
                break;
            case 'products':
                this.loadProducts();
                break;
            case 'categories':
                this.loadCategories();
                break;
            case 'settings':
                this.loadSettings();
                break;
            case 'reports':
                this.loadReports();
                break;
        }
    },
    
    // Configurar event listeners
    setupEventListeners: function() {
        // Los listeners de navegación ya están configurados en el HTML principal
        console.log('📝 Listeners configurados');
    },
    
    // ============================================
    // DASHBOARD
    // ============================================
    loadDashboard: async function() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Obtener pedidos de hoy
            const ordersSnapshot = await firebaseApp.db
                .collection('orders')
                .where('fecha', '>=', today)
                .get();
            
            const ordersToday = ordersSnapshot.size;
            document.getElementById('ordersToday').textContent = ordersToday;
            
            // Obtener estado del local
            const settingsDoc = await firebaseApp.db
                .collection('settings')
                .doc('store_config')
                .get();
            
            if (settingsDoc.exists) {
                const config = settingsDoc.data();
                const status = config.abierto ? '🟢 Abierto' : '🔴 Cerrado';
                document.getElementById('storeStatus').textContent = status;
            }
            
            // Calcular ventas totales
            let totalSales = 0;
            ordersSnapshot.forEach(doc => {
                const order = doc.data();
                totalSales += parseFloat(order.total) || 0;
            });
            document.getElementById('totalSales').textContent = `$${totalSales.toFixed(2)}`;
            
            // Obtener productos activos
            const productsSnapshot = await firebaseApp.db
                .collection('products')
                .where('disponible', '==', true)
                .get();
            
            document.getElementById('activeProducts').textContent = productsSnapshot.size;
            
            // Cargar pedidos recientes
            this.loadRecentOrders();
            
        } catch (error) {
            console.error('Error cargando dashboard:', error);
        }
    },
    
    refreshDashboard: function() {
        this.loadDashboard();
        this.showNotification('Dashboard actualizado');
    },
    
    loadRecentOrders: async function() {
        try {
            const ordersSnapshot = await firebaseApp.db
                .collection('orders')
                .orderBy('fecha', 'desc')
                .limit(5)
                .get();
            
            const ordersList = document.getElementById('recentOrdersList');
            ordersList.innerHTML = '';
            
            if (ordersSnapshot.empty) {
                ordersList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-shopping-bag"></i>
                        <p>No hay pedidos recientes</p>
                    </div>
                `;
                return;
            }
            
            ordersSnapshot.forEach(doc => {
                const order = doc.data();
                const orderId = doc.id;
                const fecha = order.fecha.toDate ? 
                    order.fecha.toDate().toLocaleString('es-AR') : 
                    new Date(order.fecha).toLocaleString('es-AR');
                
                const orderItem = document.createElement('div');
                orderItem.className = 'order-item';
                orderItem.innerHTML = `
                    <div class="order-header">
                        <strong>${orderId}</strong>
                        <span class="status-badge ${order.estado.toLowerCase()}">${order.estado}</span>
                    </div>
                    <div class="order-details">
                        <div>${order.nombre_cliente || 'Cliente'}</div>
                        <div>${fecha}</div>
                        <div><strong>$${order.total || '0'}</strong></div>
                    </div>
                `;
                
                orderItem.addEventListener('click', () => {
                    this.showOrderDetail(orderId, order);
                });
                
                ordersList.appendChild(orderItem);
            });
            
        } catch (error) {
            console.error('Error cargando pedidos recientes:', error);
        }
    },
    
    // ============================================
    // GESTIÓN DE PEDIDOS
    // ============================================
    loadOrders: async function(filter = 'all') {
        try {
            let query = firebaseApp.db.collection('orders').orderBy('fecha', 'desc');
            
            if (filter === 'today') {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                query = query.where('fecha', '>=', today);
            } else if (filter !== 'all') {
                query = query.where('estado', '==', this.getStatusText(filter));
            }
            
            const ordersSnapshot = await query.get();
            const ordersList = document.getElementById('ordersList');
            ordersList.innerHTML = '';
            
            if (ordersSnapshot.empty) {
                ordersList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-shopping-bag"></i>
                        <p>No hay pedidos</p>
                    </div>
                `;
                return;
            }
            
            ordersSnapshot.forEach(doc => {
                const order = doc.data();
                const orderId = doc.id;
                this.renderOrderItem(orderId, order, ordersList);
            });
            
        } catch (error) {
            console.error('Error cargando pedidos:', error);
            this.showError('Error al cargar pedidos');
        }
    },
    
    filterOrders: function() {
        const filter = document.getElementById('orderFilter').value;
        this.loadOrders(filter);
    },
    
    getStatusText: function(filterValue) {
        const statusMap = {
            'pending': 'Pendiente',
            'preparation': 'En preparación',
            'ready': 'Listo',
            'delivered': 'Entregado'
        };
        return statusMap[filterValue] || filterValue;
    },
    
    renderOrderItem: function(orderId, order, container) {
        const fecha = order.fecha.toDate ? 
            order.fecha.toDate().toLocaleString('es-AR') : 
            new Date(order.fecha).toLocaleString('es-AR');
        
        const orderItem = document.createElement('div');
        orderItem.className = 'order-item detailed';
        orderItem.innerHTML = `
            <div class="order-header">
                <div>
                    <strong>${orderId}</strong>
                    <div class="order-customer">${order.nombre_cliente || 'Cliente'}</div>
                </div>
                <span class="status-badge ${order.estado.toLowerCase()}">${order.estado}</span>
            </div>
            <div class="order-body">
                <div class="order-info">
                    <div><i class="fas fa-clock"></i> ${fecha}</div>
                    <div><i class="fas fa-phone"></i> ${order.telefono || 'Sin teléfono'}</div>
                    <div><i class="fas fa-truck"></i> ${order.tipo_pedido || 'Retiro'}</div>
                </div>
                <div class="order-total">
                    <strong>$${order.total || '0'}</strong>
                </div>
            </div>
            <div class="order-actions">
                <button class="btn-small" onclick="adminPanel.showOrderDetail('${orderId}')">
                    <i class="fas fa-eye"></i> Ver
                </button>
                <button class="btn-small" onclick="adminPanel.openWhatsApp('${order.telefono || ''}')">
                    <i class="fab fa-whatsapp"></i> WhatsApp
                </button>
                <select class="status-select" onchange="adminPanel.updateOrderStatus('${orderId}', this.value)">
                    <option value="Pendiente" ${order.estado === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
                    <option value="En preparación" ${order.estado === 'En preparación' ? 'selected' : ''}>En preparación</option>
                    <option value="Listo" ${order.estado === 'Listo' ? 'selected' : ''}>Listo</option>
                    <option value="Entregado" ${order.estado === 'Entregado' ? 'selected' : ''}>Entregado</option>
                </select>
            </div>
        `;
        
        container.appendChild(orderItem);
    },
    
    showOrderDetail: async function(orderId, orderData = null) {
        try {
            let order = orderData;
            
            if (!order) {
                const orderDoc = await firebaseApp.db
                    .collection('orders')
                    .doc(orderId)
                    .get();
                
                if (orderDoc.exists) {
                    order = orderDoc.data();
                } else {
                    this.showError('Pedido no encontrado');
                    return;
                }
            }
            
            const fecha = order.fecha.toDate ? 
                order.fecha.toDate().toLocaleString('es-AR') : 
                new Date(order.fecha).toLocaleString('es-AR');
            
            const modalContent = document.getElementById('modalOrderContent');
            modalContent.innerHTML = `
                <div class="order-detail">
                    <div class="detail-header">
                        <h3>${orderId}</h3>
                        <span class="status-badge large ${order.estado.toLowerCase()}">${order.estado}</span>
                    </div>
                    
                    <div class="detail-section">
                        <h4><i class="fas fa-user"></i> Datos del Cliente</h4>
                        <div class="detail-grid">
                            <div><strong>Nombre:</strong> ${order.nombre_cliente || 'No especificado'}</div>
                            <div><strong>Teléfono:</strong> ${order.telefono || 'No especificado'}</div>
                            <div><strong>Tipo:</strong> ${order.tipo_pedido || 'Retiro'}</div>
                            <div><strong>Fecha:</strong> ${fecha}</div>
                        </div>
                    </div>
                    
                    ${order.direccion ? `
                    <div class="detail-section">
                        <h4><i class="fas fa-map-marker-alt"></i> Dirección de Envío</h4>
                        <p>${order.direccion}</p>
                    </div>
                    ` : ''}
                    
                    <div class="detail-section">
                        <h4><i class="fas fa-receipt"></i> Detalles del Pedido</h4>
                        <div class="order-items">
                            <pre>${order.pedido_detallado || 'Sin detalles'}</pre>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h4><i class="fas fa-cog"></i> Configuración</h4>
                        <div class="detail-grid">
                            <div>
                                <label>Tiempo Estimado (minutos):</label>
                                <input type="number" id="estimatedTime" value="${order.tiempo_estimado_actual || 40}" min="1">
                            </div>
                            <div>
                                <label>Estado:</label>
                                <select id="orderStatus">
                                    <option value="Pendiente" ${order.estado === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
                                    <option value="En preparación" ${order.estado === 'En preparación' ? 'selected' : ''}>En preparación</option>
                                    <option value="Listo" ${order.estado === 'Listo' ? 'selected' : ''}>Listo</option>
                                    <option value="Entregado" ${order.estado === 'Entregado' ? 'selected' : ''}>Entregado</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div class="detail-total">
                        <h3>Total: $${order.total || '0'}</h3>
                    </div>
                    
                    <div class="detail-actions">
                        <button class="btn-primary" onclick="adminPanel.saveOrderChanges('${orderId}')">
                            <i class="fas fa-save"></i> Guardar Cambios
                        </button>
                        <button class="btn-secondary" onclick="adminPanel.openWhatsApp('${order.telefono || ''}', '${orderId}')">
                            <i class="fab fa-whatsapp"></i> Contactar por WhatsApp
                        </button>
                        <button class="btn-danger" onclick="adminPanel.closeModal('orderModal')">
                            <i class="fas fa-times"></i> Cerrar
                        </button>
                    </div>
                </div>
            `;
            
            this.openModal('orderModal');
            
        } catch (error) {
            console.error('Error mostrando detalle:', error);
            this.showError('Error al cargar detalles del pedido');
        }
    },
    
    saveOrderChanges: async function(orderId) {
        try {
            const estimatedTime = document.getElementById('estimatedTime').value;
            const status = document.getElementById('orderStatus').value;
            
            await firebaseApp.db
                .collection('orders')
                .doc(orderId)
                .update({
                    tiempo_estimado_actual: parseInt(estimatedTime),
                    estado: status,
                    actualizado: new Date()
                });
            
            this.showNotification('Pedido actualizado correctamente');
            this.closeModal('orderModal');
            this.loadOrders();
            this.loadRecentOrders();
            
        } catch (error) {
            console.error('Error guardando cambios:', error);
            this.showError('Error al guardar cambios');
        }
    },
    
    updateOrderStatus: async function(orderId, newStatus) {
        try {
            await firebaseApp.db
                .collection('orders')
                .doc(orderId)
                .update({
                    estado: newStatus,
                    actualizado: new Date()
                });
            
            this.showNotification(`Estado cambiado a: ${newStatus}`);
            
            // Si el estado es "En preparación", actualizar tiempo estimado
            if (newStatus === 'En preparación') {
                const time = prompt('Ingresá el tiempo estimado en minutos:', '40');
                if (time) {
                    await firebaseApp.db
                        .collection('orders')
                        .doc(orderId)
                        .update({
                            tiempo_estimado_actual: parseInt(time)
                        });
                    
                    this.showNotification(`Tiempo estimado: ${time} minutos`);
                }
            }
            
        } catch (error) {
            console.error('Error actualizando estado:', error);
            this.showError('Error al actualizar estado');
        }
    },
    
    // ============================================
    // GESTIÓN DE PRODUCTOS
    // ============================================
    loadProducts: async function() {
        try {
            const productsSnapshot = await firebaseApp.db
                .collection('products')
                .orderBy('nombre')
                .get();
            
            const productsList = document.getElementById('productsList');
            productsList.innerHTML = '';
            
            if (productsSnapshot.empty) {
                productsList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-hamburger"></i>
                        <p>No hay productos</p>
                        <button class="btn-small" onclick="adminPanel.showProductModal()">
                            <i class="fas fa-plus"></i> Agregar primer producto
                        </button>
                    </div>
                `;
                return;
            }
            
            productsSnapshot.forEach(doc => {
                const product = doc.data();
                const productId = doc.id;
                this.renderProductItem(productId, product, productsList);
            });
            
        } catch (error) {
            console.error('Error cargando productos:', error);
            this.showError('Error al cargar productos');
        }
    },
    
    renderProductItem: function(productId, product, container) {
        const productItem = document.createElement('div');
        productItem.className = 'product-card';
        productItem.innerHTML = `
            <div class="product-image">
                <i class="fas fa-${product.categoria === 'hamburguesas' ? 'hamburger' : 'pizza' || 'box'}"></i>
            </div>
            <div class="product-info">
                <h3>${product.nombre}</h3>
                <p class="product-description">${product.descripcion || 'Sin descripción'}</p>
                <div class="product-meta">
                    <span class="product-price">$${product.precio || '0'}</span>
                    <span class="product-category">${product.categoria || 'Sin categoría'}</span>
                    <span class="product-status ${product.disponible ? 'available' : 'unavailable'}">
                        ${product.disponible ? 'Disponible' : 'No disponible'}
                    </span>
                </div>
            </div>
            <div class="product-actions">
                <button class="btn-icon" onclick="adminPanel.editProduct('${productId}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon" onclick="adminPanel.toggleProductAvailability('${productId}', ${product.disponible})">
                    <i class="fas fa-${product.disponible ? 'eye-slash' : 'eye'}"></i>
                </button>
                <button class="btn-icon delete" onclick="adminPanel.deleteProduct('${productId}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        container.appendChild(productItem);
    },
    
    showProductModal: function(productId = null) {
        const modal = document.getElementById('productModal');
        const isEdit = productId !== null;
        
        let productData = {
            nombre: '',
            descripcion: '',
            precio: '',
            categoria: '',
            disponible: true,
            aderezos_disponibles: [],
            precios_extra_aderezos: {}
        };
        
        if (isEdit) {
            // Cargar datos del producto si es edición
            // Esto se implementaría cuando se cargue el producto
        }
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${isEdit ? 'Editar Producto' : 'Nuevo Producto'}</h2>
                    <button class="modal-close" onclick="adminPanel.closeModal('productModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="productForm" onsubmit="event.preventDefault(); adminPanel.saveProduct('${productId}')">
                        <div class="form-group">
                            <label for="productName">Nombre del Producto</label>
                            <input type="text" id="productName" value="${productData.nombre}" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="productDescription">Descripción</label>
                            <textarea id="productDescription" rows="3">${productData.descripcion}</textarea>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="productPrice">Precio ($)</label>
                                <input type="number" id="productPrice" step="0.01" min="0" value="${productData.precio}" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="productCategory">Categoría</label>
                                <select id="productCategory">
                                    <option value="">Seleccionar categoría</option>
                                    <option value="hamburguesas">Hamburguesas</option>
                                    <option value="pizzas">Pizzas</option>
                                    <option value="sandwiches">Sandwiches</option>
                                    <option value="bebidas">Bebidas</option>
                                    <option value="postres">Postres</option>
                                    <option value="otros">Otros</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label class="switch-container">
                                <input type="checkbox" id="productAvailable" ${productData.disponible ? 'checked' : ''}>
                                <span class="slider"></span>
                                <span>Disponible para la venta</span>
                            </label>
                        </div>
                        
                        <div class="form-actions">
                            <button type="submit" class="btn-primary">
                                <i class="fas fa-save"></i> ${isEdit ? 'Actualizar Producto' : 'Crear Producto'}
                            </button>
                            <button type="button" class="btn-secondary" onclick="adminPanel.closeModal('productModal')">
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        // Establecer categoría si existe
        if (productData.categoria) {
            setTimeout(() => {
                const categorySelect = document.getElementById('productCategory');
                if (categorySelect) {
                    categorySelect.value = productData.categoria;
                }
            }, 100);
        }
        
        this.openModal('productModal');
    },
    
    saveProduct: async function(productId = null) {
        try {
            const productData = {
                nombre: document.getElementById('productName').value,
                descripcion: document.getElementById('productDescription').value,
                precio: parseFloat(document.getElementById('productPrice').value),
                categoria: document.getElementById('productCategory').value,
                disponible: document.getElementById('productAvailable').checked,
                actualizado: new Date()
            };
            
            if (productId) {
                // Actualizar producto existente
                await firebaseApp.db
                    .collection('products')
                    .doc(productId)
                    .update(productData);
                
                this.showNotification('Producto actualizado correctamente');
            } else {
                // Crear nuevo producto
                productData.creado = new Date();
                await firebaseApp.db
                    .collection('products')
                    .add(productData);
                
                this.showNotification('Producto creado correctamente');
            }
            
            this.closeModal('productModal');
            this.loadProducts();
            
        } catch (error) {
            console.error('Error guardando producto:', error);
            this.showError('Error al guardar producto');
        }
    },
    
    toggleProductAvailability: async function(productId, currentStatus) {
        try {
            await firebaseApp.db
                .collection('products')
                .doc(productId)
                .update({
                    disponible: !currentStatus,
                    actualizado: new Date()
                });
            
            this.showNotification(`Producto ${!currentStatus ? 'activado' : 'desactivado'}`);
            this.loadProducts();
            
        } catch (error) {
            console.error('Error cambiando disponibilidad:', error);
            this.showError('Error al cambiar disponibilidad');
        }
    },
    
    deleteProduct: async function(productId) {
        if (confirm('¿Estás seguro de eliminar este producto?')) {
            try {
                await firebaseApp.db
                    .collection('products')
                    .doc(productId)
                    .delete();
                
                this.showNotification('Producto eliminado');
                this.loadProducts();
                
            } catch (error) {
                console.error('Error eliminando producto:', error);
                this.showError('Error al eliminar producto');
            }
        }
    },
    
    searchProducts: function() {
        const searchTerm = document.getElementById('productSearch').value.toLowerCase();
        const productCards = document.querySelectorAll('.product-card');
        
        productCards.forEach(card => {
            const productName = card.querySelector('h3').textContent.toLowerCase();
            const productDesc = card.querySelector('.product-description').textContent.toLowerCase();
            
            if (productName.includes(searchTerm) || productDesc.includes(searchTerm)) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    },
    
    // ============================================
    // GESTIÓN DE CATEGORÍAS
    // ============================================
    loadCategories: async function() {
        try {
            const categoriesSnapshot = await firebaseApp.db
                .collection('categories')
                .orderBy('nombre')
                .get();
            
            const categoriesList = document.getElementById('categoriesList');
            categoriesList.innerHTML = '';
            
            if (categoriesSnapshot.empty) {
                categoriesList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-folder"></i>
                        <p>No hay categorías</p>
                        <button class="btn-small" onclick="adminPanel.showCategoryModal()">
                            <i class="fas fa-plus"></i> Crear primera categoría
                        </button>
                    </div>
                `;
                return;
            }
            
            categoriesSnapshot.forEach(doc => {
                const category = doc.data();
                const categoryId = doc.id;
                this.renderCategoryItem(categoryId, category, categoriesList);
            });
            
        } catch (error) {
            console.error('Error cargando categorías:', error);
            this.showError('Error al cargar categorías');
        }
    },
    
    renderCategoryItem: function(categoryId, category, container) {
        const categoryItem = document.createElement('div');
        categoryItem.className = 'category-card';
        categoryItem.innerHTML = `
            <div class="category-icon">
                <i class="fas fa-${category.icono || 'folder'}"></i>
            </div>
            <div class="category-info">
                <h3>${category.nombre}</h3>
                <p>${category.descripcion || 'Sin descripción'}</p>
                <div class="category-meta">
                    <span>Orden: ${category.orden || '0'}</span>
                    <span class="category-status ${category.activa ? 'active' : 'inactive'}">
                        ${category.activa ? 'Activa' : 'Inactiva'}
                    </span>
                </div>
            </div>
            <div class="category-actions">
                <button class="btn-icon" onclick="adminPanel.editCategory('${categoryId}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon delete" onclick="adminPanel.deleteCategory('${categoryId}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        container.appendChild(categoryItem);
    },
    
    showCategoryModal: function(categoryId = null) {
        // Implementación similar a showProductModal
        console.log('Mostrar modal de categoría');
    },
    
    // ============================================
    // CONFIGURACIÓN
    // ============================================
    loadSettings: async function() {
        try {
            const configDoc = await firebaseApp.db
                .collection('settings')
                .doc('store_config')
                .get();
            
            if (configDoc.exists) {
                const config = configDoc.data();
                
                // Llenar formulario con valores existentes
                if (config.nombre_local) {
                    document.getElementById('storeName').value = config.nombre_local;
                }
                
                if (config.whatsapp_number) {
                    document.getElementById('whatsappNumber').value = config.whatsapp_number;
                }
                
                if (config.gemini_api_key) {
                    document.getElementById('geminiApiKey').value = config.gemini_api_key;
                }
                
                if (config.abierto !== undefined) {
                    document.getElementById('storeOpen').checked = config.abierto;
                    document.getElementById('storeStatusText').textContent = 
                        config.abierto ? 'Abierto' : 'Cerrado';
                }
                
                if (config.mensaje_cerrado) {
                    document.getElementById('closedMessage').value = config.mensaje_cerrado;
                }
                
                if (config.precio_envio) {
                    document.getElementById('deliveryPrice').value = config.precio_envio;
                }
                
                if (config.tiempo_base_estimado) {
                    document.getElementById('baseTime').value = config.tiempo_base_estimado;
                }
                
                if (config.retiro_habilitado !== undefined) {
                    document.getElementById('pickupEnabled').checked = config.retiro_habilitado;
                    document.getElementById('pickupStatusText').textContent = 
                        config.retiro_habilitado ? 'Habilitado' : 'Deshabilitado';
                }
                
                if (config.color_principal) {
                    document.getElementById('primaryColor').value = config.color_principal;
                    document.getElementById('primaryColorText').textContent = config.color_principal;
                }
                
                if (config.color_secundario) {
                    document.getElementById('secondaryColor').value = config.color_secundario;
                    document.getElementById('secondaryColorText').textContent = config.color_secundario;
                }
            }
            
        } catch (error) {
            console.error('Error cargando configuración:', error);
        }
    },
    
    saveSettings: async function() {
        try {
            const settingsData = {
                nombre_local: document.getElementById('storeName').value,
                whatsapp_number: document.getElementById('whatsappNumber').value,
                gemini_api_key: document.getElementById('geminiApiKey').value,
                abierto: document.getElementById('storeOpen').checked,
                mensaje_cerrado: document.getElementById('closedMessage').value,
                precio_envio: parseFloat(document.getElementById('deliveryPrice').value) || 0,
                tiempo_base_estimado: parseInt(document.getElementById('baseTime').value) || 40,
                retiro_habilitado: document.getElementById('pickupEnabled').checked,
                color_principal: document.getElementById('primaryColor').value,
                color_secundario: document.getElementById('secondaryColor').value,
                actualizado: new Date()
            };
            
            await firebaseApp.db
                .collection('settings')
                .doc('store_config')
                .set(settingsData, { merge: true });
            
            this.showNotification('Configuración guardada correctamente');
            
            // Guardar API Key en localStorage para el chat
            if (settingsData.gemini_api_key) {
                localStorage.setItem('el_tachi_gemini_key', settingsData.gemini_api_key);
            }
            
        } catch (error) {
            console.error('Error guardando configuración:', error);
            this.showError('Error al guardar configuración');
        }
    },
    
    // ============================================
    // REPORTES
    // ============================================
    loadReports: async function() {
        // Implementar carga de reportes
        console.log('Cargando reportes...');
    },
    
    generateReport: function() {
        // Implementar generación de reportes CSV
        console.log('Generando reporte...');
        this.showNotification('Reporte generado (simulación)');
    },
    
    // ============================================
    // UTILIDADES
    // ============================================
    openWhatsApp: function(phoneNumber, orderId = '') {
        if (!phoneNumber) {
            this.showError('No hay número de teléfono');
            return;
        }
        
        const message = orderId ? 
            `Hola, soy de EL TACHI. Te contacto por tu pedido ${orderId}.` :
            'Hola, soy de EL TACHI. ¿En qué puedo ayudarte?';
        
        const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    },
    
    openModal: function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    },
    
    closeModal: function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    },
    
    showNotification: function(message, type = 'success') {
        // Crear notificación
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        // Remover después de 3 segundos
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    },
    
    showError: function(message) {
        this.showNotification(message, 'error');
    },
    
    // ============================================
    // INICIALIZACIÓN GLOBAL
    // ============================================
    initialize: function() {
        // Esta función se llama desde el HTML principal
        console.log('🔄 Inicializando panel admin...');
        
        // Verificar si Firebase está inicializado
        if (!firebaseApp.initialized) {
            console.error('Firebase no está inicializado');
            this.showError('Error de conexión con Firebase');
            return;
        }
        
        console.log('✅ Panel admin listo');
    }
};

// Hacer disponible globalmente
window.adminPanel = adminPanel;

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        adminPanel.initialize();
    });
} else {
    adminPanel.initialize();
}
