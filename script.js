const form = document.getElementById('inventory-form');
const tbody = document.getElementById('inventory-body');
const alerts = document.getElementById('alerts');
document.getElementById('date-display').innerText = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

let inventory = JSON.parse(localStorage.getItem('my_inventory')) || [];

function updateUI() {
    // Ordenar de A a Z
    inventory.sort((a, b) => a.name.localeCompare(b.name));

    tbody.innerHTML = '';
    alerts.innerHTML = '';
    
    inventory.forEach((item, index) => {
        const isLow = Number(item.quantity) <= Number(item.minStock);
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td data-label="Producto"><strong>${item.name}</strong></td>
            <td data-label="Stock">${item.quantity}</td>
            <td data-label="Mínimo">${item.minStock}</td>
            <td data-label="Estado">
                <span class="badge ${isLow ? 'bg-low' : 'bg-ok'}">
                    ${isLow ? 'REABASTECER' : 'OK'}
                </span>
            </td>
            <td>
                <button onclick="deleteItem(${index})" style="background:var(--danger); padding: 8px; width: 100%; font-size: 13px;">Eliminar</button>
            </td>
        `;
        tbody.appendChild(row);

        if (isLow) {
            alerts.innerHTML += `<div>⚠️ Stock bajo en: ${item.name}</div>`;
        }
    });
    localStorage.setItem('my_inventory', JSON.stringify(inventory));
}

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
    document.getElementById('name').focus();
});

function deleteItem(index) {
    if(confirm("¿Deseas eliminar este producto?")) {
        inventory.splice(index, 1);
        updateUI();
    }
}

// EXPORTAR EXCEL PROFESIONAL
document.getElementById('download-excel').addEventListener('click', () => {
    if (inventory.length === 0) return alert("No hay datos");

    const dataReport = inventory.map(item => ({
        "DESCRIPCIÓN": item.name.toUpperCase(),
        "STOCK ACTUAL": item.quantity,
        "STOCK MÍNIMO": item.minStock,
        "SITUACIÓN": Number(item.quantity) <= Number(item.minStock) ? "RECOMPRAR" : "ESTABLE",
        "FECHA": new Date().toLocaleDateString()
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dataReport);
    ws['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    XLSX.writeFile(wb, `Inventario_${new Date().toISOString().split('T')[0]}.xlsx`);
});

updateUI();