// Panel Admin - EL TACHI
// Sistema de administración para pedidos gastronómicos con actualización en tiempo real

// Estado global del panel admin
const adminState = {
    currentUser: null,
    orders: [],
    filteredOrders: [],
    products: [],
    filteredProducts: [],
    categories: [],
    selectedCategory: 'todos',
    settings: null,
    currentTab: 'dashboard',
    currentFilter: 'hoy',
    stats: {
        todayOrders: 0,
        todaySales: 0,
        activeOrders: 0
    },
    lastOrderId: null,
    realtimeEnabled: true,
    productSearchTerm: '',
    isManualOverride: false, // Nueva propiedad para saber si el estado fue cambiado manualmente
    manualOverrideTime: null // Hora del cambio manual
};

// FUNCIONES DE UTILIDAD (definidas primero)
function showNotification(message, type = 'info') {
    // Eliminar notificaciones anteriores
    document.querySelectorAll('[data-notification]').forEach(el => {
        el.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => el.remove(), 300);
    });
    
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.setAttribute('data-notification', 'true');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        z-index: 9999;
        animation: slideIn 0.3s ease;
        max-width: 350px;
        display: flex;
        align-items: center;
        gap: 12px;
        font-weight: 600;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,0.1);
        cursor: pointer;
    `;
    
    const icon = type === 'success' ? 'fa-check-circle' : 
                type === 'error' ? 'fa-exclamation-circle' : 
                type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle';
    
    notification.innerHTML = `
        <i class="fas ${icon}" style="font-size: 1.3rem;"></i>
        <div style="flex: 1;">${message}</div>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer; opacity: 0.7; padding: 4px;">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    notification.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON' && !e.target.closest('button')) {
            notification.remove();
        }
    });
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }, 6000);
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
                background: rgba(255,255,255,0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9998;
                backdrop-filter: blur(3px);
            `;
            overlay.innerHTML = `
                <div style="text-align: center; background: white; padding: 30px; border-radius: 15px; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
                    <div style="width: 50px; height: 50px; border: 3px solid #e5e7eb; border-top-color: #1e40af; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <p style="margin-top: 15px; color: #6b7280; font-weight: 600;">Cargando...</p>
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

// FUNCIONES DE SONIDO
function playNotificationSound() {
    try {
        const audio = document.getElementById('notificationSound');
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(e => {
                console.log('Error reproduciendo sonido:', e);
                const newOrderSound = document.getElementById('newOrderSound');
                if (newOrderSound) {
                    newOrderSound.currentTime = 0;
                    newOrderSound.play().catch(e2 => console.log('Error con segundo sonido:', e2));
                }
            });
        } else {
            const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3');
            audio.volume = 0.5;
            audio.play().catch(e => console.log('Error con audio dinámico:', e));
        }
    } catch (error) {
        console.log('Error con sonido de notificación:', error);
    }
}

function playNewOrderSound() {
    try {
        const audio = document.getElementById('newOrderSound');
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(e => console.log('Error reproduciendo sonido de nuevo pedido:', e));
        } else {
            const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-alert-quick-chime-766.mp3');
            audio.volume = 0.5;
            audio.play().catch(e => console.log('Error con audio dinámico:', e));
        }
    } catch (error) {
        console.log('Error con sonido de nuevo pedido:', error);
    }
}

// FUNCIONES DE FIREBASE
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
            estado_manual: false, // Nueva propiedad
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
            mantener_historial_dias: 30
        };
        
        await db.collection('settings').doc('config').set(defaultSettings);
        console.log('✅ Configuración por defecto creada');
        return true;
        
    } catch (error) {
        console.error('Error inicializando configuración:', error);
        return false;
    }
}

async function loadOrders() {
    try {
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        const snapshot = await db.collection('orders')
            .where('fecha', '>=', oneDayAgo)
            .orderBy('fecha', 'desc')
            .get();
        
        const orders = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        if (orders.length !== adminState.orders.length || 
            orders[0]?.id !== adminState.orders[0]?.id) {
            adminState.orders = orders;
            console.log(`📦 ${adminState.orders.length} pedidos cargados (últimas 24hs)`);
        }
        
        return adminState.orders;
        
    } catch (error) {
        console.error('Error cargando pedidos:', error);
        
        try {
            const snapshot = await db.collection('orders')
                .orderBy('fecha', 'desc')
                .limit(100)
                .get();
            
            adminState.orders = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log(`📦 ${adminState.orders.length} pedidos cargados (fallback)`);
            return adminState.orders;
            
        } catch (fallbackError) {
            console.error('Error en fallback de carga:', fallbackError);
            return [];
        }
    }
}

async function loadProducts() {
    try {
        const snapshot = await db.collection('products').get();
        adminState.products = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        adminState.filteredProducts = [...adminState.products];
        
        console.log(`🍔 ${adminState.products.length} productos cargados`);
        return adminState.products;
        
    } catch (error) {
        console.error('Error cargando productos:', error);
        return [];
    }
}

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

// NUEVA FUNCIÓN: Calcular estado según horarios
function calculateStoreStatusFromSchedule(settings) {
    if (!settings || !settings.horarios_por_dia) {
        console.log('No hay horarios configurados');
        return true; // Por defecto abierto
    }
    
    const now = new Date();
    const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const today = days[now.getDay()];
    
    const schedule = settings.horarios_por_dia[today];
    
    if (!schedule) {
        console.log(`No hay horario para ${today}`);
        return false;
    }
    
    // Verificar si está cerrado
    if (schedule.toLowerCase().includes('cerrado') || schedule === '' || schedule === 'Cerrado') {
        console.log(`Local cerrado según horario: ${schedule}`);
        return false;
    }
    
    // Parsear horarios
    const timeRegex = /(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/;
    const match = schedule.match(timeRegex);
    
    if (!match) {
        console.log(`Formato de horario inválido: ${schedule}`);
        return true; // Por defecto abierto si no se puede parsear
    }
    
    const openHour = parseInt(match[1]);
    const openMinute = parseInt(match[2]);
    const closeHour = parseInt(match[3]);
    const closeMinute = parseInt(match[4]);
    
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    const currentTime = currentHour * 60 + currentMinute;
    const openTime = openHour * 60 + openMinute;
    const closeTime = closeHour * 60 + closeMinute;
    
    // Si el horario de cierre es menor que el de apertura (ej: 22:00 - 02:00), significa que cierra al día siguiente
    if (closeTime < openTime) {
        // Está abierto si la hora actual es después de la apertura O antes del cierre (del día siguiente)
        return currentTime >= openTime || currentTime <= closeTime;
    } else {
        // Horario normal del mismo día
        return currentTime >= openTime && currentTime <= closeTime;
    }
}

// NUEVA FUNCIÓN: Actualizar estado automáticamente
async function updateStoreStatusAutomatically() {
    if (!adminState.settings) return;
    
    // Verificar si hay un override manual activo
    if (adminState.isManualOverride && adminState.manualOverrideTime) {
        const now = new Date();
        const overrideTime = new Date(adminState.manualOverrideTime);
        const hoursSinceOverride = (now - overrideTime) / (1000 * 60 * 60);
        
        // Si el override manual fue hace más de 2 horas, lo desactivamos
        if (hoursSinceOverride > 2) {
            adminState.isManualOverride = false;
            adminState.manualOverrideTime = null;
        } else {
            // Mantener el estado manual
            console.log('Manteniendo estado manual del local');
            return;
        }
    }
    
    // Calcular estado basado en horarios
    const shouldBeOpen = calculateStoreStatusFromSchedule(adminState.settings);
    
    // Si el estado actual es diferente al calculado, actualizar
    if (adminState.settings.abierto !== shouldBeOpen) {
        try {
            await db.collection('settings').doc('config').update({
                abierto: shouldBeOpen,
                estado_manual: false
            });
            
            adminState.settings.abierto = shouldBeOpen;
            adminState.settings.estado_manual = false;
            
            console.log(`Estado automático actualizado: ${shouldBeOpen ? 'ABIERTO' : 'CERRADO'}`);
            
            // Actualizar UI
            updateStoreStatus();
            
            // Mostrar notificación si el cambio es significativo
            if (adminState.currentTab === 'settings') {
                showNotification(`Estado actualizado automáticamente: ${shouldBeOpen ? 'ABIERTO' : 'CERRADO'}`, 'info');
            }
            
        } catch (error) {
            console.error('Error actualizando estado automático:', error);
        }
    }
}

// FUNCIONES DE TIEMPO REAL MEJORADAS
let ordersUnsubscribe = null;
let productsUnsubscribe = null;
let categoriesUnsubscribe = null;
let settingsUnsubscribe = null;
let storeStatusCheckInterval = null;

function startRealtimeUpdates() {
    console.log('🎯 Iniciando actualizaciones en tiempo real...');
    
    stopRealtimeUpdates();
    
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    ordersUnsubscribe = db.collection('orders')
        .where('fecha', '>=', oneDayAgo)
        .orderBy('fecha', 'desc')
        .onSnapshot((snapshot) => {
            console.log('📡 Cambios detectados en pedidos');
            
            let hasNewOrder = false;
            let hasStatusChange = false;
            let changedOrder = null;
            
            snapshot.docChanges().forEach((change) => {
                const orderData = {
                    id: change.doc.id,
                    ...change.doc.data()
                };
                
                if (change.type === 'added') {
                    console.log('➕ Nuevo pedido detectado:', change.doc.id);
                    
                    const existingIndex = adminState.orders.findIndex(o => o.id === change.doc.id);
                    if (existingIndex === -1) {
                        adminState.orders.unshift(orderData);
                        hasNewOrder = true;
                        changedOrder = orderData;
                        
                        const orderDate = orderData.fecha?.toDate ? orderData.fecha.toDate() : new Date(orderData.fecha);
                        const now = new Date();
                        const diffMinutes = (now - orderDate) / (1000 * 60);
                        
                        if (diffMinutes < 5) {
                            console.log('🔔 Pedido reciente:', diffMinutes.toFixed(1), 'minutos');
                            showNotification(`📦 NUEVO PEDIDO #${orderData.id_pedido || orderData.id.substring(0, 8)} por $${orderData.total || 0}`, 'success');
                            playNewOrderSound();
                        }
                    }
                }
                
                if (change.type === 'modified') {
                    console.log('✏️ Pedido actualizado:', change.doc.id);
                    
                    const existingIndex = adminState.orders.findIndex(o => o.id === change.doc.id);
                    if (existingIndex !== -1) {
                        const oldStatus = adminState.orders[existingIndex].estado;
                        adminState.orders[existingIndex] = orderData;
                        changedOrder = orderData;
                        
                        if (orderData.estado !== oldStatus) {
                            hasStatusChange = true;
                            
                            switch(orderData.estado) {
                                case 'Listo':
                                    showNotification(`✅ PEDIDO LISTO: #${orderData.id_pedido || orderData.id.substring(0, 8)}`, 'success');
                                    playNotificationSound();
                                    break;
                                case 'En preparación':
                                    showNotification(`👨‍🍳 EN PREPARACIÓN: #${orderData.id_pedido || orderData.id.substring(0, 8)}`, 'info');
                                    break;
                                case 'Entregado':
                                    showNotification(`📦 ENTREGADO: #${orderData.id_pedido || orderData.id.substring(0, 8)}`, 'info');
                                    break;
                                case 'Cancelado':
                                    showNotification(`❌ CANCELADO: #${orderData.id_pedido || orderData.id.substring(0, 8)}`, 'error');
                                    break;
                            }
                        }
                    }
                }
                
                if (change.type === 'removed') {
                    console.log('🗑️ Pedido eliminado:', change.doc.id);
                    const index = adminState.orders.findIndex(o => o.id === change.doc.id);
                    if (index !== -1) {
                        adminState.orders.splice(index, 1);
                    }
                }
            });
            
            if (hasNewOrder || hasStatusChange || snapshot.docChanges().length > 0) {
                updateDashboard();
                applyOrderFilter(adminState.currentFilter);
                
                if (adminState.currentTab === 'orders') {
                    updateOrdersTable();
                }
            }
            
            if (changedOrder && hasNewOrder) {
                adminState.lastOrderId = changedOrder.id;
            }
            
        }, (error) => {
            console.error('Error en suscripción a pedidos:', error);
            showNotification('Error en conexión en tiempo real', 'error');
            
            setTimeout(() => {
                if (adminState.realtimeEnabled) {
                    startRealtimeUpdates();
                }
            }, 5000);
        });
    
    productsUnsubscribe = db.collection('products').onSnapshot((snapshot) => {
        console.log('📡 Cambios en productos detectados');
        loadProducts().then(() => {
            applyProductFilters();
            
            if (adminState.currentTab === 'products') {
                updateProductsGrid();
            }
            updateDashboard();
        });
    });
    
    categoriesUnsubscribe = db.collection('categories').onSnapshot((snapshot) => {
        console.log('📡 Cambios en categorías detectados');
        loadCategories().then(() => {
            if (adminState.currentTab === 'categories') {
                updateCategoriesGrid();
            }
            if (adminState.currentTab === 'products') {
                updateProductsGrid();
            }
        });
    });
    
    settingsUnsubscribe = db.collection('settings').doc('config').onSnapshot((doc) => {
        console.log('📡 Cambios en configuración detectados');
        if (doc.exists) {
            adminState.settings = doc.data();
            
            // Verificar si el estado fue cambiado manualmente
            if (adminState.settings.estado_manual) {
                adminState.isManualOverride = true;
                adminState.manualOverrideTime = new Date();
            } else {
                adminState.isManualOverride = false;
                adminState.manualOverrideTime = null;
            }
            
            updateStoreStatus();
            if (adminState.currentTab === 'settings') {
                updateSettingsForm();
            }
        }
    });
    
    // Intervalo para actualizar estado del local cada minuto
    storeStatusCheckInterval = setInterval(() => {
        updateStoreStatusAutomatically();
    }, 60000); // Cada minuto
    
    // Intervalo para actualizar pedidos cada 15 segundos
    adminState.updateInterval = setInterval(() => {
        if (adminState.currentTab === 'orders' || adminState.currentTab === 'dashboard') {
            applyOrderFilter(adminState.currentFilter);
            if (adminState.currentTab === 'dashboard') {
                updateDashboard();
            }
        }
    }, 15000);
    
    showNotification('✅ Actualizaciones en tiempo real activadas', 'success');
}

function stopRealtimeUpdates() {
    console.log('🛑 Deteniendo actualizaciones en tiempo real...');
    
    if (ordersUnsubscribe) {
        ordersUnsubscribe();
        ordersUnsubscribe = null;
    }
    
    if (productsUnsubscribe) {
        productsUnsubscribe();
        productsUnsubscribe = null;
    }
    
    if (categoriesUnsubscribe) {
        categoriesUnsubscribe();
        categoriesUnsubscribe = null;
    }
    
    if (settingsUnsubscribe) {
        settingsUnsubscribe();
        settingsUnsubscribe = null;
    }
    
    if (storeStatusCheckInterval) {
        clearInterval(storeStatusCheckInterval);
        storeStatusCheckInterval = null;
    }
    
    if (adminState.updateInterval) {
        clearInterval(adminState.updateInterval);
        adminState.updateInterval = null;
    }
}

function toggleRealtimeUpdates() {
    adminState.realtimeEnabled = !adminState.realtimeEnabled;
    
    if (adminState.realtimeEnabled) {
        startRealtimeUpdates();
    } else {
        stopRealtimeUpdates();
        showNotification('⏸️ Actualizaciones en tiempo real desactivadas', 'warning');
    }
}

// FILTROS Y ORDENACIÓN
function applyOrderFilter(filterType) {
    const now = new Date();
    adminState.currentFilter = filterType;
    
    const filterSelect = document.getElementById('orderFilter');
    if (filterSelect) {
        filterSelect.value = filterType;
    }
    
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
                order.estado === 'Entregado' || order.estado === 'Listo'
            );
            break;
            
        case 'todos':
        default:
            adminState.filteredOrders = [...adminState.orders];
            break;
    }
    
    updateFilterCounter();
    updateOrdersTable();
}

function updateFilterCounter() {
    const filterCounter = document.getElementById('filterCounter');
    if (filterCounter) {
        filterCounter.textContent = `${adminState.filteredOrders.length} pedidos`;
    }
}

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
        
        const dateA = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha);
        const dateB = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha);
        return dateB - dateA;
    });
}

// FUNCIONES DE LIMPIEZA
async function clearOrderHistory() {
    if (!confirm(`⚠️ ¿ESTÁS SEGURO DE LIMPIAR EL HISTORIAL DE PEDIDOS?\n\nEsta acción eliminará permanentemente todos los pedidos excepto:\n• Pedidos de hoy\n• Pedidos con estado "Recibido" o "En preparación"\n\nNo se puede deshacer.`)) {
        return;
    }
    
    try {
        showLoading(true);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
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
        
        const batch = db.batch();
        let deletedCount = 0;
        
        for (const order of ordersToDelete) {
            const orderRef = db.collection('orders').doc(order.id);
            batch.delete(orderRef);
            deletedCount++;
            
            if (deletedCount % 400 === 0) {
                await batch.commit();
                console.log(`✅ Eliminados ${deletedCount} pedidos...`);
            }
        }
        
        if (deletedCount % 400 !== 0) {
            await batch.commit();
        }
        
        await loadOrders();
        applyOrderFilter(adminState.currentFilter);
        updateDashboard();
        
        showNotification(`✅ Historial limpiado: ${deletedCount} pedidos eliminados`, 'success');
        
    } catch (error) {
        console.error('Error limpiando historial:', error);
        showNotification('Error al limpiar el historial', 'error');
    } finally {
        showLoading(false);
    }
}

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
        
        const snapshot = await db.collection('orders').get();
        const totalOrders = snapshot.size;
        
        if (totalOrders === 0) {
            showNotification('No hay pedidos para eliminar', 'info');
            return;
        }
        
        if (!confirm(`⚠️ ÚLTIMA CONFIRMACIÓN\n\nSe eliminarán TODOS los ${totalOrders} pedidos permanentemente.\n\n¿Continuar?`)) {
            return;
        }
        
        const batch = db.batch();
        let deletedCount = 0;
        
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
            deletedCount++;
            
            if (deletedCount % 400 === 0) {
                batch.commit();
                console.log(`✅ Eliminados ${deletedCount} pedidos...`);
            }
        });
        
        if (deletedCount % 400 !== 0) {
            await batch.commit();
        }
        
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

// FUNCIONES DE UI - DASHBOARD
function updateDashboard() {
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
    
    document.getElementById('ordersToday').textContent = adminState.stats.todayOrders;
    document.getElementById('salesToday').textContent = `$${adminState.stats.todaySales}`;
    document.getElementById('activeOrders').textContent = adminState.stats.activeOrders;
    
    updateRecentOrdersList();
    updateTopProductsList();
    updateOrdersChart();
}

function updateRecentOrdersList() {
    const container = document.getElementById('recentOrdersList');
    if (!container) return;
    
    const recentOrders = adminState.orders.slice(0, 5);
    
    if (recentOrders.length === 0) {
        container.innerHTML = '<p style="padding: 20px; text-align: center; color: #6b7280;">No hay pedidos recientes</p>';
        return;
    }
    
    let html = '';
    recentOrders.forEach(order => {
        const fecha = order.fecha?.toDate ? order.fecha.toDate() : new Date(order.fecha);
        const timeStr = fecha ? fecha.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        }) : '--';
        
        const isUrgent = order.estado === 'Recibido' && order.tipo_pedido === 'envío';
        
        html += `
            <div style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; ${isUrgent ? 'background: #fef3c7; margin: 0 -10px; padding: 12px 10px; border-radius: 8px;' : ''}">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <strong style="font-size: 0.9rem;">${order.id_pedido || order.id.substring(0, 8)}</strong>
                            ${isUrgent ? '<span style="background: #f59e0b; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 600;">URGENTE</span>' : ''}
                        </div>
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

function updateTopProductsList() {
    const container = document.getElementById('topProductsList');
    if (!container) return;
    
    const productCount = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayOrders = adminState.orders.filter(order => {
        if (!order.fecha) return false;
        const orderDate = order.fecha.toDate ? order.fecha.toDate() : new Date(order.fecha);
        return orderDate >= today;
    });
    
    todayOrders.forEach(order => {
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
        container.innerHTML = '<p style="padding: 20px; text-align: center; color: #6b7280;">No hay datos de ventas hoy</p>';
        return;
    }
    
    let html = '';
    topProducts.forEach((product, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📊';
        html += `
            <div style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 1.2rem;">${medal}</span>
                        <strong style="font-size: 0.9rem;">${product.name}</strong>
                    </div>
                    <span style="font-weight: 600; color: #1e40af;">${product.count} vendidos</span>
                </div>
                <div style="font-size: 0.8rem; color: #6b7280; margin-top: 2px;">
                    $${product.price} cada uno
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function updateOrdersChart() {
    const ctx = document.getElementById('ordersChart');
    if (!ctx) return;
    
    if (window.ordersChartInstance) {
        window.ordersChartInstance.destroy();
    }
    
    const today = new Date();
    const labels = Array.from({length: 14}, (_, i) => {
        const hour = 10 + Math.floor(i/2);
        const minute = i % 2 === 0 ? '00' : '30';
        return `${hour}:${minute}`;
    });
    
    const ordersByHour = Array(14).fill(0);
    
    adminState.orders.forEach(order => {
        if (!order.fecha) return;
        
        const orderDate = order.fecha.toDate ? order.fecha.toDate() : new Date(order.fecha);
        if (orderDate.getDate() === today.getDate() && 
            orderDate.getMonth() === today.getMonth() && 
            orderDate.getFullYear() === today.getFullYear()) {
            
            const hour = orderDate.getHours();
            const minute = orderDate.getMinutes();
            const slot = (hour - 10) * 2 + (minute >= 30 ? 1 : 0);
            
            if (slot >= 0 && slot < 14) {
                ordersByHour[slot]++;
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
                fill: true,
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    titleFont: {
                        size: 12
                    },
                    bodyFont: {
                        size: 14
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
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

// FUNCIONES DE UI - PEDIDOS
function updateOrdersTable() {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;
    
    if (adminState.filteredOrders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px;">
                    <div style="color: #6b7280;">
                        <i class="fas fa-shopping-cart" style="font-size: 2rem; margin-bottom: 10px; opacity: 0.5;"></i>
                        <p>No hay pedidos para mostrar</p>
                        <p style="font-size: 0.9rem; margin-top: 5px;">
                            Filtro: ${getFilterName(adminState.currentFilter)}
                        </p>
                        <button class="button-secondary" onclick="forceRefreshOrders()" style="margin-top: 15px;">
                            <i class="fas fa-sync-alt"></i> Actualizar
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    const sortedOrders = sortOrdersByPriority([...adminState.filteredOrders]);
    
    tbody.innerHTML = '';
    
    sortedOrders.forEach(order => {
        const row = document.createElement('tr');
        
        const fecha = order.fecha?.toDate ? order.fecha.toDate() : new Date(order.fecha);
        const fechaStr = fecha ? fecha.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }) : '--';
        
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
                           min-width: 140px;
                           transition: all 0.2s;">
                <option value="Recibido" ${order.estado === 'Recibido' ? 'selected' : ''}>Recibido</option>
                <option value="En preparación" ${order.estado === 'En preparación' ? 'selected' : ''}>En preparación</option>
                <option value="Listo" ${order.estado === 'Listo' ? 'selected' : ''}>Listo</option>
                <option value="Entregado" ${order.estado === 'Entregado' ? 'selected' : ''}>Entregado</option>
                <option value="Cancelado" ${order.estado === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
            </select>
        `;
        
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
                <span style="font-size: 0.8rem; color: #6b7280;">min</span>
            </div>
        `;
        
        const customerInfo = `
            <div style="max-width: 150px;">
                <div style="font-weight: 600; font-size: 0.9rem; color: #1e40af;">${order.nombre_cliente || '--'}</div>
                <div style="font-size: 0.75rem; color: #6b7280; margin-top: 2px;">
                    <i class="fas fa-phone" style="color: #10b981;"></i> ${order.telefono || '--'}
                </div>
                ${order.direccion && order.tipo_pedido === 'envío' ? 
                    `<div style="font-size: 0.7rem; color: #ef4444; margin-top: 2px; display: flex; align-items: center; gap: 4px;">
                        <i class="fas fa-map-marker-alt"></i> 
                        <span style="overflow: hidden; text-overflow: ellipsis;">${order.direccion.substring(0, 25)}</span>
                    </div>` : 
                    `<div style="font-size: 0.7rem; color: #10b981; margin-top: 2px; display: flex; align-items: center; gap: 4px;">
                        <i class="fas fa-store"></i> Retiro en local
                    </div>`
                }
            </div>
        `;
        
        const commentsHtml = order.comentarios ? `
            <div style="position: relative; display: inline-block;">
                <i class="fas fa-sticky-note" style="color: #f59e0b; cursor: help;" 
                   title="${order.comentarios.replace(/"/g, '&quot;')}"></i>
            </div>
        ` : '';
        
        const itemsCount = order.items?.length || 0;
        const itemsHtml = order.items ? `
            <div style="font-size: 0.75rem; color: #6b7280; margin-top: 2px;">
                ${itemsCount} item${itemsCount !== 1 ? 's' : ''}
            </div>
        ` : '';
        
        const actionButtons = `
            <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                <button class="action-button button-view" onclick="showOrderDetails('${order.id}')" 
                        style="padding: 4px 8px; font-size: 0.8rem; background: #3b82f6;">
                    <i class="fas fa-eye"></i> Detalles
                </button>
                ${order.telefono ? `
                    <button class="action-button button-whatsapp" 
                            onclick="openWhatsAppAdmin('${order.telefono}', '${order.id_pedido || order.id}', '${order.nombre_cliente || ''}', ${order.total || 0}, '${order.estado || 'Recibido'}', ${order.tiempo_estimado_actual || 30})"
                            style="padding: 4px 8px; font-size: 0.8rem; background: #25D366;">
                        <i class="fab fa-whatsapp"></i> WhatsApp
                    </button>
                ` : ''}
            </div>
        `;
        
        const isUrgent = order.estado === 'Recibido' && order.tipo_pedido === 'envío';
        const isNew = adminState.lastOrderId === order.id;
        const rowStyle = isUrgent ? 'background-color: #fef3c7 !important;' : 
                       isNew ? 'background-color: #f0f9ff !important; animation: highlightRow 2s;' : '';
        
        row.innerHTML = `
            <td style="${rowStyle}">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="min-width: 24px;">
                        ${isUrgent ? '<i class="fas fa-bolt" style="color: #f59e0b;"></i>' : 
                          isNew ? '<i class="fas fa-star" style="color: #3b82f6;"></i>' : ''}
                    </div>
                    <div>
                        <div style="display: flex; align-items: center; gap: 4px;">
                            <strong style="font-size: 0.9rem; color: #1e40af;">${order.id_pedido || order.id.substring(0, 8)}</strong>
                            ${commentsHtml}
                            ${isNew ? '<span style="background: #3b82f6; color: white; padding: 1px 6px; border-radius: 4px; font-size: 0.6rem; font-weight: 600;">NUEVO</span>' : ''}
                        </div>
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
                <strong style="color: #1e40af; font-size: 1rem;">$${order.total || 0}</strong>
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
    
    if (!document.getElementById('highlightStyle')) {
        const style = document.createElement('style');
        style.id = 'highlightStyle';
        style.textContent = `
            @keyframes highlightRow {
                0% { background-color: #f0f9ff; }
                100% { background-color: transparent; }
            }
        `;
        document.head.appendChild(style);
    }
}

// FUNCIONES DE PEDIDOS
async function updateOrderStatus(select) {
    const orderId = select.dataset.orderId;
    const newStatus = select.value;
    
    try {
        await db.collection('orders').doc(orderId).update({
            estado: newStatus,
            fecha_actualizacion: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        const orderIndex = adminState.orders.findIndex(o => o.id === orderId);
        if (orderIndex !== -1) {
            adminState.orders[orderIndex].estado = newStatus;
            adminState.orders[orderIndex].fecha_actualizacion = new Date();
        }
        
        applyOrderFilter(adminState.currentFilter);
        updateDashboard();
        
        showNotification(`Estado actualizado a: ${newStatus}`, 'success');
        
    } catch (error) {
        console.error('Error actualizando estado:', error);
        showNotification('Error al actualizar el estado', 'error');
        const order = adminState.orders.find(o => o.id === orderId);
        if (order) {
            select.value = order.estado;
        }
    }
}

async function updateOrderTime(input) {
    const orderId = input.dataset.orderId;
    const newTime = parseInt(input.value);
    
    if (isNaN(newTime) || newTime < 1 || newTime > 180) {
        showNotification('Tiempo inválido. Use entre 1 y 180 minutos.', 'error');
        input.value = adminState.orders.find(o => o.id === orderId)?.tiempo_estimado_actual || 30;
        return;
    }
    
    try {
        await db.collection('orders').doc(orderId).update({
            tiempo_estimado_actual: newTime
        });
        
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
    
    const fecha = order.fecha?.toDate ? order.fecha.toDate() : new Date(order.fecha);
    const fechaStr = fecha ? fecha.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }) : '--';
    
    let itemsHtml = '';
    if (order.items && order.items.length > 0) {
        itemsHtml = `
            <div style="margin-top: 20px;">
                <h4 style="margin-bottom: 10px; color: #1e40af; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">
                    Detalle del pedido (${order.items.length} items)
                </h4>
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; max-height: 300px; overflow-y: auto;">
        `;
        
        let itemIndex = 1;
        order.items.forEach((item) => {
            let productName = item.nombre || 'Producto';
            let productPrice = item.precio || 0;
            let productQuantity = item.cantidad || 1;
            
            if (!item.nombre && item.id) {
                const product = adminState.products.find(p => p.id === item.id);
                if (product) {
                    productName = product.nombre || 'Producto';
                    productPrice = product.precio || 0;
                }
            }
            
            itemsHtml += `
                <div style="margin-bottom: 10px; padding: 10px; background: white; border-radius: 6px; border-left: 4px solid #3b82f6; position: relative;">
                    <div style="position: absolute; top: 10px; right: 10px; background: #3b82f6; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 600;">
                        ${itemIndex++}
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="flex: 1; padding-right: 30px;">
                            <strong style="color: #1e40af; font-size: 1rem;">${productName}</strong>
                            <div style="font-size: 0.9rem; color: #6b7280; margin-top: 4px;">
                                Cantidad: <strong>${productQuantity}</strong> • Precio unitario: <strong>$${productPrice}</strong>
                            </div>
                            ${item.comentarios ? `
                                <div style="margin-top: 6px; padding: 6px; background: #fef3c7; border-radius: 4px; font-size: 0.85rem; color: #92400e; border-left: 3px solid #f59e0b;">
                                    <strong>Nota:</strong> ${item.comentarios}
                                </div>
                            ` : ''}
                        </div>
                        <div style="font-weight: 700; color: #1e40af; font-size: 1.2rem;">
                            $${productPrice * productQuantity}
                        </div>
                    </div>
                </div>
            `;
        });
        
        itemsHtml += '</div></div>';
    }
    
    modalOrderId.textContent = `Pedido: ${order.id_pedido || order.id}`;
    modalOrderDetails.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin-bottom: 20px;">
            <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                <div style="font-size: 0.9rem; color: #6b7280;">Cliente</div>
                <div style="font-weight: 600; font-size: 1.1rem; color: #1e40af;">${order.nombre_cliente || '--'}</div>
                <div style="margin-top: 5px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-phone" style="color: #10b981;"></i> 
                    <span>${order.telefono || '--'}</span>
                </div>
            </div>
            
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <div style="font-size: 0.9rem; color: #6b7280;">Fecha y Hora</div>
                <div style="font-weight: 600; font-size: 1.1rem;">${fechaStr}</div>
                <div style="margin-top: 5px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-clock" style="color: #f59e0b;"></i> 
                    <span>${order.tiempo_estimado_actual || adminState.settings?.tiempo_base_estimado || 30} min estimados</span>
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
                    <div style="margin-top: 5px; font-size: 0.9rem; display: flex; align-items: center; gap: 8px; color: #ef4444;">
                        <i class="fas fa-map-marker-alt"></i> 
                        <span>${order.direccion}</span>
                    </div>
                ` : ''}
            </div>
            
            <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; border-left: 4px solid #${getStatusColor(order.estado)};">
                <div style="font-size: 0.9rem; color: #6b7280;">Estado Actual</div>
                <div style="font-weight: 600; font-size: 1.1rem; color: #${getStatusColor(order.estado)};">
                    ${order.estado || 'Recibido'}
                </div>
                <div style="margin-top: 5px; font-size: 0.9rem; color: #6b7280;">
                    <i class="fas fa-history"></i> Actualizado: ${order.fecha_actualizacion ? new Date(order.fecha_actualizacion).toLocaleTimeString('es-ES') : '--'}
                </div>
            </div>
        </div>
        
        ${order.comentarios ? `
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
                <div style="font-weight: 600; color: #92400e; margin-bottom: 5px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-sticky-note"></i> Comentarios del Cliente
                </div>
                <div style="color: #92400e; line-height: 1.5;">${order.comentarios}</div>
            </div>
        ` : ''}
        
        ${itemsHtml}
        
        <hr style="margin: 25px 0; border: none; border-top: 2px solid #e5e7eb;">
        
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); border-radius: 12px; color: white;">
            <div>
                <div style="font-size: 0.9rem; opacity: 0.9;">Resumen de Pago</div>
                <div style="font-size: 0.9rem; margin-top: 5px;">
                    <div>Subtotal: <strong>$${order.subtotal || order.total || 0}</strong></div>
                    ${order.precio_envio ? `<div>Envío: <strong>$${order.precio_envio}</strong></div>` : ''}
                    ${order.descuento ? `<div>Descuento: <strong>-$${order.descuento}</strong></div>` : ''}
                </div>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 1rem; opacity: 0.9;">Total</div>
                <div style="font-size: 2.5rem; font-weight: 800;">$${order.total || 0}</div>
            </div>
        </div>
        
        <div style="margin-top: 20px; display: flex; gap: 10px;">
            ${order.telefono ? `
                <button class="button-primary" onclick="openWhatsAppAdmin('${order.telefono}', '${order.id_pedido || order.id}', '${order.nombre_cliente || ''}', ${order.total || 0}, '${order.estado || 'Recibido'}', ${order.tiempo_estimado_actual || 30})" style="flex: 1;">
                    <i class="fab fa-whatsapp"></i> Enviar WhatsApp
                </button>
            ` : ''}
            <button class="button-secondary" onclick="document.getElementById('orderModal').style.display = 'none'" style="flex: 1;">
                <i class="fas fa-times"></i> Cerrar
            </button>
        </div>
    `;
    
    modal.style.display = 'flex';
}

// FUNCIÓN WHATSAPP
function openWhatsAppAdmin(phone, orderId, customerName, total, status, estimatedTime) {
    if (!phone) {
        showNotification('No hay número de teléfono para este pedido', 'error');
        return;
    }
    
    let message = `Hola ${customerName || 'cliente'}! 👋\n\n`;
    message += `Soy de ${adminState.settings?.nombre_local || 'EL TACHI'}. `;
    
    switch(status) {
        case 'En preparación':
            message += `Tu pedido #${orderId} está en preparación. `;
            if (estimatedTime) {
                message += `Tiempo estimado: ${estimatedTime} minutos. `;
            }
            message += `Te avisaremos cuando esté listo.`;
            break;
            
        case 'Listo':
            message += `¡Tu pedido #${orderId} está listo para retirar! `;
            if (adminState.settings?.retiro_habilitado) {
                message += `Podés pasar por el local cuando quieras.`;
            }
            break;
            
        case 'Entregado':
            message += `¡Gracias por tu pedido #${orderId}! `;
            message += `Esperamos que hayas disfrutado. ¡Te esperamos pronto!`;
            break;
            
        default:
            message += `Tu pedido #${orderId} ha sido recibido. `;
            message += `Te mantendremos informado sobre el estado.`;
    }
    
    message += `\n\nTotal: $${total}`;
    message += `\n\n¡Gracias por elegirnos!`;
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
}

// NUEVA FUNCIÓN PARA APLICAR FILTROS DE PRODUCTOS
function applyProductFilters() {
    const searchTerm = adminState.productSearchTerm.toLowerCase();
    const categoryId = adminState.selectedCategory;
    
    adminState.filteredProducts = adminState.products.filter(product => {
        const matchesSearch = !searchTerm || 
            product.nombre.toLowerCase().includes(searchTerm) ||
            (product.descripcion && product.descripcion.toLowerCase().includes(searchTerm));
        
        const matchesCategory = categoryId === 'todos' || !categoryId || 
            product.categoria === categoryId ||
            (!product.categoria && categoryId === 'sin-categoria');
        
        return matchesSearch && matchesCategory;
    });
    
    updateProductsGrid();
}

// FUNCIONES DE UI - PRODUCTOS (CON BUSCADOR Y FILTRO POR CATEGORÍA)
function updateProductsGrid() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    
    let searchContainer = document.getElementById('productSearchContainer');
    if (!searchContainer) {
        searchContainer = document.createElement('div');
        searchContainer.id = 'productSearchContainer';
        searchContainer.className = 'filter-controls';
        searchContainer.style.cssText = 'margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; padding: 15px; background: #f8fafc; border-radius: 12px; flex-wrap: wrap; gap: 15px;';
        
        const leftControls = document.createElement('div');
        leftControls.style.cssText = 'display: flex; align-items: center; gap: 10px; flex: 1; max-width: 800px; flex-wrap: wrap;';
        
        const searchBox = document.createElement('div');
        searchBox.style.cssText = 'position: relative; flex: 1; min-width: 250px; max-width: 400px;';
        
        searchBox.innerHTML = `
            <input type="text" 
                   id="productSearchInput" 
                   placeholder="Buscar productos por nombre..." 
                   class="form-input" 
                   style="padding-left: 40px; width: 100%;"
                   value="${adminState.productSearchTerm}">
            <i class="fas fa-search" style="position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: #6b7280;"></i>
        `;
        
        const categoryFilter = document.createElement('select');
        categoryFilter.id = 'categoryFilter';
        categoryFilter.className = 'form-input';
        categoryFilter.style.cssText = 'min-width: 180px;';
        
        const clearButton = document.createElement('button');
        clearButton.id = 'clearProductSearch';
        clearButton.className = 'button-secondary';
        clearButton.style.cssText = 'white-space: nowrap; display: flex; align-items: center; gap: 6px;';
        clearButton.innerHTML = '<i class="fas fa-times"></i> Limpiar filtros';
        
        leftControls.appendChild(searchBox);
        leftControls.appendChild(categoryFilter);
        leftControls.appendChild(clearButton);
        
        const counter = document.createElement('div');
        counter.id = 'productCounter';
        counter.className = 'filter-counter';
        counter.textContent = `${adminState.filteredProducts.length} productos`;
        
        searchContainer.appendChild(leftControls);
        searchContainer.appendChild(counter);
        
        grid.parentNode.insertBefore(searchContainer, grid);
        
        const searchInput = document.getElementById('productSearchInput');
        const categorySelect = document.getElementById('categoryFilter');
        
        updateCategoryFilterOptions();
        
        categorySelect.value = adminState.selectedCategory || 'todos';
        
        searchInput.addEventListener('input', function() {
            adminState.productSearchTerm = this.value.trim();
            applyProductFilters();
        });
        
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                adminState.productSearchTerm = this.value.trim();
                applyProductFilters();
            }
        });
        
        categorySelect.addEventListener('change', function() {
            adminState.selectedCategory = this.value;
            applyProductFilters();
        });
        
        clearButton.addEventListener('click', function() {
            adminState.productSearchTerm = '';
            adminState.selectedCategory = 'todos';
            document.getElementById('productSearchInput').value = '';
            document.getElementById('categoryFilter').value = 'todos';
            applyProductFilters();
        });
    } else {
        updateCategoryFilterOptions();
        
        const categorySelect = document.getElementById('categoryFilter');
        if (categorySelect) {
            categorySelect.value = adminState.selectedCategory || 'todos';
        }
    }
    
    const counter = document.getElementById('productCounter');
    if (counter) {
        counter.textContent = `${adminState.filteredProducts.length} productos`;
        
        if (adminState.productSearchTerm || (adminState.selectedCategory && adminState.selectedCategory !== 'todos')) {
            let filterInfo = 'Filtros: ';
            if (adminState.productSearchTerm) {
                filterInfo += `"${adminState.productSearchTerm}" `;
            }
            if (adminState.selectedCategory && adminState.selectedCategory !== 'todos') {
                const category = adminState.categories.find(c => c.id === adminState.selectedCategory);
                filterInfo += `${category ? `en ${category.nombre}` : 'categoría seleccionada'}`;
            }
            counter.title = filterInfo;
            counter.style.cursor = 'help';
        } else {
            counter.title = 'Mostrando todos los productos';
            counter.style.cursor = 'default';
        }
    }
    
    if (adminState.filteredProducts.length === 0) {
        grid.innerHTML = `
            <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                <i class="fas fa-hamburger" style="font-size: 3rem; color: #e5e7eb; margin-bottom: 20px;"></i>
                <p style="color: #6b7280; margin-bottom: 10px;">
                    ${adminState.productSearchTerm || adminState.selectedCategory !== 'todos' ? 
                        `No se encontraron productos con los filtros aplicados` : 
                        'No hay productos registrados'}
                </p>
                <p style="font-size: 0.9rem; color: #9ca3af; margin-bottom: 20px;">
                    ${adminState.productSearchTerm || adminState.selectedCategory !== 'todos' ? 
                        'Intenta con otros términos de búsqueda o selecciona otra categoría' : 
                        'Agrega productos para comenzar a vender'}
                </p>
                ${!adminState.productSearchTerm && adminState.selectedCategory === 'todos' ? `
                    <button class="button-primary" id="addFirstProduct" style="margin-top: 15px;">
                        <i class="fas fa-plus"></i> Agregar primer producto
                    </button>
                ` : `
                    <button class="button-secondary" onclick="clearProductFilters()" style="margin-top: 15px;">
                        <i class="fas fa-times"></i> Limpiar filtros
                    </button>
                `}
            </div>
        `;
        
        document.getElementById('addFirstProduct')?.addEventListener('click', () => {
            showNewProductForm();
        });
        
        return;
    }
    
    grid.innerHTML = '';
    
    adminState.filteredProducts.forEach(product => {
        const soldCount = adminState.orders.reduce((count, order) => {
            if (order.items) {
                const item = order.items.find(i => i.id === product.id);
                if (item) {
                    return count + (item.cantidad || 1);
                }
            }
            return count;
        }, 0);
        
        const categoryName = adminState.categories.find(c => c.id === product.categoria)?.nombre || 'Sin categoría';
        
        let highlightedName = product.nombre;
        if (adminState.productSearchTerm) {
            const regex = new RegExp(`(${adminState.productSearchTerm})`, 'gi');
            highlightedName = product.nombre.replace(regex, '<mark style="background: #fef3c7; color: #92400e; padding: 0 2px; border-radius: 3px;">$1</mark>');
        }
        
        const card = document.createElement('div');
        card.className = 'product-card';
        card.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            border: 1px solid ${product.disponible ? '#e5e7eb' : '#fee2e2'};
            transition: all 0.2s;
            opacity: ${product.disponible ? '1' : '0.7'};
            position: relative;
        `;
        
        const categoryBadge = document.createElement('div');
        categoryBadge.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: #f1f5f9;
            color: #64748b;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 600;
            border: 1px solid #e2e8f0;
        `;
        categoryBadge.textContent = categoryName;
        
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; padding-right: 80px;">
                <h3 class="card-title" style="margin: 0; color: #1e40af; font-size: 1.2rem;">${highlightedName}</h3>
                <span class="status-badge ${product.disponible ? 'status-listo' : 'status-entregado'}" style="font-size: 0.75rem;">
                    ${product.disponible ? '✓ Disponible' : '✗ No disponible'}
                </span>
            </div>
            <p style="color: #6b7280; margin-bottom: 15px; font-size: 0.9rem; min-height: 40px; line-height: 1.4;">
                ${product.descripcion || 'Sin descripción'}
            </p>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; margin-top: 10px;">
                <div>
                    <div class="card-value" style="color: #1e40af; font-size: 1.5rem; font-weight: 700;">$${product.precio}</div>
                    <div style="font-size: 0.8rem; color: #6b7280; display: flex; align-items: center; gap: 4px;">
                        <i class="fas fa-chart-line"></i> ${soldCount} vendidos
                    </div>
                </div>
                <div style="font-size: 0.8rem; color: #9ca3af; background: #f3f4f6; padding: 4px 10px; border-radius: 12px; display: flex; align-items: center; gap: 4px;">
                    <i class="fas fa-tag"></i> ${categoryName}
                </div>
            </div>
            <div style="display: flex; gap: 8px;">
                <button class="action-button button-edit" onclick="editProduct('${product.id}')" style="flex: 1; background: #f59e0b; color: white; border: none; padding: 8px; border-radius: 8px; cursor: pointer; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 6px;">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="action-button button-delete" onclick="deleteProduct('${product.id}')" style="width: 40px; background: #ef4444; color: white; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        card.appendChild(categoryBadge);
        grid.appendChild(card);
    });
}

// FUNCIÓN PARA ACTUALIZAR LAS OPCIONES DEL FILTRO DE CATEGORÍAS
function updateCategoryFilterOptions() {
    const categoryFilter = document.getElementById('categoryFilter');
    if (!categoryFilter) return;
    
    const currentValue = categoryFilter.value;
    
    categoryFilter.innerHTML = `
        <option value="todos">Todas las categorías</option>
        <option value="sin-categoria">Sin categoría</option>
    `;
    
    adminState.categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.nombre;
        
        const productCount = adminState.products.filter(p => p.categoria === category.id).length;
        if (productCount > 0) {
            option.textContent += ` (${productCount})`;
        }
        
        categoryFilter.appendChild(option);
    });
    
    categoryFilter.value = currentValue || 'todos';
}

// FUNCIÓN PARA LIMPIAR FILTROS DE PRODUCTOS
function clearProductFilters() {
    adminState.productSearchTerm = '';
    adminState.selectedCategory = 'todos';
    
    const searchInput = document.getElementById('productSearchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    
    if (searchInput) searchInput.value = '';
    if (categoryFilter) categoryFilter.value = 'todos';
    
    applyProductFilters();
}

function filterProducts(searchTerm) {
    adminState.productSearchTerm = searchTerm;
    applyProductFilters();
}

function showNewProductForm() {
    const form = document.getElementById('productForm');
    const title = document.getElementById('productFormTitle');
    const saveButton = document.getElementById('saveProductButton');
    
    if (form && title && saveButton) {
        document.getElementById('productName').value = '';
        document.getElementById('productDescription').value = '';
        document.getElementById('productPrice').value = '';
        document.getElementById('productAderezos').value = '';
        document.getElementById('productAvailable').checked = true;
        
        const categorySelect = document.getElementById('productCategory');
        categorySelect.innerHTML = '<option value="">Seleccionar categoría...</option>';
        
        adminState.categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.nombre;
            categorySelect.appendChild(option);
        });
        
        saveButton.onclick = () => saveProduct();
        saveButton.textContent = 'Guardar Producto';
        
        form.classList.remove('hidden');
        title.textContent = 'Nuevo Producto';
        
        form.scrollIntoView({ behavior: 'smooth' });
    }
}

function hideProductForm() {
    const form = document.getElementById('productForm');
    if (form) {
        form.classList.add('hidden');
    }
}

function editProduct(productId) {
    const product = adminState.products.find(p => p.id === productId);
    if (!product) return;
    
    const form = document.getElementById('productForm');
    const title = document.getElementById('productFormTitle');
    const saveButton = document.getElementById('saveProductButton');
    
    if (!form || !title || !saveButton) return;
    
    document.getElementById('productName').value = product.nombre;
    document.getElementById('productDescription').value = product.descripcion || '';
    document.getElementById('productPrice').value = product.precio;
    document.getElementById('productAvailable').checked = product.disponible !== false;
    
    document.getElementById('productAderezos').value = 
        Array.isArray(product.aderezos_disponibles) 
            ? product.aderezos_disponibles.join(', ')
            : '';
    
    const categorySelect = document.getElementById('productCategory');
    categorySelect.innerHTML = '<option value="">Seleccionar categoría...</option>';
    
    adminState.categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.nombre;
        if (cat.id === product.categoria) {
            option.selected = true;
        }
        categorySelect.appendChild(option);
    });
    
    saveButton.onclick = () => saveProduct(productId);
    saveButton.textContent = 'Actualizar Producto';
    
    form.classList.remove('hidden');
    title.textContent = 'Editar Producto';
    
    form.scrollIntoView({ behavior: 'smooth' });
}

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
        fecha_actualizacion: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (!productData.nombre) {
        showNotification('El nombre del producto es requerido', 'error');
        return;
    }
    
    if (isNaN(productData.precio) || productData.precio < 0) {
        showNotification('Precio inválido', 'error');
        return;
    }
    
    if (!productData.categoria) {
        showNotification('Selecciona una categoría', 'error');
        return;
    }
    
    try {
        if (isNew) {
            const newId = productData.nombre.toLowerCase()
                .replace(/[^a-z0-9áéíóúüñ]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '') + '-' + Date.now().toString().slice(-6);
            
            productData.id = newId;
            productData.fecha_creacion = firebase.firestore.FieldValue.serverTimestamp();
            
            await db.collection('products').doc(newId).set(productData);
            
        } else {
            await db.collection('products').doc(productId).update(productData);
        }
        
        await loadProducts();
        
        applyProductFilters();
        
        hideProductForm();
        
        showNotification(`Producto ${isNew ? 'agregado' : 'actualizado'} correctamente`, 'success');
        
    } catch (error) {
        console.error('Error guardando producto:', error);
        showNotification('Error al guardar el producto', 'error');
    }
}

async function deleteProduct(productId) {
    if (!confirm('¿Estás seguro de eliminar este producto?\n\nEsta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        await db.collection('products').doc(productId).delete();
        
        await loadProducts();
        
        applyProductFilters();
        
        showNotification('Producto eliminado correctamente', 'success');
        
    } catch (error) {
        console.error('Error eliminando producto:', error);
        showNotification('Error al eliminar el producto', 'error');
    }
}

// FUNCIONES DE UI - CATEGORÍAS
function updateCategoriesGrid() {
    const grid = document.getElementById('categoriesGrid');
    if (!grid) return;
    
    if (adminState.categories.length === 0) {
        grid.innerHTML = `
            <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                <i class="fas fa-folder" style="font-size: 3rem; color: #e5e7eb; margin-bottom: 20px;"></i>
                <p style="color: #6b7280;">No hay categorías registradas</p>
                <p style="font-size: 0.9rem; color: #9ca3af; margin-top: 10px;">
                    Agrega categorías para organizar tus productos
                </p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = '';
    
    adminState.categories.forEach(category => {
        const productCount = adminState.products.filter(p => p.categoria === category.id).length;
        
        const card = document.createElement('div');
        card.className = 'card';
        card.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            border: 1px solid #e5e7eb;
        `;
        card.innerHTML = `
            <h3 class="card-title" style="margin: 0 0 15px 0; color: #1e40af; font-size: 1.2rem;">${category.nombre}</h3>
            <div style="margin-top: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 0.9rem; color: #6b7280; display: flex; align-items: center; gap: 6px;">
                        <i class="fas fa-box"></i> ${productCount} producto${productCount !== 1 ? 's' : ''}
                    </span>
                    <span style="font-size: 0.8rem; color: #9ca3af; background: #f3f4f6; padding: 4px 10px; border-radius: 10px;">
                        Orden: ${category.orden}
                    </span>
                </div>
            </div>
            <div style="margin-top: 20px; display: flex; gap: 8px;">
                <button class="action-button button-edit" onclick="editCategory('${category.id}')" style="flex: 1; background: #f59e0b; color: white; border: none; padding: 8px; border-radius: 8px; cursor: pointer; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 6px;">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="action-button button-delete" onclick="deleteCategory('${category.id}')" style="width: 40px; background: #ef4444; color: white; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center;" ${productCount > 0 ? 'disabled title="No se puede eliminar categorías con productos"' : ''}>
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        grid.appendChild(card);
    });
}

function editCategory(categoryId) {
    const category = adminState.categories.find(c => c.id === categoryId);
    if (!category) return;
    
    document.getElementById('categoryName').value = category.nombre;
    document.getElementById('categoryOrder').value = category.orden || 1;
    
    document.getElementById('categoryFormTitle').textContent = 'Editar Categoría';
    document.getElementById('addCategoryButton').textContent = 'Actualizar Categoría';
    document.getElementById('addCategoryButton').dataset.editingId = categoryId;
    document.getElementById('cancelEditCategoryButton').style.display = 'inline-block';
    
    document.getElementById('categoryName').focus();
}

async function addCategory() {
    const nameInput = document.getElementById('categoryName');
    const orderInput = document.getElementById('categoryOrder');
    const addButton = document.getElementById('addCategoryButton');
    
    const name = nameInput.value.trim();
    const order = parseInt(orderInput.value);
    const isEditing = addButton.dataset.editingId;
    
    if (!name) {
        showNotification('El nombre de la categoría es requerido', 'error');
        return;
    }
    
    if (isNaN(order) || order < 1) {
        showNotification('El orden debe ser un número mayor a 0', 'error');
        return;
    }
    
    try {
        if (isEditing) {
            await db.collection('categories').doc(isEditing).update({
                nombre: name,
                orden: order,
                fecha_actualizacion: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            cancelEditCategory();
            
            showNotification('Categoría actualizada correctamente', 'success');
            
        } else {
            const id = name.toLowerCase()
                .replace(/[^a-z0-9áéíóúüñ]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
            
            await db.collection('categories').doc(id).set({
                id,
                nombre: name,
                orden: order,
                fecha_creacion: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            nameInput.value = '';
            orderInput.value = adminState.categories.length + 1;
            
            showNotification('Categoría agregada correctamente', 'success');
        }
        
        await loadCategories();
        updateCategoriesGrid();
        
        if (adminState.currentTab === 'products') {
            updateCategoryFilterOptions();
        }
        
    } catch (error) {
        console.error('Error guardando categoría:', error);
        
        if (error.code === 'permission-denied') {
            showNotification('No tienes permisos para realizar esta acción', 'error');
        } else {
            showNotification('Error al guardar la categoría', 'error');
        }
    }
}

async function deleteCategory(categoryId) {
    const productsInCategory = adminState.products.filter(p => p.categoria === categoryId);
    
    if (productsInCategory.length > 0) {
        showNotification(`No se puede eliminar la categoría porque tiene ${productsInCategory.length} producto(s). Reasigna los productos primero.`, 'error');
        return;
    }
    
    if (!confirm('¿Estás seguro de eliminar esta categoría?\n\nEsta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        await db.collection('categories').doc(categoryId).delete();
        
        await loadCategories();
        updateCategoriesGrid();
        
        if (adminState.currentTab === 'products') {
            updateCategoryFilterOptions();
        }
        
        showNotification('Categoría eliminada correctamente', 'success');
        
    } catch (error) {
        console.error('Error eliminando categoría:', error);
        showNotification('Error al eliminar la categoría', 'error');
    }
}

function cancelEditCategory() {
    document.getElementById('categoryFormTitle').textContent = 'Agregar Nueva Categoría';
    document.getElementById('addCategoryButton').textContent = 'Agregar Categoría';
    document.getElementById('cancelEditCategoryButton').style.display = 'none';
    
    document.getElementById('categoryName').value = '';
    document.getElementById('categoryOrder').value = adminState.categories.length + 1;
    
    const addButton = document.getElementById('addCategoryButton');
    if (addButton.dataset.editingId) {
        delete addButton.dataset.editingId;
    }
}

// FUNCIONES DE CONFIGURACIÓN - MODIFICADA
function updateSettingsForm() {
    if (!adminState.settings) return;
    
    const settings = adminState.settings;
    
    document.getElementById('storeName').value = settings.nombre_local || '';
    document.getElementById('whatsappPhone').value = settings.telefono_whatsapp || '';
    document.getElementById('geminiApiKey').value = settings.api_key_gemini || '';
    
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
    
    document.getElementById('closedMessage').value = settings.mensaje_cerrado || '';
    
    document.getElementById('deliveryPrice').value = settings.precio_envio || 0;
    document.getElementById('baseDeliveryTime').value = settings.tiempo_base_estimado || 30;
    document.getElementById('retiroEnabled').checked = settings.retiro_habilitado !== false;
    
    document.getElementById('colorPrimary').value = settings.colores_marca?.azul || '#1e40af';
    document.getElementById('colorSecondary').value = settings.colores_marca?.amarillo || '#f59e0b';
    
    // Calcular y mostrar el estado actual basado en horarios
    updateCurrentScheduleStatus();
}

// NUEVA FUNCIÓN: Mostrar estado actual según horarios
function updateCurrentScheduleStatus() {
    if (!adminState.settings) return;
    
    const statusElement = document.getElementById('currentScheduleStatus');
    if (!statusElement) return;
    
    const isOpen = calculateStoreStatusFromSchedule(adminState.settings);
    const now = new Date();
    const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const today = days[now.getDay()];
    const schedule = adminState.settings.horarios_por_dia?.[today] || 'No configurado';
    
    if (isOpen) {
        statusElement.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; padding: 10px; background: #d1fae5; border-radius: 8px; border-left: 4px solid #10b981;">
                <i class="fas fa-clock" style="color: #10b981; font-size: 1.2rem;"></i>
                <div>
                    <div style="font-weight: 600; color: #065f46;">Según horarios: ABIERTO</div>
                    <div style="font-size: 0.85rem; color: #047857;">Hoy (${today}): ${schedule}</div>
                </div>
            </div>
        `;
    } else {
        statusElement.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; padding: 10px; background: #fee2e2; border-radius: 8px; border-left: 4px solid #ef4444;">
                <i class="fas fa-clock" style="color: #ef4444; font-size: 1.2rem;"></i>
                <div>
                    <div style="font-weight: 600; color: #991b1b;">Según horarios: CERRADO</div>
                    <div style="font-size: 0.85rem; color: #dc2626;">Hoy (${today}): ${schedule}</div>
                </div>
            </div>
        `;
    }
}

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
        },
        fecha_actualizacion: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    const days = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
    days.forEach(day => {
        const input = document.getElementById(`hours_${day}`);
        if (input) {
            settingsData.horarios_por_dia[day] = input.value.trim();
        }
    });
    
    try {
        await db.collection('settings').doc('config').update(settingsData);
        
        adminState.settings = { ...adminState.settings, ...settingsData };
        
        updateStoreStatus();
        updateCurrentScheduleStatus();
        
        showNotification('Configuración guardada correctamente', 'success');
        
    } catch (error) {
        console.error('Error guardando configuración:', error);
        showNotification('Error al guardar la configuración', 'error');
    }
}

function updateStoreStatus() {
    if (!adminState.settings) return;
    
    const statusElement = document.getElementById('storeStatus');
    const statusValueElement = document.getElementById('storeStatusValue');
    const toggle = document.getElementById('storeToggle');
    const toggleLabel = document.getElementById('storeToggleLabel');
    
    if (!statusElement || !statusValueElement || !toggle || !toggleLabel) return;
    
    const isOpen = adminState.settings.abierto !== false;
    
    // Actualizar estado visual del toggle
    if (toggle) {
        toggle.checked = isOpen;
    }
    
    if (isOpen) {
        statusElement.textContent = '📍 Local ABIERTO';
        statusElement.style.color = '#10b981';
        statusValueElement.textContent = 'ABIERTO';
        statusValueElement.style.color = '#10b981';
        toggleLabel.textContent = 'Abierto';
        
        // Mostrar indicador de estado manual si aplica
        if (adminState.settings.estado_manual) {
            statusElement.innerHTML += ' <span style="font-size: 0.8rem; background: #f59e0b; color: white; padding: 2px 8px; border-radius: 10px;">MANUAL</span>';
        }
    } else {
        statusElement.textContent = '📍 Local CERRADO';
        statusElement.style.color = '#ef4444';
        statusValueElement.textContent = 'CERRADO';
        statusValueElement.style.color = '#ef4444';
        toggleLabel.textContent = 'Cerrado';
        
        if (adminState.settings.estado_manual) {
            statusElement.innerHTML += ' <span style="font-size: 0.8rem; background: #f59e0b; color: white; padding: 2px 8px; border-radius: 10px;">MANUAL</span>';
        }
    }
    
    // Actualizar también el estado según horarios
    updateCurrentScheduleStatus();
}

// FUNCIÓN MODIFICADA: toggleStoreStatus
async function toggleStoreStatus(checkbox) {
    const isOpen = checkbox.checked;
    
    try {
        await db.collection('settings').doc('config').update({
            abierto: isOpen,
            estado_manual: true, // Marcar como cambio manual
            fecha_actualizacion: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        adminState.settings.abierto = isOpen;
        adminState.settings.estado_manual = true;
        adminState.isManualOverride = true;
        adminState.manualOverrideTime = new Date();
        
        updateStoreStatus();
        
        showNotification(`Local ${isOpen ? 'abierto' : 'cerrado'} manualmente`, 'success');
        
    } catch (error) {
        console.error('Error cambiando estado:', error);
        showNotification('Error al cambiar el estado del local', 'error');
        checkbox.checked = !isOpen;
    }
}

// FUNCIONES DE INICIALIZACIÓN
async function loadAllData() {
    try {
        showLoading(true);
        
        adminState.settings = await getSettings();
        if (!adminState.settings) {
            await initializeDefaultSettings();
            adminState.settings = await getSettings();
        }
        
        await loadOrders();
        await loadProducts();
        await loadCategories();
        
        applyOrderFilter('hoy');
        
        updateDashboard();
        updateOrdersTable();
        updateProductsGrid();
        updateCategoriesGrid();
        updateSettingsForm();
        updateStoreStatus();
        
        // Verificar estado automático al cargar
        updateStoreStatusAutomatically();
        
        console.log('✅ Datos cargados correctamente');
        
    } catch (error) {
        console.error('Error cargando datos:', error);
        showNotification('Error cargando datos del sistema', 'error');
    } finally {
        showLoading(false);
    }
}

// FUNCIONES DE REPORTES
async function generateReport() {
    const period = document.getElementById('reportPeriod').value;
    const dateFrom = document.getElementById('reportDateFrom').value;
    const dateTo = document.getElementById('reportDateTo').value;
    
    let startDate, endDate;
    
    const now = new Date();
    
    switch(period) {
        case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            break;
            
        case 'yesterday':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
            break;
            
        case 'week':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            break;
            
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            break;
            
        case 'custom':
            if (!dateFrom || !dateTo) {
                showNotification('Selecciona ambas fechas para el período personalizado', 'error');
                return;
            }
            startDate = new Date(dateFrom);
            endDate = new Date(dateTo);
            endDate.setHours(23, 59, 59);
            break;
    }
    
    try {
        const filteredOrders = adminState.orders.filter(order => {
            if (!order.fecha) return false;
            const orderDate = order.fecha.toDate ? order.fecha.toDate() : new Date(order.fecha);
            return orderDate >= startDate && orderDate <= endDate;
        });
        
        const totalOrders = filteredOrders.length;
        const totalSales = filteredOrders.reduce((sum, order) => sum + (order.total || 0), 0);
        const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
        
        const statusCount = {
            Recibido: 0,
            'En preparación': 0,
            Listo: 0,
            Entregado: 0,
            Cancelado: 0
        };
        
        filteredOrders.forEach(order => {
            const status = order.estado || 'Recibido';
            if (statusCount[status] !== undefined) {
                statusCount[status]++;
            }
        });
        
        const reportSummary = document.getElementById('reportSummary');
        if (reportSummary) {
            reportSummary.innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 20px;">
                    <div class="card">
                        <h4 style="color: #6b7280; font-size: 0.9rem; margin-bottom: 5px;">Total Pedidos</h4>
                        <div style="font-size: 2rem; font-weight: 800; color: #1e40af;">${totalOrders}</div>
                    </div>
                    
                    <div class="card">
                        <h4 style="color: #6b7280; font-size: 0.9rem; margin-bottom: 5px;">Ventas Totales</h4>
                        <div style="font-size: 2rem; font-weight: 800; color: #10b981;">$${totalSales}</div>
                    </div>
                    
                    <div class="card">
                        <h4 style="color: #6b7280; font-size: 0.9rem; margin-bottom: 5px;">Ticket Promedio</h4>
                        <div style="font-size: 2rem; font-weight: 800; color: #f59e0b;">$${avgOrderValue.toFixed(2)}</div>
                    </div>
                </div>
                
                <div class="card">
                    <h4 style="margin-bottom: 15px;">Distribución por Estado</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px;">
                        ${Object.entries(statusCount).map(([status, count]) => `
                            <div style="text-align: center; padding: 15px; background: #f8fafc; border-radius: 8px;">
                                <div style="font-size: 1.5rem; font-weight: 700; color: #1e40af;">${count}</div>
                                <div style="font-size: 0.9rem; color: #6b7280; margin-top: 5px;">${status}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        updateSalesChart(filteredOrders);
        
        showNotification(`Reporte generado para ${period === 'custom' ? 'período personalizado' : period}`, 'success');
        
    } catch (error) {
        console.error('Error generando reporte:', error);
        showNotification('Error al generar el reporte', 'error');
    }
}

function updateSalesChart(orders) {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;
    
    if (window.salesChartInstance) {
        window.salesChartInstance.destroy();
    }
    
    const salesByDay = {};
    orders.forEach(order => {
        if (!order.fecha) return;
        
        const orderDate = order.fecha.toDate ? order.fecha.toDate() : new Date(order.fecha);
        const dateStr = orderDate.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short'
        });
        
        if (!salesByDay[dateStr]) {
            salesByDay[dateStr] = 0;
        }
        salesByDay[dateStr] += order.total || 0;
    });
    
    const labels = Object.keys(salesByDay);
    const data = Object.values(salesByDay);
    
    window.salesChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ventas por día',
                data: data,
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                borderColor: '#3b82f6',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value;
                        }
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

// FUNCIONES UTILITARIAS ADICIONALES
async function forceRefreshOrders() {
    try {
        showLoading(true);
        
        await loadOrders();
        applyOrderFilter(adminState.currentFilter);
        updateDashboard();
        
        showNotification('✅ Pedidos actualizados manualmente', 'success');
        
    } catch (error) {
        console.error('Error forzando actualización:', error);
        showNotification('Error al actualizar', 'error');
    } finally {
        showLoading(false);
    }
}

function debugRealtimeUpdates() {
    console.log('🔍 DEBUG - Estado del sistema:');
    console.log('- Pedidos cargados:', adminState.orders.length);
    console.log('- Pedidos filtrados:', adminState.filteredOrders.length);
    console.log('- Pestaña actual:', adminState.currentTab);
    console.log('- Filtro actual:', adminState.currentFilter);
    console.log('- Último pedido ID:', adminState.lastOrderId);
    console.log('- Realtime habilitado:', adminState.realtimeEnabled);
    console.log('- Estado manual activo:', adminState.isManualOverride);
    console.log('- Hora override manual:', adminState.manualOverrideTime);
    console.log('- Suscripciones activas:', {
        orders: ordersUnsubscribe ? 'ACTIVA' : 'INACTIVA',
        products: productsUnsubscribe ? 'ACTIVA' : 'INACTIVA',
        categories: categoriesUnsubscribe ? 'ACTIVA' : 'INACTIVA',
        settings: settingsUnsubscribe ? 'ACTIVA' : 'INACTIVA'
    });
    
    db.collection('orders').limit(1).get()
        .then(snap => {
            console.log('✅ Conexión a Firestore: OK');
            if (!snap.empty) {
                console.log('📡 Último pedido en DB:', snap.docs[0].id);
            }
        })
        .catch(err => console.error('❌ Error conexión Firestore:', err));
}

// EVENT LISTENERS
function setupAdminEventListeners() {
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            if (confirm('¿Estás seguro de cerrar sesión?')) {
                stopRealtimeUpdates();
                auth.signOut();
            }
        });
    }
    
    document.querySelectorAll('.nav-button').forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.dataset.tab;
            
            document.querySelectorAll('.nav-button').forEach(btn => {
                btn.classList.remove('active');
            });
            button.classList.add('active');
            
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            const tabElement = document.getElementById(`${tab}Tab`);
            if (tabElement) {
                tabElement.classList.add('active');
            }
            
            adminState.currentTab = tab;
            
            if (tab === 'orders') {
                updateOrdersTable();
            } else if (tab === 'products') {
                updateProductsGrid();
            } else if (tab === 'dashboard') {
                updateDashboard();
            }
        });
    });
    
    const orderFilter = document.getElementById('orderFilter');
    if (orderFilter) {
        orderFilter.addEventListener('change', function() {
            applyOrderFilter(this.value);
        });
    }
    
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', clearOrderHistory);
    }
    
    const clearAllBtn = document.getElementById('clearAllOrdersBtn');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', clearAllOrders);
    }
    
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
    
    const addCategoryButton = document.getElementById('addCategoryButton');
    if (addCategoryButton) {
        addCategoryButton.addEventListener('click', addCategory);
    }
    
    const cancelEditButton = document.getElementById('cancelEditCategoryButton');
    if (cancelEditButton) {
        cancelEditButton.addEventListener('click', cancelEditCategory);
    }
    
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
    
    const orderModal = document.getElementById('orderModal');
    if (orderModal) {
        orderModal.addEventListener('click', (e) => {
            if (e.target === orderModal) {
                orderModal.style.display = 'none';
            }
        });
    }
    
    const refreshButton = document.createElement('button');
    refreshButton.className = 'button-secondary';
    refreshButton.style.cssText = 'margin-left: 10px; padding: 8px 12px; display: flex; align-items: center; gap: 6px;';
    refreshButton.innerHTML = '<i class="fas fa-sync-alt"></i> Actualizar';
    refreshButton.onclick = forceRefreshOrders;
    
    const filterControls = document.querySelector('.filter-controls');
    if (filterControls) {
        filterControls.querySelector('.filter-left')?.appendChild(refreshButton);
    }
    
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        const debugButton = document.createElement('button');
        debugButton.className = 'button-secondary';
        debugButton.style.cssText = 'margin-left: 10px; padding: 8px 12px; background: #6b7280; display: flex; align-items: center; gap: 6px;';
        debugButton.innerHTML = '<i class="fas fa-bug"></i> Debug';
        debugButton.onclick = debugRealtimeUpdates;
        filterControls?.querySelector('.filter-left')?.appendChild(debugButton);
    }
}

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

function showAdminPanel() {
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('adminContainer').style.display = 'block';
}

function showLoginScreen() {
    document.getElementById('loginContainer').style.display = 'block';
    document.getElementById('adminContainer').style.display = 'none';
}

// INICIALIZACIÓN PRINCIPAL
async function initAdminApp() {
    try {
        console.log('🚀 Inicializando Panel Admin...');
        
        if (!firebase.apps.length) {
            showNotification('Error: Firebase no está inicializado', 'error');
            return;
        }
        
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                adminState.currentUser = user;
                showAdminPanel();
                
                const userAvatar = document.getElementById('userAvatar');
                if (userAvatar) {
                    const initials = user.email ? user.email.substring(0, 2).toUpperCase() : 'AD';
                    userAvatar.innerHTML = initials;
                    userAvatar.style.background = 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)';
                }
                
                await loadAllData();
                
                setupAdminEventListeners();
                
                setTimeout(() => {
                    startRealtimeUpdates();
                }, 1000);
                
                showNotification('✅ Panel admin conectado - Actualizaciones en tiempo real activadas', 'success');
                
            } else {
                showLoginScreen();
                stopRealtimeUpdates();
            }
        });
        
        setupLoginEvents();
        
        console.log('✅ Panel Admin inicializado');
        
    } catch (error) {
        console.error('❌ Error inicializando admin:', error);
        showNotification('Error inicializando el sistema', 'error');
    }
}

// AGREGAR ESTILOS DE ANIMACIÓN
document.addEventListener('DOMContentLoaded', function() {
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
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        @keyframes highlightRow {
            0% { background-color: #f0f9ff; }
            100% { background-color: transparent; }
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
    `;
    document.head.appendChild(style);
    
    if (!document.getElementById('notificationSound')) {
        const notificationSound = document.createElement('audio');
        notificationSound.id = 'notificationSound';
        notificationSound.preload = 'auto';
        notificationSound.style.display = 'none';
        notificationSound.innerHTML = `
            <source src="https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3" type="audio/mpeg">
        `;
        document.body.appendChild(notificationSound);
    }
    
    if (!document.getElementById('newOrderSound')) {
        const newOrderSound = document.createElement('audio');
        newOrderSound.id = 'newOrderSound';
        newOrderSound.preload = 'auto';
        newOrderSound.style.display = 'none';
        newOrderSound.innerHTML = `
            <source src="https://assets.mixkit.co/sfx/preview/mixkit-alert-quick-chime-766.mp3" type="audio/mpeg">
        `;
        document.body.appendChild(newOrderSound);
    }
});

// INICIALIZAR LA APLICACIÓN
document.addEventListener('DOMContentLoaded', initAdminApp);

// EXPORTAR FUNCIONES GLOBALES
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
window.forceRefreshOrders = forceRefreshOrders;
window.debugRealtimeUpdates = debugRealtimeUpdates;
window.toggleRealtimeUpdates = toggleRealtimeUpdates;
window.showNotification = showNotification;
window.filterProducts = filterProducts;
window.applyProductFilters = applyProductFilters;
window.clearProductFilters = clearProductFilters;
