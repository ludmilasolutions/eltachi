<!-- ARCHIVO: setup-firebase.html -->
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Configuración Inicial - EL TACHI</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        h1 {
            color: #1a73e8;
            text-align: center;
        }
        
        .step {
            background: #e8f0fe;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
            border-left: 4px solid #1a73e8;
        }
        
        button {
            background: #fbbc04;
            color: #1a73e8;
            border: none;
            padding: 12px 24px;
            font-size: 16px;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
            display: block;
            margin: 20px auto;
            transition: all 0.3s;
        }
        
        button:hover {
            background: #f9ab00;
            transform: scale(1.05);
        }
        
        .success {
            color: #34a853;
            background: #e6f4ea;
            padding: 10px;
            border-radius: 5px;
            display: none;
        }
        
        .error {
            color: #ea4335;
            background: #fce8e6;
            padding: 10px;
            border-radius: 5px;
            display: none;
        }
        
        .loading {
            text-align: center;
            display: none;
        }
        
        .loader {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #1a73e8;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
    
    <!-- Firebase -->
    <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js"></script>
</head>
<body>
    <div class="container">
        <h1>⚙️ Configuración Inicial - EL TACHI</h1>
        
        <div class="step">
            <h3>PASO 1: Configurar Firebase</h3>
            <p>1. Abrí Firebase Console: <a href="https://console.firebase.google.com" target="_blank">console.firebase.google.com</a></p>
            <p>2. Creá un proyecto llamado "el-tachi-rotiseria"</p>
            <p>3. En "Project Settings" → "General" → "Your apps", hacé clic en el ícono web (&#60;/&#62;)</p>
            <p>4. Registrá la app y copiá la configuración</p>
        </div>
        
        <div class="step">
            <h3>PASO 2: Pegar Configuración</h3>
            <textarea id="firebaseConfig" rows="8" cols="80" placeholder="Pega aquí tu configuración Firebase...">
const firebaseConfig = {
  apiKey: "AIzaSyAZnd-oA7S99_w2rt8_Vw53ux8l1PqiQ-k",
  authDomain: "eltachi.firebaseapp.com",
  projectId: "eltachi",
  storageBucket: "eltachi.firebasestorage.app",
  messagingSenderId: "231676602106",
  appId: "1:231676602106:web:fde347e9caa00760b34b43"
};</textarea>
        </div>
        
        <div class="step">
            <h3>PASO 3: Inicializar Base de Datos</h3>
            <p>Hacé clic en el botón para crear todas las colecciones y datos iniciales:</p>
            
            <button onclick="initializeDatabase()">🚀 Inicializar Base de Datos</button>
            
            <div class="loading" id="loading">
                <div class="loader"></div>
                <p>Creando base de datos...</p>
            </div>
            
            <div class="success" id="success">
                ✅ ¡Base de datos creada exitosamente!
                <p>Podés cerrar esta pestaña y usar el sistema.</p>
            </div>
            
            <div class="error" id="error">
                ❌ Hubo un error. Revisá la configuración.
            </div>
        </div>
        
        <div class="step" id="results" style="display:none;">
            <h3>Resultado:</h3>
            <pre id="resultOutput"></pre>
        </div>
    </div>

    <script>
        let db;
        
        function initializeDatabase() {
            // Mostrar loading
            document.getElementById('loading').style.display = 'block';
            document.getElementById('success').style.display = 'none';
            document.getElementById('error').style.display = 'none';
            document.getElementById('results').style.display = 'none';
            
            // Obtener configuración
            const configText = document.getElementById('firebaseConfig').value;
            
            try {
                // Extraer valores de la configuración
                const apiKey = configText.match(/apiKey:\s*"([^"]+)"/)[1];
                const authDomain = configText.match(/authDomain:\s*"([^"]+)"/)[1];
                const projectId = configText.match(/projectId:\s*"([^"]+)"/)[1];
                const storageBucket = configText.match(/storageBucket:\s*"([^"]+)"/)[1];
                const messagingSenderId = configText.match(/messagingSenderId:\s*"([^"]+)"/)[1];
                const appId = configText.match(/appId:\s*"([^"]+)"/)[1];
                
                // Configurar Firebase
                const firebaseConfig = {
                    apiKey: apiKey,
                    authDomain: authDomain,
                    projectId: projectId,
                    storageBucket: storageBucket,
                    messagingSenderId: messagingSenderId,
                    appId: appId
                };
                
                // Inicializar
                firebase.initializeApp(firebaseConfig);
                db = firebase.firestore();
                
                // Crear colecciones
                createInitialData();
                
            } catch (error) {
                document.getElementById('loading').style.display = 'none';
                document.getElementById('error').style.display = 'block';
                document.getElementById('results').style.display = 'block';
                document.getElementById('resultOutput').textContent = 'Error: ' + error.message;
            }
        }
        
        async function createInitialData() {
            const results = [];
            
            try {
                // 1. Configuración del local
                const storeConfig = {
                    nombre_local: "EL TACHI",
                    horarios_por_dia: {
                        lunes: { abierto: true, apertura: "10:00", cierre: "22:00" },
                        martes: { abierto: true, apertura: "10:00", cierre: "22:00" },
                        miercoles: { abierto: true, apertura: "10:00", cierre: "22:00" },
                        jueves: { abierto: true, apertura: "10:00", cierre: "22:00" },
                        viernes: { abierto: true, apertura: "10:00", cierre: "23:00" },
                        sabado: { abierto: true, apertura: "11:00", cierre: "23:00" },
                        domingo: { abierto: false, apertura: "12:00", cierre: "20:00" }
                    },
                    abierto: true,
                    mensaje_cerrado: "Lo siento, estamos cerrados. Horarios: Lunes a Viernes 10:00-22:00, Sábados 11:00-23:00",
                    precio_envio: 300,
                    tiempo_base_estimado: 40,
                    retiro_habilitado: true,
                    colores_marca: {
                        principal: "#1a73e8",
                        secundario: "#fbbc04"
                    },
                    gemini_api_key: "TU_API_KEY_GEMINI_AQUI" // Reemplazar después
                };
                
                await db.collection('settings').doc('store_config').set(storeConfig);
                results.push("✅ Configuración del local creada");
                
                // 2. Horarios
                await db.collection('settings').doc('store_hours').set({
                    abierto: true,
                    horarios_por_dia: storeConfig.horarios_por_dia,
                    mensaje_cerrado: storeConfig.mensaje_cerrado,
                    ultima_actualizacion: firebase.firestore.FieldValue.serverTimestamp()
                });
                results.push("✅ Horarios configurados");
                
                // 3. Categorías
                const categorias = [
                    { id: "hamburguesas", nombre: "Hamburguesas", orden: 1 },
                    { id: "pizzas", nombre: "Pizzas", orden: 2 },
                    { id: "sandwiches", nombre: "Sándwiches", orden: 3 },
                    { id: "bebidas", nombre: "Bebidas", orden: 4 },
                    { id: "postres", nombre: "Postres", orden: 5 }
                ];
                
                for (const categoria of categorias) {
                    await db.collection('categories').doc(categoria.id).set(categoria);
                }
                results.push("✅ Categorías creadas (5 categorías)");
                
                // 4. Productos de ejemplo
                const productos = [
                    {
                        id: "hamburguesa-clasica",
                        nombre: "Hamburguesa Clásica",
                        descripcion: "Carne 150g, queso, lechuga, tomate, aderezo especial",
                        precio: 1200,
                        disponible: true,
                        categoria: "hamburguesas",
                        aderezos_disponibles: ["Extra queso", "Panceta", "Cebolla caramelizada"],
                        precios_extra_aderezos: {
                            "Extra queso": 100,
                            "Panceta": 150,
                            "Cebolla caramelizada": 80
                        },
                        imagen_url: ""
                    },
                    {
                        id: "hamburguesa-doble",
                        nombre: "Hamburguesa Doble",
                        descripcion: "Doble carne, doble queso, panceta, cebolla crispy",
                        precio: 1800,
                        disponible: true,
                        categoria: "hamburguesas",
                        aderezos_disponibles: ["Sin cebolla", "Sin tomate", "Extra panceta"],
                        precios_extra_aderezos: {
                            "Extra panceta": 200
                        }
                    },
                    {
                        id: "pizza-muzzarella",
                        nombre: "Pizza Muzzarella",
                        descripcion: "Clásica pizza con salsa de tomate y queso muzzarella",
                        precio: 1500,
                        disponible: true,
                        categoria: "pizzas",
                        aderezos_disponibles: ["Extra queso", "Aceitunas", "Orégano"],
                        precios_extra_aderezos: {
                            "Extra queso": 200,
                            "Aceitunas": 100
                        }
                    },
                    {
                        id: "coca-cola",
                        nombre: "Coca-Cola 500ml",
                        descripcion: "Gaseosa Coca-Cola 500ml",
                        precio: 400,
                        disponible: true,
                        categoria: "bebidas",
                        aderezos_disponibles: [],
                        precios_extra_aderezos: {}
                    },
                    {
                        id: "papas-fritas",
                        nombre: "Papas Fritas",
                        descripcion: "Porción de papas fritas crocantes",
                        precio: 600,
                        disponible: true,
                        categoria: "acompanamientos",
                        aderezos_disponibles: ["Con cheddar", "Con panceta"],
                        precios_extra_aderezos: {
                            "Con cheddar": 150,
                            "Con panceta": 200
                        }
                    }
                ];
                
                for (const producto of productos) {
                    await db.collection('products').doc(producto.id).set(producto);
                }
                results.push("✅ Productos creados (5 productos de ejemplo)");
                
                // 5. Pedido de ejemplo
                const exampleOrder = {
                    id_pedido: "TACHI-000001",
                    fecha: firebase.firestore.FieldValue.serverTimestamp(),
                    nombre_cliente: "Cliente de Ejemplo",
                    telefono: "1122334455",
                    tipo_pedido: "retiro",
                    direccion: "",
                    pedido_detallado: "1 Hamburguesa Clásica\n1 Papas Fritas\n1 Coca-Cola 500ml",
                    total: 2200,
                    estado: "Entregado",
                    tiempo_estimado_actual: 35,
                    notas: "Pedido de ejemplo para demostración"
                };
                
                await db.collection('orders').doc(exampleOrder.id_pedido).set(exampleOrder);
                results.push("✅ Pedido de ejemplo creado (TACHI-000001)");
                
                // Mostrar éxito
                document.getElementById('loading').style.display = 'none';
                document.getElementById('success').style.display = 'block';
                document.getElementById('results').style.display = 'block';
                document.getElementById('resultOutput').textContent = results.join('\n');
                
            } catch (error) {
                document.getElementById('loading').style.display = 'none';
                document.getElementById('error').style.display = 'block';
                document.getElementById('results').style.display = 'block';
                document.getElementById('resultOutput').textContent = 'Error: ' + error.message + '\n\n' + results.join('\n');
            }
        }
    </script>
</body>
</html>
