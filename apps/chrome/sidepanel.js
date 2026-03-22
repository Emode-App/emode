// emodeAI | Side Panel Script
const BASE_URL = 'http://localhost:3000';

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

// Listen for messages from content scripts or background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'PRODUCT_DETECTED') {
        updateActiveProduct(message.product);
    } else if (message.type === 'WARDROBE_UPDATED') {
        loadWardrobe();
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
    const modalUrl = `${BASE_URL}/modal?title=${encodeURIComponent(activeProduct.title)}&image=${encodeURIComponent(activeProduct.image)}&price=${encodeURIComponent(activeProduct.price)}`;
    window.open(modalUrl, 'emodeAI_TryOn', 'width=1100,height=850');
});

// Initialize
async function init() {
    console.log('emodeAI Side Panel Initialized');
    await loadWardrobe();
}

async function loadWardrobe() {
    try {
        const response = await fetch(`${BASE_URL}/api/dressing-room/list`);
        if (!response.ok) {
            if (response.status === 401) {
                renderLoginState();
            }
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
            <p style="margin-bottom: 16px;">Sign in to emode.ai to see your Cloud Closet.</p>
            <button id="btn-login-sidebar" class="btn-try-on" style="margin-top: 0;">Sign In</button>
        </div>
    `;
    const loginBtn = document.getElementById('btn-login-sidebar');
    if (loginBtn) loginBtn.onclick = () => window.open(BASE_URL, '_blank');
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
