/**
 * The name a shopper would recognise.
 *
 * "Rick Owens Women's Low Sneaker - Blue" and "Low Sneaker" are the same shoe,
 * and one of them is useless in a dressing room. Length is a decent proxy for
 * which carries the brand, but only when the longer one actually contains the
 * shorter - otherwise they are describing different things and the first one
 * seen is the safer keep.
 */
function pickRicherTitle(existing, incoming) {
    const a = (existing || '').trim();
    const b = (incoming || '').trim();
    if (!a) return b;
    if (!b) return a;
    if (a === b) return a;

    const norm = (t) => t.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (norm(b).includes(norm(a))) return b;
    if (norm(a).includes(norm(b))) return a;
    return a;
}

/* ------------------------------------------------------------------ *
 * Full-size product image for a search-results card                   *
 * ------------------------------------------------------------------ */

/**
 * Google serves ~200px gstatic thumbnails on results pages. Feeding one to the
 * try-on model gives a visibly worse result than the same garment tried from its
 * product page, and the shopper has no way to know why - they would just decide
 * emode is bad at this. So when a pill on a results page is clicked, we fetch
 * the destination and read the merchant's own product image out of it.
 *
 * Runs here rather than in the content script because the results page is
 * google.com and the fetch is cross-origin; the service worker holds the
 * extension's host permissions.
 *
 * `credentials: 'omit'` matters. This is a request to a store the shopper has
 * not visited yet, made on their behalf - it must not carry their cookies to it.
 * No DOMParser exists in an MV3 service worker, so this reads by pattern rather
 * than by tree.
 */

const MAX_HTML_BYTES = 512 * 1024;

function absolutise(src, base) {
    try {
        const url = new URL(src, base);
        return /^https?:$/.test(url.protocol) ? url.toString() : null;
    } catch {
        return null;
    }
}

// schema.org Product.image, the same first-tier signal the on-page detector
// trusts. Merchants maintain it for Google, which is why it is reliable.
function imageFromJsonLd(html, base) {
    const blocks = html.match(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) || [];

    for (const block of blocks) {
        const body = block.replace(/^[\s\S]*?>/, '').replace(/<\/script>$/i, '');
        let parsed;
        try { parsed = JSON.parse(body); } catch { continue; }

        const queue = Array.isArray(parsed) ? [...parsed] : [parsed];
        while (queue.length) {
            const node = queue.shift();
            if (!node || typeof node !== 'object') continue;
            if (Array.isArray(node['@graph'])) queue.push(...node['@graph']);

            const type = node['@type'];
            const isProduct = type === 'Product' ||
                (Array.isArray(type) && type.includes('Product'));
            if (!isProduct) continue;

            let image = node.image;
            if (Array.isArray(image)) image = image[0];
            if (image && typeof image === 'object') image = image.url || image.contentUrl;
            if (typeof image === 'string') {
                const resolved = absolutise(image, base);
                if (resolved) return { image: resolved, title: typeof node.name === 'string' ? node.name : null };
            }
        }
    }
    return null;
}

function metaContent(html, property) {
    const re = new RegExp(
        `<meta[^>]+(?:property|name)=["']${property}["'][^>]*>`, 'i');
    const tag = html.match(re)?.[0];
    if (!tag) return null;
    return tag.match(/content=["']([^"']+)["']/i)?.[1] || null;
}

async function resolveProductImage(rawUrl) {
    let target;
    try {
        target = new URL(rawUrl);
        if (target.protocol !== 'https:' && target.protocol !== 'http:') return {};
    } catch {
        return {};
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    try {
        const response = await fetch(target.toString(), {
            credentials: 'omit',
            redirect: 'follow',
            signal: controller.signal,
        });
        if (!response.ok) return {};

        // Cap the read. Some product pages are enormous, and everything worth
        // having is in the head.
        const type = response.headers.get('content-type') || '';
        if (!/text\/html/i.test(type)) return {};
        const html = (await response.text()).slice(0, MAX_HTML_BYTES);

        // The page we actually landed on, after redirects — relative URLs and
        // the click-through destination should both resolve against it.
        const base = response.url || target.toString();

        const fromLd = imageFromJsonLd(html, base);
        if (fromLd) return { ...fromLd, url: base };

        const og = metaContent(html, 'og:image') || metaContent(html, 'twitter:image');
        const image = og ? absolutise(og, base) : null;
        if (!image) return {};

        const title = metaContent(html, 'og:title') ||
            html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || null;

        return { image, title, url: base };
    } catch {
        // Blocked, timed out, bot-challenged. The caller falls back to the
        // thumbnail; a soft try-on beats a dead button.
        return {};
    } finally {
        clearTimeout(timer);
    }
}

// 1. Sidebar Toggle / Icon Click logic
chrome.action.onClicked.addListener((tab) => {
    chrome.sidePanel.setOptions({
        tabId: tab.id,
        path: 'sidepanel.html',
        enabled: true
    });
    chrome.sidePanel.open({ windowId: tab.windowId });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'OPEN_SIDEBAR') {
        chrome.sidePanel.open({ windowId: sender.tab.windowId });
    }

    // 2. Auth bridge — persist the token relayed from the web app (see auth-bridge.js)
    // so the side panel can authenticate API calls even after being closed/reopened.
    if (message.type === 'AUTH_TOKEN_UPDATE') {
        if (message.accessToken) {
            chrome.storage.local.set({
                emode_access_token: message.accessToken,
                emode_user_id: message.userId || null,
                emode_user_email: message.email || null,
                emode_token_expires_at: message.expiresAt || null,
            });
        } else {
            chrome.storage.local.remove(['emode_access_token', 'emode_user_id', 'emode_user_email', 'emode_token_expires_at']);
        }
    }

    // 3. Local outbound cart — no account required. Source of truth lives in
    // chrome.storage.local; PRODUCT_DETECTED/CART_ADD messages also reach an
    // already-open side panel directly since sendMessage broadcasts to all
    // extension contexts, but we persist here so a closed panel sees it later.
    if (message.type === 'CART_ADD' && message.item) {
        chrome.storage.local.get({ emode_cart: [] }, (result) => {
            const cart = result.emode_cart || [];

            // Identity is the product's URL, not its picture.
            //
            // Matching on image AND title meant the same sneaker saved twice -
            // once from a search card carrying a gstatic thumbnail, once from the
            // shop with the merchant's own photo - had two different images and
            // so counted as two different shoes. The list showed "Low Sneaker"
            // twice. The URL is the only thing that stays the same no matter
            // which surface it was saved from.
            const key = (item) => {
                if (!item?.url) return null;
                try {
                    const url = new URL(item.url);
                    return url.origin + url.pathname.replace(/\/+$/, '');
                } catch {
                    return item.url;
                }
            };

            const incoming = key(message.item);
            const existingIndex = incoming
                ? cart.findIndex((i) => key(i) === incoming)
                : cart.findIndex((i) => i.image === message.item.image && i.title === message.item.title);

            if (existingIndex >= 0) {
                // Re-saving is not a no-op: the second visit usually knows more.
                // A card seen on the shop's own page carries a better title and a
                // full-size image than the same item seen in a search result, and
                // silently discarding that keeps the worse of the two forever.
                const existing = cart[existingIndex];
                cart[existingIndex] = {
                    ...existing,
                    title: pickRicherTitle(existing.title, message.item.title),
                    image: message.item.image || existing.image,
                    price: message.item.price || existing.price,
                };
            } else {
                cart.push({ ...message.item, id: crypto.randomUUID(), addedAt: Date.now() });
            }
            chrome.storage.local.set({ emode_cart: cart });
        });
    }

    // 4. Purchase detection. The content script reports reaching an order
    // confirmation page; we mark that host's saved items as bought.
    //
    // Only items saved BEFORE the confirmation page was reached, so a later
    // save on the same store is not retroactively swept up by an order that
    // could not have included it. Items are marked, never removed - someone who
    // bought a jacket may still want to see themselves in it.
    if (message.type === 'CART_MARK_PURCHASED' && message.host) {
        const host = String(message.host).toLowerCase();
        const now = Date.now();
        chrome.storage.local.get({ emode_cart: [] }, (result) => {
            const cart = result.emode_cart || [];
            let changed = false;
            const updated = cart.map((item) => {
                if (item.purchasedAt || !item.url) return item;
                let itemHost;
                try { itemHost = new URL(item.url).host.toLowerCase(); } catch { return item; }
                // Same registrable-ish host, allowing the www/apex split and the
                // checkout subdomains stores routinely bounce through.
                const strip = (h) => h.replace(/^(?:www|checkout|secure|shop|store)\./, '');
                if (strip(itemHost) !== strip(host)) return item;
                if (item.addedAt && item.addedAt > now) return item;
                changed = true;
                return { ...item, purchasedAt: now };
            });
            if (changed) chrome.storage.local.set({ emode_cart: updated });
        });
    }

    // 5. Resolve a results-page card to the merchant's own product image.
    if (message.type === 'RESOLVE_PRODUCT_IMAGE' && message.url) {
        resolveProductImage(message.url).then(sendResponse);
        return true; // keep the channel open for the async reply
    }

    return true;
});

chrome.runtime.onInstalled.addListener(() => {
    console.log('emodeAI Extension Installed');
});
