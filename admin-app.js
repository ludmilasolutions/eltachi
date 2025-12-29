// Estado del panel admin
const adminState = {
    currentUser: null,
    orders: [],
    products: [],
    categories: [],
    settings: null,
    currentTab: 'dashboard'
};

// Inicializar aplicación admin
async function initAdminApp() {
    try {
        // Verificar autenticación
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                adminState.currentUser = user;
                showAdminPanel();
                await loadAllData();
                setupAdminEventListeners();
            } else {
                showLoginScreen();
            }
        });
        
        // Configurar login
        document.getElementById('loginButton').addEventListener('click', handleLogin);
        document.getElementById('passwordInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleLogin();
        });
        
    } catch (error) {
        console.error('Error inicializando admin:', error);
    }
}

// Manejar login
async function handleLogin() {
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;
    const errorElement = document.getElementById('loginError');
    
    if (!email || !password) {
        errorElement.textContent = 'Por favor completa todos los campos';
        errorElement.style.display = 'block';
        return;
    }
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
        errorElement.style.display = 'none';
    } catch (error) {
        console.error('Login error:', error);
        errorElement.textContent = 'Error al iniciar sesión. Verifica tus credenciales.';
        errorElement.style.display = 'block';
    }
}

// Mostrar panel admin
function showAdminPanel() {
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('adminContainer').style.display = 'block';
}

// Mostrar pantalla de login
function showLoginScreen() {
    document.getElementById('loginContainer').style.display = 'block';
    document.getElementById('adminContainer').style.display = 'none';
}

// Cargar todos los datos
async function loadAllData() {
    try {
        // Cargar configuración
        adminState.settings = await getSettings();
        
        // Cargar pedidos
        await loadOrders();
        
        // Cargar productos
        await loadProducts();
        
        // Cargar categorías
        await loadCategories();
        
        // Actualizar UI
        updateDashboard();
        updateOrdersTable();
        updateProductsGrid();
        updateCategoriesGrid();
        updateSettingsForm();
        
        // Actualizar estado del local
        updateStoreStatus();
        
    } catch (error) {
        console.error('Error cargando datos:', error);
    }
}

// Cargar pedidos
async function loadOrders() {
    try {
        const snapshot = await db.collection('orders')
            .orderBy('fecha', 'desc')
            .limit(100)
            .get();
        
        adminState.orders = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error cargando pedidos:', error);
    }
}

// Cargar productos
async function loadProducts() {
    try {
        const snapshot = await db.collection('products').get();
        adminState.products = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error cargando productos:', error);
    }
}

// Cargar categorías
async function loadCategories() {
    try {
        const snapshot = await db.collection('categories')
            .orderBy('orden')
            .get();
        
        adminState.categories = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error cargando categorías:', error);
    }
}

// Actualizar dashboard
function updateDashboard() {
    // Pedidos de hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayOrders = adminState.orders.filter(order => {
        const orderDate = order.fecha?.toDate();
        return orderDate >= today;
    });
    
    document.getElementById('ordersToday').textContent = todayOrders.length;
    
    // Ventas de hoy
    const todaySales = todayOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    document.getElementById('salesToday').textContent = `$${todaySales}`;
    
    // Pedidos activos
    const activeOrders = adminState.orders.filter(order => 
        order.estado === 'Recibido' || order.estado === 'En preparación'
    );
    document.getElementById('activeOrders').textContent = activeOrders.length;
    
    // Pedidos recientes
    updateRecentOrdersList();
    
    // Productos más vendidos
    updateTopProductsList();
    
    // Gráfico de pedidos por hora
    updateOrdersChart();
}

// Actualizar tabla de pedidos
function updateOrdersTable() {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    adminState.orders.forEach(order => {
        const row = document.createElement('tr');
        
        // Formatear fecha
        const fecha = order.fecha?.toDate();
        const fechaStr = fecha ? fecha.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }) : '--';
        
        // Estado con badge
        const statusBadge = `<span class="status-badge status-${order.estado?.toLowerCase().replace(' ', '')}">${order.estado}</span>`;
        
        // Tiempo estimado editable
        const timeInput = `<input type="number" 
            class="form-input" 
            style="width: 80px; padding: 4px;" 
            value="${order.tiempo_estimado_actual || adminState.settings?.tiempo_base_estimado || 30}"
            data-order-id="${order.id}"
            onchange="updateOrderTime(this)">`;
        
        // Botón WhatsApp
        const whatsappBtn = adminState.settings?.telefono_whatsapp ? 
            `<button class="action-button button-whatsapp" onclick="openWhatsApp('${order.telefono}', '${order.id}')">💬 WhatsApp</button>` : '';
        
        row.innerHTML = `
            <td>${order.id}</td>
            <td>${fechaStr}</td>
            <td>${order.nombre_cliente || '--'}</td>
            <td>$${order.total || 0}</td>
            <td>
                <select class="form-input" style="width: 140px; padding: 4px;" 
                        data-order-id="${order.id}"
                        onchange="updateOrderStatus(this)">
                    <option value="Recibido" ${order.estado === 'Recibido' ? 'selected' : ''}>Recibido</option>
                    <option value="En preparación" ${order.estado === 'En preparación' ? 'selected' : ''}>En preparación</option>
                    <option value="Listo" ${order.estado === 'Listo' ? 'selected' : ''}>Listo</option>
                    <option value="Entregado" ${order.estado === 'Entregado' ? 'selected' : ''}>Entregado</option>
                </select>
            </td>
            <td>${timeInput} min</td>
            <td>
                ${whatsappBtn}
                <button class="action-button button-edit" onclick="showOrderDetails('${order.id}')">👁️ Ver</button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Actualizar estado del pedido
async function updateOrderStatus(select) {
    const orderId = select.dataset.orderId;
    const newStatus = select.value;
    
    try {
        await db.collection('orders').doc(orderId).update({
            estado: newStatus,
            fecha_actualizacion: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Actualizar en memoria
        const orderIndex = adminState.orders.findIndex(o => o.id === orderId);
        if (orderIndex !== -1) {
            adminState.orders[orderIndex].estado = newStatus;
        }
        
        // Si cambia a "En preparación", activar campo de tiempo
        if (newStatus === 'En preparación') {
            const timeInput = select.parentElement.parentElement.querySelector('input[type="number"]');
            if (timeInput) {
                timeInput.focus();
            }
        }
        
        updateDashboard();
    } catch (error) {
        console.error('Error actualizando estado:', error);
        alert('Error al actualizar el estado');
    }
}

// Actualizar tiempo estimado del pedido
async function updateOrderTime(input) {
    const orderId = input.dataset.orderId;
    const newTime = parseInt(input.value);
    
    if (isNaN(newTime) || newTime < 1) {
        alert('Tiempo inválido');
        return;
    }
    
    try {
        await db.collection('orders').doc(orderId).update({
            tiempo_estimado_actual: newTime
        });
        
        // Actualizar en memoria
        const orderIndex = adminState.orders.findIndex(o => o.id === orderId);
        if (orderIndex !== -1) {
            adminState.orders[orderIndex].tiempo_estimado_actual = newTime;
        }
    } catch (error) {
        console.error('Error actualizando tiempo:', error);
        alert('Error al actualizar el tiempo');
    }
}

// Mostrar detalles del pedido
async function showOrderDetails(orderId) {
    const order = adminState.orders.find(o => o.id === orderId);
    if (!order) return;
    
    document.getElementById('modalOrderId').textContent = `Pedido: ${orderId}`;
    
    const fecha = order.fecha?.toDate();
    const fechaStr = fecha ? fecha.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }) : '--';
    
    let details = `
        <p><strong>Fecha:</strong> ${fechaStr}</p>
        <p><strong>Cliente:</strong> ${order.nombre_cliente || '--'}</p>
        <p><strong>Teléfono:</strong> ${order.telefono || '--'}</p>
        <p><strong>Tipo:</strong> ${order.tipo_pedido || '--'}</p>
        
        ${order.direccion ? `<p><strong>Dirección:</strong> ${order.direccion}</p>` : ''}
        
        <p><strong>Estado:</strong> ${order.estado}</p>
        <p><strong>Tiempo estimado:</strong> ${order.tiempo_estimado_actual || '--'} minutos</p>
        
        <hr style="margin: 20px 0;">
        
        <h4>Detalle del Pedido:</h4>
        <pre style="white-space: pre-wrap; background: #f3f4f6; padding: 15px; border-radius: 8px;">${order.pedido_detallado || '--'}</pre>
        
        <hr style="margin: 20px 0;">
        
        <p><strong>Total:</strong> $${order.total || 0}</p>
    `;
    
    document.getElementById('modalOrderDetails').innerHTML = details;
    document.getElementById('orderModal').style.display = 'flex';
}

// Abrir WhatsApp
function openWhatsApp(phone, orderId) {
    if (!phone) {
        alert('No hay número de teléfono para este pedido');
        return;
    }
    
    const message = `Hola! Soy de EL TACHI. Tu pedido ${orderId} está en camino. ¿Todo bien?`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
}

// Actualizar grid de productos
function updateProductsGrid() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    adminState.products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'card';
        
        card.innerHTML = `
            <h3 class="card-title">${product.nombre}</h3>
            <p style="color: var(--gris); margin-bottom: 12px;">${product.descripcion || ''}</p>
            <p class="card-value">$${product.precio}</p>
            <p style="margin-bottom: 16px;">
                <span class="status-badge ${product.disponible ? 'status-listo' : 'status-entregado'}">
                    ${product.disponible ? 'Disponible' : 'No disponible'}
                </span>
            </p>
            <div style="display: flex; gap: 8px;">
                <button class="action-button button-edit" onclick="editProduct('${product.id}')">✏️ Editar</button>
                <button class="action-button button-delete" onclick="deleteProduct('${product.id}')">🗑️ Eliminar</button>
            </div>
        `;
        
        grid.appendChild(card);
    });
}

// Editar producto
async function editProduct(productId) {
    const product = adminState.products.find(p => p.id === productId);
    if (!product) return;
    
    // Mostrar formulario
    document.getElementById('productForm').style.display = 'block';
    document.getElementById('productFormTitle').textContent = 'Editar Producto';
    
    // Llenar formulario
    document.getElementById('productName').value = product.nombre;
    document.getElementById('productDescription').value = product.descripcion || '';
    document.getElementById('productPrice').value = product.precio;
    document.getElementById('productAvailable').checked = product.disponible;
    document.getElementById('productAderezos').value = product.aderezos_disponibles?.join(', ') || '';
    document.getElementById('productAderezosPrices').value = JSON.stringify(product.precios_extra_aderezos || {}, null, 2);
    
    // Llenar categorías
    const categorySelect = document.getElementById('productCategory');
    categorySelect.innerHTML = '<option value="">Seleccionar categoría...</option>';
    
    adminState.categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.nombre;
        option.selected = cat.id === product.categoria;
        categorySelect.appendChild(option);
    });
    
    // Configurar botón guardar
    const saveButton = document.getElementById('saveProductButton');
    saveButton.onclick = async () => {
        await saveProduct(productId);
    };
    
    // Scroll al formulario
    document.getElementById('productForm').scrollIntoView({ behavior: 'smooth' });
}

// Guardar producto
async function saveProduct(productId = null) {
    const isNew = !productId;
    
    const productData = {
        nombre: document.getElementById('productName').value.trim(),
        descripcion: document.getElementById('productDescription').value.trim(),
        precio: parseFloat(document.getElementById('productPrice').value),
        categoria: document.getElementById('productCategory').value,
        disponible: document.getElementById('productAvailable').checked,
        aderezos_disponibles: document.getElementById('productAderezos').value
            .split(',')
            .map(a => a.trim())
            .filter(a => a),
        precios_extra_aderezos: JSON.parse(document.getElementById('productAderezosPrices').value || '{}')
    };
    
    // Validaciones
    if (!productData.nombre) {
        alert('El nombre es requerido');
        return;
    }
    
    if (isNaN(productData.precio) || productData.precio < 0) {
        alert('Precio inválido');
        return;
    }
    
    try {
        if (isNew) {
            // Generar ID
            const newId = productData.nombre.toLowerCase()
                .replace(/[^a-z0-9]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
            
            productData.id = newId;
            await db.collection('products').doc(newId).set(productData);
        } else {
            await db.collection('products').doc(productId).update(productData);
        }
        
        // Recargar productos
        await loadProducts();
        updateProductsGrid();
        
        // Ocultar formulario
        document.getElementById('productForm').style.display = 'none';
        document.getElementById('productForm').reset();
        
        alert(`Producto ${isNew ? 'agregado' : 'actualizado'} correctamente`);
        
    } catch (error) {
        console.error('Error guardando producto:', error);
        alert('Error al guardar el producto');
    }
}

// Eliminar producto
async function deleteProduct(productId) {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;
    
    try {
        await db.collection('products').doc(productId).delete();
        
        // Recargar productos
        await loadProducts();
        updateProductsGrid();
        
        alert('Producto eliminado correctamente');
    } catch (error) {
        console.error('Error eliminando producto:', error);
        alert('Error al eliminar el producto');
    }
}

// Actualizar grid de categorías
function updateCategoriesGrid() {
    const grid = document.getElementById('categoriesGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    adminState.categories.forEach(category => {
        // Contar productos en esta categoría
        const productCount = adminState.products.filter(p => p.categoria === category.id).length;
        
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <h3 class="card-title">${category.nombre}</h3>
            <p class="card-subtitle">${productCount} productos</p>
            <p class="card-subtitle">Orden: ${category.orden}</p>
            <div style="margin-top: 16px; display: flex; gap: 8px;">
                <button class="action-button button-edit" onclick="editCategory('${category.id}')">✏️ Editar</button>
                <button class="action-button button-delete" onclick="deleteCategory('${category.id}')">🗑️ Eliminar</button>
            </div>
        `;
        
        grid.appendChild(card);
    });
}

// Función para editar categoría
function editCategory(categoryId) {
    const category = adminState.categories.find(c => c.id === categoryId);
    if (!category) return;
    
    // Rellenar formulario
    document.getElementById('categoryName').value = category.nombre;
    document.getElementById('categoryOrder').value = category.orden;
    
    // Cambiar título y botón
    document.getElementById('categoryFormTitle').textContent = 'Editar Categoría';
    document.getElementById('addCategoryButton').textContent = 'Actualizar Categoría';
    document.getElementById('cancelEditButton').style.display = 'inline-block';
    
    // Guardar el ID de la categoría que se está editando en el botón
    const addButton = document.getElementById('addCategoryButton');
    addButton.dataset.editingId = categoryId;
    
    // Hacer scroll al formulario
    document.getElementById('categoryName').focus();
}

// Función para eliminar categoría
async function deleteCategory(categoryId) {
    if (!confirm('¿Estás seguro de eliminar esta categoría?\n\nLos productos que pertenezcan a esta categoría quedarán sin categoría.')) {
        return;
    }
    
    try {
        await db.collection('categories').doc(categoryId).delete();
        
        // Recargar categorías
        await loadCategories();
        updateCategoriesGrid();
        
        alert('Categoría eliminada correctamente');
    } catch (error) {
        console.error('Error eliminando categoría:', error);
        alert('Error al eliminar la categoría');
    }
}

// Función para agregar o actualizar categoría
async function addCategory() {
    const name = document.getElementById('categoryName').value.trim();
    const order = parseInt(document.getElementById('categoryOrder').value);
    const addButton = document.getElementById('addCategoryButton');
    const isEditing = addButton.dataset.editingId;
    
    if (!name) {
        alert('El nombre es requerido');
        return;
    }
    
    if (isNaN(order) || order < 1) {
        alert('Orden inválido');
        return;
    }
    
    try {
        if (isEditing) {
            // Actualizar categoría existente
            await db.collection('categories').doc(isEditing).update({
                nombre: name,
                orden: order
            });
            
            // Restaurar formulario
            cancelEditCategory();
            
            alert('Categoría actualizada correctamente');
        } else {
            // Crear nueva categoría
            const id = name.toLowerCase()
                .replace(/[^a-z0-9]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
            
            await db.collection('categories').doc(id).set({
                id,
                nombre: name,
                orden: order
            });
            
            // Limpiar formulario
            document.getElementById('categoryName').value = '';
            document.getElementById('categoryOrder').value = adminState.categories.length + 1;
            
            alert('Categoría agregada correctamente');
        }
        
        // Recargar categorías
        await loadCategories();
        updateCategoriesGrid();
        
    } catch (error) {
        console.error('Error guardando categoría:', error);
        alert('Error al guardar la categoría');
    }
}

// Función para cancelar la edición de categoría
function cancelEditCategory() {
    // Restaurar formulario
    document.getElementById('categoryFormTitle').textContent = 'Agregar Nueva Categoría';
    document.getElementById('addCategoryButton').textContent = 'Agregar Categoría';
    document.getElementById('cancelEditButton').style.display = 'none';
    
    // Limpiar campos
    document.getElementById('categoryName').value = '';
    document.getElementById('categoryOrder').value = adminState.categories.length + 1;
    
    // Eliminar el dataset de edición
    const addButton = document.getElementById('addCategoryButton');
    if (addButton.dataset.editingId) {
        delete addButton.dataset.editingId;
    }
}

// Actualizar formulario de configuración
function updateSettingsForm() {
    if (!adminState.settings) return;
    
    const settings = adminState.settings;
    
    // Información básica
    document.getElementById('storeName').value = settings.nombre_local || '';
    document.getElementById('whatsappPhone').value = settings.telefono_whatsapp || '';
    document.getElementById('geminiApiKey').value = settings.api_key_gemini || '';
    
    // Horarios
    const hoursContainer = document.getElementById('hoursContainer');
    hoursContainer.innerHTML = '';
    
    const days = [
        { key: 'lunes', label: 'Lunes' },
        { key: 'martes', label: 'Martes' },
        { key: 'miércoles', label: 'Miércoles' },
        { key: 'jueves', label: 'Jueves' },
        { key: 'viernes', label: 'Viernes' },
        { key: 'sábado', label: 'Sábado' },
        { key: 'domingo', label: 'Domingo' }
    ];
    
    days.forEach(day => {
        const div = document.createElement('div');
        div.className = 'form-group';
        div.innerHTML = `
            <label class="form-label">${day.label}</label>
            <input type="text" class="form-input" 
                   id="hours_${day.key}" 
                   value="${settings.horarios_por_dia?.[day.key] || '11:00 - 23:00'}"
                   placeholder="Ej: 11:00 - 23:00 o Cerrado">
        `;
        hoursContainer.appendChild(div);
    });
    
    // Mensaje cerrado
    document.getElementById('closedMessage').value = settings.mensaje_cerrado || '';
    
    // Envíos y retiro
    document.getElementById('deliveryPrice').value = settings.precio_envio || 0;
    document.getElementById('baseDeliveryTime').value = settings.tiempo_base_estimado || 30;
    document.getElementById('retiroEnabled').checked = settings.retiro_habilitado || false;
    
    // Colores
    document.getElementById('colorPrimary').value = settings.colores_marca?.azul || '#1e40af';
    document.getElementById('colorSecondary').value = settings.colores_marca?.amarillo || '#f59e0b';
}

// Guardar configuración
async function saveSettings() {
    const settingsData = {
        nombre_local: document.getElementById('storeName').value.trim(),
        telefono_whatsapp: document.getElementById('whatsappPhone').value.trim(),
        api_key_gemini: document.getElementById('geminiApiKey').value.trim(),
        horarios_por_dia: {},
        mensaje_cerrado: document.getElementById('closedMessage').value.trim(),
        precio_envio: parseInt(document.getElementById('deliveryPrice').value) || 0,
        tiempo_base_estimado: parseInt(document.getElementById('baseDeliveryTime').value) || 30,
        retiro_habilitado: document.getElementById('retiroEnabled').checked,
        colores_marca: {
            azul: document.getElementById('colorPrimary').value,
            amarillo: document.getElementById('colorSecondary').value
        }
    };
    
    // Recoger horarios
    const days = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
    days.forEach(day => {
        const input = document.getElementById(`hours_${day}`);
        if (input) {
            settingsData.horarios_por_dia[day] = input.value.trim();
        }
    });
    
    try {
        await db.collection('settings').doc('config').update(settingsData);
        
        // Actualizar en memoria
        adminState.settings = { ...adminState.settings, ...settingsData };
        
        // Actualizar estado del local
        updateStoreStatus();
        
        alert('Configuración guardada correctamente');
        
    } catch (error) {
        console.error('Error guardando configuración:', error);
        alert('Error al guardar la configuración');
    }
}

// Actualizar estado del local
function updateStoreStatus() {
    if (!adminState.settings) return;
    
    const statusElement = document.getElementById('storeStatus');
    const statusValueElement = document.getElementById('storeStatusValue');
    const toggle = document.getElementById('storeToggle');
    const toggleLabel = document.getElementById('storeToggleLabel');
    
    if (adminState.settings.abierto) {
        statusElement.textContent = '📍 Local ABIERTO';
        statusElement.style.color = '#10b981';
        statusValueElement.textContent = 'ABIERTO';
        statusValueElement.style.color = '#10b981';
        toggle.checked = true;
        toggleLabel.textContent = 'Abierto';
    } else {
        statusElement.textContent = '📍 Local CERRADO';
        statusElement.style.color = '#ef4444';
        statusValueElement.textContent = 'CERRADO';
        statusValueElement.style.color = '#ef4444';
        toggle.checked = false;
        toggleLabel.textContent = 'Cerrado';
    }
}

// Cambiar estado del local
async function toggleStoreStatus(checkbox) {
    const isOpen = checkbox.checked;
    
    try {
        await db.collection('settings').doc('config').update({
            abierto: isOpen
        });
        
        // Actualizar en memoria
        adminState.settings.abierto = isOpen;
        
        // Actualizar UI
        updateStoreStatus();
        
        alert(`Local ${isOpen ? 'abierto' : 'cerrado'} correctamente`);
        
    } catch (error) {
        console.error('Error cambiando estado:', error);
        alert('Error al cambiar el estado');
        checkbox.checked = !isOpen; // Revertir visualmente
    }
}

// Configurar event listeners del admin
function setupAdminEventListeners() {
    // Logout
    document.getElementById('logoutButton').addEventListener('click', () => {
        auth.signOut();
    });
    
    // Navegación por tabs
    document.querySelectorAll('.nav-button').forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.dataset.tab;
            
            // Actualizar botones activos
            document.querySelectorAll('.nav-button').forEach(btn => {
                btn.classList.remove('active');
            });
            button.classList.add('active');
            
            // Mostrar contenido del tab
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`${tab}Tab`).classList.add('active');
            
            adminState.currentTab = tab;
        });
    });
    
    // Productos
    document.getElementById('addProductButton').addEventListener('click', () => {
        document.getElementById('productForm').style.display = 'block';
        document.getElementById('productFormTitle').textContent = 'Nuevo Producto';
        document.getElementById('productForm').reset();
        
        // Llenar categorías
        const categorySelect = document.getElementById('productCategory');
        categorySelect.innerHTML = '<option value="">Seleccionar categoría...</option>';
        adminState.categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.nombre;
            categorySelect.appendChild(option);
        });
        
        // Configurar botón guardar
        const saveButton = document.getElementById('saveProductButton');
        saveButton.onclick = async () => {
            await saveProduct();
        };
    });
    
    document.getElementById('cancelProductButton').addEventListener('click', () => {
        document.getElementById('productForm').style.display = 'none';
    });
    
    // Categorías
    document.getElementById('addCategoryButton').addEventListener('click', addCategory);
    document.getElementById('cancelEditButton').addEventListener('click', cancelEditCategory);
    
    // Configuración
    document.getElementById('storeToggle').addEventListener('change', function() {
        toggleStoreStatus(this);
    });
    
    document.getElementById('saveSettingsButton').addEventListener('click', saveSettings);
    
    // Reportes
    document.getElementById('reportPeriod').addEventListener('change', function() {
        const customRange = document.getElementById('customDateRange');
        customRange.style.display = this.value === 'custom' ? 'block' : 'none';
    });
    
    // Modal
    document.getElementById('closeModalButton').addEventListener('click', () => {
        document.getElementById('orderModal').style.display = 'none';
    });
    
    // Cerrar modal al hacer clic fuera
    document.getElementById('orderModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('orderModal')) {
            document.getElementById('orderModal').style.display = 'none';
        }
    });
}

// Funciones auxiliares para el dashboard
function updateRecentOrdersList() {
    const container = document.getElementById('recentOrdersList');
    if (!container) return;
    
    const recentOrders = adminState.orders.slice(0, 5);
    
    let html = '';
    recentOrders.forEach(order => {
        const fecha = order.fecha?.toDate();
        const timeStr = fecha ? fecha.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        }) : '--';
        
        html += `
            <div style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                <div style="display: flex; justify-content: space-between;">
                    <strong>${order.id}</strong>
                    <span class="status-badge status-${order.estado?.toLowerCase().replace(' ', '')}">
                        ${order.estado}
                    </span>
                </div>
                <div style="color: var(--gris); font-size: 14px;">
                    ${order.nombre_cliente || '--'} • ${timeStr} • $${order.total || 0}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html || '<p>No hay pedidos recientes</p>';
}

function updateTopProductsList() {
    const container = document.getElementById('topProductsList');
    if (!container) return;
    
    // Simular productos más vendidos (en un sistema real, contarías de los pedidos)
    const topProducts = adminState.products.slice(0, 5);
    
    let html = '';
    topProducts.forEach(product => {
        html += `
            <div style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                <div style="display: flex; justify-content: space-between;">
                    <strong>${product.nombre}</strong>
                    <span>$${product.precio}</span>
                </div>
                <div style="color: var(--gris); font-size: 14px;">
                    ${product.disponible ? '✅ Disponible' : '❌ No disponible'}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html || '<p>No hay productos</p>';
}

function updateOrdersChart() {
    const ctx = document.getElementById('ordersChart');
    if (!ctx) return;
    
    // Datos de ejemplo por hora
    const data = {
        labels: ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'],
        datasets: [{
            label: 'Pedidos por hora',
            data: [2, 5, 8, 12, 15, 18, 20, 22, 25, 20, 15, 10],
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
            borderColor: '#3b82f6',
            borderWidth: 2,
            tension: 0.4
        }]
    };
    
    new Chart(ctx, {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 5
                    }
                }
            }
        }
    });
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initAdminApp);

// Exportar funciones globales
window.updateOrderStatus = updateOrderStatus;
window.updateOrderTime = updateOrderTime;
window.showOrderDetails = showOrderDetails;
window.openWhatsApp = openWhatsApp;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.toggleStoreStatus = toggleStoreStatus;
