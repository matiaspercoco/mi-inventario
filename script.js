const SUPABASE_URL = 'https://wnhcsrwioprqtpdzioda.supabase.co';
const SUPABASE_KEY = 'sb_publishable_GtiYBNjdAxyy5YV7BJY_0A_wXZCHFQ1';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let inventory = [];
let html5QrCode = null;
let currentSelectedItemId = null; // Guarda el ID del producto que se va a generar el QR

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

// Evento para procesar el formulario de Registro de Productos en Supabase
document.getElementById('inventory-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('name').value;
    const cantidad = parseInt(document.getElementById('quantity').value);
    const min_stock = parseInt(document.getElementById('min-stock').value);

    const { error } = await supabaseClient.from('productos').insert([{ nombre, cantidad, min_stock }]);

    if (error) {
        alert("Error al guardar: " + error.message);
    } else {
        document.getElementById('inventory-form').reset();
        loadData();
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

// Abre el modal y rellena los datos existentes de la ficha técnica
window.showQR = (id, nombre) => {
    currentSelectedItemId = id;
    document.getElementById('qr-product-name').innerText = nombre;
    
    // Resetear las secciones del modal
    document.getElementById('qr-form-section').style.display = 'block';
    document.getElementById('qr-result-section').style.display = 'none';
    document.getElementById('qrcode-container').innerHTML = '';
    document.getElementById('tech-info-display').innerHTML = '';
    
    // Rellenar con datos almacenados de forma local si ya los tiene
    const item = inventory.find(i => i.id === id);
    document.getElementById('tech-brand').value = item.marca || '';
    document.getElementById('tech-model').value = item.modelo || '';
    document.getElementById('tech-date').value = item.fecha_ingreso || '';
    document.getElementById('tech-purchase').value = item.factura || '';

    document.getElementById('qr-modal').style.display = 'flex';
};

// Guarda la ficha en Supabase y renderiza el código QR usando la librería QRCode
window.generateFinalQR = async () => {
    const marca = document.getElementById('tech-brand').value;
    const modelo = document.getElementById('tech-model').value;
    const fecha = document.getElementById('tech-date').value;
    const factura = document.getElementById('tech-purchase').value;

    // Actualiza la fila en Supabase
    const { error } = await supabaseClient.from('productos').update({
        marca: marca,
        modelo: modelo,
        fecha_ingreso: fecha,
        factura: factura
    }).eq('id', currentSelectedItemId);

    if (error) {
        alert("Error al guardar la ficha: " + error.message);
        return;
    }

    loadData(); // Refrescar base de datos interna

    const qrContainer = document.getElementById('qrcode-container');
    qrContainer.innerHTML = ''; // Limpiar contenedor

    // El contenido cifrado en el QR será el ID único para que lo procese la cámara
    new QRCode(qrContainer, {
        text: currentSelectedItemId,
        width: 180,
        height: 180,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });

    // Inyectar etiquetas informativas bajo el código
    document.getElementById('tech-info-display').innerHTML = `
        <p style="margin: 8px 0 4px 0;"><b>Marca:</b> ${marca || '-'}</p>
        <p style="margin: 4px 0 4px 0;"><b>Modelo:</b> ${modelo || '-'}</p>
        <p style="margin: 4px 0 4px 0;"><b>Fecha:</b> ${fecha || '-'}</p>
        <p style="margin: 4px 0 8px 0;"><b>Factura:</b> ${factura || '-'}</p>
    `;

    // Alternar vistas dentro del modal
    document.getElementById('qr-form-section').style.display = 'none';
    document.getElementById('qr-result-section').style.display = 'block';
};

// Lógica de impresión directa de la etiqueta
window.printQR = () => {
    const nombre = document.getElementById('qr-product-name').innerText;
    const qrHtml = document.getElementById('qrcode-container').innerHTML;
    const infoHtml = document.getElementById('tech-info-display').innerHTML;
    
    const ventanaImpresion = window.open('', '_blank');
    ventanaImpresion.document.write(`
        <html>
        <head>
            <title>Imprimir QR - ${nombre}</title>
            <style>
                body { font-family: sans-serif; text-align: center; padding: 20px; }
                .print-card { border: 2px dashed #000; padding: 20px; display: inline-block; border-radius: 10px; }
                #qrcode-container img { margin: auto; }
            </style>
        </head>
        <body>
            <div class="print-card">
                <h2>${nombre}</h2>
                <div>${qrHtml}</div>
                <div style="text-align: left; margin-top: 15px;">${infoHtml}</div>
            </div>
            <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
        </html>
    `);
    ventanaImpresion.document.close();
};

window.closeQRModal = () => document.getElementById('qr-modal').style.display = 'none';

// Eliminar un producto
window.deleteItem = async (id, nombre) => {
    if (!confirm(`¿Eliminar ${nombre}?`)) return;
    const { error } = await supabaseClient.from('productos').delete().eq('id', id);
    if (error) alert("Error: " + error.message);
    else {
        inventory = inventory.filter(item => item.id !== id);
        render(document.getElementById('search-input').value);
    }
};

// Exportación nativa a Excel
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