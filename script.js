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
            <h3>${item.nombre}</h3>
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
window.onload = checkUser;