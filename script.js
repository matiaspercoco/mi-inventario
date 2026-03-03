let inventory = JSON.parse(localStorage.getItem('my_inventory')) || [];
const listContainer = document.getElementById('inventory-list');
const alerts = document.getElementById('alerts');

function render() {
    inventory.sort((a, b) => a.name.localeCompare(b.name));
    listContainer.innerHTML = '';
    alerts.innerHTML = '';

    inventory.forEach((item, index) => {
        const isLow = Number(item.quantity) <= Number(item.minStock);
        
        // Alertas
        if (isLow) {
            const div = document.createElement('div');
            div.className = 'alert-item';
            div.innerHTML = `⚠️ Stock bajo en: ${item.name}`;
            alerts.appendChild(div);
        }

        // Tarjeta de Producto
        const card = document.createElement('div');
        card.className = `product-card ${isLow ? 'low-stock' : ''}`;
        card.innerHTML = `
            <div class="info">
                <h3>${item.name}</h3>
                <p>Mínimo: ${item.minStock}</p>
            </div>
            <div class="qty-controls">
                <button class="qty-btn" onclick="changeQty(${index}, -1)">-</button>
                <span class="qty-num">${item.quantity}</span>
                <button class="qty-btn" onclick="changeQty(${index}, 1)">+</button>
                <button onclick="deleteItem(${index})" style="background:none; border:none; margin-left:10px; font-size:18px;">🗑️</button>
            </div>
        `;
        listContainer.appendChild(card);
    });
    localStorage.setItem('my_inventory', JSON.stringify(inventory));
}

window.changeQty = (idx, val) => {
    inventory[idx].quantity = Math.max(0, inventory[idx].quantity + val);
    render();
};

window.deleteItem = (idx) => {
    if(confirm('¿Eliminar producto?')) {
        inventory.splice(idx, 1);
        render();
    }
};

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

// Excel Pro
document.getElementById('download-excel').addEventListener('click', () => {
    const ws = XLSX.utils.json_to_sheet(inventory);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    XLSX.writeFile(wb, "Reporte_Inventario.xlsx");
});

document.getElementById('date-display').innerText = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
render();