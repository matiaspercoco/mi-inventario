const SUPABASE_URL = 'https://wnhcsrwioprqtpdzioda.supabase.co';
const SUPABASE_KEY = 'sb_publishable_GtiYBNjdAxyy5YV7BJY_0A_wXZCHFQ1';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let inventory = [];
let currentQRProductId = null;
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
    inventory.filter(i => i.nombre.toLowerCase().includes(filter.toLowerCase()) || i.id.includes(filter)).forEach(item => {
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

window.showQR = (id, nombre) => {
    currentQRProductId = id;
    const item = inventory.find(i => i.id === id);
    document.getElementById('qr-product-name').innerText = nombre;
    
    document.getElementById('tech-brand').value = item.marca || '';
    document.getElementById('tech-model').value = item.modelo || '';
    document.getElementById('tech-date').value = item.fecha_compra || '';
    document.getElementById('tech-purchase').value = item.detalle_compra || '';

    document.getElementById('qr-form-section').style.display = 'block';
    document.getElementById('qr-result-section').style.display = 'none';
    document.getElementById('qr-modal').style.display = 'flex';
};

window.generateFinalQR = async () => {
    const b = document.getElementById('tech-brand').value;
    const m = document.getElementById('tech-model').value;
    const d = document.getElementById('tech-date').value;
    const p = document.getElementById('tech-purchase').value;

    await supabaseClient.from('productos').update({ marca: b, modelo: m, fecha_compra: d, detalle_compra: p }).eq('id', currentQRProductId);
    
    const item = inventory.find(i => i.id === currentQRProductId);
    Object.assign(item, { marca: b, modelo: m, fecha_compra: d, detalle_compra: p });

    const container = document.getElementById('qrcode-container');
    container.innerHTML = "";
    new QRCode(container, { text: `ID:${item.id}`, width: 200, height: 200 });

    document.getElementById('tech-info-display').innerHTML = `<b>Marca:</b> ${b}<br><b>Modelo:</b> ${m}<br><b>Compra:</b> ${p}`;
    document.getElementById('qr-form-section').style.display = 'none';
    document.getElementById('qr-result-section').style.display = 'block';
};

window.printQR = () => {
    const canvas = document.querySelector('#qrcode-container canvas');
    const win = window.open('', '', 'width=600,height=400');
    win.document.write(`<html><body style="text-align:center;"><h2>${document.getElementById('qr-product-name').innerText}</h2><img src="${canvas.toDataURL()}"><p>${document.getElementById('tech-info-display').innerHTML}</p><script>window.onload=()=>{window.print();window.close();}<\/script></body></html>`);
    win.document.close();
};

window.startScanner = async () => {
    document.getElementById('scanner-container').style.display = 'block';
    html5QrCode = new Html5Qrcode("reader");
    await html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, (text) => {
        const id = text.replace("ID:", "").trim();
        stopScanner();
        const item = inventory.find(i => i.id === id);
        if(item) showQR(item.id, item.nombre);
    });
};

window.stopScanner = async () => {
    if (html5QrCode) { await html5QrCode.stop(); html5QrCode = null; }
    document.getElementById('scanner-container').style.display = 'none';
};

window.handleAuth = async () => {
    const email = document.getElementById('email-auth').value;
    const password = document.getElementById('pass-auth').value;
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
        const { error: se } = await supabaseClient.auth.signUp({ email, password });
        if (se) alert(se.message); else alert("Confirma tu email");
    }
    checkUser();
};

window.logout = async () => { await supabaseClient.auth.signOut(); checkUser(); };

window.changeQty = async (id, val) => {
    const item = inventory.find(i => i.id === id);
    const newQty = Math.max(0, item.cantidad + val);
    await supabaseClient.from('productos').update({ cantidad: newQty }).eq('id', id);
    item.cantidad = newQty; render();
};

document.getElementById('inventory-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const item = { nombre: document.getElementById('name').value, cantidad: parseInt(document.getElementById('quantity').value), min_stock: parseInt(document.getElementById('min-stock').value) };
    const { data } = await supabaseClient.from('productos').insert([item]).select();
    if (data) { inventory.push(data[0]); render(); e.target.reset(); }
});

window.closeQRModal = () => document.getElementById('qr-modal').style.display = 'none';
window.resetModal = () => { document.getElementById('qr-form-section').style.display = 'block'; document.getElementById('qr-result-section').style.display = 'none'; };
window.onload = checkUser;