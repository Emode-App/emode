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
                        title: String(node.name).trim(),
                        image: absoluteUrl(String(imageUrl)),
                        price: price != null ? `${currency ? currency + ' ' : ''}${price}` : undefined,
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
            title: title.trim(),
            image: absoluteUrl(image),
            price: amount ? `${currency ? currency + ' ' : ''}${amount}` : undefined,
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

    /** Is this element actually a clickable control a shopper can see? */
    function isUsableControl(el) {
        if (!el || el.offsetParent === null) return false;
        const r = el.getBoundingClientRect();
        return r.width >= 60 && r.height >= 20;
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
    function imageCandidates(scope) {
        return Array.from((scope || document).querySelectorAll('img'))
            .filter((img) => img.offsetParent !== null && img.naturalWidth > 150)
            .filter((img) => looksLikeProductImage(img.currentSrc || img.src))
            .map((img) => {
                const r = img.getBoundingClientRect();
                return { src: img.currentSrc || img.src, area: r.width * r.height };
            })
            .filter((c) => c.area > 0 && c.src)
            .sort((a, b) => b.area - a.area);
    }

    function largestImage(scope) {
        const best = imageCandidates(scope)[0];
        return best ? best.src : undefined;
    }

    const PRICE_RE = /(?:[$£€¥]|USD|EUR|GBP)\s?\d[\d.,]*/;

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
        return { title, image: absoluteUrl(image), price, url: window.location.href, source: 'dom' };
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
        const context = fromJsonLd() || fromOpenGraph() || fromDom();
        if (!context) return null;

        context.alternateImages = imageCandidates(document).map((c) => c.src).slice(0, 8);

        if (context.source !== 'dom') {
            const onPage = imageCandidates(document)[0];
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
