// Panel Admin - EL TACHI
// Sistema de administración para pedidos gastronómicos

// Estado global del panel admin
const adminState = {
    currentUser: null,
    orders: [],
    filteredOrders: [],
    products: [],
    categories: [],
    settings: null,
    currentTab: 'dashboard',
    currentFilter: 'todos',
    stats: {
        todayOrders: 0,
        todaySales: 0,
        activeOrders: 0
    }
};

// Inicializar aplicación admin
async function initAdminApp() {
    try {
        console.log('🚀 Inicializando Panel Admin...');
        
        // Verificar autenticación
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                adminState.currentUser = user;
                showAdminPanel();
                await loadAllData();
                setupAdminEventListeners();
                startRealtimeUpdates();
            } else {
                showLoginScreen();
            }
        });
        
        // Configurar login
        setupLoginEvents();
        
        console.log('✅ Panel Admin inicializado');
        
    } catch (error) {
        console.error('❌ Error inicializando admin:', error);
        showError('Error inicializando el sistema');
    }
}

// Configurar eventos de login
function setupLoginEvents() {
    const loginButton = document.getElementById('loginButton');
    const passwordInput = document.getElementById('passwordInput');
    
    if (loginButton) {
        loginButton.addEventListener('click', handleLogin);
    }
    
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleLogin();
        });
    }
}

// Manejar login
async function handleLogin() {
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;
    const errorElement = document.getElementById('loginError');
    
    if (!email || !password) {
        showError('Por favor completa todos los campos', errorElement);
        return;
    }
    
    try {
        showLoading(true);
        await auth.signInWithEmailAndPassword(email, password);
        hideError(errorElement);
    } catch (error) {
        console.error('Login error:', error);
        showError('Error al iniciar sesión. Verifica tus credenciales.', errorElement);
    } finally {
        showLoading(false);
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
        showLoading(true);
        
        // Cargar configuración
        adminState.settings = await getSettings();
        if (!adminState.settings) {
            await initializeDefaultSettings();
            adminState.settings = await getSettings();
        }
        
        // Cargar pedidos
        await loadOrders();
        
        // Cargar productos
        await loadProducts();
        
        // Cargar categorías
        await loadCategories();
        
        // Aplicar filtro inicial
        applyOrderFilter('hoy');
        
        // Actualizar UI
        updateDashboard();
        updateOrdersTable();
        updateProductsGrid();
        updateCategoriesGrid();
        updateSettingsForm();
        updateStoreStatus();
        
        console.log('✅ Datos cargados correctamente');
        
    } catch (error) {
        console.error('Error cargando datos:', error);
        showError('Error cargando datos del sistema');
    } finally {
        showLoading(false);
    }
}

// Obtener configuración
async function getSettings() {
    try {
        const settingsRef = db.collection('settings').doc('config');
        const doc = await settingsRef.get();
        return doc.exists ? doc.data() : null;
    } catch (error) {
        console.error("Error obteniendo configuración:", error);
        return null;
    }
}

// Inicializar configuración por defecto
async function initializeDefaultSettings() {
    try {
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
            api_key_gemini: "",
            mantener_historial_dias: 30 // Nueva configuración: días a mantener historial
        };
        
        await db.collection('settings').doc('config').set(defaultSettings);
        console.log('✅ Configuración por defecto creada');
        return true;
        
    } catch (error) {
        console.error('Error inicializando configuración:', error);
        return false;
    }
}

// Cargar pedidos
async function loadOrders() {
    try {
        const snapshot = await db.collection('orders')
            .orderBy('fecha', 'desc')
            .limit(500)
            .get();
        
        adminState.orders = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        console.log(`📦 ${adminState.orders.length} pedidos cargados`);
        return adminState.orders;
        
    } catch (error) {
        console.error('Error cargando pedidos:', error);
        return [];
    }
}

// Aplicar filtro a pedidos
function applyOrderFilter(filterType) {
    const now = new Date();
    adminState.currentFilter = filterType;
    
    switch(filterType) {
        case 'hoy':
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            adminState.filteredOrders = adminState.orders.filter(order => {
                if (!order.fecha) return false;
                const orderDate = order.fecha.toDate ? order.fecha.toDate() : new Date(order.fecha);
                return orderDate >= today;
            });
            break;
            
        case 'ayer':
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);
            const endOfYesterday = new Date(yesterday);
            endOfYesterday.setHours(23, 59, 59, 999);
            adminState.filteredOrders = adminState.orders.filter(order => {
                if (!order.fecha) return false;
                const orderDate = order.fecha.toDate ? order.fecha.toDate() : new Date(order.fecha);
                return orderDate >= yesterday && orderDate <= endOfYesterday;
            });
            break;
            
        case 'semana':
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            weekAgo.setHours(0, 0, 0, 0);
            adminState.filteredOrders = adminState.orders.filter(order => {
                if (!order.fecha) return false;
                const orderDate = order.fecha.toDate ? order.fecha.toDate() : new Date(order.fecha);
                return orderDate >= weekAgo;
            });
            break;
            
        case 'mes':
            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            monthAgo.setHours(0, 0, 0, 0);
            adminState.filteredOrders = adminState.orders.filter(order => {
                if (!order.fecha) return false;
                const orderDate = order.fecha.toDate ? order.fecha.toDate() : new Date(order.fecha);
                return orderDate >= monthAgo;
            });
            break;
            
        case 'pendientes':
            adminState.filteredOrders = adminState.orders.filter(order => 
                order.estado === 'Recibido' || order.estado === 'En preparación'
            );
            break;
            
        case 'completados':
            adminState.filteredOrders = adminState.orders.filter(order => 
                order.estado === 'Entregado'
            );
            break;
            
        case 'todos':
        default:
            adminState.filteredOrders = [...adminState.orders];
            break;
    }
    
    // Actualizar contador del filtro
    updateFilterCounter();
    
    // Actualizar tabla
    updateOrdersTable();
}

// Actualizar contador del filtro
function updateFilterCounter() {
    const filterCounter = document.getElementById('filterCounter');
    if (filterCounter) {
        filterCounter.textContent = `${adminState.filteredOrders.length} pedidos`;
    }
}

// Limpiar historial de pedidos
async function clearOrderHistory() {
    if (!confirm(`⚠️ ¿ESTÁS SEGURO DE LIMPIAR EL HISTORIAL DE PEDIDOS?\n\nEsta acción eliminará permanentemente todos los pedidos excepto:\n• Pedidos de hoy\n• Pedidos con estado "Recibido" o "En preparación"\n\nNo se puede deshacer.`)) {
        return;
    }
    
    try {
        showLoading(true);
        
        // Calcular fecha límite (hoy a las 00:00)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Filtrar pedidos a eliminar
        const ordersToDelete = adminState.orders.filter(order => {
            if (!order.fecha) return true;
            
            const orderDate = order.fecha.toDate ? order.fecha.toDate() : new Date(order.fecha);
            const isOld = orderDate < today;
            const isCompleted = order.estado === 'Entregado' || order.estado === 'Cancelado' || order.estado === 'Listo';
            
            return isOld && isCompleted;
        });
        
        if (ordersToDelete.length === 0) {
            showNotification('No hay pedidos antiguos para eliminar', 'info');
            return;
        }
        
        if (!confirm(`Se eliminarán ${ordersToDelete.length} pedidos antiguos.\n\n¿Continuar?`)) {
            return;
        }
        
        // Eliminar pedidos en lotes
        const batch = db.batch();
        let deletedCount = 0;
        
        for (const order of ordersToDelete) {
            const orderRef = db.collection('orders').doc(order.id);
            batch.delete(orderRef);
            deletedCount++;
            
            // Firestore limita los lotes a 500 operaciones
            if (deletedCount % 400 === 0) {
                await batch.commit();
                console.log(`✅ Eliminados ${deletedCount} pedidos...`);
            }
        }
        
        // Commit del último lote
        if (deletedCount % 400 !== 0) {
            await batch.commit();
        }
        
        // Recargar pedidos
        await loadOrders();
        
        // Aplicar filtro actual nuevamente
        applyOrderFilter(adminState.currentFilter);
        
        // Actualizar dashboard
        updateDashboard();
        
        showNotification(`✅ Historial limpiado: ${deletedCount} pedidos eliminados`, 'success');
        
    } catch (error) {
        console.error('Error limpiando historial:', error);
        showNotification('Error al limpiar el historial', 'error');
    } finally {
        showLoading(false);
    }
}

// Limpiar TODOS los pedidos (función peligrosa - solo para emergencias)
async function clearAllOrders() {
    if (!confirm(`🚨🚨🚨 PELIGRO: OPERACIÓN IRREVERSIBLE\n\n¿Estás ABSOLUTAMENTE seguro de eliminar TODOS los pedidos?\n\nEsta acción NO se puede deshacer y eliminará:\n• Todos los pedidos históricos\n• Pedidos en preparación\n• Pedidos pendientes\n\nESCRIBE "ELIMINAR TODO" para confirmar:`)) {
        return;
    }
    
    const confirmation = prompt('Escribe "ELIMINAR TODO" para confirmar:');
    if (confirmation !== 'ELIMINAR TODO') {
        showNotification('Operación cancelada', 'info');
        return;
    }
    
    try {
        showLoading(true);
        
        // Obtener todos los pedidos
        const snapshot = await db.collection('orders').get();
        const totalOrders = snapshot.size;
        
        if (totalOrders === 0) {
            showNotification('No hay pedidos para eliminar', 'info');
            return;
        }
        
        if (!confirm(`⚠️ ÚLTIMA CONFIRMACIÓN\n\nSe eliminarán TODOS los ${totalOrders} pedidos permanentemente.\n\n¿Continuar?`)) {
            return;
        }
        
        // Eliminar en lotes
        const batch = db.batch();
        let deletedCount = 0;
        
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
            deletedCount++;
            
            // Firestore limita los lotes a 500 operaciones
            if (deletedCount % 400 === 0) {
                batch.commit();
                console.log(`✅ Eliminados ${deletedCount} pedidos...`);
            }
        });
        
        // Commit del último lote
        if (deletedCount % 400 !== 0) {
            await batch.commit();
        }
        
        // Recargar pedidos
        await loadOrders();
        applyOrderFilter('todos');
        updateDashboard();
        
        showNotification(`✅ TODOS los pedidos eliminados (${deletedCount})`, 'success');
        
    } catch (error) {
        console.error('Error eliminando todos los pedidos:', error);
        showNotification('Error al eliminar los pedidos', 'error');
    } finally {
        showLoading(false);
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
        
        console.log(`🍔 ${adminState.products.length} productos cargados`);
        return adminState.products;
        
    } catch (error) {
        console.error('Error cargando productos:', error);
        return [];
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
        
        console.log(`🗂️ ${adminState.categories.length} categorías cargadas`);
        return adminState.categories;
        
    } catch (error) {
        console.error('Error cargando categorías:', error);
        return [];
    }
}

// Actualizar dashboard
function updateDashboard() {
    // Calcular estadísticas del día
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayOrders = adminState.orders.filter(order => {
        if (!order.fecha) return false;
        const orderDate = order.fecha.toDate ? order.fecha.toDate() : new Date(order.fecha);
        return orderDate >= today;
    });
    
    adminState.stats.todayOrders = todayOrders.length;
    adminState.stats.todaySales = todayOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    adminState.stats.activeOrders = adminState.orders.filter(order => 
        order.estado === 'Recibido' || order.estado === 'En preparación'
    ).length;
    
    // Actualizar UI
    document.getElementById('ordersToday').textContent = adminState.stats.todayOrders;
    document.getElementById('salesToday').textContent = `$${adminState.stats.todaySales}`;
    document.getElementById('activeOrders').textContent = adminState.stats.activeOrders;
    
    // Actualizar listas
    updateRecentOrdersList();
    updateTopProductsList();
    
    // Actualizar gráficos
    updateOrdersChart();
}

// Actualizar lista de pedidos recientes
function updateRecentOrdersList() {
    const container = document.getElementById('recentOrdersList');
    if (!container) return;
    
    const recentOrders = adminState.orders.slice(0, 5);
    
    if (recentOrders.length === 0) {
        container.innerHTML = '<p>No hay pedidos recientes</p>';
        return;
    }
    
    let html = '';
    recentOrders.forEach(order => {
        const fecha = order.fecha?.toDate ? order.fecha.toDate() : new Date(order.fecha);
        const timeStr = fecha ? fecha.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        }) : '--';
        
        html += `
            <div style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="font-size: 0.9rem;">${order.id_pedido || order.id}</strong>
                        <div style="font-size: 0.8rem; color: #6b7280; margin-top: 2px;">
                            ${order.nombre_cliente || 'Sin nombre'} • ${timeStr}
                        </div>
                    </div>
                    <div>
                        <span class="status-badge status-${getStatusClass(order.estado)}" style="font-size: 0.7rem;">
                            ${order.estado || 'Recibido'}
                        </span>
                    </div>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 4px;">
                    <span style="font-size: 0.85rem;">${order.items?.length || 0} items</span>
                    <strong style="color: #1e40af;">$${order.total || 0}</strong>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Actualizar lista de productos más vendidos
function updateTopProductsList() {
    const container = document.getElementById('topProductsList');
    if (!container) return;
    
    // Contar productos vendidos
    const productCount = {};
    adminState.orders.forEach(order => {
        if (order.items) {
            order.items.forEach(item => {
                const productId = item.id;
                if (!productCount[productId]) {
                    productCount[productId] = 0;
                }
                productCount[productId] += item.cantidad || 1;
            });
        }
    });
    
    // Obtener top 5
    const topProducts = Object.entries(productCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([productId, count]) => {
            const product = adminState.products.find(p => p.id === productId);
            return {
                name: product?.nombre || productId,
                count: count,
                price: product?.precio || 0
            };
        });
    
    if (topProducts.length === 0) {
        container.innerHTML = '<p>No hay datos de ventas</p>';
        return;
    }
    
    let html = '';
    topProducts.forEach(product => {
        html += `
            <div style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                <div style="display: flex; justify-content: space-between;">
                    <strong style="font-size: 0.9rem;">${product.name}</strong>
                    <span style="font-weight: 600;">${product.count} vendidos</span>
                </div>
                <div style="font-size: 0.8rem; color: #6b7280;">
                    $${product.price} cada uno
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Actualizar gráfico de pedidos
function updateOrdersChart() {
    const ctx = document.getElementById('ordersChart');
    if (!ctx) return;
    
    // Destruir gráfico anterior si existe
    if (window.ordersChartInstance) {
        window.ordersChartInstance.destroy();
    }
    
    // Agrupar pedidos por hora del día actual
    const today = new Date();
    const labels = Array.from({length: 12}, (_, i) => {
        const hour = 10 + i;
        return `${hour}:00`;
    });
    
    const ordersByHour = Array(12).fill(0);
    
    adminState.orders.forEach(order => {
        if (!order.fecha) return;
        
        const orderDate = order.fecha.toDate ? order.fecha.toDate() : new Date(order.fecha);
        if (orderDate.getDate() === today.getDate() && 
            orderDate.getMonth() === today.getMonth() && 
            orderDate.getFullYear() === today.getFullYear()) {
            
            const hour = orderDate.getHours();
            if (hour >= 10 && hour <= 21) {
                ordersByHour[hour - 10]++;
            }
        }
    });
    
    window.ordersChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Pedidos por hora',
                data: ordersByHour,
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderColor: '#3b82f6',
                borderWidth: 2,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Función para ordenar pedidos por prioridad
function sortOrdersByPriority(orders) {
    const priorityOrder = {
        'En preparación': 1,
        'Recibido': 2,
        'Listo': 3,
        'Entregado': 4,
        'Cancelado': 5
    };
    
    return orders.sort((a, b) => {
        const priorityA = priorityOrder[a.estado] || 6;
        const priorityB = priorityOrder[b.estado] || 6;
        
        if (priorityA !== priorityB) {
            return priorityA - priorityB;
        }
        
        // Si misma prioridad, ordenar por fecha (más reciente primero)
        const dateA = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha);
        const dateB = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha);
        return dateB - dateA;
    });
}

// Actualizar tabla de pedidos (MEJORADA)
function updateOrdersTable() {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;
    
    if (adminState.filteredOrders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px;">
                    <div style="color: #6b7280;">
                        <i class="fas fa-shopping-cart" style="font-size: 2rem; margin-bottom: 10px; opacity: 0.5;"></i>
                        <p>No hay pedidos para mostrar</p>
                        <p style="font-size: 0.9rem; margin-top: 5px;">
                            Filtro: ${getFilterName(adminState.currentFilter)}
                        </p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Ordenar pedidos por prioridad
    const sortedOrders = sortOrdersByPriority([...adminState.filteredOrders]);
    
    tbody.innerHTML = '';
    
    sortedOrders.forEach(order => {
        const row = document.createElement('tr');
        
        // Formatear fecha
        const fecha = order.fecha?.toDate ? order.fecha.toDate() : new Date(order.fecha);
        const fechaStr = fecha ? fecha.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }) : '--';
        
        // Estado con colores mejorados
        const statusOptions = ['Recibido', 'En preparación', 'Listo', 'Entregado', 'Cancelado'];
        const statusColors = {
            'Recibido': '#3b82f6',
            'En preparación': '#f59e0b',
            'Listo': '#10b981',
            'Entregado': '#6b7280',
            'Cancelado': '#ef4444'
        };
        
        const statusSelect = `
            <select class="status-select" 
                    data-order-id="${order.id}"
                    onchange="updateOrderStatus(this)"
                    style="background-color: ${statusColors[order.estado] || '#6b7280'}; 
                           color: white; 
                           border: none; 
                           padding: 6px 12px; 
                           border-radius: 20px; 
                           font-weight: 600;
                           cursor: pointer;
                           min-width: 140px;">
                ${statusOptions.map(status => 
                    `<option value="${status}" ${order.estado === status ? 'selected' : ''}>
                        ${status}
                    </option>`
                ).join('')}
            </select>
        `;
        
        // Tiempo estimado con indicador visual
        const timeInput = `
            <div style="display: flex; align-items: center; gap: 5px;">
                <input type="number" 
                    class="time-input" 
                    style="width: 50px; padding: 4px 6px; border: 1px solid #e5e7eb; border-radius: 6px; text-align: center;" 
                    value="${order.tiempo_estimado_actual || adminState.settings?.tiempo_base_estimado || 30}"
                    data-order-id="${order.id}"
                    onchange="updateOrderTime(this)"
                    min="1"
                    max="180">
                <span style="font-size: 0.8rem;">min</span>
            </div>
        `;
        
        // Información del cliente compacta
        const customerInfo = `
            <div style="max-width: 150px;">
                <div style="font-weight: 600; font-size: 0.9rem;">${order.nombre_cliente || '--'}</div>
                <div style="font-size: 0.75rem; color: #6b7280; margin-top: 2px;">
                    <i class="fas fa-phone"></i> ${order.telefono || '--'}
                </div>
                ${order.direccion && order.tipo_pedido === 'envío' ? 
                    `<div style="font-size: 0.7rem; color: #9ca3af; margin-top: 2px;">
                        <i class="fas fa-map-marker-alt"></i> ${order.direccion.substring(0, 20)}...
                    </div>` : 
                    `<div style="font-size: 0.7rem; color: #10b981; margin-top: 2px;">
                        <i class="fas fa-store"></i> Retiro en local
                    </div>`
                }
            </div>
        `;
        
        // Comentarios con tooltip
        const commentsHtml = order.comentarios ? `
            <div style="position: relative; display: inline-block;">
                <i class="fas fa-sticky-note" style="color: #f59e0b; cursor: help;" 
                   title="${order.comentarios}"></i>
            </div>
        ` : '';
        
        // Botones de acción mejorados
        const actionButtons = `
            <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                <button class="action-button button-view" onclick="showOrderDetails('${order.id}')" 
                        style="padding: 4px 8px; font-size: 0.8rem;">
                    <i class="fas fa-eye"></i> Detalles
                </button>
                ${order.telefono ? `
                    <button class="action-button button-whatsapp" 
                            onclick="openWhatsAppAdmin('${order.telefono}', '${order.id_pedido || order.id}', '${order.nombre_cliente || ''}', ${order.total || 0}, '${order.estado || 'Recibido'}', ${order.tiempo_estimado_actual || 30})"
                            style="padding: 4px 8px; font-size: 0.8rem;">
                        <i class="fab fa-whatsapp"></i> WhatsApp
                    </button>
                ` : ''}
            </div>
        `;
        
        // Items del pedido
        const itemsHtml = order.items ? `
            <div style="font-size: 0.8rem; color: #6b7280;">
                ${order.items.slice(0, 2).map(item => 
                    `${item.cantidad}x ${item.nombre}`
                ).join(', ')}
                ${order.items.length > 2 ? `... (+${order.items.length - 2})` : ''}
            </div>
        ` : '';
        
        // Resaltar pedidos urgentes
        const isUrgent = order.estado === 'Recibido' && order.tipo_pedido === 'envío';
        const rowStyle = isUrgent ? 'background-color: #fef3c7;' : '';
        
        row.innerHTML = `
            <td style="${rowStyle}">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="min-width: 24px;">
                        ${isUrgent ? '<i class="fas fa-bolt" style="color: #f59e0b;"></i>' : ''}
                    </div>
                    <div>
                        <strong style="font-size: 0.9rem;">${order.id_pedido || order.id}</strong>
                        ${commentsHtml}
                        ${itemsHtml}
                    </div>
                </div>
            </td>
            <td style="${rowStyle}">
                <div style="font-size: 0.85rem;">${fechaStr}</div>
            </td>
            <td style="${rowStyle}">
                ${customerInfo}
            </td>
            <td style="${rowStyle}">
                <strong style="color: #1e40af;">$${order.total || 0}</strong>
            </td>
            <td style="${rowStyle}">
                ${statusSelect}
            </td>
            <td style="${rowStyle}">
                ${timeInput}
            </td>
            <td style="${rowStyle}">
                ${actionButtons}
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Obtener nombre del filtro
function getFilterName(filter) {
    const filterNames = {
        'todos': 'Todos los pedidos',
        'hoy': 'Hoy',
        'ayer': 'Ayer',
        'semana': 'Esta semana',
        'mes': 'Este mes',
        'pendientes': 'Pendientes',
        'completados': 'Completados'
    };
    return filterNames[filter] || filter;
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
            adminState.orders[orderIndex].fecha_actualizacion = new Date();
        }
        
        // Aplicar filtro actual nuevamente
        applyOrderFilter(adminState.currentFilter);
        
        // Actualizar dashboard
        updateDashboard();
        
        showNotification(`Estado del pedido actualizado a: ${newStatus}`, 'success');
        
    } catch (error) {
        console.error('Error actualizando estado:', error);
        showNotification('Error al actualizar el estado', 'error');
    }
}

// Actualizar tiempo estimado
async function updateOrderTime(input) {
    const orderId = input.dataset.orderId;
    const newTime = parseInt(input.value);
    
    if (isNaN(newTime) || newTime < 1) {
        showNotification('Tiempo inválido', 'error');
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
        
        showNotification('Tiempo estimado actualizado', 'success');
        
    } catch (error) {
        console.error('Error actualizando tiempo:', error);
        showNotification('Error al actualizar el tiempo', 'error');
    }
}

// Mostrar detalles del pedido
async function showOrderDetails(orderId) {
    const order = adminState.orders.find(o => o.id === orderId);
    if (!order) {
        showNotification('Pedido no encontrado', 'error');
        return;
    }
    
    const modal = document.getElementById('orderModal');
    const modalOrderId = document.getElementById('modalOrderId');
    const modalOrderDetails = document.getElementById('modalOrderDetails');
    
    if (!modal || !modalOrderId || !modalOrderDetails) {
        console.error('Elementos del modal no encontrados');
        return;
    }
    
    // Formatear fecha
    const fecha = order.fecha?.toDate ? order.fecha.toDate() : new Date(order.fecha);
    const fechaStr = fecha ? fecha.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }) : '--';
    
    // Formatear items del pedido
    let itemsHtml = '';
    if (order.items && order.items.length > 0) {
        itemsHtml = `
            <div style="margin-top: 20px;">
                <h4 style="margin-bottom: 10px; color: #1e40af; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">
                    Detalle del pedido (${order.items.length} items)
                </h4>
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; max-height: 300px; overflow-y: auto;">
        `;
        
        order.items.forEach((item, index) => {
            itemsHtml += `
                <div style="margin-bottom: 10px; padding: 10px; background: white; border-radius: 6px; border-left: 4px solid #3b82f6;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="flex: 1;">
                            <strong style="color: #1e40af;">${item.nombre || 'Producto'}</strong>
                            <div style="font-size: 0.9rem; color: #6b7280; margin-top: 4px;">
                                Cantidad: ${item.cantidad || 1} • Precio unitario: $${item.precio || 0}
                            </div>
                        </div>
                        <div style="font-weight: 700; color: #1e40af;">
                            $${(item.precio || 0) * (item.cantidad || 1)}
                        </div>
                    </div>
                </div>
            `;
        });
        
        itemsHtml += '</div></div>';
    }
    
    // Construir contenido del modal
    modalOrderId.textContent = `Pedido: ${order.id_pedido || order.id}`;
    modalOrderDetails.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin-bottom: 20px;">
            <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                <div style="font-size: 0.9rem; color: #6b7280;">Cliente</div>
                <div style="font-weight: 600; font-size: 1.1rem;">${order.nombre_cliente || '--'}</div>
                <div style="margin-top: 5px;">
                    <i class="fas fa-phone" style="color: #6b7280;"></i> ${order.telefono || '--'}
                </div>
            </div>
            
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <div style="font-size: 0.9rem; color: #6b7280;">Fecha y Hora</div>
                <div style="font-weight: 600; font-size: 1.1rem;">${fechaStr}</div>
                <div style="margin-top: 5px;">
                    <i class="fas fa-clock" style="color: #6b7280;"></i> ${order.tiempo_estimado_actual || '--'} min estimados
                </div>
            </div>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin-bottom: 20px;">
            <div style="background: ${order.tipo_pedido === 'envío' ? '#f0fdf4' : '#f8fafc'}; padding: 15px; border-radius: 8px; border-left: 4px solid ${order.tipo_pedido === 'envío' ? '#10b981' : '#6b7280'};">
                <div style="font-size: 0.9rem; color: #6b7280;">Tipo de Pedido</div>
                <div style="font-weight: 600; font-size: 1.1rem; color: ${order.tipo_pedido === 'envío' ? '#10b981' : '#1e40af'};">
                    ${order.tipo_pedido === 'envío' ? '🚚 Envío a domicilio' : '🏪 Retiro en local'}
                </div>
                ${order.direccion && order.tipo_pedido === 'envío' ? `
                    <div style="margin-top: 5px; font-size: 0.9rem;">
                        <i class="fas fa-map-marker-alt" style="color: #ef4444;"></i> ${order.direccion}
                    </div>
                ` : ''}
            </div>
            
            <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; border-left: 4px solid #${getStatusColor(order.estado)};">
                <div style="font-size: 0.9rem; color: #6b7280;">Estado Actual</div>
                <div style="font-weight: 600; font-size: 1.1rem; color: #${getStatusColor(order.estado)};">
                    ${order.estado || 'Recibido'}
                </div>
                <div style="margin-top: 5px; font-size: 0.9rem;">
                    Actualizado: ${order.fecha_actualizacion ? new Date(order.fecha_actualizacion).toLocaleTimeString('es-ES') : '--'}
                </div>
            </div>
        </div>
        
        ${order.comentarios ? `
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
                <div style="font-weight: 600; color: #92400e; margin-bottom: 5px;">
                    <i class="fas fa-sticky-note"></i> Comentarios del Cliente
                </div>
                <div style="color: #92400e;">${order.comentarios}</div>
            </div>
        ` : ''}
        
        ${itemsHtml}
        
        <hr style="margin: 25px 0; border: none; border-top: 2px solid #e5e7eb;">
        
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: #f8fafc; border-radius: 8px;">
            <div>
                <div style="font-size: 0.9rem; color: #6b7280;">Resumen de Pago</div>
                <div style="font-size: 0.9rem;">
                    Subtotal: $${order.subtotal || order.total || 0}<br>
                    ${order.precio_envio ? `Envío: $${order.precio_envio}<br>` : ''}
                </div>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 1.1rem; font-weight: 600; color: #6b7280;">Total</div>
                <div style="font-size: 2rem; font-weight: 800; color: #1e40af;">$${order.total || 0}</div>
            </div>
        </div>
    `;
    
    // Mostrar modal
    modal.style.display = 'flex';
}

// Resto del código se mantiene igual desde aquí...
// [Mantener todas las funciones existentes desde este punto en adelante]
// Solo agregar las siguientes funciones adicionales:

// ... [Aquí continúa todo el resto del código existente, incluyendo:
// - updateProductsGrid
// - showNewProductForm
// - hideProductForm
// - editProduct
// - saveProduct
// - deleteProduct
// - updateCategoriesGrid
// - editCategory
// - addCategory
// - deleteCategory
// - cancelEditCategory
// - updateSettingsForm
// - saveSettings
// - updateStoreStatus
// - toggleStoreStatus
// - setupAdminEventListeners
// - generateReport
// - updateSalesChart
// - startRealtimeUpdates
// - showNotification
// - getStatusClass
// - getStatusColor
// - showLoading
// - showError
// - hideError
// ]

// Configurar event listeners del admin (actualizado)
function setupAdminEventListeners() {
    // Logout
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            if (confirm('¿Estás seguro de cerrar sesión?')) {
                auth.signOut();
            }
        });
    }
    
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
            
            const tabElement = document.getElementById(`${tab}Tab`);
            if (tabElement) {
                tabElement.classList.add('active');
            }
            
            adminState.currentTab = tab;
            
            // Actualizar datos específicos del tab
            if (tab === 'orders') {
                updateOrdersTable();
            } else if (tab === 'products') {
                updateProductsGrid();
            } else if (tab === 'dashboard') {
                updateDashboard();
            }
        });
    });
    
    // Filtros de pedidos
    const orderFilter = document.getElementById('orderFilter');
    if (orderFilter) {
        orderFilter.addEventListener('change', function() {
            applyOrderFilter(this.value);
        });
    }
    
    // Botón limpiar historial
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', clearOrderHistory);
    }
    
    // Botón limpiar TODO (emergencia)
    const clearAllBtn = document.getElementById('clearAllOrdersBtn');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', clearAllOrders);
    }
    
    // Productos
    const addProductButton = document.getElementById('addProductButton');
    if (addProductButton) {
        addProductButton.addEventListener('click', () => {
            showNewProductForm();
        });
    }
    
    const cancelProductFormButton = document.getElementById('cancelProductFormButton');
    if (cancelProductFormButton) {
        cancelProductFormButton.addEventListener('click', hideProductForm);
    }
    
    // Categorías
    const addCategoryButton = document.getElementById('addCategoryButton');
    if (addCategoryButton) {
        addCategoryButton.addEventListener('click', addCategory);
    }
    
    const cancelEditButton = document.getElementById('cancelEditCategoryButton');
    if (cancelEditButton) {
        cancelEditButton.addEventListener('click', cancelEditCategory);
    }
    
    // Configuración
    const storeToggle = document.getElementById('storeToggle');
    if (storeToggle) {
        storeToggle.addEventListener('change', function() {
            toggleStoreStatus(this);
        });
    }
    
    const saveSettingsButton = document.getElementById('saveSettingsButton');
    if (saveSettingsButton) {
        saveSettingsButton.addEventListener('click', saveSettings);
    }
    
    // Reportes
    const reportPeriod = document.getElementById('reportPeriod');
    if (reportPeriod) {
        reportPeriod.addEventListener('change', function() {
            const customRange = document.getElementById('customDateRange');
            if (customRange) {
                customRange.style.display = this.value === 'custom' ? 'block' : 'none';
            }
        });
    }
    
    const generateReportButton = document.getElementById('generateReportButton');
    if (generateReportButton) {
        generateReportButton.addEventListener('click', generateReport);
    }
    
    // Modal
    const closeModalButton = document.getElementById('closeModalButton');
    if (closeModalButton) {
        closeModalButton.addEventListener('click', () => {
            document.getElementById('orderModal').style.display = 'none';
        });
    }
    
    const closeModalBtn = document.getElementById('closeModalBtn');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            document.getElementById('orderModal').style.display = 'none';
        });
    }
    
    // Cerrar modal al hacer clic fuera
    const orderModal = document.getElementById('orderModal');
    if (orderModal) {
        orderModal.addEventListener('click', (e) => {
            if (e.target === orderModal) {
                orderModal.style.display = 'none';
            }
        });
    }
}

// Agregar estilos de animación
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .status-select {
        appearance: none;
        -webkit-appearance: none;
        -moz-appearance: none;
        padding-right: 25px;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='white' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 8px center;
        background-size: 16px;
    }
    
    .status-select:focus {
        outline: none;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }
    
    .time-input:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }
    
    .button-view {
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 4px 8px;
        cursor: pointer;
        font-size: 0.8rem;
        transition: background 0.2s;
    }
    
    .button-view:hover {
        background: #2563eb;
    }
    
    .button-whatsapp {
        background: #25D366;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 4px 8px;
        cursor: pointer;
        font-size: 0.8rem;
        transition: background 0.2s;
    }
    
    .button-whatsapp:hover {
        background: #128C7E;
    }
    
    .button-danger {
        background: #ef4444;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 8px 12px;
        cursor: pointer;
        font-size: 0.85rem;
        transition: all 0.2s;
    }
    
    .button-danger:hover {
        background: #dc2626;
        transform: translateY(-1px);
    }
`;
document.head.appendChild(style);

// Funciones auxiliares
function getStatusClass(status) {
    const statusMap = {
        'Recibido': 'recibido',
        'En preparación': 'preparacion',
        'Listo': 'listo',
        'Entregado': 'entregado',
        'Cancelado': 'entregado'
    };
    
    return statusMap[status] || 'recibido';
}

function getStatusColor(status) {
    const statusMap = {
        'Recibido': '3b82f6',
        'En preparación': 'f59e0b',
        'Listo': '10b981',
        'Entregado': '6b7280',
        'Cancelado': 'ef4444'
    };
    
    return statusMap[status] || '6b7280';
}

function showLoading(show) {
    const loadingElement = document.getElementById('loadingOverlay');
    if (show) {
        if (!loadingElement) {
            const overlay = document.createElement('div');
            overlay.id = 'loadingOverlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255,255,255,0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
            `;
            overlay.innerHTML = `
                <div style="text-align: center;">
                    <div class="loading-spinner" style="width: 50px; height: 50px;"></div>
                    <p style="margin-top: 10px; color: #6b7280;">Cargando...</p>
                </div>
            `;
            document.body.appendChild(overlay);
        }
    } else {
        if (loadingElement) {
            loadingElement.remove();
        }
    }
}

function showError(message, element = null) {
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
    } else {
        showNotification(message, 'error');
    }
}

function hideError(element) {
    if (element) {
        element.style.display = 'none';
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initAdminApp);

// Exportar funciones globales
window.updateOrderStatus = updateOrderStatus;
window.updateOrderTime = updateOrderTime;
window.showOrderDetails = showOrderDetails;
window.openWhatsAppAdmin = openWhatsAppAdmin;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.toggleStoreStatus = toggleStoreStatus;
window.addCategory = addCategory;
window.cancelEditCategory = cancelEditCategory;
window.applyOrderFilter = applyOrderFilter;
window.clearOrderHistory = clearOrderHistory;
window.clearAllOrders = clearAllOrders;
