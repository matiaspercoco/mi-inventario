const form = document.getElementById('inventory-form');
const tbody = document.getElementById('inventory-body');
const alerts = document.getElementById('alerts');
document.getElementById('current-date').innerText = new Date().toLocaleDateString();

let inventory = JSON.parse(localStorage.getItem('my_inventory')) || [];

function updateUI() {
    // 1. ORDENAR ALFABÉTICAMENTE POR NOMBRE
    inventory.sort((a, b) => a.name.localeCompare(b.name));

    tbody.innerHTML = '';
    alerts.innerHTML = '';
    
    inventory.forEach((item, index) => {
        const isLow = Number(item.quantity) <= Number(item.minStock);
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td><strong>${item.name}</strong></td>
            <td>${item.quantity} uds.</td>
            <td>${item.minStock} uds.</td>
            <td>
                <span class="status-badge ${isLow ? 'bg-danger' : 'bg-success'}">
                    ${isLow ? 'REABASTECER' : 'STOCK OK'}
                </span>
            </td>
            <td>
                <button onclick="deleteItem(${index})" style="background:var(--danger); padding: 5px 10px; font-size: 12px;">Eliminar</button>
            </td>
        `;
        tbody.appendChild(row);

        if (isLow) {
            const alertDiv = document.createElement('div');
            alertDiv.innerHTML = `⚠️ Alerta de Stock: ${item.name} (Quedan solo ${item.quantity})`;
            alerts.appendChild(alertDiv);
        }
    });
    localStorage.setItem('my_inventory', JSON.stringify(inventory));
}

// Evento para agregar productos
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const newItem = {
        name: document.getElementById('name').value.trim(),
        quantity: parseInt(document.getElementById('quantity').value),
        minStock: parseInt(document.getElementById('min-stock').value)
    };
    
    inventory.push(newItem);
    updateUI();
    form.reset();
});

// Función para eliminar
function deleteItem(index) {
    if(confirm("¿Eliminar este producto del inventario?")) {
        inventory.splice(index, 1);
        updateUI();
    }
}

// EXPORTACIÓN EXCEL PROFESIONAL
document.getElementById('download-excel').addEventListener('click', () => {
    if (inventory.length === 0) return alert("Agrega productos primero.");

    // Mapeo de datos para que el Excel tenga títulos formales
    const dataReport = inventory.map(item => ({
        "DESCRIPCIÓN PRODUCTO": item.name.toUpperCase(),
        "CANTIDAD DISPONIBLE": item.quantity,
        "NIVEL MÍNIMO": item.minStock,
        "ESTADO": Number(item.quantity) <= Number(item.minStock) ? "BAJO STOCK" : "NORMAL",
        "ULTIMA REVISIÓN": new Date().toLocaleDateString()
    }));

    // Crear libro y hoja
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dataReport);

    // Configurar ancho de columnas (caracteres aproximados)
    ws['!cols'] = [
        { wch: 35 }, // Producto
        { wch: 20 }, // Cantidad
        { wch: 15 }, // Mínimo
        { wch: 15 }, // Estado
        { wch: 18 }  // Fecha
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Inventario Actual");
    
    // Descargar archivo con fecha en el nombre
    const fileName = `Reporte_Inventario_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
});

// Carga inicial
updateUI();