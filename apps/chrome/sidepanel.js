// emodeAI | Side Panel Script

// Points at production; see the storage override below for local work.
// Live origin. www is canonical — the apex 308-redirects to it, and an
// extra hop on every API call is wasteful. Override for local work with:
//   chrome.storage.local.set({ emode_dev_base_url: 'http://localhost:3000' })
let BASE_URL = 'https://www.emode.style';

// State
let activeProduct = {
    title: 'Detecting...',
    image: '',
    price: '...'
};

// UI Elements
const productImg = document.getElementById('active-product-img');
const productTitle = document.getElementById('active-product-title');
const productPrice = document.getElementById('active-product-price');
const tryOnBtn = document.getElementById('btn-try-on');
const wardrobeGrid = document.getElementById('wardrobe-grid');
const cartList = document.getElementById('cart-list');
const cartTotal = document.getElementById('cart-total');
const usageProgress = document.getElementById('usage-progress');
const usageCount = document.getElementById('usage-count');
const upgradeSection = document.getElementById('upgrade-section');

async function getAuthToken() {
    const { emode_access_token, emode_user_id } = await chrome.storage.local.get(['emode_access_token', 'emode_user_id']);
    return { token: emode_access_token || null, userId: emode_user_id || null };
}

// Listen for messages from content scripts (also fires live while the panel is open)
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'PRODUCT_DETECTED') {
        updateActiveProduct(message.product);
    } else if (message.type === 'WARDROBE_UPDATED') {
        loadWardrobe();
    } else if (message.type === 'CART_ADD') {
        loadCart();
    }
});

function updateActiveProduct(product) {
    if (!product) return;
    activeProduct = { ...activeProduct, ...product };

    if (productImg && activeProduct.image) productImg.src = activeProduct.image;
    if (productTitle) productTitle.textContent = activeProduct.title;
    if (productPrice) productPrice.textContent = activeProduct.price || 'Detected on page';

    const card = document.querySelector('.active-product-card');
    if (card) {
        card.style.animation = 'none';
        card.offsetHeight; // trigger reflow
        card.style.animation = 'pulse 0.5s ease-in-out';
    }
}

// Handle Try-On click
tryOnBtn.addEventListener('click', () => {
    let originParam = '';
    try {
        if (activeProduct.url) originParam = `&origin=${encodeURIComponent(new URL(activeProduct.url).host)}`;
    } catch (e) { /* malformed URL — skip outbound link */ }
    const modalUrl = `${BASE_URL}/modal?title=${encodeURIComponent(activeProduct.title)}&image=${encodeURIComponent(activeProduct.image)}&price=${encodeURIComponent(activeProduct.price)}${originParam}`;
    window.open(modalUrl, 'emodeAI_TryOn', 'width=1100,height=850');
});

// ── Cloud Closet (Wardrobe) — requires sign-in, synced via Supabase ──
async function loadWardrobe() {
    try {
        const { token } = await getAuthToken();
        if (!token) {
            renderLoginState();
            return;
        }

        const response = await fetch(`${BASE_URL}/api/dressing-room/list`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) {
            if (response.status === 401) renderLoginState();
            return;
        }

        const data = await response.json();
        renderWardrobe(data.items);
    } catch (err) {
        console.error('Failed to load wardrobe', err);
    }
}

function renderLoginState() {
    if (!wardrobeGrid) return;
    wardrobeGrid.innerHTML = `
        <div class="empty-state" style="border-style: solid; border-color: #6366f1; background: rgba(99, 102, 241, 0.05); grid-column: span 2;">
            <p style="color: #6366f1; font-weight: 700; margin-bottom: 8px;">Login Required</p>
            <p style="margin-bottom: 16px;">Sign in to emode.style to see your Cloud Closet.</p>
            <button id="btn-login-sidebar" class="btn-try-on" style="margin-top: 0;">Sign In</button>
        </div>
    `;
    const loginBtn = document.getElementById('btn-login-sidebar');
    if (loginBtn) loginBtn.onclick = () => window.open(`${BASE_URL}/login`, '_blank');
}

function renderWardrobe(items) {
    if (!wardrobeGrid) return;
    if (!items || items.length === 0) {
        wardrobeGrid.innerHTML = `
            <div class="empty-state" style="grid-column: span 2;">
                Your Cloud Closet is empty.<br />
                Add items while browsing!
            </div>
        `;
        return;
    }

    wardrobeGrid.innerHTML = '';
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'wardrobe-item glass-card';
        div.style.padding = '0';
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.background = 'white';

        div.innerHTML = `
            <div style="height: 120px; overflow: hidden; position: relative; border-radius: 12px 12px 0 0;">
                <img src="${item.image}" style="width: 100%; height: 100%; object-fit: cover;" />
            </div>
            <div style="padding: 8px; display: flex; flex-direction: column; gap: 4px; flex: 1;">
                <h5 style="font-size: 0.7rem; font-weight: 700; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin: 0; line-height: 1.1;">
                    ${item.title}
                </h5>
                <p style="font-size: 0.65rem; color: #666; font-weight: 600;">${item.price}</p>
                <button class="btn-buy" style="margin-top: auto; width: 100%; background: #111; color: white; border: none; padding: 6px; border-radius: 6px; font-size: 9px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
                    BUY NOW
                </button>
            </div>
        `;

        div.querySelector('.btn-buy').onclick = (e) => {
            e.stopPropagation();
            window.open(item.url || BASE_URL, '_blank');
        };

        wardrobeGrid.appendChild(div);
    });
}

// ── Local Cart — no account required, works across every site you visit ──
function parseCartPrice(text) {
    if (!text) return 0;
    const match = String(text).match(/[\d,.]+/);
    if (!match) return 0;
    const val = parseFloat(match[0].replace(/,/g, ''));
    return isNaN(val) ? 0 : val;
}

async function loadCart() {
    const { emode_cart } = await chrome.storage.local.get({ emode_cart: [] });
    renderCart(emode_cart || []);
}

function renderCart(items) {
    if (!cartList || !cartTotal) return;

    const total = items.reduce((sum, item) => sum + parseCartPrice(item.price), 0);
    cartTotal.textContent = `$${total.toFixed(2)}`;

    if (items.length === 0) {
        cartList.innerHTML = `<div class="empty-state" style="grid-column: span 2;">No items saved yet.<br />Add items while browsing to build your cart.</div>`;
        return;
    }

    cartList.innerHTML = '';
    items.slice().reverse().forEach(item => {
        const row = document.createElement('div');
        row.className = 'glass-card';
        row.style.cssText = 'padding:10px 12px;display:flex;align-items:center;gap:12px;background:white;';
        row.innerHTML = `
            <img src="${item.image}" style="width:36px;height:44px;object-fit:cover;border-radius:6px;flex-shrink:0;" />
            <div style="flex:1;min-width:0;">
                <p style="font-size:0.75rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.title}</p>
                <p style="font-size:0.7rem;color:#666;">${item.price || 'Price unknown'}</p>
            </div>
            <button class="btn-cart-buy" style="background:#111;color:white;border:none;padding:6px 10px;border-radius:6px;font-size:9px;font-weight:700;cursor:pointer;flex-shrink:0;">BUY</button>
            <button class="btn-cart-remove" style="background:none;border:none;color:rgba(0,0,0,0.3);cursor:pointer;font-size:16px;flex-shrink:0;">&times;</button>
        `;
        row.querySelector('.btn-cart-buy').onclick = () => window.open(item.url || BASE_URL, '_blank');
        row.querySelector('.btn-cart-remove').onclick = async () => {
            const { emode_cart } = await chrome.storage.local.get({ emode_cart: [] });
            const updated = (emode_cart || []).filter(i => i.id !== item.id);
            await chrome.storage.local.set({ emode_cart: updated });
            renderCart(updated);
        };
        cartList.appendChild(row);
    });
}

// ── Usage / entitlement ──
async function loadUsage() {
    const { token, userId } = await getAuthToken();
    if (!token) {
        if (usageCount) usageCount.textContent = 'Sign in to track usage';
        if (usageProgress) usageProgress.style.width = '0%';
        if (upgradeSection) upgradeSection.style.display = 'none';
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/api/entitlements/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) return;
        const data = await response.json();
        renderUsage(data, userId);
    } catch (err) {
        console.error('Failed to load usage', err);
    }
}

function renderUsage(data, userId) {
    const { unlimited, dailyLimit, used } = data;

    if (unlimited) {
        if (usageCount) usageCount.textContent = 'Unlimited';
        if (usageProgress) usageProgress.style.width = '100%';
        if (upgradeSection) upgradeSection.style.display = 'none';
        return;
    }

    const pct = dailyLimit > 0 ? Math.min(100, (used / dailyLimit) * 100) : 0;
    if (usageCount) usageCount.textContent = `${used} / ${dailyLimit}`;
    if (usageProgress) usageProgress.style.width = `${pct}%`;

    if (upgradeSection) {
        upgradeSection.style.display = used >= dailyLimit ? 'block' : 'none';
    }

    const upgradeBtn = document.getElementById('btn-upgrade');
    if (upgradeBtn && !upgradeBtn.dataset.bound) {
        upgradeBtn.dataset.bound = 'true';
        upgradeBtn.onclick = async () => {
            if (!userId) return;
            upgradeBtn.textContent = 'Loading...';
            try {
                const res = await fetch(`${BASE_URL}/api/stripe/checkout`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ planId: 'chrome_unlimited', userId, platform: 'chrome' })
                });
                const json = await res.json();
                if (json.url) window.open(json.url, '_blank');
            } finally {
                upgradeBtn.textContent = 'Upgrade — $5/mo Unlimited';
            }
        };
    }
}

// Initialize
async function init() {
    console.log('emodeAI Side Panel Initialized');
    const { emode_dev_base_url } = await chrome.storage.local.get('emode_dev_base_url');
    if (emode_dev_base_url) BASE_URL = emode_dev_base_url;

    await Promise.all([loadWardrobe(), loadCart(), loadUsage()]);
}

// Re-check auth/usage whenever the bridged token changes (e.g. user just signed in)
chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.emode_access_token) {
        loadWardrobe();
        loadUsage();
    }
    if (changes.emode_cart) {
        loadCart();
    }
});

init();

// Animation CSS
if (!document.getElementById('emode-sidepanel-styles')) {
    const style = document.createElement('style');
    style.id = 'emode-sidepanel-styles';
    style.textContent = `
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.02); }
            100% { transform: scale(1); }
        }
    `;
    document.head.appendChild(style);
}
