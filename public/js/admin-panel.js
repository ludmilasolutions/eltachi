// Panel de Administración EL TACHI
class AdminPanel {
    constructor() {
        this.currentUser = null;
        this.orders = [];
        this.products = [];
        this.chart = null;
        
        this.initializeAuth();
    }
    
    initializeAuth() {
        // Verificar estado de autenticación
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                this.currentUser = user;
                this.showAdminPanel(user);
                this.loadDashboardData();
            }
        });
    }
    
    showAdminPanel(user) {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'flex';
        document.getElementById('userEmail').textContent = user.email;
    }
    
    async login() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const errorElement = document.getElementById('loginError');
        
        if (!email || !password) {
            errorElement.textContent = "Por favor completá email y contraseña";
            errorElement.style.display = 'block';
            return;
        }
        
        try {
            await firebase.auth().signInWithEmailAndPassword(email, password);
            errorElement.style.display = 'none';
        } catch (error) {
            errorElement.textContent = this.getAuthErrorMessage(error.code);
            errorElement.style.display = 'block';
        }
    }
    
    async register() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const errorElement = document.getElementById('loginError');
        
        if (!email || !password) {
            errorElement.textContent = "Por favor completá email y contraseña";
            errorElement.style.display = 'block';
            return;
        }
        
        if (password.length < 6) {
            errorElement.textContent = "La contraseña debe tener al menos 6 caracteres";
            errorElement.style.display = 'block';
            return;
        }
        
        try {
            await firebase.auth().createUserWithEmailAndPassword(email, password);
            errorElement.style.display = 'none';
            
            // Mostrar mensaje de éxito
            alert('✅ Administrador registrado exitosamente. Ahora podés iniciar sesión.');
        } catch (error) {
            errorElement.textContent = this.getAuthErrorMessage(error.code);
            errorElement.style.display = 'block';
        }
    }
    
    getAuthErrorMessage(errorCode) {
        const messages = {
            'auth/invalid-email': 'Email inválido',
            'auth/user-disabled': 'Usuario deshabilitado',
            'auth/user-not-found': 'Usuario no encontrado',
            'auth/wrong-password': 'Contraseña incorrecta',
            'auth/email-already-in-use': 'El email ya está registrado',
            'auth/weak-password': 'La contraseña es muy débil',
            'auth/operation-not-allowed': 'Operación no permitida'
        };
        
        return messages[errorCode] || 'Error desconocido. Intentá de nuevo.';
    }
    
    logout() {
        firebase.auth().signOut().then(() => {
            document.getElementById('loginScreen').style.display = 'flex';
            document.getElementById('adminPanel').style.display = 'none';
            document.getElementById('loginEmail').value = '';
            document.getElementById('loginPassword').value = '';
        });
    }
    
    showSection(sectionId) {
        // Ocultar todas las secciones
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Desactivar todos los botones de navegación
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Mostrar sección seleccionada
        document.getElementById(sectionId).classList.add('active');
        
        // Activar botón correspondiente
        document.querySelector(`[onclick="showSection('${sectionId}')"]`).classList.add('active');
        
        // Cargar datos específicos de la sección
        switch(sectionId) {
            case 'dashboard':
                this.loadDashboardData();
                break;
            case 'orders':
                this.loadOrders();
                break;
            case 'products':
                this.loadProducts();
                break;
            case 'settings':
                this.loadSettings();
                break;
        }
    }
    
    async loadDashboardData() {
        try {
            // 1. Cargar estadísticas
            await this.loadStats();
            
            // 2. Cargar pedidos recientes
            await this.loadRecentOrders();
            
            // 3. Crear gráfico
            this.createOrdersChart();
            
        } catch (error) {
            console.error("Error loading dashboard:", error);
        }
    }
    
    async loadStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        try {
            // Pedidos de hoy
            const todayOrders = await window.firebaseApp.db
                .collection('orders')
                .where('fecha', '>=', today)
                .get();
            
            document.getElementById('ordersToday').textContent = todayOrders.size;
            
            // Estado del local
            const settings = await window.firebaseApp.db
                .collection('settings')
                .doc('store_hours')
                .get();
            
            if (settings.exists) {
                const status = settings.data().abierto ? "🔓 ABIERTO" : "🔒 CERRADO";
                document.getElementById('storeStatus').textContent = status;
                document.getElementById('storeStatus').style.color = 
                    settings.data().abierto ? "#34a853" : "#ea4335";
            }
            
            // Productos activos
            const activeProducts = await window.firebaseApp.db
                .collection('products')
                .where('disponible', '==', true)
                .get();
            
            document.getElementById('activeProducts').textContent = activeProducts.size;
            
            // Ventas totales (últimos 30 días)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const recentOrders = await window.firebaseApp.db
                .collection('orders')
                .where('fecha', '>=', thirtyDaysAgo)
                .get();
            
            let totalSales = 0;
            recentOrders.forEach(doc => {
                totalSales += doc.data().total || 0;
            });
            
            document.getElementById('totalSales').textContent = `$${totalSales}`;
            
        } catch (error) {
            console.error("Error loading stats:", error);
        }
    }
    
    async loadRecentOrders() {
        try {
            const ordersSnapshot = await window.firebaseApp.db
                .collection('orders')
                .orderBy('fecha', 'desc')
                .limit(10)
                .get();
            
            const ordersList = document.getElementById('recentOrdersList');
            ordersList.innerHTML = '';
            
            ordersSnapshot.forEach(doc => {
                const order = doc.data();
                ordersList.appendChild(this.createOrderCard(order));
            });
            
        } catch (error) {
            console.error("Error loading recent orders:", error);
        }
    }
    
    async loadOrders() {
        try {
            const ordersSnapshot = await window.firebaseApp.db
                .collection('orders')
                .orderBy('fecha', 'desc')
                .get();
            
            this.orders = [];
            const ordersList = document.getElementById('ordersList');
            ordersList.innerHTML = '';
            
            ordersSnapshot.forEach(doc => {
                const order = { id: doc.id, ...doc.data() };
                this.orders.push(order);
                ordersList.appendChild(this.createOrderCard(order, true));
            });
            
        } catch (error) {
            console.error("Error loading orders:", error);
        }
    }
    
    createOrderCard(order, detailed = false) {
        const card = document.createElement('div');
        card.className = `order-card ${order.estado?.toLowerCase().replace(' ', '-') || ''}`;
        
        // Formatear fecha
        let fechaStr = 'Fecha no disponible';
        if (order.fecha) {
            const fecha = order.fecha.toDate ? order.fecha.toDate() : new Date(order.fecha);
            fechaStr = fecha.toLocaleDateString('es-AR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        
        let html = `
            <div class="order-header">
                <div>
                    <span class="order-id">${order.id_pedido || 'Sin ID'}</span>
                    <span class="order-status status-${order.estado?.toLowerCase().replace(' ', '-') || 'unknown'}">
                        ${order.estado || 'Desconocido'}
                    </span>
                </div>
                <span class="order-date">${fechaStr}</span>
            </div>
            
            <div class="order-details">
                <div>
                    <strong>Cliente:</strong><br>
                    ${order.nombre_cliente || 'Sin nombre'}<br>
                    📞 ${order.telefono || 'Sin teléfono'}
                </div>
                
                <div>
                    <strong>Tipo:</strong><br>
                    ${order.tipo_pedido === 'envio' ? '🚚 Envío' : '📍 Retiro'}<br>
                    ${order.tipo_pedido === 'envio' ? (order.direccion || 'Sin dirección') : 'Retira en local'}
                </div>
                
                <div>
                    <strong>Total:</strong><br>
                    $${order.total || 0}<br>
                    ${order.tiempo_estimado_actual ? `⏰ ${order.tiempo_estimado_actual} min` : 'Sin tiempo estimado'}
                </div>
            </div>
        `;
        
        if (detailed) {
            html += `
                <div class="order-items">
                    <strong>Pedido:</strong><br>
                    <pre style="white-space: pre-wrap; background: #f5f5f5; padding: 10px; border-radius: 5px; margin-top: 5px;">
${order.pedido_detallado || 'Sin detalles'}
                    </pre>
                </div>
                
                <div class="order-actions">
                    <button class="action-btn whatsapp-btn" onclick="adminPanel.openWhatsApp('${order.telefono || ''}')">
                        💬 WhatsApp
                    </button>
                    
                    <select class="status-select" onchange="adminPanel.updateOrderStatus('${order.id_pedido}', this.value)" 
                            style="padding: 8px; border-radius: 5px; border: 1px solid #ddd;">
                        <option value="Recibido" ${order.estado === 'Recibido' ? 'selected' : ''}>Recibido</option>
                        <option value="En preparación" ${order.estado === 'En preparación' ? 'selected' : ''}>En preparación</option>
                        <option value="Listo" ${order.estado === 'Listo' ? 'selected' : ''}>Listo</option>
                        <option value="Entregado" ${order.estado === 'Entregado' ? 'selected' : ''}>Entregado</option>
                    </select>
                    
                    ${order.estado === 'En preparación' ? `
                        <input type="number" 
                               value="${order.tiempo_estimado_actual || ''}" 
                               placeholder="Minutos"
                               style="padding: 8px; width: 80px; border: 1px solid #ddd; border-radius: 5px;"
                               onchange="adminPanel.updateOrderTime('${order.id_pedido}', this.value)">
                    ` : ''}
                    
                    <button class="action-btn delete-btn" onclick="adminPanel.deleteOrder('${order.id_pedido}')">
                        🗑 Eliminar
                    </button>
                </div>
            `;
        }
        
        card.innerHTML = html;
        return card;
    }
    
    openWhatsApp(phoneNumber) {
        if (!phoneNumber) {
            alert("No hay número de teléfono para este pedido");
            return;
        }
        
        // Limpiar número (solo dígitos)
        const cleanNumber = phoneNumber.replace(/\D/g, '');
        
        // Abrir WhatsApp
        const whatsappUrl = `https://wa.me/${cleanNumber}`;
        window.open(whatsappUrl, '_blank');
    }
    
    async updateOrderStatus(orderId, newStatus) {
        try {
            await window.firebaseApp.db
                .collection('orders')
                .where('id_pedido', '==', orderId)
                .get()
                .then(async (querySnapshot) => {
                    if (!querySnapshot.empty) {
                        const docId = querySnapshot.docs[0].id;
                        await window.firebaseApp.db
                            .collection('orders')
                            .doc(docId)
                            .update({
                                estado: newStatus,
                                ultima_actualizacion: firebase.firestore.FieldValue.serverTimestamp()
                            });
                        
                        window.firebaseApp.showNotification(`✅ Estado actualizado a: ${newStatus}`);
                        this.loadOrders(); // Recargar lista
                    }
                });
        } catch (error) {
            console.error("Error updating order status:", error);
            window.firebaseApp.showNotification("❌ Error al actualizar estado", "error");
        }
    }
    
    async updateOrderTime(orderId, minutes) {
        if (!minutes || isNaN(minutes) || minutes < 1) {
            alert("Por favor ingresá un tiempo válido en minutos");
            return;
        }
        
        try {
            await window.firebaseApp.db
                .collection('orders')
                .where('id_pedido', '==', orderId)
                .get()
                .then(async (querySnapshot) => {
                    if (!querySnapshot.empty) {
                        const docId = querySnapshot.docs[0].id;
                        await window.firebaseApp.db
                            .collection('orders')
                            .doc(docId)
                            .update({
                                tiempo_estimado_actual: parseInt(minutes),
                                ultima_actualizacion: firebase.firestore.FieldValue.serverTimestamp()
                            });
                        
                        window.firebaseApp.showNotification(`✅ Tiempo actualizado: ${minutes} minutos`);
                    }
                });
        } catch (error) {
            console.error("Error updating order time:", error);
            window.firebaseApp.showNotification("❌ Error al actualizar tiempo", "error");
        }
    }
    
    async deleteOrder(orderId) {
        if (!confirm(`¿Estás seguro de eliminar el pedido ${orderId}? Esta acción no se puede deshacer.`)) {
            return;
        }
        
        try {
            await window.firebaseApp.db
                .collection('orders')
                .where('id_pedido', '==', orderId)
                .get()
                .then(async (querySnapshot) => {
                    if (!querySnapshot.empty) {
                        const docId = querySnapshot.docs[0].id;
                        await window.firebaseApp.db
                            .collection('orders')
                            .doc(docId)
                            .delete();
                        
                        window.firebaseApp.showNotification(`✅ Pedido ${orderId} eliminado`);
                        this.loadOrders(); // Recargar lista
                    }
                });
        } catch (error) {
            console.error("Error deleting order:", error);
            window.firebaseApp.showNotification("❌ Error al eliminar pedido", "error");
        }
    }
    
    async loadProducts() {
        try {
            const productsSnapshot = await window.firebaseApp.db
                .collection('products')
                .orderBy('nombre')
                .get();
            
            this.products = [];
            const productsList = document.getElementById('productsList');
            productsList.innerHTML = '';
            
            productsSnapshot.forEach(doc => {
                const product = { id: doc.id, ...doc.data() };
                this.products.push(product);
                productsList.appendChild(this.createProductCard(product));
            });
            
        } catch (error) {
            console.error("Error loading products:", error);
        }
    }
    
    createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        const html = `
            <div class="product-image">
                ${product.imagen_url ? 
                    `<img src="${product.imagen_url}" alt="${product.nombre}" style="width:100%; height:100%; object-fit:cover;">` :
                    '🍔'
                }
            </div>
            
            <div class="product-info">
                <div class="product-header">
                    <div>
                        <div class="product-name">${product.nombre}</div>
                        <span class="product-category">${product.categoria || 'Sin categoría'}</span>
                    </div>
                    <div class="product-price">$${product.precio || 0}</div>
                </div>
                
                <div class="product-description">
                    ${product.descripcion || 'Sin descripción'}
                </div>
                
                ${product.aderezos_disponibles?.length > 0 ? `
                    <div class="product-toppings">
                        <strong>Aderezos disponibles:</strong><br>
                        ${product.aderezos_disponibles.map(aderezo => {
                            const precioExtra = product.precios_extra_aderezos?.[aderezo] || 0;
                            return `<span class="topping-tag">${aderezo} ${precioExtra > 0 ? `(+$${precioExtra})` : ''}</span>`;
                        }).join(' ')}
                    </div>
                ` : ''}
                
                <div class="product-footer">
                    <div class="availability ${product.disponible ? 'active' : 'inactive'}">
                        ${product.disponible ? '✅ Disponible' : '❌ No disponible'}
                    </div>
                    
                    <div class="product-actions">
                        <button class="action-btn edit-btn" onclick="adminPanel.editProduct('${product.id}')">
                            ✏️ Editar
                        </button>
                        <button class="action-btn delete-btn" onclick="adminPanel.deleteProduct('${product.id}')">
                            🗑 Eliminar
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        card.innerHTML = html;
        return card;
    }
    
    createOrdersChart() {
        const ctx = document.getElementById('ordersChart').getContext('2d');
        
        if (this.chart) {
            this.chart.destroy();
        }
        
        // Datos de ejemplo para el gráfico
        // En producción, estos datos vendrían de Firestore
        const hours = Array.from({length: 24}, (_, i) => `${i}:00`);
        const ordersData = hours.map(() => Math.floor(Math.random() * 10));
        
        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: hours,
                datasets: [{
                    label: 'Pedidos por hora',
                    data: ordersData,
                    backgroundColor: 'rgba(26, 115, 232, 0.7)',
                    borderColor: 'rgba(26, 115, 232, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }
    
    filterOrders() {
        const filterValue = document.getElementById('orderFilter').value;
        const ordersList = document.getElementById('ordersList');
        
        let filteredOrders = [...this.orders];
        
        if (filterValue === 'today') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            filteredOrders = filteredOrders.filter(order => {
                const orderDate = order.fecha?.toDate ? order.fecha.toDate() : new Date(order.fecha);
                return orderDate >= today;
            });
        } else if (filterValue === 'pending') {
            filteredOrders = filteredOrders.filter(order => 
                order.estado === 'Recibido' || order.estado === 'En preparación'
            );
        } else if (filterValue === 'preparation') {
            filteredOrders = filteredOrders.filter(order => order.estado === 'En preparación');
        } else if (filterValue === 'ready') {
            filteredOrders = filteredOrders.filter(order => order.estado === 'Listo');
        }
        
        ordersList.innerHTML = '';
        filteredOrders.forEach(order => {
            ordersList.appendChild(this.createOrderCard(order, true));
        });
    }
    
    refreshOrders() {
        this.loadOrders();
        window.firebaseApp.showNotification("✅ Lista de pedidos actualizada");
    }
    
    searchProducts() {
        const searchTerm = document.getElementById('productSearch').value.toLowerCase();
        const productsList = document.getElementById('productsList');
        
        productsList.innerHTML = '';
        
        const filteredProducts = this.products.filter(product => 
            product.nombre.toLowerCase().includes(searchTerm) ||
            product.descripcion?.toLowerCase().includes(searchTerm) ||
            product.categoria?.toLowerCase().includes(searchTerm)
        );
        
        filteredProducts.forEach(product => {
            productsList.appendChild(this.createProductCard(product));
        });
    }
    
    showProductModal(productId = null) {
        // Implementar modal para agregar/editar producto
        alert("Modal de producto - Esta funcionalidad se implementará en la versión completa");
    }
    
    editProduct(productId) {
        // Implementar edición de producto
        alert(`Editar producto ${productId} - Esta funcionalidad se implementará en la versión completa`);
    }
    
    deleteProduct(productId) {
        if (!confirm("¿Estás seguro de eliminar este producto?")) {
            return;
        }
        
        // Implementar eliminación de producto
        alert(`Eliminar producto ${productId} - Esta funcionalidad se implementará en la versión completa`);
    }
    
    async loadSettings() {
        try {
            const settingsDoc = await window.firebaseApp.db
                .collection('settings')
                .doc('store_config')
                .get();
            
            if (settingsDoc.exists) {
                this.populateSettingsForm(settingsDoc.data());
            }
        } catch (error) {
            console.error("Error loading settings:", error);
        }
    }
    
    populateSettingsForm(settings) {
        // Implementar llenado del formulario de configuración
        // Esta funcionalidad se implementará en la versión completa
    }
}
// Función global para login
window.loginUser = async function() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorElement = document.getElementById('loginError');
    
    if (!email || !password) {
        if (errorElement) {
            errorElement.textContent = "Por favor completá email y contraseña";
            errorElement.style.display = 'block';
        }
        return;
    }
    
    try {
        await firebase.auth().signInWithEmailAndPassword(email, password);
        if (errorElement) errorElement.style.display = 'none';
    } catch (error) {
        if (errorElement) {
            errorElement.textContent = getAuthErrorMessage(error.code);
            errorElement.style.display = 'block';
        }
    }
};

// Función global para registro
window.registerUser = async function() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorElement = document.getElementById('loginError');
    
    if (!email || !password) {
        if (errorElement) {
            errorElement.textContent = "Por favor completá email y contraseña";
            errorElement.style.display = 'block';
        }
        return;
    }
    
    if (password.length < 6) {
        if (errorElement) {
            errorElement.textContent = "La contraseña debe tener al menos 6 caracteres";
            errorElement.style.display = 'block';
        }
        return;
    }
    
    try {
        await firebase.auth().createUserWithEmailAndPassword(email, password);
        if (errorElement) errorElement.style.display = 'none';
        
        alert('✅ Administrador registrado exitosamente. Ahora podés iniciar sesión.');
    } catch (error) {
        if (errorElement) {
            errorElement.textContent = getAuthErrorMessage(error.code);
            errorElement.style.display = 'block';
        }
    }
};

// Función auxiliar para mensajes de error
function getAuthErrorMessage(errorCode) {
    const messages = {
        'auth/invalid-email': 'Email inválido',
        'auth/user-disabled': 'Usuario deshabilitado',
        'auth/user-not-found': 'Usuario no encontrado',
        'auth/wrong-password': 'Contraseña incorrecta',
        'auth/email-already-in-use': 'El email ya está registrado',
        'auth/weak-password': 'La contraseña es muy débil',
        'auth/operation-not-allowed': 'Operación no permitida'
    };
    
    return messages[errorCode] || 'Error desconocido. Intentá de nuevo.';
}

// Función global para logout
window.logoutUser = function() {
    firebase.auth().signOut().then(() => {
        window.location.reload();
    });
};
// Inicializar panel admin
let adminPanel;

document.addEventListener('DOMContentLoaded', function() {
    adminPanel = new AdminPanel();
    window.adminPanel = adminPanel; // Hacer disponible globalmente
});
