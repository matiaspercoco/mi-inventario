// 1. CONFIGURACIÓN
const SUPABASE_URL = 'https://wnhcsrwioprqtpdzioda.supabase.co';
const SUPABASE_KEY = 'sb_publishable_GtiYBNjdAxyy5YV7BJY_0A_wXZCHFQ1';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let inventory = [];

// 2. CONTROL DE SESIÓN
async function checkUser() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    const authSection = document.getElementById('auth-section');
    const mainApp = document.getElementById('main-app');

    if (user) {
        authSection.style.display = 'none';
        mainApp.style.display = 'block';
        loadData();
    } else {
        authSection.style.display = 'block';
        mainApp.style.display = 'none';
    }
}

// 3. GENERADOR DE QR
window.showQR = (id, nombre) => {
    const container = document.getElementById('qrcode-container');
    container.innerHTML = ""; // Limpiar el anterior
    
    new QRCode(container, {
        text: id, // El QR contiene el ID único del producto
        width: 180,
        height: 180,
        colorDark : "#2c3e50",
        colorLight : "#ffffff"
    });
    
    document.getElementById('qr-product-name').innerText = nombre.toUpperCase();
    document.getElementById('qr-modal').style.display = 'flex';
};

// 4. LÓGICA DE INVENTARIO
async function loadData() {
    const { data, error } = await supabaseClient
        .from('productos')
        .select('*')
        .order('nombre', { ascending: true });
    if (!error) { inventory = data; render(); }
}

function render(filter = "") {
    const list = document.getElementById('inventory-list');
    const alerts = document.getElementById('alerts');
    list.innerHTML = '';
    alerts.innerHTML = '';

    const filtered = inventory.filter(i => i.nombre.toLowerCase().includes(filter.toLowerCase()));

    filtered.forEach(item => {
        const isLow = item.cantidad <= item.min_stock;
        if (isLow) {
            const alertDiv = document.createElement('div');
            alertDiv.className = 'alert-item';
            alertDiv.innerHTML = `⚠️ Stock bajo: ${item.nombre}`;
            alerts.appendChild(alertDiv);
        }

        const card = document.createElement('div');
        card.className = `product-card ${isLow ? 'low-stock' : ''}`;
        card.innerHTML = `
            <div class="info">
                <h3>${item.nombre}</h3>
                <small>ID: ${item.id.substring(0,8)}</small>
                <button onclick="showQR('${item.id}', '${item.nombre}')" class="btn-qr">📱 Generar QR</button>
            </div>
            <div class="qty-controls">
                <button onclick="changeQty('${item.id}', -1)">-</button>
                <span>${item.cantidad}</span>
                <button onclick="changeQty('${item.id}', 1)">+</button>
                <button class="btn-del" onclick="deleteItem('${item.id}')">🗑️</button>
            </div>
        `;
        list.appendChild(card);
    });
}

// 5. ACCIONES
window.handleAuth = async () => {
    const email = document.getElementById('email-auth').value;
    const password = document.getElementById('pass-auth').value;
    
    // Intentar entrar primero
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    
    if (error) {
        // Si falla el login, intentar registrar
        const { error: signUpError } = await supabaseClient.auth.signUp({ email, password });
        if (signUpError) alert("Error: " + signUpError.message);
        else alert("Cuenta creada. Revisa tu correo de confirmación.");
    }
    checkUser();
};

window.logout = async () => {
    await supabaseClient.auth.signOut();
    checkUser();
};

window.changeQty = async (id, val) => {
    const item = inventory.find(i => i.id === id);
    const newQty = Math.max(0, item.cantidad + val);
    await supabaseClient.from('productos').update({ cantidad: newQty }).eq('id', id);
    item.cantidad = newQty;
    render();
};

window.deleteItem = async (id) => {
    if (confirm('¿Eliminar producto?')) {
        await supabaseClient.from('productos').delete().eq('id', id);
        inventory = inventory.filter(i => i.id !== id);
        render();
    }
};

document.getElementById('inventory-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newItem = {
        nombre: document.getElementById('name').value,
        cantidad: parseInt(document.getElementById('quantity').value),
        min_stock: parseInt(document.getElementById('min-stock').value)
    };
    const { data, error } = await supabaseClient.from('productos').insert([newItem]).select();
    if (!error) { inventory.push(data[0]); e.target.reset(); render(); }
});

// Inicializar
window.onload = checkUser;
document.getElementById('search-input')?.addEventListener('input', (e) => render(e.target.value));