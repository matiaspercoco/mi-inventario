const SUPABASE_URL = 'https://wnhcsrwioprqtpdzioda.supabase.co';
const SUPABASE_KEY = 'sb_publishable_GtiYBNjdAxyy5YV7BJY_0A_wXZCHFQ1';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let inventory = [];
const listContainer = document.getElementById('inventory-list');
const alerts = document.getElementById('alerts');
const searchInput = document.getElementById('search-input');

// --- SISTEMA DE AUTENTICACIÓN ---
async function checkUser() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) {
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        loadData();
    } else {
        document.getElementById('auth-section').style.display = 'block';
        document.getElementById('main-app').style.display = 'none';
    }
}

window.handleAuth = async () => {
    const email = document.getElementById('email-auth').value;
    const password = document.getElementById('pass-auth').value;
    
    let { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
        ({ data, error } = await supabaseClient.auth.signUp({ email, password }));
        if (error) alert("Error: " + error.message);
        else alert("Usuario creado. ¡Ya puedes entrar!");
    }
    checkUser();
};

window.logout = async () => {
    await supabaseClient.auth.signOut();
    checkUser();
};

// --- GESTIÓN DE INVENTARIO ---
async function loadData() {
    const { data, error } = await supabaseClient
        .from('productos')
        .select('*')
        .order('nombre', { ascending: true });
    if (!error) { inventory = data; render(); }
}

function render(filter = "") {
    listContainer.innerHTML = '';
    alerts.innerHTML = '';
    const filtered = inventory.filter(i => i.nombre.toLowerCase().includes(filter.toLowerCase()));

    filtered.forEach((item) => {
        const isLow = Number(item.cantidad) <= Number(item.min_stock);
        if (isLow) {
            const div = document.createElement('div');
            div.className = 'alert-item';
            div.innerHTML = `🚨 Stock crítico: ${item.nombre}`;
            alerts.appendChild(div);
        }

        const card = document.createElement('div');
        card.className = `product-card ${isLow ? 'low-stock' : ''}`;
        card.innerHTML = `
            <div class="info">
                <h3>${item.nombre}</h3>
                <p>MÍNIMO: ${item.min_stock}</p>
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

window.changeQty = async (id, val) => {
    const item = inventory.find(i => i.id === id);
    const newQty = Math.max(0, item.cantidad + val);
    const { error } = await supabaseClient.from('productos').update({ cantidad: newQty }).eq('id', id);
    if (!error) { item.cantidad = newQty; render(searchInput.value); }
};

window.deleteItem = async (id) => {
    if (confirm('¿Eliminar producto?')) {
        const { error } = await supabaseClient.from('productos').delete().eq('id', id);
        if (!error) { inventory = inventory.filter(i => i.id !== id); render(); }
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

// --- EXCEL PROFESIONAL ---
document.getElementById('download-excel').addEventListener('click', () => {
    const excelData = inventory.map(item => ({
        "PRODUCTO": item.nombre.toUpperCase(),
        "CANTIDAD": item.cantidad,
        "MIN_STOCK": item.min_stock,
        "ESTADO": item.cantidad <= item.min_stock ? "⚠️ RECOMPRAR" : "✅ OK"
    }));
    const ws = XLSX.utils.json_to_sheet(excelData);
    ws['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 15 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    XLSX.writeFile(wb, `Inventario_Sincronizado.xlsx`);
});

checkUser();