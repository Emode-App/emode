/**
 * Product detection, shared shape with apps/widget/src/index.ts.
 *
 * The extension grew its own detection independently, built around two signals:
 * og:type="product", and a button whose text contains "add to" / "bag" / "buy".
 * Both are conventions rather than standards, and the sites most worth
 * supporting are the ones least likely to follow them. Gucci sets no og:type at
 * all and gates its cart behind a "SELECT SIZE" button, so the extension
 * concluded a $2,250 jacket page was not a product page — while emitting
 * complete Product JSON-LD with name, image and price the whole time.
 *
 * Tiers, most to least reliable:
 *   1. schema.org Product JSON-LD — Shopify, Woo, Squarespace, BigCommerce,
 *      and essentially every luxury house, because Google requires it for rich
 *      results. This is the tier that matters.
 *   2. OpenGraph product meta.
 *   3. DOM heuristics anchored on the buy control.
 *
 * Plain script, no modules: MV3 content scripts share one scope per document,
 * so listing this before content.js in the manifest is enough. Loaded by the
 * side panel too.
 *
 * Mirror behavioural changes in apps/widget/src/index.ts — the two are separate
 * files for packaging reasons, not because they should disagree.
 */
(function (global) {
    'use strict';

    /**
     * Strip the store's own name off a title.
     *
     * og:title is written for a browser tab and a link preview, so it routinely
     * ends "<product> | <STORE>" — which arrived intact in the try-on panel as
     * "Froissé nylon faille zip jacket with embroidery in beige | GUCCI® US".
     * Only the trailing segment is removed, and only when it plausibly names
     * this site, so a product genuinely called "Something | Something" survives.
     */
    function cleanProductTitle(raw) {
        if (!raw) return raw;
        let title = String(raw).trim();

        const siteName = (document.querySelector('meta[property="og:site_name"]') || {}).content || '';
        const host = window.location.hostname.replace(/^www\./, '').split('.')[0];
        const normalise = (v) => v.toLowerCase().replace(/[^a-z0-9]/g, '');
        const brands = [normalise(siteName), normalise(host)].filter((b) => b.length > 2);

        // Split on separators, but rebuild by SLICING the original string rather
        // than re-joining the parts. Re-joining printed one canonical separator
        // back, so "Merino Wool Jacket - Charcoal | NORTHBOUND SUPPLY" came out
        // as "Merino Wool Jacket | Charcoal" — the store name correctly gone and
        // the garment's own name quietly rewritten. A title nothing was stripped
        // from was still not the title the merchant wrote.
        const separator = /\s+[|–—·-]\s+/g;
        const cuts = [];
        for (let m = separator.exec(title); m; m = separator.exec(title)) {
            cuts.push({ start: m.index, end: m.index + m[0].length });
        }

        let end = title.length;
        for (let i = cuts.length - 1; i >= 0; i--) {
            const tail = normalise(title.slice(cuts[i].end, end));
            const isSite = brands.some((b) => tail.includes(b) || b.includes(tail));
            if (!isSite) break;
            end = cuts[i].start;
        }

        title = title.slice(0, end).trim();
        return title || String(raw).trim();
    }

    const CURRENCY_SYMBOLS = {
        USD: '$', CAD: '$', AUD: '$', NZD: '$', EUR: '€', GBP: '£',
        JPY: '¥', CNY: '¥', KRW: '₩', INR: '₹', CHF: 'CHF ',
    };

    /**
     * "$85.00", not "USD 85.00".
     *
     * Structured data gives the amount and an ISO currency code separately, and
     * joining them produced a price no storefront would ever print. Unknown
     * codes keep the code, which is better than guessing a symbol wrong.
     */
    function formatPrice(amount, currency) {
        if (amount == null || amount === '') return undefined;

        const value = String(amount).trim();
        const code = String(currency || '').trim().toUpperCase();
        if (!code) return value;

        // Normalise the amount itself. Structured data is inconsistent about
        // this - "285.00" from one store and "1250" from the next - and passing
        // it straight through printed $285.00 beside £1250 on the same screen.
        // A price is the one number a shopper actually reads.
        const number = Number(value.replace(/,/g, ''));
        const amountText = Number.isFinite(number)
            ? number.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : value;

        const symbol = CURRENCY_SYMBOLS[code];
        return symbol ? `${symbol}${amountText}` : `${code} ${amountText}`;
    }

    function absoluteUrl(src) {
        if (!src) return '';
        try {
            return new URL(src, window.location.href).href;
        } catch {
            return src || '';
        }
    }

    /** Tier 1: schema.org Product JSON-LD. */
    function fromJsonLd() {
        const blocks = document.querySelectorAll('script[type="application/ld+json"]');

        for (const block of Array.from(blocks)) {
            let parsed;
            try {
                parsed = JSON.parse(block.textContent || '');
            } catch {
                continue; // Malformed JSON-LD is common; skip rather than throw.
            }

            // A page may ship an array, or nest everything under @graph.
            const candidates = [];
            const visit = (node) => {
                if (!node || typeof node !== 'object') return;
                if (Array.isArray(node)) return node.forEach(visit);
                if (node['@graph']) visit(node['@graph']);
                candidates.push(node);
            };
            visit(parsed);

            for (const node of candidates) {
                const type = node['@type'];
                const isProduct = Array.isArray(type) ? type.includes('Product') : type === 'Product';
                if (!isProduct) continue;

                const rawImage = Array.isArray(node.image) ? node.image[0] : node.image;
                const imageUrl = rawImage && typeof rawImage === 'object' ? rawImage.url : rawImage;

                const offers = Array.isArray(node.offers) ? node.offers[0] : node.offers;
                const price = offers && (offers.price != null ? offers.price : offers.lowPrice);
                const currency = offers && offers.priceCurrency;

                if (node.name && imageUrl && looksLikeProductImage(String(imageUrl))) {
                    return {
                        title: cleanProductTitle(node.name),
                        image: absoluteUrl(String(imageUrl)),
                        price: formatPrice(price, currency),
                        productId: node.productID ? String(node.productID)
                            : (node.sku ? String(node.sku) : undefined),
                        url: window.location.href,
                        source: 'json-ld',
                    };
                }
            }
        }
        return null;
    }

    // Images that are furniture, not merchandise. A favicon or a logo passes
    // every size and presence check while being useless to generate from.
    const NON_PRODUCT_IMAGE_RE = /favicon|sprite|logo|placeholder|\/icons?\/|1x1|pixel|spacer|avatar/i;

    function looksLikeProductImage(url) {
        return Boolean(url) && !NON_PRODUCT_IMAGE_RE.test(url);
    }

    /**
     * Tier 2: OpenGraph / product meta tags.
     *
     * Requires evidence the page is about ONE product. Title-plus-image alone is
     * not that: many sites serve identical site-level og tags on every page, so
     * the check passed on a homepage and produced a "product" named after the
     * store, illustrated with its favicon. og:type, a price, or a buy control —
     * any one will do, but not none.
     */
    function fromOpenGraph() {
        const meta = (prop) => {
            const el = document.querySelector(`meta[property="${prop}"], meta[name="${prop}"]`);
            return el ? el.content : undefined;
        };

        const title = meta('og:title');
        const image = meta('og:image');
        if (!title || !image) return null;
        if (!looksLikeProductImage(image)) return null;

        const amount = meta('product:price:amount') || meta('og:price:amount');
        const currency = meta('product:price:currency') || meta('og:price:currency');

        const isProductType = String(meta('og:type') || '').toLowerCase().includes('product');
        if (!isProductType && !amount && !findCartButton()) return null;

        return {
            title: cleanProductTitle(title),
            image: absoluteUrl(image),
            price: formatPrice(amount, currency),
            url: window.location.href,
            source: 'opengraph',
        };
    }

    // Deliberately broad. A buy control is the strongest evidence a page sells
    // one thing, and "Add to bag" is only one of the ways stores write it —
    // luxury sites in particular gate the cart behind size selection, so the
    // visible control says "Select size" until a size is chosen.
    const CART_BUTTON_RE =
        /add to (cart|bag|basket)|add-to-cart|addtocart|buy now|purchase|select size|choose size|pick a size|add to my|shop now/i;

    /**
     * Is this element pinned to the viewport rather than sitting in the page?
     *
     * Sticky add-to-cart bars and site headers are chrome: they follow the
     * shopper around and are not part of the product form. Anchoring to one puts
     * the try-on buttons in a floating strip at the bottom of the window instead
     * of beside the real buy button, which is exactly what happened on a Shopify
     * theme whose sticky bar appears earlier in the DOM than its product form.
     */
    function isPinned(el) {
        for (let node = el; node && node !== document.body; node = node.parentElement) {
            const position = window.getComputedStyle(node).position;
            if (position !== 'fixed' && position !== 'sticky') continue;

            // Being pinned is not itself disqualifying — a quick-view dialog is
            // position:fixed and its buy button is the realest control on the
            // page. What marks chrome is being a strip: headers and sticky
            // add-to-cart bars hug an edge and are shallow, while a dialog
            // occupies the middle of the window.
            const r = node.getBoundingClientRect();
            const isStrip =
                r.height < window.innerHeight * 0.25 || r.width < window.innerWidth * 0.25;
            if (isStrip) return true;
        }
        return false;
    }

    /** Is this element actually a clickable control a shopper can see? */
    function isUsableControl(el) {
        if (!el || el.offsetParent === null) return false;
        const r = el.getBoundingClientRect();
        if (r.width < 60 || r.height < 20) return false;
        return !isPinned(el);
    }

    /**
     * The merchant's own buy control — the best anchor on any storefront.
     *
     * Text is checked before class names. A selector like [class*="add-to-bag"]
     * matches the icon-only bag in a site header just as happily as the real
     * control, and anchoring to that puts the try-on buttons in the navigation.
     * Requiring real text, then real size, keeps the header out of it.
     */
    function findCartButton() {
        const clickable = document.querySelectorAll(
            'button, a[role="button"], input[type="submit"], [role="button"]'
        );
        for (const el of Array.from(clickable)) {
            const label = (el.textContent || el.value || '').trim();
            if (label && CART_BUTTON_RE.test(label) && isUsableControl(el)) return el;
        }

        // Only then fall back to structure, and still require a real control.
        const explicit = Array.from(document.querySelectorAll(
            'button[name="add"], .add-to-cart, .product-form__submit, [data-add-to-cart], ' +
            'form[action*="/cart/add"] button, [data-testid*="add-to"], [class*="AddToCart"]'
        )).find(isUsableControl);

        return explicit || null;
    }

    /**
     * The biggest image actually on screen.
     *
     * Ranked by RENDERED area, not intrinsic size: sites reuse one file for the
     * hero and the related-products strip, so intrinsic size ranks them equal
     * and the winner comes down to sort stability. naturalWidth stays as a
     * quality floor, rejecting logos, icons, tracking pixels, and images that
     * have not decoded yet.
     */
    /**
     * How much of this element is actually on screen.
     *
     * Layout area alone cannot pick a product shot out of a carousel: every
     * slide is rendered at identical size and every one reports as visible, so
     * on a Shopify gallery four images tied at exactly 149630px² and the winner
     * was whichever appeared first in the DOM. That was a lifestyle photo — a
     * figure across a courtyard — and it kept being handed to the generator no
     * matter how the ranking was phrased, because the ranking had nothing to
     * discriminate on.
     *
     * Off-screen slides are translated outside the viewport, so intersecting
     * with it separates the picture the shopper is looking at from its siblings.
     */
    function onScreenArea(el) {
        const style = window.getComputedStyle(el);
        if (style.visibility === 'hidden' || style.opacity === '0') return 0;
        if (el.closest('[aria-hidden="true"]')) return 0;

        const r = el.getBoundingClientRect();
        const w = Math.max(0, Math.min(r.right, window.innerWidth) - Math.max(r.left, 0));
        const h = Math.max(0, Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0));
        return w * h;
    }

    /**
     * Is this picture of something else entirely?
     *
     * Alternate views of one product are not links, or link back to the page you
     * are on. A picture wrapped in a link to a DIFFERENT product page is a
     * different product — a colourway strip, a "you may also like" rail, a
     * recommendation. StockX renders five other Jordan 1 colourways directly
     * under the title, and offering those as "wrong picture?" alternatives
     * invites the shopper to try on a shoe from another listing entirely.
     */
    /**
     * Is this image about something other than the thing we are reading?
     *
     * On a product page the question is answered against the page itself: an
     * image linking to a different URL is a recommendation - "you may also
     * like" - and not this garment. That is what stopped the detector pulling a
     * neighbouring listing's photo.
     *
     * Inside a scope it is a different question, and answering the page-level
     * one there was a bug. A quick-view dialog is ABOUT one product and its
     * image is routinely wrapped in a link to that product's page - the most
     * ordinary quick-view markup there is. Judged against the current URL, that
     * link always "points elsewhere", so every image in the dialog was thrown
     * away and the dialog detected as nothing at all. Within a scope the subject
     * is the scope's own primary link, not the address bar.
     */
    function linksElsewhere(img, scope) {
        const anchor = img.closest('a[href]');
        if (!anchor) return false;

        const href = anchor.getAttribute('href') || '';
        if (!href || href.startsWith('#') || href.startsWith('javascript:')) return false;

        const samePath = (a, b) => {
            try {
                const one = new URL(a, window.location.href);
                const two = new URL(b, window.location.href);
                return one.origin === two.origin &&
                    one.pathname.replace(/\/+$/, '') === two.pathname.replace(/\/+$/, '');
            } catch {
                return false;
            }
        };

        if (scope && scope !== document && scope.querySelectorAll) {
            const subject = primaryHref(scope);
            // No link to compare against means nothing to contradict.
            return subject ? !samePath(href, subject) : false;
        }

        return !samePath(href, window.location.href);
    }

    /**
     * The link a scope is "about": the href shared by the most of its image
     * links. A card or dialog usually repeats one product link across the photo,
     * the title and a details button, so the modal href wins on count alone.
     */
    function primaryHref(scope) {
        const counts = new Map();
        for (const anchor of Array.from(scope.querySelectorAll('a[href]'))) {
            const href = anchor.getAttribute('href') || '';
            if (!href || href.startsWith('#') || href.startsWith('javascript:')) continue;
            counts.set(href, (counts.get(href) || 0) + 1);
        }
        let best = null;
        let bestCount = 0;
        for (const [href, count] of counts) {
            if (count > bestCount) { best = href; bestCount = count; }
        }
        return best;
    }

    function imageCandidates(scope) {
        return Array.from((scope || document).querySelectorAll('img'))
            .filter((img) => img.offsetParent !== null && img.naturalWidth > 150)
            .filter((img) => looksLikeProductImage(img.currentSrc || img.src))
            .filter((img) => !linksElsewhere(img, scope))
            .map((img) => {
                const r = img.getBoundingClientRect();
                return {
                    src: img.currentSrc || img.src,
                    area: r.width * r.height,
                    visible: onScreenArea(img),
                };
            })
            .filter((c) => c.area > 0 && c.src)
            // On screen first; layout size only breaks ties between images that
            // are equally visible.
            .sort((a, b) => (b.visible - a.visible) || (b.area - a.area));
    }

    function largestImage(scope) {
        const best = imageCandidates(scope)[0];
        return best ? best.src : undefined;
    }

    const PRICE_RE = /(?:[$£€¥]|USD|EUR|GBP)\s?\d[\d.,]*/;

    /**
     * Read a product out of one region of the page.
     *
     * Headings are ranked by nearness to the price rather than by document
     * order. An overlay's first heading is often the brand or a breadcrumb, and
     * its later ones are section labels — which is how Lyst's dialog produced
     * "Size & fit" as a product name. The name sits beside the price, because
     * that is how people read a product.
     */
    // Headings that label a section rather than name a product.
    const SECTION_LABEL_RE =
        /^(size|fit|size ?& ?fit|description|details|delivery|shipping|returns?|reviews?|care|composition|about|more|similar|you may also like|related)/i;

    function fromScope(scope) {
        // Anchor on the price. Everything a shopper needs to identify what they
        // are looking at is printed immediately above it.
        let priceEl = null;
        let price;
        for (const el of Array.from(scope.querySelectorAll('h1, h2, h3, h4, span, div, p, b, strong'))) {
            if (el.children.length) continue;
            const match = (el.textContent || '').match(PRICE_RE);
            if (match && el.offsetParent !== null) { priceEl = el; price = match[0]; break; }
        }

        let title = '';

        if (priceEl) {
            const priceTop = priceEl.getBoundingClientRect().top;

            // Lines printed above the price, nearest last. Not only headings:
            // aggregators mark the brand as a heading and the product name as a
            // paragraph, so a headings-only rule skipped the actual name and
            // reached down for a section label instead — which is how a dress
            // came through titled "Cara Cara Size & fit".
            const above = Array.from(scope.querySelectorAll('h1, h2, h3, h4, p, span, div, a'))
                .filter((el) => {
                    if (el.children.length) return false;
                    if (el === priceEl || el.offsetParent === null) return false;

                    const text = (el.textContent || '').trim();
                    if (text.length < 3 || text.length > 120) return false;
                    if (PRICE_RE.test(text)) return false;
                    if (SECTION_LABEL_RE.test(text)) return false;

                    const gap = priceTop - el.getBoundingClientRect().top;
                    return gap > 0 && gap < 220;
                })
                .map((el) => (el.textContent || '').trim());

            // Brand on one line, product name on the next, is the usual shape.
            const unique = [...new Set(above)];
            title = unique.slice(-2).join(' ').trim();
        }

        if (!title) {
            const heading = Array.from(scope.querySelectorAll('h1, h2, h3'))
                .find((h) => h.offsetParent !== null
                    && (h.textContent || '').trim().length > 2
                    && !SECTION_LABEL_RE.test((h.textContent || '').trim()));
            title = heading ? (heading.textContent || '').trim() : '';
        }

        const image = largestImage(scope);
        if (!title || !image) return null;

        return {
            title: cleanProductTitle(title),
            image: absoluteUrl(image),
            price,
            url: window.location.href,
            source: 'overlay',
        };
    }

    /** Tier 3: DOM heuristics, anchored on the buy control. */
    function fromDom() {
        const cart = findCartButton();
        // Without a buy control there is no evidence this is a product page.
        // "Any h1 plus the largest image" happily invents a product from a
        // homepage or a collection grid.
        if (!cart) return null;

        let container = null;
        let node = cart.parentElement;
        for (let depth = 0; node && depth < 8; depth++) {
            if (node.querySelector('h1, h2')) { container = node; break; }
            node = node.parentElement;
        }

        const scope = container || document;
        const titleEl = scope.querySelector('h1') || document.querySelector('h1');
        const title = titleEl && titleEl.textContent ? titleEl.textContent.trim() : '';

        // A two-column layout puts the gallery in a SIBLING of the block holding
        // the heading, so the scoped search usually finds nothing.
        const image = largestImage(scope) || (scope !== document ? largestImage(document) : undefined);

        let price;
        if (container) {
            const match = (container.textContent || '').match(PRICE_RE);
            price = match ? match[0] : undefined;
        }

        if (!title || !image) return null;
        return { title: cleanProductTitle(title), image: absoluteUrl(image), price, url: window.location.href, source: 'dom' };
    }

    /**
     * An open quick-view / modal, if one is covering the page.
     *
     * Aggregators like Lyst show a product in a dialog on top of whatever the
     * shopper was already looking at. Detection reading the document then answers
     * about the wrong thing entirely: on Lyst it returned a title of "Size & fit"
     * — a section heading inside the dialog — illustrated with the magazine photo
     * from the page underneath, for a dress that was right there on screen.
     *
     * Structured data is worse than useless in this state. JSON-LD is emitted for
     * the underlying page and does not change when a dialog opens, so it
     * confidently describes something the shopper is not looking at. Inside an
     * overlay the DOM is the only honest source.
     */
    function findOverlay() {
        const candidates = Array.from(document.querySelectorAll(
            '[role="dialog"], [aria-modal="true"], dialog[open], [class*="modal"], [class*="quickview"], [class*="quick-view"]'
        ));

        let best = null;
        let bestArea = 0;

        for (const el of candidates) {
            if (el.offsetParent === null && window.getComputedStyle(el).position !== 'fixed') continue;

            const style = window.getComputedStyle(el);
            if (style.visibility === 'hidden' || style.opacity === '0' || style.display === 'none') continue;

            const r = el.getBoundingClientRect();
            // Must actually cover a meaningful part of the window. Plenty of
            // markup is called "modal" while sitting collapsed and empty.
            const area = r.width * r.height;
            if (area < window.innerWidth * window.innerHeight * 0.2) continue;

            // And must contain something to buy — otherwise it is a newsletter
            // prompt, a cookie banner, or a size guide.
            const hasHeading = el.querySelector('h1, h2, h3');
            const hasPrice = PRICE_RE.test(el.textContent || '');
            if (!hasHeading || !hasPrice) continue;

            if (area > bestArea) { best = el; bestArea = area; }
        }

        return best;
    }

    /**
     * Best available product context, or null if this is not a product page.
     *
     * JSON-LD wins on identity but not always on imagery: a store's featured
     * image is frequently a styled lifestyle shot, and a photo of someone across
     * a courtyard is useless to generate from. Where the page is showing a
     * markedly larger image than the one the metadata names, prefer what the
     * shopper is actually looking at.
     */
    function detectProduct() {
        // A quick-view dialog wins over everything the page says about itself.
        const overlay = findOverlay();
        const context = overlay
            ? fromScope(overlay)
            : (fromJsonLd() || fromOpenGraph() || fromDom());
        if (!context) return null;

        const imageScope = overlay || document;
        context.alternateImages = imageCandidates(imageScope).map((c) => c.src).slice(0, 8);

        if (context.source !== 'dom' && context.source !== 'overlay') {
            const onPage = imageCandidates(imageScope)[0];
            if (onPage && onPage.area > 90000 && onPage.src !== context.image) {
                context.metadataImage = context.image;
                context.image = onPage.src;
            }
        }

        return context;
    }

    function isProductPage() {
        return detectProduct() !== null;
    }

    /**
     * Where the try-on buttons should go.
     *
     * The buy control when there is one. When there is not — and on a luxury
     * site there often is not until a size is chosen — the product heading. A
     * page can be confidently identified as a product page through JSON-LD and
     * still contain no button matching any keyword, which is exactly Gucci: the
     * old placement scan gave up there and no buttons appeared on a page the
     * detector was certain about.
     */
    function findAnchor() {
        const cart = findCartButton();
        if (cart) return { el: cart, position: 'before' };

        const heading = document.querySelector('h1');
        if (heading && heading.offsetParent !== null) return { el: heading, position: 'after' };

        return null;
    }

    global.emodeDetect = {
        linksElsewhere,
        primaryHref,
        findOverlay,
        fromScope,
        onScreenArea,
        isPinned,
        cleanProductTitle,
        findAnchor,
        isUsableControl,
        detectProduct,
        isProductPage,
        findCartButton,
        largestImage,
        imageCandidates,
        fromJsonLd,
        fromOpenGraph,
        fromDom,
    };
})(typeof window !== 'undefined' ? window : globalThis);
