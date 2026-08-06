// emodeAI | Universal Widget Content Script

console.log('emodeAI | Universal Widget Active.');

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

/**
 * Answer the side panel when it asks what is on this page.
 *
 * The panel only ever learned about a product by being pushed one, and the push
 * happens while injecting buttons — during page load. Opening the panel on a page
 * you are already looking at, which is how anyone actually uses it, meant nothing
 * had been sent since and it sat on "Detecting..." indefinitely. It needed to be
 * able to ask.
 */
chrome.runtime?.onMessage?.addListener((message, sender, sendResponse) => {
    if (message?.type !== 'REQUEST_PRODUCT') return;
    try {
        sendResponse({ product: isPDP() ? extractProductContext() : null });
    } catch (err) {
        console.warn('[emodeAI] Could not answer product request:', err);
        sendResponse({ product: null });
    }
    return true;
});

// Relay detected product context to the side panel (best-effort; side panel may not be open)
function notifyProductDetected(context) {
    if (!context) return;
    try {
        chrome.runtime.sendMessage({
            type: 'PRODUCT_DETECTED',
            // sourceUrl wins where it exists: on a search-results page the
            // current URL is Google, not the garment. Saving a card that points
            // back at a search query is the same as saving nothing.
            product: { ...context, url: context.sourceUrl || window.location.href }
        });
    } catch (e) { /* extension context invalidated (e.g. mid-reload) — ignore */ }
}

// Persist a locally-tracked cart item (no account required) and notify the side panel
function addToLocalCart(context) {
    if (!context) return;
    try {
        chrome.runtime.sendMessage({
            type: 'CART_ADD',
            item: {
                title: context.title,
                image: context.image,
                price: context.price,
                // See notifyProductDetected: the item's own page, never the
                // results page that happened to list it.
                url: context.sourceUrl || window.location.href,
            }
        });
    } catch (e) { /* extension context invalidated — ignore */ }
}

/**
 * Confirmation toast, optionally with something to do about it.
 *
 * "Added to Dressing Room" used to be a dead end. Someone who has just decided
 * they like a garment is at the exact peak of wanting to see it on, and the
 * confirmation of that decision was the one thing on screen they could not
 * click. Making them re-find the button, or open the side panel, spends that
 * moment on navigation.
 *
 * `action` is optional: { label, onClick }.
 */
function showToast(message, action) {
    const existing = document.querySelector('.emode-toast');
    if (existing) {
        if (existing._emodeTimer) clearTimeout(existing._emodeTimer);
        existing.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'emode-toast';
    toast.style.cssText = `
        position: fixed;
        bottom: 50px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 2147483647;
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
    `;

    const pill = document.createElement('div');
    pill.style.cssText = `
        background: rgba(0,0,0,0.95); color: white; padding: 12px 24px;
        border-radius: 50px; font-family: 'Inter', system-ui, sans-serif;
        font-size: 13px; font-weight: 700; display: flex; align-items: center;
        gap: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(10px);
        pointer-events: auto;
    `;

    const tick = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    tick.setAttribute('width', '16');
    tick.setAttribute('height', '16');
    tick.setAttribute('viewBox', '0 0 24 24');
    tick.setAttribute('fill', 'none');
    tick.setAttribute('stroke', '#10b981');
    tick.setAttribute('stroke-width', '3');
    tick.setAttribute('stroke-linecap', 'round');
    tick.setAttribute('stroke-linejoin', 'round');
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    poly.setAttribute('points', '20 6 9 17 4 12');
    tick.appendChild(poly);
    pill.appendChild(tick);

    // textContent, not innerHTML. The message can carry a scraped product title,
    // and a title is attacker-controlled text on someone else's page.
    const label = document.createElement('span');
    label.textContent = String(message).toUpperCase();
    pill.appendChild(label);

    let dismissed = false;
    const dismiss = () => {
        if (dismissed) return;
        dismissed = true;
        if (toast._emodeTimer) clearTimeout(toast._emodeTimer);
        toast.style.opacity = '0';
        toast.style.bottom = '50px';
        setTimeout(() => toast.remove(), 300);
    };

    if (action) {
        const cta = document.createElement('button');
        cta.type = 'button';
        cta.textContent = action.label;
        cta.style.cssText = `
            background: white; color: #111; border: none; padding: 7px 16px;
            border-radius: 50px; font-family: inherit; font-size: 11px;
            font-weight: 800; letter-spacing: 0.06em; cursor: pointer;
            margin-left: 4px; white-space: nowrap;
        `;
        cta.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            dismiss();
            action.onClick();
        };
        pill.appendChild(cta);
    }

    toast.appendChild(pill);
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.bottom = '60px';
    }, 10);

    // An actionable toast gets longer, because now it is worth reading rather
    // than merely worth noticing. Hovering holds it open - a toast that expires
    // while the cursor is travelling toward it is worse than no toast.
    const life = action ? 7000 : 3000;
    toast._emodeTimer = setTimeout(dismiss, life);
    pill.addEventListener('mouseenter', () => clearTimeout(toast._emodeTimer));
    pill.addEventListener('mouseleave', () => {
        if (!dismissed) toast._emodeTimer = setTimeout(dismiss, 2000);
    });
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

// A product card is a picture you can click to buy the thing in it. Editorial
// photography, hero banners, lookbook stills and article thumbnails are not,
// however much they look alike.
// Product URLs, as actually written in the wild. Gucci alone uses /pr/ for the
// path and hangs the style code off the end as "-p-8202981ABAP9754", matching
// neither /product/ nor /p/.
const PRODUCT_HREF_RE =
    /\/(products?|pr|p|item|items|dp|sku|prod|listing)(\/|\?|$)|-p-[a-z0-9]{4,}|-(\d{5,})(\/|\?|$)/i;
const EDITORIAL_HREF_RE = /\/(stories|story|blog|article|news|guides?|lookbook|editorial|magazine|journal|about|help|careers)(\/|\?|$)/i;

function isValidProductCard(img) {
    if (!img || img.tagName !== 'IMG') return false;

    const rect = img.getBoundingClientRect();
    if (rect.width < 150 || rect.height < 150) return false;

    // The image must itself be the clickable target of a product link.
    //
    // Without this the check leant on findProductContainer, which walks upward
    // until the container dwarfs the image — on a homepage that swallows a whole
    // section, so prices and product links belonging to entirely different
    // modules counted as this image's own. A magazine still on Lyst's front page
    // passed, and the try-on pill appeared over an article photo. It is why the
    // buttons turned up on "damn near any picture" while browsing.
    const anchor = img.closest('a[href]');
    if (!anchor) return false;

    const href = anchor.getAttribute('href') || '';
    if (EDITORIAL_HREF_RE.test(href)) return false;
    if (!PRODUCT_HREF_RE.test(href)) return false;

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

    // Price is now required, not merely preferred. A product card without a
    // price on it is usually not a product card.
    const isValid = hasPrice && (hasValidAlt || hasNearbyTitle);

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
    // Shared cleaner as well: cleanTitle strips known junk phrases, this removes
    // a trailing "| STORE" that og:title carries on essentially every site.
    if (detectApiForTitle()) title = detectApiForTitle().cleanProductTitle(title);

    console.log('Final Choice:', { title, price });
    console.groupEnd();

    return { title, image: img.src, price };
}



function detectApiForTitle() {
    return (typeof window !== 'undefined' && window.emodeDetect) || null;
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

/**
 * What the modal is told about the product.
 *
 * detect.js first. The heuristics below predate it and were left in place when
 * detection was rewritten, so the extension ended up with two extractors: one
 * deciding whether a page IS a product, another deciding WHAT the product is,
 * disagreeing freely. On StockX detection read the Jordan correctly from
 * structured data while this reported a product called "Browse More" priced at
 * $290 — a nav link and somebody else's number — and that is what reached the
 * try-on.
 *
 * The heuristics remain as a fallback for pages carrying no structured data at
 * all, which is what they were always for.
 */
function extractProductContext() {
    const api = global_detect();
    const detected = api && api.detectProduct();

    if (detected && detected.title && detected.image) {
        return {
            title: detected.title,
            image: detected.image,
            price: detected.price || '',
            alternateImages: detected.alternateImages || [],
        };
    }

    return extractProductContextHeuristic();
}

function extractProductContextHeuristic() {
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
    // Same shared cleaner as the catalog path: og:title and document.title both
    // carry a trailing "| STORE" on essentially every storefront.
    if (detectApiForTitle()) title = detectApiForTitle().cleanProductTitle(title);

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
        imageCount: onPage.length
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

    // Hand over every candidate image once the modal says it is listening.
    //
    // Which photo on a product page is the garment is not reliably decidable: a
    // gallery renders its lifestyle shot and its cutout at identical size, both
    // on screen, so every ranking rule ties and the winner is whichever the
    // markup happened to list first. Rather than keep guessing, give the shopper
    // the page's other pictures and let them correct it in one click. Sent by
    // postMessage because eight URLs do not fit in a query string.
    const handoffImages = (context.alternateImages || []).slice(0, 8);
    const onModalReady = (event) => {
        if (event.origin !== BASE_URL) return;
        if (event.data && event.data.type === 'emode:ready' && handoffImages.length > 1) {
            iframe.contentWindow?.postMessage(
                { type: 'emode:image-options', images: handoffImages },
                BASE_URL
            );
        }
    };
    window.addEventListener('message', onModalReady);
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

/**
 * Does this store already run emode itself?
 *
 * Three surfaces can put try-on buttons on a product page — the merchant's
 * widget, the Shopify theme extension, and this extension — and until now
 * nothing stopped two of them doing it at once. Any merchant paying for emode,
 * visited by a shopper who also installed the extension, got two sets of
 * buttons stacked on their product page.
 *
 * The store's own installation wins, always. It is the thing the merchant is
 * paying for, it is styled to their theme, and its try-ons are attributed to
 * them. This extension exists for the stores that DON'T have it.
 *
 * The script tag is checked as well as the rendered container, because the
 * widget injects asynchronously — waiting for its buttons to appear would mean
 * showing ours first and yanking them away, which is its own kind of broken.
 */
const STORE_EMODE_SELECTORS = [
    'script[data-emode-merchant]',           // widget installed, before it draws
    '.emode-integration-container',          // widget has drawn
    '.emode-buttons',                        // Shopify theme extension
    '#emode-try-on',                         // Shopify theme extension, older markup
];

function storeHasEmode() {
    return STORE_EMODE_SELECTORS.some((sel) => document.querySelector(sel));
}

function injectButtons() {
    // Stand down on stores that already have emode. Checked before anything
    // else, and it removes our own buttons if we got there first — on a slow
    // connection the extension can inject before the merchant's widget script
    // has even loaded.
    if (storeHasEmode()) {
        document.querySelector('.emode-extension-injected')?.remove();
        return;
    }

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

    const alreadyThere = document.querySelector('.emode-extension-injected');
    if (alreadyThere) {
        // Re-anchor if a real buy control has since appeared.
        //
        // A luxury PDP renders its heading immediately and its buy control after
        // the size/variant data loads, so an early scan legitimately finds only
        // the heading. Without this the buttons stay stranded next to the title
        // — which on Gucci is the whole other side of the page from "Select
        // size" — for as long as the shopper is there.
        const cartNow = detectApi && detectApi.findCartButton();
        if (cartNow && alreadyThere.dataset.emodeAnchor === 'heading' && cartNow.parentNode) {
            alreadyThere.remove();
        } else {
            return;
        }
    }

    // Placement comes from detect.js, the same module that decided this IS a
    // product page. These were separate before: detection was rewritten to use
    // JSON-LD, while placement kept its own scan for a button whose text
    // contained "ADD TO"/"BAG"/"BUY". So on Gucci the detector was certain and
    // the placer found nothing, and no buttons appeared on a page we had fully
    // identified. One source of truth, one answer.
    const detectApi = global_detect();
    const anchor = detectApi ? detectApi.findAnchor() : null;
    if (!anchor) return;

    const targetBtn = anchor.el;

    notifyProductDetected(extractProductContext());

    const btnGroup = document.createElement('div');
    btnGroup.className = 'emode-extension-injected';
    // Remembered so a later scan knows whether this placement was a fallback.
    btnGroup.dataset.emodeAnchor = anchor.position === 'after' ? 'heading' : 'cart';
    // Sit where it was put. This used to carry order:-1 plus width and
    // flex-basis of 100%, and rewrote the parent's flex-wrap — a set of hacks
    // meant to force the buttons to the top of whatever container they landed
    // in. On Gucci that yanked them out of the buy column into the top of the
    // page's flex row, pushed the product title sideways until it overlapped,
    // and left the buttons stranded above the price with the real buy control
    // still across the page. Fighting a storefront's layout cannot be won in
    // general; matching the anchor's own width can.
    Object.assign(btnGroup.style, {
        display: 'flex',
        gap: '10px',
        margin: '12px 0',
        boxSizing: 'border-box',
    });

    // Match the control we are sitting next to, so the buttons read as part of
    // the page rather than as something bolted on.
    const anchorRect = targetBtn.getBoundingClientRect();
    if (anchorRect.width > 80) {
        btnGroup.style.width = `${Math.round(anchorRect.width)}px`;
        btnGroup.style.maxWidth = '100%';
    } else {
        btnGroup.style.width = '100%';
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
        showToast('Added to Dressing Room', {
            label: 'TRY IT ON',
            onClick: () => openModal(extractProductContext() || context),
        });
    };

    btnGroup.appendChild(tryBtn);
    btnGroup.appendChild(dressBtn);
    if (anchor.position === 'after') {
        targetBtn.parentNode.insertBefore(btnGroup, targetBtn.nextSibling);
    } else {
        targetBtn.parentNode.insertBefore(btnGroup, targetBtn);
    }
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
    // setTimeout, not requestAnimationFrame: rAF does not fire while a tab is
    // not compositing, so a product opened in a background tab — a link from a
    // newsletter, a middle-click from a listing page — would sit there with no
    // buttons until it happened to be focused. 100ms still coalesces the bursts
    // a live SPA produces.
    setTimeout(() => {
        scanQueued = false;
        try {
            injectButtons();
        } catch (err) {
            // One thrown scan used to be fatal for every site: extractProductContext
            // referenced a variable that no longer existed, injectButtons threw
            // before inserting anything, and the buttons vanished everywhere.
            console.warn('[emodeAI] scan failed:', err);
        }
    }, 100);
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
    // Product cards, wherever they appear.
    //
    // This used to bail on any product page, so the "You may also like" rail at
    // the bottom of a PDP — four more jackets, each its own listing — was the one
    // place a shopper is most obviously shopping and the one place the pill was
    // switched off. The page type is the wrong question; the card is checked
    // directly by isValidProductCard, which is strict enough now to carry it.
    //
    // The pill stands down on stores running emode too. Their buttons and ours
    // look different, and two flavours of the same feature on one storefront
    // reads as a bug rather than as two products.
    if (isEmodeApp() || storeHasEmode()) return;

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
    // Search-result thumbnails are legitimately smaller than a storefront's
    // grid images, so the floor that keeps pills off site furniture elsewhere
    // would exclude every real product on a results page.
    const onSearch = isGoogleSearch();
    const minSize = onSearch ? 70 : 150;

    if (target.tagName === 'IMG' && target.offsetWidth > minSize && target.offsetHeight > minSize) {
        // On a results page the generic validator cannot apply - every href is a
        // Google redirect - so the adapter decides, and it is stricter: a card
        // without a price or a resolvable destination gets no pill.
        const searchContext = onSearch ? extractFromGoogleCard(target) : null;

        // Validate this is a product card
        if (!searchContext && !isValidProductCard(target)) {
            // Same grace period as the mousemove path, and for the same reason:
            // a card that swaps its image on hover briefly presents a node that
            // has not been re-associated with its link yet, and hiding on that
            // single frame is what made the pill flash and vanish.
            const trigger = document.getElementById('emode-floating-trigger');
            if (trigger && trigger.style.display !== 'none' && !trigger._emodeHideTimer) {
                trigger._emodeHideTimer = setTimeout(() => {
                    trigger._emodeHideTimer = null;
                    trigger.style.display = 'none';
                }, 150);
            }
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
            trySeg.onclick = async (e) => {
                e.stopPropagation();
                e.preventDefault();
                const currentTarget = trigger._emodeTarget;
                if (!currentTarget) return;

                let context = trigger._emodeContext;
                if (context) {
                    // Search card: swap the thumbnail for the merchant's own
                    // image before generating.
                    trySeg.textContent = 'LOADING...';
                    context = await resolveGoogleImage(context);
                    trySeg.innerHTML = '&#10024; TRY ON';
                } else {
                    const container = findProductContainer(currentTarget);
                    context = extractFromContainer(container, currentTarget);
                }
                if (!context) return;
                notifyProductDetected(context);
                openModal(context);
            };

            addSeg.onclick = async (e) => {
                e.stopPropagation();
                e.preventDefault();
                const currentTarget = trigger._emodeTarget;
                if (!currentTarget) return;

                let context = trigger._emodeContext;
                if (context) {
                    context = await resolveGoogleImage(context);
                } else {
                    const container = findProductContainer(currentTarget);
                    context = extractFromContainer(container, currentTarget);
                }
                if (!context) return;
                notifyProductDetected(context);
                addToLocalCart(context);
                const originHost = context.sourceUrl
                    ? new URL(context.sourceUrl).host
                    : window.location.host;
                const addUrl = `${BASE_URL}/modal?action=add&title=${encodeURIComponent(context.title)}&image=${encodeURIComponent(context.image)}&price=${encodeURIComponent(context.price)}&origin=${encodeURIComponent(originHost)}`;
                const iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                iframe.src = addUrl;
                document.body.appendChild(iframe);
                setTimeout(() => iframe.remove(), 5000);
                // Same offer from the listing-page pill: the shopper never had
                // to open the product to save it, so they should not have to
                // open it to try it on either.
                showToast('Added to Dressing Room', {
                    label: 'TRY IT ON',
                    onClick: () => openModal(context),
                });
            };

            trigger.appendChild(trySeg);
            trigger.appendChild(addSeg);
            document.body.appendChild(trigger);
        }

        // Anchor the hover region to the CARD, not the image.
        //
        // Listing pages swap the card image on hover - Gucci flips to a second
        // shot, and plenty of stores cross-fade two stacked <img> nodes. The
        // pill was bound to the specific <img> under the cursor, so the moment
        // the site swapped it, e.target became a different node,
        // target.contains(e.target) went false, and the pill vanished while the
        // cursor had not moved at all. The card survives the swap; the image
        // does not.
        trigger._emodeTarget = target;
        trigger._emodeCard = target.closest('a[href]') || findProductContainer(target) || target;
        // Set only on search results, where the DOM cannot be re-read the way a
        // storefront's can. Null everywhere else so the normal fresh-read path
        // is never bypassed.
        trigger._emodeContext = searchContext || null;

        // Cancel a pending hide: coming back inside the card during the grace
        // window should keep the pill rather than let it disappear behind you.
        if (trigger._emodeHideTimer) {
            clearTimeout(trigger._emodeHideTimer);
            trigger._emodeHideTimer = null;
        }

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

// Hide the pill once the cursor has actually left the card.
document.addEventListener('mousemove', (e) => {
    const trigger = document.getElementById('emode-floating-trigger');
    if (!trigger || trigger.style.display === 'none') return;

    const card = trigger._emodeCard || trigger._emodeTarget;
    const isOverTrigger = trigger.contains(e.target);
    const isOverCard = card && card.contains(e.target);

    // Geometry as well as containment. A card that re-renders on hover can
    // replace the very node we are holding, at which point contains() is false
    // about an element the cursor is still sitting inside. The rectangle does
    // not care which nodes were swapped.
    let isInsideRect = false;
    if (card) {
        const r = card.getBoundingClientRect();
        isInsideRect =
            e.clientX >= r.left && e.clientX <= r.right &&
            e.clientY >= r.top && e.clientY <= r.bottom;
    }

    if (isOverTrigger || isOverCard || isInsideRect) {
        if (trigger._emodeHideTimer) {
            clearTimeout(trigger._emodeHideTimer);
            trigger._emodeHideTimer = null;
        }
        return;
    }

    // Grace period rather than an instant hide, so a card mid-re-render cannot
    // flash the pill away between two frames.
    if (!trigger._emodeHideTimer) {
        trigger._emodeHideTimer = setTimeout(() => {
            trigger._emodeHideTimer = null;
            trigger.style.display = 'none';
        }, 150);
    }
});


/* ------------------------------------------------------------------ *
 * Search-results adapter (Google)                                     *
 * ------------------------------------------------------------------ */

/**
 * Product cards on a Google results page.
 *
 * Search is where a lot of shopping actually starts, and the Sponsored Products
 * strip is a rack of real garments with real prices attached. The generic
 * detector cannot see them: it requires the image to sit inside a product-shaped
 * href, and Google wraps everything in /aclk redirects. So this is an explicit
 * adapter rather than a loosening of the general rule - loosening the rule is
 * what previously put pills on magazine photos.
 *
 * The bar stays high on purpose. A card qualifies only if it carries a price AND
 * resolves to a real destination URL. No price, no pill.
 */
const GOOGLE_HOST_RE = /^(?:www\.)?google\.[a-z.]{2,7}$/i;

function isGoogleSearch() {
    return GOOGLE_HOST_RE.test(window.location.host) &&
        /^\/(search|shopping)/.test(window.location.pathname);
}

/**
 * The merchant URL hiding inside a Google redirect.
 *
 * /aclk?...&adurl=<encoded> for ads, /url?q=<encoded> for the older organic
 * wrapper. Returning null rather than the redirect itself is deliberate: a pill
 * whose destination is google.com/aclk cannot be attributed, cannot be resolved
 * for a real product image, and is not "a real item" in the sense that matters.
 */
function googleDestination(href) {
    if (!href) return null;
    let url;
    try {
        url = new URL(href, window.location.origin);
    } catch { return null; }

    for (const key of ['adurl', 'q', 'url', 'imgrefurl']) {
        const raw = url.searchParams.get(key);
        if (!raw) continue;
        try {
            const dest = new URL(raw);
            if (dest.protocol !== 'http:' && dest.protocol !== 'https:') continue;
            if (GOOGLE_HOST_RE.test(dest.host)) continue;
            return dest.toString();
        } catch { /* not a URL, try the next key */ }
    }

    // A direct outbound link (Google sometimes renders these unwrapped).
    if (!GOOGLE_HOST_RE.test(url.host) && /^https?:$/.test(url.protocol)) {
        return url.toString();
    }
    return null;
}

// How many distinct merchant destinations live under this element. More than
// one means it is a strip of cards, not a card.
function countProductLinks(el) {
    const seen = new Set();
    for (const a of el.querySelectorAll('a[href]')) {
        const dest = googleDestination(a.getAttribute('href'));
        if (dest) seen.add(dest);
    }
    return seen.size;
}

const GOOGLE_PRICE_RE = /(?:[$£€]|USD|EUR|GBP)\s?\d[\d,]*(?:\.\d{2})?/;

/**
 * Read a Google result card, given an image inside it.
 * Returns the same shape as extractFromContainer, or null.
 */
function extractFromGoogleCard(img) {
    if (!img || img.tagName !== 'IMG') return null;

    const anchor = img.closest('a[href]');
    if (!anchor) return null;

    const destination = googleDestination(anchor.getAttribute('href'));
    if (!destination) return null;

    // Walk up to the card, and stop at the card.
    //
    // Climbing a fixed number of levels looking for a price is the same mistake
    // that put pills on magazine photos: a container holding several cards has
    // a price in it, just not this card's. On a results page it meant an
    // unpriced tile - "Buy and sell authentic sneakers" - inherited the $882
    // from the listing two cards over and offered a try-on for a page that
    // sells nothing.
    //
    // An ancestor holding more than one outbound product link is not one card,
    // so the walk stops before it.
    let card = anchor;
    let price = '';
    for (let i = 0; i < 6 && card; i++) {
        if (i > 0 && countProductLinks(card) > 1) break;
        const match = (card.innerText || '').match(GOOGLE_PRICE_RE);
        if (match) { price = match[0]; break; }
        card = card.parentElement;
    }
    if (!price || !card) return null;

    // A favicon or a rating star is not a garment. The hover handler applies its
    // own floor, but the reader must not depend on its caller for that.
    const rect = img.getBoundingClientRect();
    if (rect.width < 60 || rect.height < 60) return null;

    // Title: the longest non-price line in the card that is not the merchant
    // name or Google's own chrome. Merchant names are short and repeat across
    // every card in the strip, so length is a decent discriminator here.
    const lines = (card.innerText || '')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) =>
            l.length > 8 &&
            !GOOGLE_PRICE_RE.test(l) &&
            !/^(sponsored|visit|ad|shop now|free (shipping|delivery)|in stock|by )/i.test(l) &&
            !/^\d+(\.\d+)?\s*(star|\()/i.test(l));

    const title = lines.sort((a, b) => b.length - a.length)[0] || img.alt || '';
    if (!title || title.length < 5) return null;

    return {
        title: cleanGoogleTitle(title),
        image: img.currentSrc || img.src,
        price,
        alternateImages: [],
        // Where the pill should send them, and what we resolve a full-size
        // product image from.
        sourceUrl: destination,
    };
}

// Google truncates long titles with an ellipsis mid-word ("Jordan 1 Retro High
// Virgil Abloh Archiv..."). Sending that to the model as-is is worse than
// sending a clean stem.
function cleanGoogleTitle(title) {
    return title
        .replace(/\s*(\.\.\.|…)\s*$/, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 140);
}

/**
 * Trade the search thumbnail for the merchant's own product image.
 *
 * Google serves ~200px gstatic thumbnails. Feeding one to the try-on model
 * produces a visibly worse result than the same garment tried on from the
 * product page, and a shopper has no way to know why - they would just conclude
 * emode is bad. So on click we fetch the destination page and read its real
 * product image out of JSON-LD or OpenGraph.
 *
 * Falls back to the thumbnail rather than failing: a slightly soft try-on beats
 * a dead button. The fetch is credential-less (see background.js).
 */
function resolveGoogleImage(context) {
    return new Promise((resolve) => {
        if (!context?.sourceUrl) return resolve(context);

        let settled = false;
        const done = (extra) => {
            if (settled) return;
            settled = true;
            resolve({ ...context, ...extra });
        };

        // Never let image resolution be the reason nothing happens.
        setTimeout(() => done({}), 4000);

        try {
            chrome.runtime.sendMessage(
                { type: 'RESOLVE_PRODUCT_IMAGE', url: context.sourceUrl },
                (response) => {
                    if (chrome.runtime.lastError || !response?.image) return done({});
                    done({ image: response.image, title: response.title || context.title });
                }
            );
        } catch { done({}); }
    });
}

/* ------------------------------------------------------------------ *
 * Did they actually buy it?                                           *
 * ------------------------------------------------------------------ */

/**
 * Order-confirmation URLs, across the platforms that matter.
 *
 * Shopify lands on /checkouts/<token>/thank_you (and /orders/<token> for the
 * order status page), WooCommerce on /checkout/order-received/<id>, and most
 * bespoke carts land on some spelling of thank-you or order-confirmation.
 */
const ORDER_CONFIRMED_RE = /\/(?:thank[-_]?you|thanks|order[-_]?(?:confirmation|confirmed|complete|completed|received|success)|checkout\/success|purchase[-_]?complete|receipt)(?:[/?#]|$)/i;

// Shopify specifically: /checkouts/<token>/thank_you, /orders/<long-token>.
const SHOPIFY_CONFIRMED_RE = /\/(?:checkouts\/[^/]+\/thank_you|orders\/[a-f0-9]{16,})(?:[/?#]|$)/i;

/**
 * Mark saved items as bought when the shopper reaches a confirmation page.
 *
 * A saved item that stays "saved" forever is clutter, and worse, it is a
 * standing nag to buy something already owned. This is what turns the panel
 * from a list of links into a record of what actually happened.
 *
 * It is a heuristic and it is honest about being one. The extension cannot see
 * inside someone else's checkout - no line items, no order total, no way to
 * know which of three saved pieces the order covered. What it CAN see is that
 * this browser reached a confirmation URL on a host it has saved items from.
 * So it marks that host's items, and the side panel presents the result as
 * "looks purchased" rather than as a receipt. Wrong occasionally, in a
 * direction that costs nothing: the item stays in the list either way.
 */
function checkForPurchase() {
    const path = window.location.pathname;
    if (!ORDER_CONFIRMED_RE.test(path) && !SHOPIFY_CONFIRMED_RE.test(path)) return;

    try {
        chrome.runtime.sendMessage({
            type: 'CART_MARK_PURCHASED',
            host: window.location.host,
        });
    } catch (e) { /* extension context invalidated - ignore */ }
}

if (!isEmodeApp()) {
    checkForPurchase();

    // Checkouts are single-page apps as often as not, so the confirmation step
    // frequently arrives as a history push rather than a navigation the content
    // script sees load.
    let lastPath = window.location.pathname;
    setInterval(() => {
        if (window.location.pathname !== lastPath) {
            lastPath = window.location.pathname;
            checkForPurchase();
        }
    }, 1000);
}
