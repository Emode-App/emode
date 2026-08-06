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

/**
 * Product titles come from arbitrary websites and were being interpolated
 * straight into innerHTML in here. This document holds the user's access token
 * in chrome.storage and can call the extension APIs, so a product named
 * `<img src=x onerror=...>` on any store in the world would have run script in
 * that context. Everything from a page goes through this now.
 */
function escapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Ask the page what it is showing.
 *
 * The panel used to wait to be told, and the telling happens during page load —
 * so opening the panel on a page already loaded left it on "Detecting..."
 * forever, and switching tabs left it describing the previous one.
 */
async function refreshActiveProduct() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return;

        const response = await chrome.tabs.sendMessage(tab.id, { type: 'REQUEST_PRODUCT' });
        if (response?.product) {
            updateActiveProduct({ ...response.product, url: tab.url });
        } else {
            showNoProduct();
        }
    } catch {
        // No content script in this tab — chrome:// pages, the web store, a tab
        // opened before the extension was installed. Not an error worth showing.
        showNoProduct();
    }
}

// A drawn placeholder, not an empty src.
//
// removeAttribute('src') leaves the browser's broken-image icon sitting in
// the card - a torn page glyph, which reads as 'this is broken' rather than
// 'there is nothing here yet'. Inline SVG so it needs no network and no file.
const EMPTY_PRODUCT_IMAGE =
    'data:image/svg+xml;utf8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 64" fill="none">' +
        '<rect width="48" height="64" rx="6" fill="%23f2f2f0"/>' +
        '<path d="M18 20h12l3 5v17a2 2 0 0 1-2 2H17a2 2 0 0 1-2-2V25l3-5z" ' +
        'stroke="%23c9c7c2" stroke-width="2" stroke-linejoin="round"/>' +
        '<path d="M20 20a4 4 0 0 0 8 0" stroke="%23c9c7c2" stroke-width="2"/>' +
        '</svg>'
    );

function showNoProduct() {
    activeProduct = { title: 'No product on this page', image: '', price: '' };
    if (productTitle) productTitle.textContent = activeProduct.title;
    if (productPrice) productPrice.textContent = 'Open a product page to try something on';
    if (productImg) productImg.src = EMPTY_PRODUCT_IMAGE;
    if (tryOnBtn) tryOnBtn.disabled = true;
}

async function getAuthToken() {
    const { emode_access_token, emode_user_id, emode_user_email } =
        await chrome.storage.local.get(['emode_access_token', 'emode_user_id', 'emode_user_email']);
    return {
        token: emode_access_token || null,
        userId: emode_user_id || null,
        email: emode_user_email || null,
    };
}

/**
 * Initials from an email address.
 *
 * The tag is dropped first: brandonmtalla+logical@gmail.com is one person, and
 * reading the tag as a surname would render "BL" for somebody called Brandon.
 * Dots, underscores and hyphens do separate names, so those become two letters.
 */
function initialsFromEmail(email) {
    const local = String(email || '').split('@')[0].split('+')[0];
    const parts = local.split(/[._-]+/).filter(Boolean);
    if (!parts.length) return '';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}

/**
 * The header avatar said "US" for every person on earth — left over from the
 * placeholder avatar service, which was being asked for initials of a user
 * literally named "User".
 */
async function renderIdentity() {
    const el = document.getElementById('user-initial');
    if (!el) return;

    const { email } = await getAuthToken();
    const initials = initialsFromEmail(email);

    if (initials) {
        el.textContent = initials;
        el.title = email;
        el.classList.remove('avatar-signed-out');
        el.onclick = null;
        el.removeAttribute('role');
    } else {
        // Signed out. Inventing initials for nobody is worse than saying so, and
        // this is the natural place to offer the way in.
        el.textContent = '→';
        el.title = 'Sign in to emode';
        el.classList.add('avatar-signed-out');
        el.setAttribute('role', 'button');
        el.onclick = () => window.open(`${BASE_URL}/login`, '_blank');
    }
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
    if (tryOnBtn) tryOnBtn.disabled = false;

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
                <img src="${escapeHtml(item.image)}" style="width: 100%; height: 100%; object-fit: contain;" />
            </div>
            <div style="padding: 8px; display: flex; flex-direction: column; gap: 4px; flex: 1;">
                <h5 style="font-size: 0.7rem; font-weight: 700; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin: 0; line-height: 1.1;">
                    ${escapeHtml(item.title)}
                </h5>
                <p style="font-size: 0.65rem; color: #666; font-weight: 600;">${escapeHtml(item.price)}</p>
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

// A product image that fails to load leaves the same torn-page glyph, and
// merchant CDNs hotlink-block often enough that this is not rare.
if (productImg) {
    productImg.src = EMPTY_PRODUCT_IMAGE;
    productImg.addEventListener('error', () => {
        if (productImg.src !== EMPTY_PRODUCT_IMAGE) productImg.src = EMPTY_PRODUCT_IMAGE;
    });
}

async function loadCart() {
    const { emode_cart } = await chrome.storage.local.get({ emode_cart: [] });
    renderCart(emode_cart || []);
}

// "gucci.com" reads better than a full URL, and tells the shopper which of two
// saved lookalikes came from where.
function storeName(url) {
    if (!url) return '';
    try {
        return new URL(url).host.replace(/^www\./, '');
    } catch {
        return '';
    }
}

function renderCart(items) {
    if (!cartList || !cartTotal) return;

    // Purchased items stop counting toward the total - a running total that
    // includes things already bought is not a number anyone can use.
    const total = items
        .filter((item) => !item.purchasedAt)
        .reduce((sum, item) => sum + parseCartPrice(item.price), 0);
    cartTotal.textContent = `$${total.toFixed(2)}`;

    // Nothing to clear when there is nothing there, and a disabled-looking
    // control beside an empty list is just noise.
    const clearBtn = document.getElementById('btn-clear-cart');
    if (clearBtn) clearBtn.style.display = items.length ? 'inline-block' : 'none';

    if (items.length === 0) {
        cartList.innerHTML = `<div class="empty-state" style="grid-column: span 2;">Nothing saved yet.<br />Add items while browsing and they collect here, from any shop.</div>`;
        return;
    }

    cartList.innerHTML = '';
    items.slice().reverse().forEach(item => {
        const row = document.createElement('div');
        row.className = 'glass-card';
        row.style.cssText = 'padding:10px 12px;display:flex;align-items:center;gap:12px;background:white;';
        // The whole row opens the item, not just a button on the end of it. A
        // saved card IS a pointer to something for sale; making the shopper aim
        // at a 40px target to act on that is friction for no reason.
        const bought = !!item.purchasedAt;
        const store = storeName(item.url);
        row.style.cursor = item.url ? 'pointer' : 'default';
        row.innerHTML = `
            <img src="${escapeHtml(item.image)}" style="width:36px;height:44px;object-fit:contain;border-radius:6px;flex-shrink:0;background:#f5f5f5;${bought ? 'opacity:0.55;' : ''}" />
            <div style="flex:1;min-width:0;">
                <p style="font-size:0.75rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${bought ? 'color:#666;' : ''}">${escapeHtml(item.title)}</p>
                <p style="font-size:0.7rem;color:#666;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                    ${escapeHtml(item.price || 'Price unknown')}${store ? ' &middot; ' + escapeHtml(store) : ''}
                </p>
            </div>
            ${bought
                ? `<span style="background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;padding:5px 9px;border-radius:6px;font-size:9px;font-weight:800;letter-spacing:0.04em;flex-shrink:0;">PURCHASED</span>`
                : `<button class="btn-cart-buy" style="background:#111;color:white;border:none;padding:6px 10px;border-radius:6px;font-size:9px;font-weight:700;cursor:pointer;flex-shrink:0;">BUY</button>`}
            <button class="btn-cart-remove" style="background:none;border:none;color:rgba(0,0,0,0.3);cursor:pointer;font-size:16px;flex-shrink:0;">&times;</button>
        `;
        if (item.url) {
            row.onclick = (e) => {
                if (e.target.closest('.btn-cart-remove')) return;
                window.open(item.url, '_blank', 'noopener');
            };
        }
        const buyBtn = row.querySelector('.btn-cart-buy');
        if (buyBtn) buyBtn.onclick = () => window.open(item.url || BASE_URL, '_blank', 'noopener');
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

    await Promise.all([renderIdentity(), refreshActiveProduct(), loadWardrobe(), loadCart(), loadUsage()]);
}

// The panel outlives any one page, so it has to follow the user: a different
// tab, or a navigation within the same one, is a different product.
chrome.tabs.onActivated.addListener(() => refreshActiveProduct());
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.active) refreshActiveProduct();
});

// Re-check auth/usage whenever the bridged token changes (e.g. user just signed in)
chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.emode_access_token || changes.emode_user_email) {
        renderIdentity();
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

/* ------------------------------------------------------------------ *
 * Emptying the dressing room                                          *
 * ------------------------------------------------------------------ */

// Saved items had no way out except one at a time. A shopper who has been
// collecting for a week faces a column of little crosses, which is the kind of
// small indignity that makes people give up on a feature rather than complain
// about it.
//
// Confirmed, because it is not undoable and the items came from shops the
// shopper may not be able to find again.
const clearCartBtn = document.getElementById('btn-clear-cart');
if (clearCartBtn) {
    clearCartBtn.onclick = async () => {
        const { emode_cart } = await chrome.storage.local.get({ emode_cart: [] });
        const count = (emode_cart || []).length;
        if (!count) return;

        const noun = count === 1 ? 'item' : 'items';
        if (!confirm(`Remove all ${count} ${noun} from your dressing room?`)) return;

        await chrome.storage.local.set({ emode_cart: [] });
        renderCart([]);
    };
}

/* ------------------------------------------------------------------ *
 * "No buttons on this page?"                                          *
 * ------------------------------------------------------------------ */

/**
 * Detection will always be wrong on some shops. There are millions of them and
 * no rule covers every one — what decides whether that is a slow leak or a
 * fixable backlog is whether the failures are ever written down.
 *
 * Sends host and PATH only, never the full URL: a product URL routinely carries
 * a click id, a session token or an email address in its query string, and none
 * of that helps explain a missing button. Along with it goes what the detector
 * actually saw — which tier fired, whether a buy control was found, whether a
 * scan threw — because a report without that says only that something is wrong.
 */
const reportBtn = document.getElementById('btn-report');
const reportStatus = document.getElementById('report-status');

if (reportBtn) {
    reportBtn.onclick = async () => {
        reportBtn.disabled = true;
        const previous = reportBtn.textContent;
        reportBtn.textContent = 'Sending…';

        const say = (message, ok = true) => {
            if (!reportStatus) return;
            reportStatus.textContent = message;
            reportStatus.style.color = ok ? '#047857' : '#b91c1c';
            reportStatus.style.display = 'block';
        };

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            let diagnostics = null;
            try {
                const answer = await chrome.tabs.sendMessage(tab.id, { type: 'REQUEST_DIAGNOSTICS' });
                diagnostics = answer?.diagnostics || null;
            } catch {
                // No content script here — a chrome:// page, the web store, or a
                // tab that predates the install. Still worth reporting: "the
                // extension is not running here" is itself the answer.
                diagnostics = { contentScript: false };
            }

            let host = diagnostics?.host || '';
            let path = diagnostics?.path || '';
            if (!host && tab?.url) {
                try {
                    const url = new URL(tab.url);
                    host = url.host;
                    path = url.pathname;
                } catch { /* not a reportable URL */ }
            }

            if (!host) {
                say('There is no shop on this tab to report.', false);
                return;
            }

            const res = await fetch(`${BASE_URL}/api/report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ host, path, diagnostics }),
            });
            if (!res.ok) throw new Error('Report failed');

            say(`Thanks — we'll take a look at ${host}.`);
            reportBtn.style.display = 'none';
        } catch {
            say('Could not send that just now. Try again in a moment.', false);
        } finally {
            reportBtn.disabled = false;
            reportBtn.textContent = previous;
        }
    };
}
