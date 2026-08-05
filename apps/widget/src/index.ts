/**
 * emode embeddable widget.
 *
 * Ships as a standalone IIFE to arbitrary third-party storefronts — Webflow,
 * Squarespace, BigCartel, WooCommerce, bespoke React/Next sites — so it cannot
 * assume any framework, build step, or markup convention.
 *
 * www, not the apex: the apex 308-redirects, and browsers treat a redirect on a
 * CORS preflight as fatal, so cross-origin POSTs would fail silently.
 * Mirror any change in apps/web/lib/site.ts and rebuild (`npm run build`,
 * which also copies to apps/web/public/widget.js).
 */
const EMODE_ORIGIN = 'https://www.emode.style';

interface WidgetConfig {
    merchantId: string;
    productSelector?: string;
    imageSelector?: string;
    titleSelector?: string;
    priceSelector?: string;
    /** Where to place the buttons relative to the detected anchor. */
    placement?: 'before-cart' | 'after-cart' | 'append';
    /** Set false to place the buttons yourself via window.emode.mount(el). */
    autoInject?: boolean;
    /** Override the emode origin. For emode's own development only. */
    host?: string;
}

interface ProductContext {
    title: string;
    image: string;
    price?: string;
    /** Merchant's own product identifier, when discoverable. */
    productId?: string;
    url: string;
}

const VISITOR_KEY = 'emode_visitor_id';
const CONTAINER_CLASS = 'emode-integration-container';

/* ------------------------------------------------------------------ *
 * Shopper identity
 *
 * Minted on the MERCHANT's origin. It cannot live on emode's origin: the
 * modal runs in a cross-origin iframe whose storage browsers partition, so
 * anything stored there is invisible everywhere else on the site. Opaque
 * random value — no personal data — used only to join a try-on to an order.
 * ------------------------------------------------------------------ */
function getVisitorId(): string | null {
    try {
        let id = localStorage.getItem(VISITOR_KEY);
        if (!id) {
            id = (window.crypto && 'randomUUID' in window.crypto)
                ? window.crypto.randomUUID()
                : `v-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
            localStorage.setItem(VISITOR_KEY, id);
        }
        return id;
    } catch {
        // Private browsing or storage disabled — attribution is skipped, the
        // try-on itself still works.
        return null;
    }
}

/* ------------------------------------------------------------------ *
 * Product detection
 *
 * Three tiers, most to least reliable. The previous version only looked for
 * `.product-single, .product` and gave up otherwise, which meant it worked on
 * Shopify themes and essentially nothing else.
 * ------------------------------------------------------------------ */

function absoluteUrl(src: string | null | undefined): string {
    if (!src) return '';
    try {
        return new URL(src, window.location.href).href;
    } catch {
        return src || '';
    }
}

/** Tier 1: schema.org Product JSON-LD. Emitted by Shopify, Woo, Squarespace, BigCommerce. */
function fromJsonLd(): ProductContext | null {
    const blocks = document.querySelectorAll('script[type="application/ld+json"]');
    for (const block of Array.from(blocks)) {
        let parsed: any;
        try {
            parsed = JSON.parse(block.textContent || '');
        } catch {
            continue; // Malformed JSON-LD is common; skip rather than throw.
        }

        // A page may ship an array, or nest everything under @graph.
        const candidates: any[] = [];
        const visit = (node: any) => {
            if (!node || typeof node !== 'object') return;
            if (Array.isArray(node)) return node.forEach(visit);
            if (node['@graph']) visit(node['@graph']);
            candidates.push(node);
        };
        visit(parsed);

        for (const node of candidates) {
            const type = node['@type'];
            const isProduct = Array.isArray(type)
                ? type.includes('Product')
                : type === 'Product';
            if (!isProduct) continue;

            const image = Array.isArray(node.image) ? node.image[0] : node.image;
            const imageUrl = typeof image === 'object' ? image?.url : image;

            const offers = Array.isArray(node.offers) ? node.offers[0] : node.offers;
            const price = offers?.price ?? offers?.lowPrice;
            const currency = offers?.priceCurrency;

            if (node.name && imageUrl && looksLikeProductImage(String(imageUrl))) {
                return {
                    title: String(node.name).trim(),
                    image: absoluteUrl(String(imageUrl)),
                    price: price != null ? `${currency ? currency + ' ' : ''}${price}` : undefined,
                    productId: node.productID ? String(node.productID) : (node.sku ? String(node.sku) : undefined),
                    url: window.location.href,
                };
            }
        }
    }
    return null;
}

/** Tier 2: OpenGraph / product meta tags. */
function fromOpenGraph(): ProductContext | null {
    const meta = (prop: string) =>
        document.querySelector<HTMLMetaElement>(
            `meta[property="${prop}"], meta[name="${prop}"]`
        )?.content;

    const title = meta('og:title');
    const image = meta('og:image');
    if (!title || !image) return null;
    if (!looksLikeProductImage(image)) return null;

    const amount = meta('product:price:amount') || meta('og:price:amount');
    const currency = meta('product:price:currency') || meta('og:price:currency');

    // Requires evidence the page is about ONE product. Title-plus-image alone is
    // not that: many stores serve identical site-level og tags on every page, so
    // this passed on a homepage and produced a "product" named after the store,
    // illustrated with its favicon. Observed on therealreal.com. og:type, a
    // price, or a buy control — any one will do, but not none.
    const isProductType = String(meta('og:type') || '').toLowerCase().includes('product');
    if (!isProductType && !amount && !findCartButton()) return null;

    return {
        title: title.trim(),
        image: absoluteUrl(image),
        price: amount ? `${currency ? currency + ' ' : ''}${amount}` : undefined,
        url: window.location.href,
    };
}

// Deliberately broad. Luxury sites in particular gate the cart behind size
// selection, so the visible control reads "Select size" until a size is chosen —
// Gucci's product pages have no "add to bag" button at all until then.
const CART_BUTTON_RE =
    /add to (cart|bag|basket)|add-to-cart|addtocart|buy now|purchase|select size|choose size|pick a size|add to my|shop now/i;

// Images that are furniture, not merchandise. A favicon or a logo passes every
// size and presence check while being useless to generate from.
const NON_PRODUCT_IMAGE_RE = /favicon|sprite|logo|placeholder|\/icons?\/|1x1|pixel|spacer|avatar/i;

function looksLikeProductImage(url: string | null | undefined): boolean {
    return Boolean(url) && !NON_PRODUCT_IMAGE_RE.test(url as string);
}

/** Find the merchant's own add-to-cart control — the best anchor on any site. */
function findCartButton(): HTMLElement | null {
    const explicit = document.querySelector<HTMLElement>(
        'button[name="add"], .add-to-cart, .product-form__submit, [data-add-to-cart], form[action*="/cart/add"] button'
    );
    if (explicit) return explicit;

    // Fall back to reading button text, which is what actually generalises.
    const clickable = document.querySelectorAll<HTMLElement>('button, a[role="button"], input[type="submit"]');
    for (const el of Array.from(clickable)) {
        const label = (el.textContent || (el as HTMLInputElement).value || '').trim();
        if (label && CART_BUTTON_RE.test(label) && el.offsetParent !== null) return el;
    }
    return null;
}

const PRICE_RE = /(?:[$£€¥]|USD|EUR|GBP)\s?\d[\d.,]*/;

/**
 * The biggest image actually on screen, which is what "the product shot" means.
 *
 * Ranked by RENDERED area, not intrinsic. Intrinsic size ranks the related-
 * products strip level with the hero whenever a site reuses the same file for
 * both — which is the normal case — and then the winner comes down to sort
 * stability rather than anything meaningful.
 *
 * naturalWidth is still used, as a quality floor: it rejects logos, icons and
 * tracking pixels, and rejects images that have not decoded yet (0), so a scan
 * that runs before the gallery loads reports nothing and is retried instead of
 * locking in a placeholder.
 */
function largestImage(scope: ParentNode): string | undefined {
    const best = Array.from(scope.querySelectorAll('img'))
        .filter((img) => img.offsetParent !== null && img.naturalWidth > 150)
        .filter((img) => looksLikeProductImage(img.currentSrc || img.src))
        .map((img) => {
            const r = img.getBoundingClientRect();
            return { img, area: r.width * r.height };
        })
        .filter((c) => c.area > 0)
        .sort((a, b) => b.area - a.area)[0];
    return best && (best.img.currentSrc || best.img.src);
}

/** Tier 3: DOM heuristics, anchored on the cart button rather than class names. */
function fromDom(config: WidgetConfig): ProductContext | null {
    const explicitContainer = config.productSelector
        ? document.querySelector<HTMLElement>(config.productSelector)
        : null;

    // Walk up from the cart button to a container that also holds a heading —
    // that is reliably the product block, whatever it is called.
    let container: HTMLElement | null = explicitContainer;
    if (!container) {
        const cart = findCartButton();

        // No add-to-cart control means no evidence this is a product page. The
        // fallbacks below — any <h1>, the largest image — will happily produce a
        // "product" from a homepage or a collection grid, and the buttons would
        // then open a try-on for whichever item was rendered biggest. Requiring
        // the cart button is what separates a product page from a page that
        // merely contains products.
        if (!cart) return null;

        let node: HTMLElement | null = cart.parentElement;
        for (let depth = 0; node && depth < 8; depth++) {
            if (node.querySelector('h1, h2')) { container = node; break; }
            node = node.parentElement;
        }
    }
    const scope: ParentNode = container || document;

    const titleEl = config.titleSelector
        ? document.querySelector(config.titleSelector)
        : (scope.querySelector('h1') || document.querySelector('h1'));
    const title = titleEl?.textContent?.trim();

    let image: string | undefined;
    if (config.imageSelector) {
        image = (document.querySelector(config.imageSelector) as HTMLImageElement | null)?.currentSrc;
    }
    if (!image) {
        // Prefer an image inside the product block, but do not require one. The
        // container is found by walking up from the cart button to the nearest
        // heading, and in the standard two-column product layout that lands on
        // the info column — whose sibling, not whose subtree, holds the gallery.
        // Scoping alone would therefore find no image on most real storefronts.
        // The cart button has already established this is a product page, so
        // widening to the document is safe here.
        image = largestImage(scope) || (scope !== document ? largestImage(document) : undefined);
    }

    let price: string | undefined;
    if (config.priceSelector) {
        price = document.querySelector(config.priceSelector)?.textContent?.trim();
    }
    if (!price && container) {
        const match = (container.textContent || '').match(PRICE_RE);
        price = match?.[0];
    }

    if (!title || !image) return null;
    return { title, image: absoluteUrl(image), price, url: window.location.href };
}

/* ------------------------------------------------------------------ *
 * Images emode's servers cannot reach
 *
 * Generation fetches the garment image server-side, so it needs a URL that
 * resolves on the public internet. Two ordinary situations produce one that
 * doesn't: a brand integrating emode while still building the store on
 * localhost, and a password-protected staging domain. Rather than fail, the
 * widget reads the image off the page it is already running on and hands the
 * bytes to the modal directly.
 * ------------------------------------------------------------------ */

const PRIVATE_HOST_RE =
    /^(localhost|127\.|0\.0\.0\.0$|\[?::1\]?$|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)|\.local$|\.test$|\.localhost$/i;

function isReachableByServer(url: string): boolean {
    try {
        const u = new URL(url, window.location.href);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
        return !PRIVATE_HOST_RE.test(u.hostname);
    } catch {
        return false;
    }
}

/**
 * Re-encode an on-page image as a data URL.
 *
 * Capped at 1024px and JPEG-encoded: the raw file can be several megabytes,
 * and the generate endpoint also carries the shopper's photo in the same
 * request, under a 4.5MB serverless body limit.
 *
 * Returns null rather than throwing when the canvas is tainted — an image
 * served cross-origin without CORS headers cannot be read back, and that is a
 * normal outcome, not an error worth surfacing to a shopper.
 */
function inlineImage(src: string): Promise<string | null> {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const scale = Math.min(1, 1024 / Math.max(img.naturalWidth, img.naturalHeight));
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(img.naturalWidth * scale);
                canvas.height = Math.round(img.naturalHeight * scale);
                const ctx = canvas.getContext('2d');
                if (!ctx) return resolve(null);
                // Transparent PNGs are common for garment cutouts and go black
                // on a JPEG background, so flatten onto white first.
                ctx.fillStyle = '#fff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.86));
            } catch {
                resolve(null);
            }
        };
        img.onerror = () => resolve(null);
        img.src = src;
    });
}

class EmodeWidget {
    private config: WidgetConfig;
    private baseUrl: string;
    private visitorId: string | null;
    private context: ProductContext | null = null;
    private lastUrl = '';

    constructor(config: WidgetConfig) {
        this.config = config;

        // Always production, even on localhost.
        //
        // A previous version pointed at http://localhost:3000 whenever the page
        // was served from localhost, on the assumption that localhost meant
        // "emode is running locally". For a merchant that is backwards:
        // localhost is THEIR site. It made the widget load the modal from the
        // merchant's own dev server — a guaranteed 404, and on the same port
        // Next.js defaults to, so the two collide.
        //
        // Working against production from localhost is the point: a brand can
        // integrate emode while building their store and have it work before
        // they have deployed anything. Only emode's own developers need to
        // override this, via data-emode-host.
        this.baseUrl = (config.host || EMODE_ORIGIN).replace(/\/+$/, '');
        this.visitorId = getVisitorId();
    }

    detect(): ProductContext | null {
        return fromJsonLd() || fromOpenGraph() || fromDom(this.config);
    }

    /** Idempotent: safe to call on every SPA route change. */
    scan() {
        // Re-detect when the URL changes even if buttons already exist — SPA
        // navigation swaps the product without reloading the page.
        const urlChanged = this.lastUrl !== window.location.href;
        const existing = document.querySelector(`.${CONTAINER_CLASS}`);
        if (existing && !urlChanged) return;
        if (existing && urlChanged) existing.remove();

        this.lastUrl = window.location.href;
        this.context = this.detect();

        if (!this.context) return; // Not a product page — expected on most pages.

        this.logImpression(this.context);
        if (this.config.autoInject !== false) this.inject(this.context);
    }

    private logImpression(ctx: ProductContext) {
        if (!this.visitorId || !this.config.merchantId) return;
        fetch(`${this.baseUrl}/api/impression`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                merchantId: this.config.merchantId,
                visitorId: this.visitorId,
                // Only a real platform id here. The URL travels separately: the
                // server keys products on it, and needs to normalise away query
                // strings first so ?utm_source and ?variant do not each mint a
                // new product.
                productId: ctx.productId,
                // The merchant has no catalogue in emode — the widget is the only
                // thing that ever sees these products, so what it scraped to draw
                // the modal is also what fills in their dashboard.
                title: ctx.title,
                image: ctx.image,
                price: ctx.price,
                url: ctx.url,
            }),
            keepalive: true,
        }).catch(() => { /* analytics must never affect the storefront */ });
    }

    private inject(ctx: ProductContext) {
        const group = document.createElement('div');
        group.className = CONTAINER_CLASS;
        group.style.cssText = 'display:flex;gap:8px;margin:12px 0;width:100%;';

        const tryBtn = this.button('✨ Try This On', true);
        tryBtn.onclick = (e) => { e.preventDefault(); this.open(ctx, 'try-on'); };

        const roomBtn = this.button('👗 Dressing Room', false);
        roomBtn.onclick = (e) => { e.preventDefault(); this.open(ctx, 'dressing-room', 'add'); };

        group.append(tryBtn, roomBtn);

        const cart = findCartButton();
        const placement = this.config.placement || 'before-cart';

        if (cart?.parentNode && placement !== 'append') {
            if (placement === 'after-cart') cart.parentNode.insertBefore(group, cart.nextSibling);
            else cart.parentNode.insertBefore(group, cart);
        } else {
            // No cart control found — sit under the heading rather than
            // appending to the end of the page, where nobody would see it.
            const heading = document.querySelector('h1');
            if (heading?.parentNode) heading.parentNode.insertBefore(group, heading.nextSibling);
            else document.body.appendChild(group);
        }
    }

    private button(label: string, primary: boolean): HTMLButtonElement {
        const b = document.createElement('button');
        b.type = 'button'; // Never submit a surrounding product form.
        b.textContent = label;
        b.style.cssText = [
            'flex:1', 'min-width:0', 'padding:13px 12px', 'border-radius:10px',
            'font:700 12px/1.2 inherit', 'letter-spacing:0.09em', 'text-transform:uppercase',
            'white-space:nowrap', 'overflow:hidden', 'text-overflow:ellipsis',
            'cursor:pointer', 'transition:transform .15s ease',
            primary
                ? 'background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff;border:none;box-shadow:0 3px 12px rgba(99,102,241,.28)'
                : 'background:#fff;color:#9a7212;border:1.6px solid #b8860b',
        ].join(';');
        b.onmouseover = () => { b.style.transform = 'translateY(-1px)'; };
        b.onmouseout = () => { b.style.transform = 'translateY(0)'; };
        return b;
    }

    open(ctx: ProductContext | null, tab: 'try-on' | 'dressing-room' = 'try-on', action?: 'add') {
        const c = ctx || this.context || this.detect();
        if (!c) {
            console.warn('[emode] No product detected on this page.');
            return;
        }
        if (document.getElementById('emode-widget-overlay')) return;

        const params = new URLSearchParams({
            merchant: this.config.merchantId,
            title: c.title,
            image: c.image,
            price: c.price || '',
            tab,
            source: 'widget',
            vid: this.visitorId || '',
            origin: window.location.host,
            url: c.url,
        });
        if (c.productId) params.set('product', c.productId);
        if (action) params.set('action', action);

        const overlay = document.createElement('div');
        overlay.id = 'emode-widget-overlay';
        overlay.style.cssText =
            'position:fixed;inset:0;background:rgba(0,0,0,.45);backdrop-filter:blur(16px);' +
            '-webkit-backdrop-filter:blur(16px);z-index:2147483647;display:flex;align-items:center;' +
            'justify-content:center;padding:16px;opacity:0;transition:opacity .3s ease';
        setTimeout(() => { overlay.style.opacity = '1'; }, 10);

        const close = () => {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 250);
            document.body.style.overflow = '';
            window.removeEventListener('message', onMessage);
            document.removeEventListener('keydown', onKey);
        };

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.setAttribute('aria-label', 'Close');
        closeBtn.innerHTML = '&times;';
        closeBtn.style.cssText =
            'position:absolute;top:20px;right:20px;width:40px;height:40px;border-radius:50%;' +
            'background:rgba(255,255,255,.15);color:#fff;border:none;font-size:24px;cursor:pointer;z-index:10';
        closeBtn.onclick = close;

        const iframe = document.createElement('iframe');
        iframe.src = `${this.baseUrl}/modal?${params.toString()}`;
        iframe.style.cssText =
            'width:95%;height:95%;max-width:1100px;max-height:850px;border:none;border-radius:24px;' +
            'box-shadow:0 30px 60px rgba(0,0,0,.5);background:#fff';
        iframe.setAttribute('allow', 'camera;microphone');

        // Kick off the re-encode now, in parallel with the iframe loading, so the
        // image is usually ready by the time the modal says it is listening.
        const handoff = isReachableByServer(c.image) ? null : inlineImage(c.image);

        const onMessage = (e: MessageEvent) => {
            if (e.origin !== this.baseUrl) return; // Only trust the modal's origin.
            if (!e.data || typeof e.data !== 'object') return;
            if (e.data.type === 'emode:close') close();
            if (e.data.type === 'emode:ready' && handoff) {
                handoff.then((dataUrl) => {
                    if (dataUrl) iframe.contentWindow?.postMessage(
                        { type: 'emode:image', dataUrl }, this.baseUrl
                    );
                });
            }
            if (e.data.type === 'emode:add-to-cart') {
                // The host site owns its cart. Sites that listen can add
                // directly; the rest fall through to the product page.
                const handled = !window.dispatchEvent(
                    new CustomEvent('emode:cart-add', { detail: { ...e.data, product: c }, cancelable: true })
                );
                close();
                if (!handled && c.url && c.url !== window.location.href) window.location.href = c.url;
            }
        };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };

        overlay.onclick = (e) => { if (e.target === overlay) close(); };
        window.addEventListener('message', onMessage);
        document.addEventListener('keydown', onKey);

        overlay.append(closeBtn, iframe);
        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';
    }

    /**
     * Merchant-called purchase hook.
     *
     * Shopify gets attribution for free via cart attributes; a custom store has
     * no equivalent, so this is the seam. Call it on your order-confirmation
     * page and try-on conversion, AOV and time-to-purchase light up exactly as
     * they do for Shopify merchants.
     */
    trackOrder(order: { orderId: string; total: number; currency?: string; productIds?: string[] }) {
        if (!this.config.merchantId || !order?.orderId) return;
        fetch(`${this.baseUrl}/api/order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                merchantId: this.config.merchantId,
                visitorId: this.visitorId,
                orderId: String(order.orderId),
                total: order.total,
                currency: order.currency || 'USD',
                productIds: order.productIds || [],
            }),
            keepalive: true,
        }).catch(() => {});
    }
}

/* ------------------------------------------------------------------ *
 * Bootstrap
 * ------------------------------------------------------------------ */
(function boot() {
    const script = (document.currentScript ||
        document.querySelector('script[data-emode-merchant]')) as HTMLScriptElement | null;

    const config: WidgetConfig = {
        merchantId: script?.dataset.emodeMerchant || '',
        productSelector: script?.dataset.productSelector,
        titleSelector: script?.dataset.titleSelector,
        imageSelector: script?.dataset.imageSelector,
        priceSelector: script?.dataset.priceSelector,
        placement: (script?.dataset.placement as WidgetConfig['placement']) || undefined,
        autoInject: script?.dataset.autoInject !== 'false',
        // data-emode-host="http://localhost:3000" points the widget at a local
        // emode instance. Merchants never need this; it exists so emode's own
        // developers can test the widget against a dev server.
        host: script?.dataset.emodeHost,
    };

    if (!config.merchantId) {
        console.error('[emode] Missing data-emode-merchant on the script tag. Widget disabled.');
        return;
    }

    const widget = new EmodeWidget(config);

    // Public API. Single-page apps and bespoke checkouts need programmatic
    // control; a script tag alone cannot cover either.
    (window as any).emode = {
        open: (tab?: 'try-on' | 'dressing-room') => widget.open(null, tab),
        scan: () => widget.scan(),
        trackOrder: (order: any) => widget.trackOrder(order),
        get visitorId() { return getVisitorId(); },
    };

    const start = () => widget.scan();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();

    // Images and prices often render after first paint (lazy loading, client
    // fetches), so detection gets another look shortly after.
    setTimeout(start, 800);
    setTimeout(start, 2000);

    // SPA route changes do not reload the page. Patch the history methods and
    // listen for popstate so the widget follows client-side navigation.
    for (const method of ['pushState', 'replaceState'] as const) {
        const original = history[method];
        history[method] = function (this: History, ...args: any[]) {
            const result = original.apply(this, args as any);
            setTimeout(start, 300);
            return result;
        } as any;
    }
    window.addEventListener('popstate', () => setTimeout(start, 300));
})();
