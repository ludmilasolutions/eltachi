class AdminPanel {
    constructor() {
        this.orders = [];
        this.products = [];
        this.settings = {};
        this.currentUser = null;
        
        // Charts
        this.ordersChart = null;
        this.salesChart = null;
        
        this.initialize();
    }

    async initialize() {
        // Verificar autenticación
        this.setupAuth();
        
        // Configurar event listeners
        this.setupEventListeners();
        
        // Inicializar drag and drop
        this.setupDragAndDrop();
    }

    setupAuth() {
        auth.onAuthStateChanged(user => {
            if (user) {
                this.currentUser = user;
                this.showAdminPanel();
                this.loadAllData();
            } else {
                this.showLoginScreen();
            }
        });
        
        // Login form
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('login-error');
            
            try {
                await auth.signInWithEmailAndPassword(email, password);
                errorDiv.textContent = '';
            } catch (error) {
                errorDiv.textContent = 'Error: ' + error.message;
            }
        });
        
        // Logout button
        document.getElementById('logout-btn').addEventListener('click', () => {
            auth.signOut();
        });
    }

    showLoginScreen() {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('admin-panel').classList.add('hidden');
    }

    showAdminPanel() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('admin-panel').classList.remove('hidden');
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                this.switchTab(tab);
            });
        });
        
        // Refresh orders
        document.getElementById('refresh-orders').addEventListener('click', () => {
            this.loadOrders();
        });
        
        // Add product button
        document.getElementById('add-product').addEventListener('click', () => {
            this.showProductModal();
        });
        
        // Settings forms
        document.getElementById('delivery-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveDeliverySettings();
        });
        
        document.getElementById('gemini-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveGeminiSettings();
        });
        
        document.getElementById('business-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveBusinessSettings();
        });
        
        document.getElementById('hours-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveHoursSettings();
        });
        
        // Product form
        document.getElementById('product-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProduct();
        });
        
        // Report generation
        document.getElementById('generate-report').addEventListener('click', () => {
            this.generateReport();
        });
        
        document.getElementById('export-csv').addEventListener('click', () => {
            this.exportCSV();
        });
        
        // Filter orders
        document.getElementById('status-filter').addEventListener('change', () => {
            this.filterOrders();
        });
        
        document.getElementById('date-filter').addEventListener('change', () => {
            this.filterOrders();
        });
    }

    switchTab(tabName) {
        // Update active nav button
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active');
            }
        });
        
        // Show active tab
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        // Load data if needed
        if (tabName === 'products' && this.products.length === 0) {
            this.loadProducts();
        } else if (tabName === 'reports') {
            this.loadReports();
        }
    }

    async loadAllData() {
        await Promise.all([
            this.loadSettings(),
            this.loadOrders(),
            this.loadProducts()
        ]);
        
        this.updateDashboard();
        this.startAutoRefresh();
    }

    async loadSettings() {
        try {
            const [horarios, envios, negocio] = await Promise.all([
                db.collection('settings').doc('horarios').get(),
                db.collection('settings').doc('envios').get(),
                db.collection('settings').doc('negocio').get()
            ]);
            
            this.settings = {
                horarios: horarios.exists ? horarios.data() : {},
                envios: envios.exists ? envios.data() : {},
                negocio: negocio.exists ? negocio.data() : {}
            };
            
            this.renderSettings();
            this.updateBusinessStatus();
        } catch (error) {
            console.error('Error cargando settings:', error);
        }
    }

    async loadOrders() {
        try {
            const snapshot = await db.collection('orders')
                .orderBy('fecha', 'desc')
                .limit(100)
                .get();
            
            this.orders = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            this.renderOrders();
            this.updateDashboardStats();
        } catch (error) {
            console.error('Error cargando pedidos:', error);
        }
    }

    async loadProducts() {
        try {
            const snapshot = await db.collection('products')
                .orderBy('orden', 'asc')
                .get();
            
            this.products = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            this.renderProducts();
        } catch (error) {
            console.error('Error cargando productos:', error);
        }
    }

    renderSettings() {
        // Horarios
        const hoursForm = document.getElementById('hours-form');
        if (hoursForm && this.settings.horarios) {
            let html = '';
            const days = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
            
            days.forEach(day => {
                const data = this.settings.horarios[day] || {abierto: true, inicio: '10:00', cierre: '22:00'};
                html += `
                    <div class="day-schedule">
                        <h4>${day.charAt(0).toUpperCase() + day.slice(1)}</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label>
                                    <input type="checkbox" class="day-open" data-day="${day}" ${data.abierto ? 'checked' : ''}>
                                    Abierto
                                </label>
                            </div>
                            <div class="form-group">
                                <label>Inicio:</label>
                                <input type="time" class="day-start" data-day="${day}" value="${data.inicio}">
                            </div>
                            <div class="form-group">
                                <label>Cierre:</label>
                                <input type="time" class="day-end" data-day="${day}" value="${data.cierre}">
                            </div>
                        </div>
                    </div>
                `;
            });
            
            hoursForm.innerHTML = html + `
                <div class="form-group">
                    <label>Mensaje cuando está cerrado:</label>
                    <input type="text" id="closed-message" value="${this.settings.horarios.cerrado_mensaje || ''}">
                </div>
                <button type="submit" class="save-btn">Guardar Horarios</button>
            `;
        }
        
        // Envíos
        if (this.settings.envios) {
            document.getElementById('delivery-price').value = this.settings.envios.precio || 300;
            document.getElementById('delivery-min').value = this.settings.envios.tiempo_min || 30;
            document.getElementById('delivery-max').value = this.settings.envios.tiempo_max || 45;
            document.getElementById('pickup-enabled').checked = this.settings.envios.retiro_habilitado || false;
        }
        
        // Negocio
        if (this.settings.negocio) {
            document.getElementById('business-phone').value = this.settings.negocio.telefono || '';
            document.getElementById('business-address').value = this.settings.negocio.direccion || '';
            document.getElementById('business-open').checked = this.settings.negocio.abierto || true;
        }
    }

    renderOrders() {
        const statuses = ['Recibido', 'En preparación', 'Listo', 'Entregado'];
        
        // Limpiar columnas
        statuses.forEach(status => {
            const column = document.getElementById(`column-${status.toLowerCase().replace(' ', '-')}`);
            if (column) column.innerHTML = '';
        });
        
        // Filtrar por fecha si hay
        const dateFilter = document.getElementById('date-filter').value;
        const statusFilter = document.getElementById('status-filter').value;
        
        let filteredOrders = this.orders;
        
        if (dateFilter) {
            const filterDate = new Date(dateFilter);
            filteredOrders = filteredOrders.filter(order => {
                const orderDate = order.fecha?.toDate ? order.fecha.toDate() : new Date(order.fecha);
                return orderDate.toDateString() === filterDate.toDateString();
            });
        }
        
        if (statusFilter) {
            filteredOrders = filteredOrders.filter(order => order.estado === statusFilter);
        }
        
        // Agregar a columnas
        filteredOrders.forEach(order => {
            const columnId = `column-${order.estado.toLowerCase().replace(' ', '-')}`;
            const column = document.getElementById(columnId);
            
            if (column) {
                const orderElement = this.createOrderElement(order);
                column.appendChild(orderElement);
            }
        });
        
        // Actualizar lista reciente en dashboard
        this.updateRecentOrders();
    }

    createOrderElement(order) {
        const div = document.createElement('div');
        div.className = 'kanban-item';
        div.dataset.orderId = order.id_pedido || order.id;
        div.draggable = true;
        
        const total = order.total || 0;
        const date = order.fecha?.toDate ? order.fecha.toDate().toLocaleString() : new Date(order.fecha).toLocaleString();
        
        div.innerHTML = `
            <h5>${order.cliente || 'Sin nombre'}</h5>
            <div class="order-id">${order.id_pedido || order.id}</div>
            <div class="order-date">${date}</div>
            <div class="order-total">$${total}</div>
            <div class="order-type">${order.tipo === 'delivery' ? '🚚 Envío' : '🏪 Retiro'}</div>
        `;
        
        div.addEventListener('click', () => {
            this.showOrderDetail(order);
        });
        
        return div;
    }

    renderProducts() {
        const container = document.getElementById('products-list');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            
            card.innerHTML = `
                <h4>${product.nombre}</h4>
                <p class="product-desc">${product.descripcion || ''}</p>
                <div class="product-price">$${product.precio}</div>
                <div class="product-category">${product.categoria}</div>
                <div class="product-available">${product.disponible ? '✅ Disponible' : '❌ No disponible'}</div>
                ${product.aderezos_disponibles?.length ? 
                    `<div class="product-toppings">Aderezos: ${product.aderezos_disponibles.join(', ')}</div>` : 
                    ''
                }
                <div class="product-actions">
                    <button class="edit-btn" data-id="${product.id}">Editar</button>
                    <button class="delete-btn" data-id="${product.id}">Eliminar</button>
                </div>
            `;
            
            container.appendChild(card);
        });
        
        // Agregar event listeners a botones
        container.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = e.target.dataset.id;
                this.editProduct(productId);
            });
        });
        
        container.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = e.target.dataset.id;
                this.deleteProduct(productId);
            });
        });
    }

    updateDashboard() {
        this.updateDashboardStats();
        this.updateOrdersChart();
    }

    updateDashboardStats() {
        const today = new Date().toDateString();
        const todayOrders = this.orders.filter(order => {
            const orderDate = order.fecha?.toDate ? order.fecha.toDate().toDateString() : new Date(order.fecha).toDateString();
            return orderDate === today;
        });
        
        const todaySales = todayOrders.reduce((sum, order) => sum + (order.total || 0), 0);
        const activeOrders = this.orders.filter(order => 
            order.estado !== 'Entregado' && order.estado !== 'Cancelado'
        ).length;
        
        document.getElementById('orders-today').textContent = todayOrders.length;
        document.getElementById('sales-today').textContent = `$${todaySales}`;
        document.getElementById('active-orders').textContent = activeOrders;
    }

    updateOrdersChart() {
        const ctx = document.getElementById('orders-chart');
        if (!ctx) return;
        
        // Destruir chart anterior si existe
        if (this.ordersChart) {
            this.ordersChart.destroy();
        }
        
        // Agrupar por hora del día
        const hours = Array.from({length: 24}, (_, i) => i);
        const ordersByHour = hours.map(hour => {
            return this.orders.filter(order => {
                const orderDate = order.fecha?.toDate ? order.fecha.toDate() : new Date(order.fecha);
                return orderDate.getHours() === hour;
            }).length;
        });
        
        this.ordersChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: hours.map(h => `${h}:00`),
                datasets: [{
                    label: 'Pedidos por hora',
                    data: ordersByHour,
                    borderColor: '#1a73e8',
                    backgroundColor: 'rgba(26, 115, 232, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    updateRecentOrders() {
        const container = document.getElementById('recent-orders-list');
        if (!container) return;
        
        const recent = this.orders.slice(0, 10);
        
        container.innerHTML = recent.map(order => `
            <div class="recent-order">
                <div class="recent-order-header">
                    <strong>${order.id_pedido || order.id}</strong>
                    <span class="status-badge">${order.estado}</span>
                </div>
                <div>${order.cliente} - $${order.total || 0}</div>
                <div class="recent-order-time">
                    ${order.fecha?.toDate ? order.fecha.toDate().toLocaleTimeString() : ''}
                </div>
            </div>
        `).join('');
    }

    updateBusinessStatus() {
        const isOpen = this.settings.negocio?.abierto || true;
        const indicator = document.getElementById('status-indicator');
        const text = document.getElementById('status-text');
        const dashboardStatus = document.getElementById('business-status');
        
        if (isOpen) {
            indicator.className = 'status-indicator';
            text.textContent = 'Abierto';
            if (dashboardStatus) {
                dashboardStatus.textContent = 'Abierto';
                dashboardStatus.className = 'stat-status';
            }
        } else {
            indicator.className = 'status-indicator closed';
            text.textContent = 'Cerrado';
            if (dashboardStatus) {
                dashboardStatus.textContent = 'Cerrado';
                dashboardStatus.className = 'stat-status closed';
            }
        }
    }

    setupDragAndDrop() {
        const columns = document.querySelectorAll('.kanban-items');
        
        columns.forEach(column => {
            column.addEventListener('dragover', (e) => {
                e.preventDefault();
                column.classList.add('drag-over');
            });
            
            column.addEventListener('dragleave', () => {
                column.classList.remove('drag-over');
            });
            
            column.addEventListener('drop', async (e) => {
                e.preventDefault();
                column.classList.remove('drag-over');
                
                const orderId = e.dataTransfer.getData('text/plain');
                const newStatus = column.dataset.status;
                
                if (orderId && newStatus) {
                    await this.updateOrderStatus(orderId, newStatus);
                }
            });
        });
        
        // Delegar eventos drag a los items
        document.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('kanban-item')) {
                e.dataTransfer.setData('text/plain', e.target.dataset.orderId);
            }
        });
    }

    async updateOrderStatus(orderId, newStatus) {
        try {
            await FirebaseService.updateOrderStatus(orderId, newStatus);
            
            // Actualizar localmente
            const orderIndex = this.orders.findIndex(o => o.id_pedido === orderId || o.id === orderId);
            if (orderIndex !== -1) {
                this.orders[orderIndex].estado = newStatus;
                this.renderOrders();
                this.updateDashboardStats();
            }
            
            // Mostrar notificación
            this.showNotification(`Estado actualizado a: ${newStatus}`);
        } catch (error) {
            console.error('Error actualizando estado:', error);
            this.showNotification('Error actualizando estado', true);
        }
    }

    showProductModal(product = null) {
        const modal = document.getElementById('product-modal');
        const title = document.getElementById('modal-title');
        const form = document.getElementById('product-form');
        
        if (product) {
            title.textContent = 'Editar Producto';
            document.getElementById('product-id').value = product.id;
            document.getElementById('product-name').value = product.nombre || '';
            document.getElementById('product-desc').value = product.descripcion || '';
            document.getElementById('product-price').value = product.precio || 0;
            document.getElementById('product-category').value = product.categoria || 'hamburguesas';
            document.getElementById('product-toppings').value = product.aderezos_disponibles?.join(', ') || '';
            document.getElementById('product-extra-prices').value = product.precios_extra_aderezos ? 
                JSON.stringify(product.precios_extra_aderezos) : '';
            document.getElementById('product-available').checked = product.disponible !== false;
        } else {
            title.textContent = 'Nuevo Producto';
            form.reset();
            document.getElementById('product-id').value = '';
        }
        
        modal.classList.remove('hidden');
    }

    async saveProduct() {
        const id = document.getElementById('product-id').value;
        const productData = {
            nombre: document.getElementById('product-name').value,
            descripcion: document.getElementById('product-desc').value,
            precio: parseFloat(document.getElementById('product-price').value),
            categoria: document.getElementById('product-category').value,
            disponible: document.getElementById('product-available').checked,
            orden: this.products.length + 1
        };
        
        // Procesar aderezos
        const toppings = document.getElementById('product-toppings').value;
        if (toppings) {
            productData.aderezos_disponibles = toppings.split(',').map(t => t.trim()).filter(t => t);
        }
        
        // Procesar precios extra
        const extraPrices = document.getElementById('product-extra-prices').value;
        if (extraPrices) {
            try {
                productData.precios_extra_aderezos = JSON.parse(extraPrices);
            } catch (e) {
                console.error('Error parseando precios extra:', e);
            }
        }
        
        try {
            if (id) {
                // Actualizar
                await db.collection('products').doc(id).update(productData);
            } else {
                // Crear nuevo con ID automático
                const docRef = await db.collection('products').add(productData);
                productData.id = docRef.id;
            }
            
            this.showNotification('Producto guardado correctamente');
            this.closeModal();
            this.loadProducts();
        } catch (error) {
            console.error('Error guardando producto:', error);
            this.showNotification('Error guardando producto', true);
        }
    }

    async deleteProduct(productId) {
        if (!confirm('¿Estás seguro de eliminar este producto?')) return;
        
        try {
            await db.collection('products').doc(productId).delete();
            this.showNotification('Producto eliminado');
            this.loadProducts();
        } catch (error) {
            console.error('Error eliminando producto:', error);
            this.showNotification('Error eliminando producto', true);
        }
    }

    editProduct(productId) {
        const product = this.products.find(p => p.id === productId);
        if (product) {
            this.showProductModal(product);
        }
    }

    async saveDeliverySettings() {
        const settings = {
            precio: parseFloat(document.getElementById('delivery-price').value),
            tiempo_min: parseInt(document.getElementById('delivery-min').value),
            tiempo_max: parseInt(document.getElementById('delivery-max').value),
            retiro_habilitado: document.getElementById('pickup-enabled').checked
        };
        
        try {
            await db.collection('settings').doc('envios').set(settings, { merge: true });
            this.settings.envios = settings;
            this.showNotification('Configuración de envíos guardada');
        } catch (error) {
            console.error('Error guardando envíos:', error);
            this.showNotification('Error guardando configuración', true);
        }
    }

    async saveBusinessSettings() {
        const settings = {
            telefono: document.getElementById('business-phone').value,
            direccion: document.getElementById('business-address').value,
            abierto: document.getElementById('business-open').checked
        };
        
        try {
            await db.collection('settings').doc('negocio').set(settings, { merge: true });
            this.settings.negocio = settings;
            this.updateBusinessStatus();
            this.showNotification('Información del negocio guardada');
        } catch (error) {
            console.error('Error guardando negocio:', error);
            this.showNotification('Error guardando configuración', true);
        }
    }

    async saveHoursSettings() {
        const days = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
        const settings = {};
        
        days.forEach(day => {
            const openCheckbox = document.querySelector(`.day-open[data-day="${day}"]`);
            const startInput = document.querySelector(`.day-start[data-day="${day}"]`);
            const endInput = document.querySelector(`.day-end[data-day="${day}"]`);
            
            if (openCheckbox && startInput && endInput) {
                settings[day] = {
                    abierto: openCheckbox.checked,
                    inicio: startInput.value,
                    cierre: endInput.value
                };
            }
        });
        
        settings.cerrado_mensaje = document.getElementById('closed-message').value;
        
        try {
            await db.collection('settings').doc('horarios').set(settings, { merge: true });
            this.settings.horarios = settings;
            this.showNotification('Horarios guardados correctamente');
        } catch (error) {
            console.error('Error guardando horarios:', error);
            this.showNotification('Error guardando horarios', true);
        }
    }

    async saveGeminiSettings() {
        const apiKey = document.getElementById('gemini-key').value;
        // Aquí podrías guardar en Firestore o usar localStorage
        localStorage.setItem('gemini_api_key', apiKey);
        this.showNotification('API Key guardada en navegador');
    }

    showOrderDetail(order) {
        const modal = document.getElementById('order-detail-modal');
        const content = document.getElementById('order-detail-content');
        
        const date = order.fecha?.toDate ? order.fecha.toDate().toLocaleString() : new Date(order.fecha).toLocaleString();
        
        content.innerHTML = `
            <div class="order-detail-section">
                <h4>Información del Pedido</h4>
                <p><strong>ID:</strong> ${order.id_pedido || order.id}</p>
                <p><strong>Fecha:</strong> ${date}</p>
                <p><strong>Estado:</strong> ${order.estado}</p>
                <p><strong>Total:</strong> $${order.total || 0}</p>
            </div>
            
            <div class="order-detail-section">
                <h4>Datos del Cliente</h4>
                <p><strong>Nombre:</strong> ${order.cliente || 'No especificado'}</p>
                <p><strong>Teléfono:</strong> ${order.telefono || 'No especificado'}</p>
                <p><strong>Tipo:</strong> ${order.tipo === 'delivery' ? 'Envío a domicilio' : 'Retiro en local'}</p>
                ${order.direccion ? `<p><strong>Dirección:</strong> ${order.direccion}</p>` : ''}
            </div>
            
            <div class="order-detail-section">
                <h4>Detalle del Pedido</h4>
                <pre style="background: #f5f5f5; padding: 15px; border-radius: 8px;">${order.pedido_detallado || 'No disponible'}</pre>
            </div>
        `;
        
        // Configurar botón de WhatsApp
        document.getElementById('whatsapp-order-btn').onclick = () => {
            const phone = order.telefono;
            if (phone) {
                const message = encodeURIComponent(
                    `Hola ${order.cliente}, soy EL TACHI. Tu pedido ${order.id_pedido} está en estado: ${order.estado}. ¡Gracias!`
                );
                window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
            }
        };
        
        modal.classList.remove('hidden');
    }

    filterOrders() {
        this.renderOrders();
    }

    async generateReport() {
        const period = document.getElementById('report-period').value;
        let startDate, endDate;
        
        const now = new Date();
        
        switch (period) {
            case 'today':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
                break;
            case 'week':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
                endDate = now;
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                endDate = now;
                break;
            case 'custom':
                startDate = new Date(document.getElementById('report-start').value);
                endDate = new Date(document.getElementById('report-end').value);
                break;
        }
        
        // Filtrar órdenes por fecha
        const filteredOrders = this.orders.filter(order => {
            const orderDate = order.fecha?.toDate ? order.fecha.toDate() : new Date(order.fecha);
            return orderDate >= startDate && orderDate <= endDate;
        });
        
        // Calcular estadísticas
        const totalSales = filteredOrders.reduce((sum, order) => sum + (order.total || 0), 0);
        const avgOrder = filteredOrders.length > 0 ? totalSales / filteredOrders.length : 0;
        const deliveredOrders = filteredOrders.filter(o => o.estado === 'Entregado').length;
        
        // Mostrar estadísticas
        document.getElementById('report-stats').innerHTML = `
            <div class="stat-item">
                <strong>Período:</strong> ${period === 'custom' ? 'Personalizado' : period}
            </div>
            <div class="stat-item">
                <strong>Total de pedidos:</strong> ${filteredOrders.length}
            </div>
            <div class="stat-item">
                <strong>Pedidos entregados:</strong> ${deliveredOrders}
            </div>
            <div class="stat-item">
                <strong>Ventas totales:</strong> $${totalSales}
            </div>
            <div class="stat-item">
                <strong>Ticket promedio:</strong> $${avgOrder.toFixed(2)}
            </div>
        `;
        
        // Actualizar gráfico
        this.updateSalesChart(filteredOrders);
    }

    updateSalesChart(orders) {
        const ctx = document.getElementById('sales-chart');
        if (!ctx) return;
        
        if (this.salesChart) {
            this.salesChart.destroy();
        }
        
        // Agrupar por día
        const salesByDay = {};
        orders.forEach(order => {
            const date = order.fecha?.toDate ? order.fecha.toDate().toDateString() : new Date(order.fecha).toDateString();
            salesByDay[date] = (salesByDay[date] || 0) + (order.total || 0);
        });
        
        const labels = Object.keys(salesByDay);
        const data = Object.values(salesByDay);
        
        this.salesChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Ventas por día',
                    data: data,
                    backgroundColor: '#34a853',
                    borderColor: '#2e7d32',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    exportCSV() {
        const headers = ['ID', 'Fecha', 'Cliente', 'Teléfono', 'Tipo', 'Total', 'Estado'];
        const rows = this.orders.map(order => [
            order.id_pedido || order.id,
            order.fecha?.toDate ? order.fecha.toDate().toLocaleString() : new Date(order.fecha).toLocaleString(),
            order.cliente || '',
            order.telefono || '',
            order.tipo || '',
            order.total || 0,
            order.estado || ''
        ]);
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pedidos-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    }

    startAutoRefresh() {
        // Actualizar pedidos cada 30 segundos
        setInterval(() => {
            this.loadOrders();
        }, 30000);
    }

    showNotification(message, isError = false) {
        // Crear notificación
        const notification = document.createElement('div');
        notification.className = `notification ${isError ? 'error' : 'success'}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 24px;
            background: ${isError ? '#ea4335' : '#34a853'};
            color: white;
            border-radius: 8px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// Funciones globales para modales
function closeModal() {
    document.getElementById('product-modal').classList.add('hidden');
}

function closeOrderModal() {
    document.getElementById('order-detail-modal').classList.add('hidden');
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.adminPanel = new AdminPanel();
});