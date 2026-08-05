// emodeAI | Universal Widget Content Script

console.log('emodeAI | Universal Widget Active.');

// ⚠️ SHIP-TIME TODO: flip this default to 'https://<your-production-domain>'
// before submitting to the Chrome Web Store. It's localhost while the app has
// no live deployment. The storage override below works in either direction:
// chrome.storage.local.set({ emode_dev_base_url: '<url>' }) in the service
// worker console.
// Live origin. www is canonical — the apex 308-redirects to it, and an
// extra hop on every API call is wasteful. Override for local work with:
//   chrome.storage.local.set({ emode_dev_base_url: 'http://localhost:3000' })
let BASE_URL = 'https://www.emode.style';
try {
    chrome.storage?.local?.get('emode_dev_base_url', (result) => {
        if (result && result.emode_dev_base_url) BASE_URL = result.emode_dev_base_url;
    });
} catch (e) { /* storage unavailable, keep default */ }

const ECOM_KEYWORDS = ['ADD TO', 'BAG', 'TOTE', 'BASKET', 'BUY', 'BUY NOW', 'CHECKOUT', 'PURCHASE'];

function isEmodeApp() {
    return window.location.origin === BASE_URL ||
        window.location.hostname === 'emode.style' ||
        window.location.hostname === 'emode.ai' ||
        // Only emode's own local dev server, not every localhost. A merchant
        // building their store on localhost:3100 is running a storefront, and
        // treating all of localhost as "this is emode" silently switched the
        // extension off on exactly the sites developers test with.
        (window.location.hostname === 'localhost' && window.location.port === '3000') ||
        window.location.pathname.startsWith('/modal');
}

// Relay detected product context to the side panel (best-effort; side panel may not be open)
function notifyProductDetected(context) {
    if (!context) return;
    try {
        chrome.runtime.sendMessage({
            type: 'PRODUCT_DETECTED',
            product: { ...context, url: window.location.href }
        });
    } catch (e) { /* extension context invalidated (e.g. mid-reload) — ignore */ }
}

// Persist a locally-tracked cart item (no account required) and notify the side panel
function addToLocalCart(context) {
    if (!context) return;
    try {
        chrome.runtime.sendMessage({
            type: 'CART_ADD',
            item: { title: context.title, image: context.image, price: context.price, url: window.location.href }
        });
    } catch (e) { /* extension context invalidated — ignore */ }
}

function showToast(message) {
    const existing = document.querySelector('.emode-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'emode-toast';
    toast.innerHTML = `
        <div style="background: rgba(0,0,0,0.95); color: white; padding: 12px 24px; border-radius: 50px; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(10px); pointer-events: auto;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="color: #10b981;"><polyline points="20 6 9 17 4 12"></polyline></svg>
            ${message.toUpperCase()}
        </div>
    `;
    toast.style.cssText = `
        position: fixed;
        bottom: 50px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 2147483647;
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.bottom = '60px';
    }, 10);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.bottom = '50px';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Is this a product page?
 *
 * Delegates to detect.js, which the widget's detection was ported into after it
 * was verified against real storefronts. What this replaced tested for
 * og:type="product" or a button whose text contained "add to"/"bag"/"buy" —
 * conventions, not standards, and the stores most worth supporting are the least
 * likely to follow them. Gucci sets no og:type and shows "SELECT SIZE" until a
 * size is chosen, so a $2,250 jacket page was ruled out while the page carried
 * complete Product JSON-LD the whole time.
 */
function isPDP() {
    if (isEmodeApp()) return false;
    if (!global_detect()) return false;
    return global_detect().isProductPage();
}

/** detect.js runs first in the same content-script scope; guard anyway so a
 *  load-order regression degrades instead of throwing on every page. */
function global_detect() {
    return (typeof window !== 'undefined' && window.emodeDetect) || null;
}

function isCatalogPage() {
    if (isEmodeApp() || isPDP()) {
        console.log('[emodeAI] Not catalog - is Emode app or PDP');
        return false;
    }

    const text = document.body.innerText.toUpperCase();

    // Check for catalog keywords (expanded list)
    const catalogKeywords = ['FILTER', 'SORT BY', 'SORT:', 'CATEGORY', 'CATEGORIES', 'SHOP ALL', 'VIEW ALL', 'DESIGNERS', 'BRANDS', 'TRENDING', 'NEW IN', 'LATEST'];
    const keywordMatches = catalogKeywords.filter(kw => text.includes(kw)).length;

    // Check for item count patterns (e.g., "24 items", "156 products", "42 results")
    const hasItemCount = /\d+\s+(ITEMS|PRODUCTS|RESULTS)/i.test(text);

    // Check for catalog-related CSS classes (expanded)
    const catalogSelectors = [
        '.product-grid', '.product-list', '.collection', '.catalog',
        '[class*="product-grid"]', '[class*="product-list"]', '[class*="grid"]',
        '[class*="catalog"]', '[class*="collection"]', '[class*="products"]'
    ];
    const hasCatalogContainer = catalogSelectors.some(sel => document.querySelector(sel));

    // Check for multiple product images (images with product links or prices nearby)
    const allImages = Array.from(document.querySelectorAll('img')).filter(img => {
        const rect = img.getBoundingClientRect();
        return rect.width > 100 && rect.height > 100 && img.offsetWidth > 0;
    });

    let productCardCount = 0;
    for (const img of allImages.slice(0, 20)) { // Check only first 20 images for performance
        const container = findProductContainer(img);
        if (container) {
            const hasPrice = /\$\s?\d+/.test(container.innerText);
            const hasProductLink = container.querySelector('a[href*="/product"], a[href*="/p/"], a[href*="/item"], a[href*="/products"]');
            if (hasPrice || hasProductLink) {
                productCardCount++;
                if (productCardCount >= 3) break; // Lowered from 4 to 3
            }
        }
    }

    const hasMultipleProductCards = productCardCount >= 3;

    // Catalog detection: needs at least 1 positive signal (more lenient)
    // OR if we have multiple product cards, that's enough on its own
    const positiveSignals = [
        keywordMatches >= 1,
        hasItemCount,
        hasCatalogContainer,
        hasMultipleProductCards
    ].filter(Boolean).length;

    console.log('[emodeAI] Catalog Detection:', {
        keywordMatches,
        hasItemCount,
        hasCatalogContainer,
        productCardCount,
        hasMultipleProductCards,
        positiveSignals,
        isCatalog: positiveSignals >= 1
    });

    return positiveSignals >= 1;
}

function isValidProductCard(img) {
    if (!img || img.tagName !== 'IMG') return false;

    const rect = img.getBoundingClientRect();
    if (rect.width < 150 || rect.height < 150) return false;

    // Find container
    const container = findProductContainer(img);
    if (!container) {
        console.log('[emodeAI] No container found for image');
        return false;
    }

    const containerText = container.innerText || '';

    // Check if there's a price nearby (preferred but not required)
    const hasPrice = /\$\s?\d+/.test(containerText);

    // Check for product page link (many catalog items link to product pages)
    const hasProductLink = container.querySelector('a[href*="/product"], a[href*="/p/"], a[href*="/item"], a[href*="/products"]');

    // Check for title or valid image alt
    const hasValidAlt = img.alt && img.alt.trim().length > 3 && !isGenericTitle(img.alt);

    // Look for text elements near the image (within 200px below)
    const imgRect = img.getBoundingClientRect();
    const nearbyTextElements = Array.from(container.querySelectorAll('span, div, p, h1, h2, h3, h4, a'))
        .filter(el => {
            if (el.children.length > 0) return false;
            const elRect = el.getBoundingClientRect();
            const text = el.innerText?.trim() || '';

            // Must be below the image and close horizontally
            const verticalDist = elRect.top - imgRect.bottom;
            const horizontalDist = Math.abs(elRect.left - imgRect.left);

            return text.length > 3 &&
                   !text.includes('$') &&
                   verticalDist > -30 && verticalDist < 200 &&
                   horizontalDist < 300 &&
                   el.offsetWidth > 0 &&
                   !ECOM_KEYWORDS.some(k => text.toUpperCase().includes(k));
        });

    const hasNearbyTitle = nearbyTextElements.length > 0;

    const isValid = (hasPrice || hasProductLink) && (hasValidAlt || hasNearbyTitle);

    console.log('[emodeAI] Product Card Validation:', {
        imgSrc: img.src.substring(0, 50),
        hasPrice,
        hasProductLink: !!hasProductLink,
        hasValidAlt,
        imgAlt: img.alt,
        nearbyTitleCount: nearbyTextElements.length,
        hasNearbyTitle,
        isValid
    });

    // Valid if: (has price OR has product link) AND (has valid alt OR has nearby title)
    return isValid;
}


function findProductContainer(img) {
    // Find the smallest container that includes both image and price
    let parent = img.parentElement;
    let depth = 0;
    let bestContainer = img.parentElement;

    while (parent && depth < 8) {
        const text = parent.innerText || '';
        const hasPrice = /\$\s?\d+/.test(text);

        if (hasPrice) {
            bestContainer = parent;
            // Keep looking for a slightly larger container that might include title
            // but stop if we get too large (more than 3x the image size)
            const parentRect = parent.getBoundingClientRect();
            const imgRect = img.getBoundingClientRect();
            const sizeRatio = (parentRect.width * parentRect.height) / (imgRect.width * imgRect.height);

            if (sizeRatio > 15) {
                // Container is too large, previous one was better
                break;
            }
        }

        parent = parent.parentElement;
        depth++;
    }

    return bestContainer;
}

function parsePrice(text) {
    if (!text) return Infinity;
    // Improved regex to capture the entire numeric group: $1,565.00
    // Matches $ followed by digits, commas, and dots.
    const match = text.match(/\$\s?([\d,.]+)/);
    if (!match) return Infinity;

    let raw = match[1];

    // Logic to distinguish between $1,500.00 and $1.500,00 (European)
    // If there's a dot followed by 2 digits at the end, it's likely decimal.
    // If there's a comma followed by 2 digits at the end, it's likely decimal.
    const hasComma = raw.includes(',');
    const hasDot = raw.includes('.');

    if (hasComma && hasDot) {
        // Both exist: usually 1,234.56
        if (raw.indexOf(',') < raw.indexOf('.')) {
            raw = raw.replace(/,/g, '');
        } else {
            // European 1.234,56
            raw = raw.replace(/\./g, '').replace(',', '.');
        }
    } else if (hasComma) {
        // Only comma: could be 1,234 or 12,34
        if (raw.split(',').pop().length === 3) {
            raw = raw.replace(/,/g, ''); // Thousands
        } else {
            raw = raw.replace(',', '.'); // Decimal
        }
    } else if (hasDot) {
        // Only dot: could be 1.234 or 12.34
        if (raw.split('.').pop().length === 3) {
            raw = raw.replace(/\./g, ''); // Thousands
        }
    }

    const val = parseFloat(raw);
    return isNaN(val) ? Infinity : val;
}

function isStruckThrough(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    const textDecoration = style.textDecorationLine || style.textDecoration || '';
    if (textDecoration.includes('line-through')) return true;
    if (el.tagName === 'DEL' || el.tagName === 'S' || el.tagName === 'STRIKE') return true;
    // Check parents too (up to 2 levels)
    let p = el.parentElement;
    for (let i = 0; i < 2 && p; i++) {
        const ps = window.getComputedStyle(p);
        const pDecoration = ps.textDecorationLine || ps.textDecoration || '';
        if (pDecoration.includes('line-through')) return true;
        if (p.tagName === 'DEL' || p.tagName === 'S' || p.tagName === 'STRIKE') return true;
        p = p.parentElement;
    }
    return false;
}

function isOverlayElement(el) {
    // Filter out popups, modals, cookie banners, navigation, etc.
    if (!el) return false;

    // Check element and its parents (up to 5 levels) for overlay indicators
    let current = el;
    for (let i = 0; i < 5 && current; i++) {
        const className = (current.className || '').toLowerCase();
        const id = (current.id || '').toLowerCase();
        const role = (current.getAttribute('role') || '').toLowerCase();

        // Common overlay/modal patterns
        const overlayPatterns = [
            'modal', 'popup', 'overlay', 'dialog', 'cookie', 'banner',
            'notification', 'alert', 'toast', 'drawer', 'sidebar',
            'nav', 'menu', 'header', 'footer', 'consent', 'gdpr'
        ];

        if (overlayPatterns.some(p => className.includes(p) || id.includes(p) || role.includes(p))) {
            return true;
        }

        // Check for high z-index (common for overlays)
        const zIndex = parseInt(window.getComputedStyle(current).zIndex);
        if (zIndex > 1000) return true;

        // Check for fixed/absolute positioning that covers content
        const position = window.getComputedStyle(current).position;
        if ((position === 'fixed' || position === 'absolute') && current.offsetWidth > window.innerWidth * 0.5) {
            return true;
        }

        current = current.parentElement;
    }

    return false;
}

function isGenericTitle(title) {
    if (!title) return true;
    const t = title.toUpperCase();

    // Reject file extensions
    const fileExtensions = ['.JPG', '.JPEG', '.PNG', '.GIF', '.WEBP', '.HEIC', '.HEIF', '.SVG', '.BMP'];
    if (fileExtensions.some(ext => t.includes(ext))) return true;

    // Explicitly reject common e-commerce badges/labels
    if (t.includes('%') || t.includes(' OFF') || t.includes('SAVE $')) return true;
    const labels = ['SALE', 'NEW', 'BESTSELLER', 'LIMITED', 'SOLD OUT', 'PRE-ORDER', 'EXCLUSIVE'];
    if (labels.some(l => t === l || t.startsWith(l + ' '))) return true;

    // Reject common UI/overlay text
    const uiTerms = ['COOKIE', 'ACCEPT', 'REJECT', 'CLOSE', 'DISMISS', 'SIGN IN', 'LOG IN', 'SUBSCRIBE', 'NEWSLETTER'];
    if (uiTerms.some(term => t.includes(term))) return true;

    const genericTerms = ['IMAGE', 'PRODUCT', 'PHOTO', 'PICTURE', 'IMG_', 'DSC_', 'SHOT', 'FRONT', 'BACK', 'SIDE'];
    const hasGeneric = genericTerms.some(term => t.includes(term));
    const isMostlyNumbers = (title.replace(/[^0-9]/g, '').length / title.length) > 0.5;
    const isTooShort = title.length < 3;

    // Reject long descriptions (often AI-generated alt tags).
    // Count only commas/semicolons — periods are common in legit brand names
    // and acronyms ("A.L.O.C.S. T-Shirt"), which must NOT be rejected.
    const words = title.split(/\s+/).filter(w => w.length > 0);
    const hasManyPunctuation = (title.match(/[,;]/g) || []).length > 2;
    const isTooLong = words.length > 15;

    return hasGeneric || isMostlyNumbers || isTooShort || isTooLong || hasManyPunctuation;
}

function extractFromContainer(container, img) {
    console.group('[emodeAI] Structural Extraction');

    const imgRect = img.getBoundingClientRect();

    // Title is resolved below — visible on-card text FIRST, image alt only as
    // fallback. The modal must show exactly what the shopper sees on the card;
    // alt text often carries metadata the card doesn't display ("... BY BRAND").
    let title = '';

    // 2. Find ALL Prices near the image and pick the CHEAPEST ACTIVE price
    const priceElements = Array.from(container.querySelectorAll('*'))
        .filter(el => el.children.length === 0 && /\$\s?\d+/.test(el.textContent) && el.offsetWidth > 0)
        .filter(el => !isStruckThrough(el));

    const priceValues = priceElements.map(el => {
        const textMatch = el.textContent.match(/\$\s?[\d,.]+/);
        const elRect = el.getBoundingClientRect();
        const verticalDist = elRect.top - imgRect.bottom;
        const horizontalDist = Math.abs(elRect.left - imgRect.left);

        return {
            el,
            value: parsePrice(el.textContent),
            text: textMatch ? textMatch[0] : null,
            verticalDist,
            horizontalDist,
            centerX: elRect.left + elRect.width / 2,
            fontSize: parseFloat(window.getComputedStyle(el).fontSize) || 0
        };
    }).filter(p =>
        p.value !== Infinity && p.value > 0.5 &&
        p.verticalDist > -50 && p.verticalDist < 300 &&
        // Same-column constraint — don't inherit a neighboring card's price
        p.centerX > imgRect.left - 40 && p.centerX < imgRect.right + 40
    );

    // Sort by proximity first, then by value
    priceValues.sort((a, b) => {
        const distA = Math.sqrt(a.verticalDist * a.verticalDist + a.horizontalDist * a.horizontalDist);
        const distB = Math.sqrt(b.verticalDist * b.verticalDist + b.horizontalDist * b.horizontalDist);
        if (Math.abs(distA - distB) < 50) {
            // If both are similarly close, prefer the cheaper one
            return a.value - b.value;
        }
        return distA - distB;
    });

    let price = priceValues[0]?.text || null;

    // If no price found nearby, try to find a link to the product page and extract from there
    if (!price) {
        const linkElement = container.querySelector('a[href*="/product"], a[href*="/p/"], a[href*="/item"]');
        if (linkElement) {
            // Check if the link text or nearby elements contain price info
            const linkText = linkElement.innerText || '';
            const priceMatch = linkText.match(/\$\s?[\d,.]+/);
            if (priceMatch) {
                price = priceMatch[0];
            }
        }
    }

    // Final fallback - some sites show price on hover or use data attributes
    if (!price) {
        const priceDataAttr = container.querySelector('[data-price], [data-product-price]');
        if (priceDataAttr) {
            const attrPrice = priceDataAttr.getAttribute('data-price') || priceDataAttr.getAttribute('data-product-price');
            if (attrPrice && !isNaN(parseFloat(attrPrice))) {
                price = `$${parseFloat(attrPrice).toFixed(2)}`;
            }
        }
    }

    // If still no price, leave it empty (modal will handle display)
    price = price || '';
    console.log('Price Selection (Lowest Active, Proximity-Based):', price || 'No price found');

    // 3. Visible on-card title — always the first choice
    {
        const candidates = Array.from(container.querySelectorAll('span, div, p, b, strong, h1, h2, h3, h4, a, .name, .product-title, [class*="title"], [class*="name"]'))
            .filter(el => {
                const text = el.innerText?.trim();
                if (!text || text.length < 3 || el.children.length > 0 || el.offsetWidth === 0) return false;
                if (text.includes('$') || ECOM_KEYWORDS.some(k => text.toUpperCase().includes(k))) return false;
                if (isGenericTitle(text)) return false;

                const elRect = el.getBoundingClientRect();
                const verticalDist = elRect.top - imgRect.bottom;

                // Must be below the image AND in the same grid column — the
                // candidate's horizontal center must fall within the hovered
                // image's span, so a neighboring card's title can never win.
                const elCenterX = elRect.left + elRect.width / 2;
                const withinColumn = elCenterX > imgRect.left - 40 && elCenterX < imgRect.right + 40;
                return verticalDist > -30 && verticalDist < 200 && withinColumn;
            })
            .map(el => {
                const elRect = el.getBoundingClientRect();
                const verticalDist = elRect.top - imgRect.bottom;
                const horizontalDist = Math.abs(elRect.left - imgRect.left);
                const hasProductClass = el.className.toLowerCase().includes('title') ||
                                       el.className.toLowerCase().includes('name') ||
                                       el.className.toLowerCase().includes('product');

                return {
                    el,
                    text: el.innerText.trim(),
                    verticalDist,
                    horizontalDist,
                    distance: Math.sqrt(verticalDist * verticalDist + horizontalDist * horizontalDist),
                    hasProductClass
                };
            })
            .sort((a, b) => {
                // Prioritize elements with product-related classes
                if (a.hasProductClass && !b.hasProductClass) return -1;
                if (!a.hasProductClass && b.hasProductClass) return 1;
                // Then sort by proximity
                return a.distance - b.distance;
            });

        title = candidates[0]?.text || '';
        console.log('Title Selection (Visible on-card text):', title || '(none found)');
    }

    // Fallback: image alt — only when the card shows no scrapable title at all
    if (!title) {
        const alt = img.alt?.trim();
        if (alt && !isGenericTitle(alt)) {
            console.log('Falling back to Image Alt:', alt);
            title = alt;
        }
    }

    title = cleanTitle(title);

    console.log('Final Choice:', { title, price });
    console.groupEnd();

    return { title, image: img.src, price };
}



function cleanTitle(title) {
    if (!title) return 'Unknown Product';

    // 1. Strip Massive Page Blobs (Navigation/SEO garbage)
    const junkPhrases = [
        'SKIP TO MAIN CONTENT', 'ACCESSIBILITY', 'USE KEYBOARD ARROWS',
        'FREE SHIPPING', 'RETURNS', 'SIGN IN', 'CREATE ACCOUNT',
        'WISH LIST', 'ADD TO BAG', 'VIEW DETAILS', 'ESTIMATED DELIVERY'
    ];

    let cleaned = title;
    junkPhrases.forEach(phrase => {
        const regex = new RegExp(phrase, 'gi');
        cleaned = cleaned.replace(regex, '');
    });

    // 2. Anti-SKU Filter: Strip purely alphanumeric codes (e.g. RHSS24JA05307108, Rhss24)
    // Looks for 5+ chars with a mix of letters and numbers
    cleaned = cleaned.replace(/\b[A-Za-z0-9]{4,}[0-9][A-Za-z0-9]*\b/g, '');

    // 3. Fix run-together words
    cleaned = cleaned.replace(/([a-z0-9])([A-Z])/g, '$1 $2');

    // 4. Remove site suffixes
    cleaned = cleaned.replace(/\s+[\-\|]\s+[A-Z][a-z]+.*$/, '');
    const commonSites = ['Zara', 'Gucci', 'StockX', 'Nordstrom', 'Nike', 'Adidas', 'Amazon', 'Farfetch', 'Lyst', 'TheDesignerBox', 'Net-A-Porter', 'SSENSE'];
    commonSites.forEach(site => {
        const regex = new RegExp(`\\s*[\\-\\|]?\\s*${site}\\s*$`, 'i');
        cleaned = cleaned.replace(regex, '');
    });

    // 5. Hard Length Limit
    if (cleaned.length > 150) {
        cleaned = cleaned.substring(0, 147) + '...';
    }

    // 6. Preserve the site's own casing exactly — the modal must show the
    // title as the shopper sees it, not a re-formatted version.
    const result = cleaned.trim().replace(/\s+/g, ' ');
    return result || 'Unknown Product';
}

function extractProductContext() {
    console.group('[emodeAI] PDP Context Extraction');

    const metaPriceVal = document.querySelector('meta[property="product:price:amount"], meta[property="og:price:amount"]')?.content;

    // 1. Find the price element
    const allPrices = Array.from(document.querySelectorAll('span, div, p, b, strong, i, em, [class*="price"], [id*="price"]'))
        .filter(el => {
            const text = el.innerText?.trim() || '';
            const rect = el.getBoundingClientRect();
            return text.length > 0 && text.length < 30 && /\$\s?\d+/.test(text) && rect.width > 0 && !isStruckThrough(el);
        });

    const pricesWithStyles = allPrices.map(el => {
        const style = window.getComputedStyle(el);
        return { el, rect: el.getBoundingClientRect(), size: parseFloat(style.fontSize) || 0, val: parsePrice(el.innerText) };
    }).sort((a, b) => b.size - a.size);

    const priceElement = pricesWithStyles[0];
    let priceText = '';

    if (priceElement) {
        const cluster = pricesWithStyles.filter(p => {
            const dist = Math.sqrt(Math.pow(p.rect.left - priceElement.rect.left, 2) + Math.pow(p.rect.top - priceElement.rect.top, 2));
            return dist < 150;
        }).sort((a, b) => a.val - b.val);

        priceText = cluster[0]?.el.innerText.match(/\$\s?[\d,.]+/)?.[0] || '';
    } else if (metaPriceVal) {
        priceText = `$${metaPriceVal}`;
    }

    // 2. Find the product title - grab the largest text NEAR THE PRICE
    let title = '';

    if (priceElement) {
        const priceRect = priceElement.rect;

        // Find all text elements near the price
        const nearbyText = Array.from(document.querySelectorAll('h1, h2, h3, div, span, p, [class*="title"], [class*="name"], [class*="product"]'))
            .filter(el => {
                const text = el.innerText?.trim() || '';
                if (el.children.length > 0 || text.length < 5 || el.offsetWidth === 0) return false;
                if (isGenericTitle(text)) return false;
                if (isOverlayElement(el)) return false; // Filter out cookie banners, modals, etc.
                if (text.includes('$') || ECOM_KEYWORDS.some(k => text.toUpperCase().includes(k))) return false;

                const elRect = el.getBoundingClientRect();
                const fontSize = parseFloat(window.getComputedStyle(el).fontSize);

                // Must be near the price (within 500px vertically)
                const verticalDist = Math.abs(elRect.top - priceRect.top);

                return fontSize >= 14 && verticalDist < 500;
            })
            .map(el => ({
                text: el.innerText.trim(),
                fontSize: parseFloat(window.getComputedStyle(el).fontSize),
                rect: el.getBoundingClientRect()
            }))
            .sort((a, b) => b.fontSize - a.fontSize);

        title = nearbyText[0]?.text || document.title;
    } else {
        // No price found, fallback to document title
        title = document.title;
    }

    title = cleanTitle(title);

    // 3. Find the main product image.
    //
    // og:image is the SHARE image, chosen to look good in a link preview, which
    // on a fashion site routinely means a styled lifestyle shot. This preferred
    // it over everything — so a product page showing a large clean cutout of the
    // trousers handed the generator a photo of someone standing across a
    // courtyard wearing them, which nobody can try on.
    //
    // What the shopper is looking at is the better signal. Rank by rendered
    // area, and fall back to the metadata only when the page offers nothing.
    const detect = global_detect();
    const onPage = detect ? detect.imageCandidates(document) : [];
    const ogImage = document.querySelector('meta[property="og:image"]')?.content;

    let mainImage = (onPage[0] && onPage[0].area > 90000 ? onPage[0].src : null) || ogImage || (onPage[0] && onPage[0].src);

    // Every candidate, so the modal can offer a swap when the guess is wrong.
    // No heuristic gets this right everywhere, and picking again is a click.
    const alternateImages = onPage.map((c) => c.src).slice(0, 8);

    // Ensure absolute URL
    if (mainImage && !mainImage.startsWith('http')) {
        try {
            mainImage = new URL(mainImage, window.location.href).href;
        } catch (e) {
            console.log('[emodeAI] Failed to resolve image URL:', mainImage);
        }
    }

    console.log('[emodeAI] PDP Extraction Result:', {
        title,
        price: priceText,
        image: mainImage?.substring(0, 80),
        imageCount: images.length
    });
    console.groupEnd();
    return { title, image: mainImage, price: priceText, alternateImages };
}

function openModal(context) {
    const modalUrl = `${BASE_URL}/modal?title=${encodeURIComponent(context.title)}&image=${encodeURIComponent(context.image)}&price=${encodeURIComponent(context.price)}&origin=${encodeURIComponent(window.location.host)}`;

    const overlay = document.createElement('div');
    overlay.id = 'emode-modal-overlay';
    Object.assign(overlay.style, {
        position: 'fixed',
        inset: '0',
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(20px)',
        webkitBackdropFilter: 'blur(20px)',
        zIndex: '2147483647',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        opacity: '0',
        transition: 'opacity 0.4s ease',
        fontFamily: 'system-ui, -apple-system, sans-serif'
    });

    setTimeout(() => overlay.style.opacity = '1', 10);

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    Object.assign(closeBtn.style, {
        position: 'absolute',
        top: '20px',
        right: '20px',
        background: 'none',
        border: 'none',
        color: 'white',
        fontSize: '40px',
        cursor: 'pointer',
        lineHeight: '1'
    });
    closeBtn.onclick = () => document.body.removeChild(overlay);

    const iframe = document.createElement('iframe');
    iframe.src = modalUrl;
    Object.assign(iframe.style, {
        width: '95%',
        height: '95%',
        maxWidth: '1100px',
        maxHeight: '850px',
        border: 'none',
        borderRadius: '32px',
        boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
        background: 'white'
    });

    overlay.onclick = (e) => {
        if (e.target === overlay) document.body.removeChild(overlay);
    };

    overlay.appendChild(closeBtn);
    overlay.appendChild(iframe);
    document.body.appendChild(overlay);
}

function injectButtons() {
    const urlChanged = lastScannedUrl !== window.location.href;
    const existing = document.querySelector('.emode-extension-injected');

    // A different page means the previous product's buttons are stale.
    if (urlChanged && existing) existing.remove();

    if (!isPDP()) {
        // Deliberately NOT removing anything here. Detection failing on this
        // pass is not evidence the product left the page — mid-render, an image
        // still decoding, or a framework swapping a subtree all produce a
        // momentary false, and tearing the buttons out on one is what made them
        // flicker and disappear on every real SPA storefront.
        return;
    }

    lastScannedUrl = window.location.href;
    if (document.querySelector('.emode-extension-injected')) return;

    const keywords = ['ADD TO', 'ADD', 'BAG', 'TOTE', 'BASKET', 'BUY', 'BUY NOW', 'CHECKOUT', 'PURCHASE'];
    const selectors = [
        'button[name="add"]',
        '.add-to-cart',
        '#add-to-cart',
        '.product-form__submit',
        '[class*="AddToCart"]',
        '[id*="AddToCart"]',
        'button.primary',
        '.btn-primary'
    ];

    let targetBtn = null;

    for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el && el.offsetWidth > 0 && el.offsetHeight > 0) {
            const text = el.textContent.toUpperCase();
            if (keywords.some(k => text.includes(k))) {
                targetBtn = el;
                break;
            }
        }
    }

    if (!targetBtn) {
        const buttons = Array.from(document.querySelectorAll('button, a.button, a.btn, [role="button"]'));
        for (const btn of buttons) {
            const text = btn.textContent.trim().toUpperCase();
            const rect = btn.getBoundingClientRect();
            if (rect.width > 100 && rect.height > 30 && keywords.some(k => text === k || text.startsWith(k + ' ') || text.includes(' ' + k))) {
                targetBtn = btn;
                break;
            }
        }
    }

    if (!targetBtn) return;

    notifyProductDetected(extractProductContext());

    const btnGroup = document.createElement('div');
    btnGroup.className = 'emode-extension-injected';
    Object.assign(btnGroup.style, {
        display: 'flex',
        gap: '10px',
        margin: '12px 0 20px 0',
        width: '100%',
        flexBasis: '100%',
        minHeight: '52px',
        order: '-1' // Try to jump to top in flex containers
    });

    // Ensure parent allows wrapping if it's a flex container
    if (targetBtn.parentNode) {
        const parentStyle = window.getComputedStyle(targetBtn.parentNode);
        if (parentStyle.display === 'flex') {
            targetBtn.parentNode.style.flexWrap = 'wrap';
        }
    }

    const tryBtn = document.createElement('button');
    tryBtn.innerHTML = '✨ TRY IT ON';
    Object.assign(tryBtn.style, {
        flex: '1.2',
        background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        cursor: 'pointer',
        fontWeight: '800',
        fontSize: '11px',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        transition: 'all 0.2s',
        boxShadow: '0 4px 15px rgba(168, 85, 247, 0.3)'
    });

    const dressBtn = document.createElement('button');
    dressBtn.innerHTML = '➕ DRESSING ROOM';
    Object.assign(dressBtn.style, {
        flex: '1',
        background: '#f8fafc',
        color: '#1e293b',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        cursor: 'pointer',
        fontWeight: '800',
        fontSize: '11px',
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        transition: 'all 0.2s'
    });

    tryBtn.onmouseover = () => {
        tryBtn.style.transform = 'translateY(-2px)';
        tryBtn.style.boxShadow = '0 6px 20px rgba(168, 85, 247, 0.4)';
    };
    tryBtn.onmouseout = () => {
        tryBtn.style.transform = 'translateY(0)';
        tryBtn.style.boxShadow = '0 4px 15px rgba(168, 85, 247, 0.3)';
    };

    dressBtn.onmouseover = () => {
        dressBtn.style.background = '#f1f5f9';
        dressBtn.style.transform = 'translateY(-2px)';
    };
    dressBtn.onmouseout = () => {
        dressBtn.style.background = '#f8fafc';
        dressBtn.style.transform = 'translateY(0)';
    };

    // Extract product context FRESH on each click, not at button creation time
    tryBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const context = extractProductContext(); // Get fresh context on click
        if (context) {
            notifyProductDetected(context);
            openModal(context);
        }
    };

    dressBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const context = extractProductContext(); // Get fresh context on click
        notifyProductDetected(context);
        addToLocalCart(context);
        const addUrl = `${BASE_URL}/modal?action=add&title=${encodeURIComponent(context.title)}&image=${encodeURIComponent(context.image)}&price=${encodeURIComponent(context.price)}&origin=${encodeURIComponent(window.location.host)}`;
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = addUrl;
        document.body.appendChild(iframe);
        setTimeout(() => iframe.remove(), 5000);
        showToast('Added to Dressing Room');
    };

    btnGroup.appendChild(tryBtn);
    btnGroup.appendChild(dressBtn);
    targetBtn.parentNode.insertBefore(btnGroup, targetBtn);
}

/* ------------------------------------------------------------------ *
 * Scan scheduling
 *
 * This ran injectButtons() on EVERY DOM mutation, and injectButtons() deletes
 * the buttons the moment isPDP() returns false. On a storefront that is a
 * static document that is merely wasteful. On a live SPA — StockX with its
 * ticking prices, The RealReal with its gallery — it is hundreds of full
 * detections per second, and a single transient false removes the buttons. That
 * is the "appeared for a second, then vanished": detection blinked while an
 * image was mid-swap, the buttons were torn out, and no later mutation happened
 * to put them back. Injecting is itself a mutation, so it also re-triggered
 * itself.
 *
 * Now: coalesce mutations into one scan per frame, and treat absence as
 * inconclusive rather than as proof. Buttons are only removed when the page
 * genuinely becomes a different page, which for an SPA means the URL changing.
 * ------------------------------------------------------------------ */
let scanQueued = false;
let lastScannedUrl = '';

function scheduleScan() {
    if (scanQueued) return;
    scanQueued = true;
    requestAnimationFrame(() => {
        scanQueued = false;
        try {
            injectButtons();
        } catch (err) {
            console.warn('[emodeAI] scan failed:', err);
        }
    });
}

const observer = new MutationObserver(scheduleScan);
observer.observe(document.body, { childList: true, subtree: true });

// SPA route changes do not reload the page, and these sites navigate between
// products without one. Re-scan shortly after, once the new product has
// rendered.
for (const method of ['pushState', 'replaceState']) {
    const original = history[method];
    history[method] = function (...args) {
        const result = original.apply(this, args);
        setTimeout(scheduleScan, 300);
        return result;
    };
}
window.addEventListener('popstate', () => setTimeout(scheduleScan, 300));

// Product data frequently arrives after first paint — JSON-LD injected by the
// framework, images still decoding. Give detection a few more looks.
scheduleScan();
setTimeout(scheduleScan, 800);
setTimeout(scheduleScan, 2000);

// Floating Pill Logic (Catalog only)
document.addEventListener('mouseover', (e) => {
    // Disable pill on PDPs and non-catalog pages
    if (isPDP() || !isCatalogPage()) return;

    let target = e.target;

    // 1. Better Image Detection (Handle overlays/wrappers)
    // If we hover over a div/span that might be an overlay over an image
    if (target.tagName !== 'IMG') {
        const rect = target.getBoundingClientRect();
        // Check for underlying images at the same point or within this small container
        const img = target.querySelector('img') ||
            (target.parentElement && target.parentElement.querySelector('img'));
        if (img && img.offsetWidth > 150 && img.offsetHeight > 150) {
            target = img;
        } else if (target.tagName === 'DIV' && rect.width > 150 && rect.height > 150) {
            // Check if this is a wrapper for a product image
            const bgImg = window.getComputedStyle(target).backgroundImage;
            if (bgImg && bgImg !== 'none') {
                // If it's a BG image container, we'll treat it as a target later if needed
            }
        }
    }

    // Validate this is actually a product card before showing pill
    if (target.tagName === 'IMG' && target.offsetWidth > 150 && target.offsetHeight > 150) {
        // Validate this is a product card
        if (!isValidProductCard(target)) {
            // Hide pill if it was showing
            const trigger = document.getElementById('emode-floating-trigger');
            if (trigger) trigger.style.display = 'none';
            return;
        }

        let trigger = document.getElementById('emode-floating-trigger');
        if (!trigger) {
            trigger = document.createElement('div');
            trigger.id = 'emode-floating-trigger';
            Object.assign(trigger.style, {
                position: 'absolute',
                padding: '0',
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(20px)',
                borderRadius: '100px',
                fontSize: '11px',
                fontWeight: '800',
                cursor: 'pointer',
                zIndex: '2147483646',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                border: '1px solid rgba(0,0,0,0.05)',
                textTransform: 'uppercase',
                display: 'none',
                alignItems: 'center',
                overflow: 'hidden',
                transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            });

            const trySeg = document.createElement('div');
            trySeg.id = 'emode-try-seg';
            trySeg.innerHTML = '✨ TRY ON';
            trySeg.style.padding = '10px 18px';
            trySeg.style.borderRight = '1px solid rgba(0,0,0,0.05)';
            trySeg.style.transition = 'background 0.2s';

            const addSeg = document.createElement('div');
            addSeg.id = 'emode-add-seg';
            addSeg.innerHTML = '➕ DRESSING ROOM';
            addSeg.style.padding = '10px 14px';
            addSeg.style.transition = 'background 0.2s';

            trySeg.onmouseover = () => trySeg.style.background = 'rgba(0,0,0,0.03)';
            trySeg.onmouseout = () => trySeg.style.background = 'transparent';
            addSeg.onmouseover = () => addSeg.style.background = 'rgba(0,0,0,0.03)';
            addSeg.onmouseout = () => addSeg.style.background = 'transparent';

            // ATTACH SINGLE CLICK HANDLERS THAT READ FROM TRIGGER STATE
            trySeg.onclick = (e) => {
                e.stopPropagation();
                const currentTarget = trigger._emodeTarget;
                if (!currentTarget) return;
                const container = findProductContainer(currentTarget);
                const context = extractFromContainer(container, currentTarget);
                notifyProductDetected(context);
                openModal(context);
            };

            addSeg.onclick = (e) => {
                e.stopPropagation();
                const currentTarget = trigger._emodeTarget;
                if (!currentTarget) return;
                const container = findProductContainer(currentTarget);
                const context = extractFromContainer(container, currentTarget);
                notifyProductDetected(context);
                addToLocalCart(context);
                const addUrl = `${BASE_URL}/modal?action=add&title=${encodeURIComponent(context.title)}&image=${encodeURIComponent(context.image)}&price=${encodeURIComponent(context.price)}&origin=${encodeURIComponent(window.location.host)}`;
                const iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                iframe.src = addUrl;
                document.body.appendChild(iframe);
                setTimeout(() => iframe.remove(), 5000);
                showToast('Added to Dressing Room');
            };

            trigger.appendChild(trySeg);
            trigger.appendChild(addSeg);
            document.body.appendChild(trigger);
        }

        // Update trigger position and current target
        trigger._emodeTarget = target;
        const rect = target.getBoundingClientRect();
        trigger.style.top = `${rect.top + window.scrollY + 20}px`;
        trigger.style.left = `${rect.left + window.scrollX + 20}px`;
        trigger.style.display = 'flex';
    }
});

document.addEventListener('scroll', () => {
    const trigger = document.getElementById('emode-floating-trigger');
    if (trigger) trigger.style.display = 'none';
}, { passive: true });

// Mouseout logic to hide trigger if not hovering target or trigger
document.addEventListener('mousemove', (e) => {
    const trigger = document.getElementById('emode-floating-trigger');
    if (!trigger || trigger.style.display === 'none') return;

    const target = trigger._emodeTarget;
    const isOverTrigger = trigger.contains(e.target);
    const isOverTarget = target && target.contains(e.target);

    if (!isOverTrigger && !isOverTarget) {
        // Optional: Small delay or distance check before hiding
        trigger.style.display = 'none';
    }
});

