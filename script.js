const SUPABASE_URL = 'https://wnhcsrwioprqtpdzioda.supabase.co';
const SUPABASE_KEY = 'sb_publishable_GtiYBNjdAxyy5YV7BJY_0A_wXZCHFQ1';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let inventory = [];
let html5QrCode = null;

async function checkUser() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    document.getElementById('auth-section').style.display = user ? 'none' : 'block';
    document.getElementById('main-app').style.display = user ? 'block' : 'none';
    if (user) loadData();
}

async function loadData() {
    const { data } = await supabaseClient.from('productos').select('*').order('nombre');
    inventory = data || [];
    render();
}

function render(filter = "") {
    const list = document.getElementById('inventory-list');
    list.innerHTML = '';
    const query = filter.toLowerCase().trim();

    const filtered = inventory.filter(item => 
        (item.nombre || "").toLowerCase().includes(query) || 
        (item.marca || "").toLowerCase().includes(query)
    );

    filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = `product-card ${item.cantidad <= item.min_stock ? 'low-stock' : ''}`;
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0;">${item.nombre}</h3>
                <button onclick="deleteItem('${item.id}', '${item.nombre}')" style="background: none; border: none; cursor: pointer; font-size: 1.2rem; padding: 5px;">🗑️</button>
            </div>
            <p>Stock: <b>${item.cantidad}</b></p>
            <button onclick="showQR('${item.id}', '${item.nombre}')" class="btn-qr">📱 Ficha / QR</button>
            <div class="qty-controls">
                <button onclick="changeQty('${item.id}', -1)">-</button>
                <button onclick="changeQty('${item.id}', 1)">+</button>
            </div>
        `;
        list.appendChild(card);
    });
}

// Escuchar el evento de envío del formulario para GUARDAR en Supabase
document.getElementById('inventory-form').addEventListener('submit', async (e) => {
    e.preventDefault(); // Evita que la página se recargue solo
    
    const nombre = document.getElementById('name').value;
    const cantidad = parseInt(document.getElementById('quantity').value);
    const min_stock = parseInt(document.getElementById('min-stock').value);

    // Enviar a la base de datos de Supabase
    const { error } = await supabaseClient
        .from('productos')
        .insert([{ nombre, cantidad, min_stock }]);

    if (error) {
        alert("Error al guardar: " + error.message);
    } else {
        document.getElementById('inventory-form').reset(); // Limpia los inputs
        loadData(); // Recarga los datos actualizados de Supabase en la pantalla
    }
});

// Escuchar el buscador
document.getElementById('search-input').addEventListener('input', (e) => render(e.target.value));

window.handleAuth = async () => {
    const email = document.getElementById('email-auth').value;
    const password = document.getElementById('pass-auth').value;
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) alert("Error: " + error.message);
    checkUser();
};

window.logout = async () => { await supabaseClient.auth.signOut(); checkUser(); };

window.changeQty = async (id, val) => {
    const item = inventory.find(i => i.id === id);
    const newQty = Math.max(0, item.cantidad + val);
    await supabaseClient.from('productos').update({ cantidad: newQty }).eq('id', id);
    item.cantidad = newQty; render(document.getElementById('search-input').value);
};

window.showQR = (id, nombre) => {
    const item = inventory.find(i => i.id === id);
    document.getElementById('qr-product-name').innerText = nombre;
    document.getElementById('qr-modal').style.display = 'flex';
    // ... resto de lógica de QR ...
};

window.closeQRModal = () => document.getElementById('qr-modal').style.display = 'none';

window.deleteItem = async (id, nombre) => {
    if (!confirm(`¿Eliminar ${nombre}?`)) return;
    const { error } = await supabaseClient.from('productos').delete().eq('id', id);
    if (error) alert("Error: " + error.message);
    else {
        inventory = inventory.filter(item => item.id !== id);
        render(document.getElementById('search-input').value);
    }
};

window.exportToExcel = () => {
    if (inventory.length === 0) {
        alert("No hay productos para exportar");
        return;
    }
    
    let excelContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">`;
    excelContent += `<head><meta charset="UTF-8"></head><body><table border="1">`;
    excelContent += `<tr style="background-color:#3498db; color:white; font-weight:bold;"><th>ID</th><th>Nombre</th><th>Cantidad</th><th>Mínimo Stock</th><th>Marca</th><th>Modelo</th></tr>`;
    
    inventory.forEach(item => {
        excelContent += `<tr>
            <td>${item.id || ''}</td>
            <td>${item.nombre || ''}</td>
            <td>${item.cantidad ?? 0}</td>
            <td>${item.min_stock ?? 0}</td>
            <td>${item.marca || ''}</td>
            <td>${item.modelo || ''}</td>
        </tr>`;
    });
    
    excelContent += `</table></body></html>`;
    
    const blob = new Blob([excelContent], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mi_inventario_stock.xls";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};

window.onload = checkUser;