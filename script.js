// CONFIGURACIÓN SUPABASE
const SUPABASE_URL = 'https://wnhcsrwioprqtpdzioda.supabase.co';
const SUPABASE_KEY = 'sb_publishable_GtiYBNjdAxyy5YV7BJY_0A_wXZCHFQ1';

// Inicializamos el cliente con un nombre distinto para evitar conflictos
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let inventory = [];
const listContainer = document.getElementById('inventory-list');
const alerts = document.getElementById('alerts');
const searchInput = document.getElementById('search-input');

// 1. CARGAR DATOS DESDE LA NUBE
async function loadData() {
    const { data, error } = await supabaseClient
        .from('productos')
        .select('*')
        .order('nombre', { ascending: true });

    if (error) {
        console.error('Error cargando datos:', error);
        alert("Error al conectar con la base de datos");
    } else {
        inventory = data;
        render();
    }
}

// 2. RENDERIZAR LA INTERFAZ
function render(filter = "") {
    listContainer.innerHTML = '';
    alerts.innerHTML = '';

    const filtered = inventory.filter(i => i.nombre.toLowerCase().includes(filter.toLowerCase()));

    filtered.forEach((item) => {
        const isLow = Number(item.cantidad) <= Number(item.min_stock);
        
        if (isLow) {
            const div = document.createElement('div');
            div.className = 'alert-item';
            div.innerHTML = `🚨 Stock crítico: ${item.nombre} (${item.cantidad} unidades)`;
            alerts.appendChild(div);
        }

        const card = document.createElement('div');
        card.className = `product-card ${isLow ? 'low-stock' : ''}`;
        card.innerHTML = `
            <div class="info">
                <h3>${item.nombre}</h3>
                <p>MÍNIMO REQUERIDO: ${item.min_stock}</p>
            </div>
            <div class="qty-controls">
                <button class="qty-btn" onclick="changeQty('${item.id}', -1)">-</button>
                <span class="qty-num">${item.cantidad}</span>
                <button class="qty-btn" onclick="changeQty('${item.id}', 1)">+</button>
                <button class="btn-del" onclick="deleteItem('${item.id}')">🗑️</button>
            </div>
        `;
        listContainer.appendChild(card);
    });
}

// 3. ACTUALIZAR CANTIDAD EN LA NUBE
window.changeQty = async (id, val) => {
    const item = inventory.find(i => i.id === id);
    const newQty = Math.max(0, item.cantidad + val);

    const { error } = await supabaseClient
        .from('productos')
        .update({ cantidad: newQty })
        .eq('id', id);

    if (!error) {
        item.cantidad = newQty;
        render(searchInput.value);
    }
};

// 4. ELIMINAR DE LA NUBE
window.deleteItem = async (id) => {
    if(confirm('¿Eliminar producto definitivamente?')) {
        const { error } = await supabaseClient
            .from('productos')
            .delete()
            .eq('id', id);

        if (!error) {
            inventory = inventory.filter(i => i.id !== id);
            render(searchInput.value);
        }
    }
};

// 5. AÑADIR NUEVO PRODUCTO
document.getElementById('inventory-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newProduct = {
        nombre: document.getElementById('name').value,
        cantidad: parseInt(document.getElementById('quantity').value),
        min_stock: parseInt(document.getElementById('min-stock').value)
    };

    const { data, error } = await supabaseClient
        .from('productos')
        .insert([newProduct])
        .select();

    if (!error) {
        inventory.push(data[0]);
        inventory.sort((a, b) => a.nombre.localeCompare(b.nombre));
        e.target.reset();
        render();
    } else {
        console.error("Error al insertar:", error);
    }
});

searchInput.addEventListener('input', (e) => render(e.target.value));

// EXPORTACIÓN EXCEL
document.getElementById('download-excel').addEventListener('click', () => {
    if (inventory.length === 0) return alert("No hay datos para exportar");

    // 1. Definimos los encabezados y mapeamos los datos
    // Usamos mayúsculas para un toque más formal y técnico
    const excelData = inventory.map(item => ({
        "PRODUCTO / DESCRIPCIÓN": item.nombre.toUpperCase(),
        "STOCK ACTUAL": item.cantidad,
        "MÍNIMO REQUERIDO": item.min_stock,
        "ESTADO": Number(item.cantidad) <= Number(item.min_stock) ? "⚠️ RECOMPRAR" : "✅ EN STOCK",
        "FECHA DE REVISIÓN": new Date().toLocaleDateString('es-ES')
    }));

    // 2. Creamos la hoja de cálculo
    const ws = XLSX.utils.json_to_sheet(excelData);

    // 3. CONFIGURACIÓN DE DISEÑO PROFESIONAL
    // Definimos anchos de columna fijos para que no se corten los nombres
    const colWidths = [
        { wch: 40 }, // Producto
        { wch: 15 }, // Stock
        { wch: 20 }, // Mínimo
        { wch: 18 }, // Estado
        { wch: 18 }  // Fecha
    ];
    ws['!cols'] = colWidths;

    // 4. Creamos el libro y descargamos
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte Inventario");

    // Generamos el nombre del archivo con la fecha actual para mejor organización
    const hoy = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Reporte_Inventario_Sync_${hoy}.xlsx`);
});

document.getElementById('date-display').innerText = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

// Arrancar la carga de datos
loadData();