let inventory = JSON.parse(localStorage.getItem('my_inventory')) || [];
const listContainer = document.getElementById('inventory-list');
const alerts = document.getElementById('alerts');
const searchInput = document.getElementById('search-input');

function render(filter = "") {
    inventory.sort((a, b) => a.name.localeCompare(b.name));
    listContainer.innerHTML = '';
    alerts.innerHTML = '';

    const filtered = inventory.filter(i => i.name.toLowerCase().includes(filter.toLowerCase()));

    filtered.forEach((item, index) => {
        const actualIdx = inventory.indexOf(item);
        const isLow = Number(item.quantity) <= Number(item.minStock);
        
        if (isLow) {
            const div = document.createElement('div');
            div.className = 'alert-item';
            div.innerHTML = `🚨 Stock crítico: ${item.name} (${item.quantity} unidades)`;
            alerts.appendChild(div);
        }

        const card = document.createElement('div');
        card.className = `product-card ${isLow ? 'low-stock' : ''}`;
        card.innerHTML = `
            <div class="info">
                <h3>${item.name}</h3>
                <p>MÍNIMO REQUERIDO: ${item.minStock}</p>
            </div>
            <div class="qty-controls">
                <button class="qty-btn" onclick="changeQty(${actualIdx}, -1)">-</button>
                <span class="qty-num">${item.quantity}</span>
                <button class="qty-btn" onclick="changeQty(${actualIdx}, 1)">+</button>
                <button class="btn-del" onclick="deleteItem(${actualIdx})">🗑️</button>
            </div>
        `;
        listContainer.appendChild(card);
    });
    localStorage.setItem('my_inventory', JSON.stringify(inventory));
}

window.changeQty = (idx, val) => {
    inventory[idx].quantity = Math.max(0, inventory[idx].quantity + val);
    render(searchInput.value);
};

window.deleteItem = (idx) => {
    if(confirm('¿Eliminar producto?')) {
        inventory.splice(idx, 1);
        render(searchInput.value);
    }
};

searchInput.addEventListener('input', (e) => render(e.target.value));

document.getElementById('inventory-form').addEventListener('submit', (e) => {
    e.preventDefault();
    inventory.push({
        name: document.getElementById('name').value,
        quantity: parseInt(document.getElementById('quantity').value),
        minStock: parseInt(document.getElementById('min-stock').value)
    });
    e.target.reset();
    render();
});

// EXPORTACIÓN EXCEL FORMATEADA
document.getElementById('download-excel').addEventListener('click', () => {
    if (inventory.length === 0) return alert("No hay datos para exportar");

    // 1. Preparamos los datos con nombres bonitos
    const excelData = inventory.map(item => ({
        "DESCRIPCIÓN DEL PRODUCTO": item.name.toUpperCase(),
        "CANTIDAD ACTUAL": item.quantity,
        "STOCK MÍNIMO": item.minStock,
        "ESTADO": Number(item.quantity) <= Number(item.minStock) ? "🚨 RECOMPRAR" : "✅ OK",
        "FECHA DE REPORTE": new Date().toLocaleDateString()
    }));

    // 2. Creamos la hoja de cálculo
    const ws = XLSX.utils.json_to_sheet(excelData);

    // 3. Estilizamos las columnas (ancho)
    const colWidths = [
        { wch: 35 }, // Producto
        { wch: 18 }, // Cantidad
        { wch: 18 }, // Mínimo
        { wch: 20 }, // Estado
        { wch: 15 }  // Fecha
    ];
    ws['!cols'] = colWidths;

    // 4. Creamos el libro y descargamos
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    
    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Reporte_Inventario_${fecha}.xlsx`);
});

document.getElementById('date-display').innerText = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
render();