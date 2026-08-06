/**
 * Regression tests for product detection.
 *
 * Every case here is a bug that actually shipped, or a shape that produced one.
 * That is the selection rule: this is not an attempt at coverage in the
 * abstract, it is a record of the ways this code has been wrong, kept executable
 * so it cannot be wrong that way twice.
 *
 * The cost of NOT having this is specific. A broad-host-permission extension
 * waits weeks in Chrome Web Store review, so a detection regression caught by a
 * user is a regression that stays shipped for a fortnight.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mount, mountContent, mountFixture, mountContentFixture } from './harness.mjs';

// The Shopify fixture is served from its own domain, which is where the
// store-name strip gets its signal in the wild.
const SHOPIFY_URL = 'https://northboundsupply.com/products/merino-wool-jacket';

describe('JSON-LD tier', () => {
    test('reads a Shopify product page', () => {
        const { detect } = mountFixture('shopify-pdp', { url: SHOPIFY_URL });
        const product = detect.detectProduct();

        assert.ok(product, 'a Shopify PDP must be detected');
        assert.equal(product.source, 'json-ld');
        assert.match(product.image, /^https:\/\/cdn\.shopify\.com\//);
        assert.equal(product.productId, 'NB-4471-CH');
    });

    test('strips the store name a theme appends to the title', () => {
        // "Merino Wool Jacket - Charcoal | NORTHBOUND SUPPLY" is what the theme
        // writes into JSON-LD. Sending the store name to the model as part of
        // the garment description is noise at best.
        const { detect } = mountFixture('shopify-pdp', { url: SHOPIFY_URL });
        const { title } = detect.detectProduct();

        assert.equal(title, 'Merino Wool Jacket - Charcoal');
        assert.doesNotMatch(title, /NORTHBOUND/i);
        // And the hyphen the merchant wrote is still a hyphen. Rebuilding the
        // title by re-joining its parts printed one canonical separator back,
        // silently rewriting a name nothing had been stripped from.
        assert.ok(title.includes(' - '), 'the merchant separator survives');
    });

    test('formats price as a symbol, never a currency code', () => {
        // Shipped bug: the panel read "USD 85.00". Nobody writes a price that
        // way, and it made a real product look like a database row.
        const { detect } = mountFixture('shopify-pdp', { url: SHOPIFY_URL });
        assert.equal(detect.detectProduct().price, '$285.00');
    });

    test('handles a non-dollar currency', () => {
        const { detect } = mountFixture('sticky-chrome');
        // Structured data gives "1250" here and "285.00" on the other fixture.
        // Both must print like money, or one screen shows $285.00 beside £1250.
        assert.equal(detect.detectProduct().price, '£1,250.00');
    });

    test('walks @graph and an image array', () => {
        // Both are the normal case on Shopify, and a detector that only handles
        // a bare top-level object with a string image misses most of the web.
        const { detect } = mountFixture('shopify-pdp', { url: SHOPIFY_URL });
        const product = detect.detectProduct();
        assert.match(product.image, /jacket-front/);
    });
});

describe('pages that are not products', () => {
    test('a collection page is not detected as a product', () => {
        const { detect } = mountFixture('collection-page', {
            url: 'https://www.allbirds.example/collections/mens',
        });
        assert.equal(detect.detectProduct(), null);
        assert.equal(detect.isProductPage(), false);
    });

    test('never returns the shop logo as the product image', () => {
        // The real failure mode behind the above: og:image on a collection page
        // is frequently the logo, and putting a logo on someone's body is the
        // single most embarrassing thing this product could do.
        const { detect } = mountFixture('collection-page', {
            url: 'https://www.allbirds.example/collections/mens',
        });
        const product = detect.detectProduct();
        assert.ok(!product || !/logo/i.test(product.image));
    });
});

describe('quick-view overlays', () => {
    test('the dialog wins over the page it opened on', () => {
        // The page's own JSON-LD names a different garment on purpose. Reading
        // document-level metadata while a dialog is open answers confidently
        // about the wrong item — the worst kind of wrong.
        const { detect } = mountFixture('quickview-overlay');
        const product = detect.detectProduct();

        assert.ok(product, 'the dialog contents must be detected');
        assert.match(product.title, /cardigan/i);
        assert.doesNotMatch(product.title, /WRONG ANSWER/);
        assert.match(product.image, /ribbed-cardigan/);
    });

    test('a dialog whose photo links to the product page still works', () => {
        // The most ordinary quick-view markup there is: the image wrapped in a
        // link to the full product page. Judged against the current URL that
        // link always "points elsewhere", so every image in the dialog was
        // discarded and the dialog detected as nothing at all - pill shown,
        // modal empty.
        const { detect } = mount(`<html><head><title>Knitwear</title></head><body>
            <div role="dialog" aria-modal="true" style="position: fixed" data-rect="360,80,720,760">
              <a href="/products/ribbed-cardigan">
                <img src="https://m.example.com/222/ribbed-cardigan.jpg"
                     alt="Ribbed cardigan" data-rect="380,100,400,600" />
              </a>
              <h2 data-rect="800,100,260,40">Ribbed wool cardigan</h2>
              <span data-rect="800,150,260,24">$1,890.00</span>
            </div></body></html>`, { url: 'https://shop.example.com/collections/knitwear' });

        const product = detect.detectProduct();
        assert.ok(product, 'the dialog must be readable');
        assert.match(product.image, /ribbed-cardigan/);
    });

    test('finds the overlay', () => {
        const { detect, document } = mountFixture('quickview-overlay');
        const overlay = detect.findOverlay();
        assert.ok(overlay, 'a role=dialog aria-modal element is an overlay');
        assert.ok(overlay.contains(document.querySelector('.quickview__info')));
    });
});

describe('site chrome vs. product', () => {
    test('a fixed full-width strip is chrome', () => {
        const { detect, document } = mountFixture('sticky-chrome');
        assert.equal(detect.isPinned(document.querySelector('.announcement')), true);
    });

    test('a dialog is not chrome even though it is fixed', () => {
        // Both are position:fixed. Only one of them is furniture.
        const { detect, document } = mountFixture('quickview-overlay');
        assert.equal(detect.isPinned(document.querySelector('.quickview')), false);
    });

    test('the announcement bar does not become the buy button', () => {
        // "Add to bag now" in a promo strip matched the cart-button keywords and
        // the try-on buttons were injected into the announcement.
        const { detect, document } = mountFixture('sticky-chrome');
        const cart = detect.findCartButton();
        assert.ok(cart, 'there is a real add-to-bag button on this page');
        assert.ok(!document.querySelector('.announcement').contains(cart));
    });
});

describe('listing pages', () => {
    test('an editorial tile in the product grid gets no product', () => {
        // The Lyst regression: the pill appeared over a magazine photo because
        // the container walk swallowed a whole page section, so prices belonging
        // to other modules counted as this image's own.
        const { detect, document } = mountFixture('listing-grid', {
            url: 'https://www.atelier-nord.com/us/en/c/men/ready-to-wear',
        });
        const editorial = document.querySelector('.card--editorial img');
        const container = detect.fromScope(editorial.closest('article'));

        assert.ok(
            !container || !container.price,
            'an editorial tile has no price and must not borrow one'
        );
    });

    test('a card image that links elsewhere is not this card\'s image', () => {
        // "those are whole different shoes as in whole other listings" — the
        // image ranking happily picked a neighbouring product's photo.
        // Judged within one card, an image belonging to a different card links
        // away from that card's subject.
        const { detect, document } = mountFixture('listing-grid');
        const card = document.querySelector('.card');
        const neighbour = document.querySelectorAll('.card')[1].querySelector('img');

        assert.equal(detect.linksElsewhere(neighbour, card), true);
        assert.equal(detect.linksElsewhere(card.querySelector('img'), card), false);
    });

    test('reads the card the cursor is actually on', () => {
        const { detect, document } = mountFixture('listing-grid');
        const card = document.querySelectorAll('.card')[1];
        const context = detect.fromScope(card);

        assert.ok(context, 'a card with a title, a price and a photo is readable');
        assert.match(context.title, /silk shirt/i);
        assert.match(context.price, /1,150/);
        assert.match(context.image, /silk-shirt/);
    });
});

describe('what makes something a product', () => {
    // The rule, stated once and tested once: a picture, a price, and a name, in
    // the same vicinity. No URL shape is required to prove anything.
    //
    // This replaced a list of per-store URL patterns - /products/, /p/, Gucci's
    // "-p-<code>", Zara's "-p<digits>.html" - where every unfamiliar shop was a
    // new bug report and a shop with opaque URLs could never work at all.
    const ZARA = 'https://www.zara.com/us/en/man-new-in-l711.html';
    const withZara = (fn) => {
        const ctx = mountContentFixture('zara-grid', { url: ZARA });
        try { fn(ctx); } finally { ctx.close(); }
    };

    test('a card with a picture, a price and a name is a product', () => {
        // Zara's URLs are "-p04302400.html" and nothing in the detector knows or
        // cares about that shape any more.
        withZara(({ window, document }) => {
            const img = document.querySelector('.product-grid__item img');
            assert.equal(window.isValidProductCard(img), true);
        });
    });

    test('a portrait grid image is big enough', () => {
        // 145x190: taller than wide, like most garment photography, and failing
        // a width >= 150 check while being larger than that check meant to say.
        withZara(({ window, document }) => {
            const img = document.querySelector('.product-grid__item img');
            const rect = img.getBoundingClientRect();
            assert.ok(rect.width < 150, 'the fixture really is under the old floor');
            assert.equal(window.isValidProductCard(img), true);
        });
    });

    test('a tile with no price is not a product, whatever its URL', () => {
        withZara(({ window, document }) => {
            const tile = document.querySelectorAll('.product-grid__item')[2].querySelector('img');
            assert.equal(window.isValidProductCard(tile), false);
        });
    });

    test('prices are read in every currency, not just dollars', () => {
        // This check was /\$\s?\d+/ - so every store selling in pounds, euros or
        // yen failed the one test that decides whether something is a product.
        withZara(({ constants }) => {
            for (const money of ['$725.00', '£1,250.00', '€99,90', '¥1200', 'CHF 210', '1 250,00 €']) {
                assert.equal(constants.PRICE_RE.test(money), true, `${money} is a price`);
            }
            for (const notMoney of ['4.1 (151K)', '10.5', 'Size 10', '2026', 'SALE']) {
                assert.equal(constants.PRICE_RE.test(notMoney), false, `${notMoney} is not a price`);
            }
        });
    });

    test('a card does not borrow the price of the card beside it', () => {
        // The boundary is not a size ratio, it is the point where a container
        // starts holding a second thing you could buy.
        withZara(({ window, document }) => {
            const tile = document.querySelectorAll('.product-grid__item')[2];
            const card = window.findProductCard(tile.querySelector('img'));
            assert.equal(card, null, 'an unpriced tile has no card of its own');
        });
    });

    test('the name carries the brand when the card prints one', () => {
        // "Rick Owens Women's Low Sneaker" beats "Low Sneaker". Shops split brand
        // and model across elements, and taking whichever came first in the DOM
        // is how a $189 sneaker was saved with no brand attached at all.
        const ctx = mountContent(`<html><body>
            <div class="card" data-rect="0,0,200,320">
                <a href="/p/low-sneaker-blue" data-rect="0,0,200,240">
                    <img src="https://cdn.example.com/sneaker.jpg" alt="" data-rect="0,0,200,240" />
                </a>
                <div data-rect="0,250,200,18">Rick Owens</div>
                <div data-rect="0,270,200,18">Women's Low Sneaker - Blue</div>
                <div data-rect="0,290,200,18">$189</div>
            </div></body></html>`, { url: 'https://www.lyst.com/shop/sneakers/' });
        try {
            const card = ctx.window.findProductCard(ctx.document.querySelector('img'));
            const title = ctx.window.readCardTitle(card, ctx.document.querySelector('img'));
            assert.match(title, /Rick Owens/, 'the brand must survive');
            assert.match(title, /Low Sneaker/);
        } finally { ctx.close(); }
    });
});

describe('a product page that is not currently buyable', () => {
    // Verified against stockx.com on 2026-08-06: two colourways of one jacket,
    // neither with a JSON-LD Product, neither with og:type. One had rendered
    // "Buy Now" and got buttons; the other had no asks, said "Make Offer", and
    // got nothing. The entire decision rested on one literal string.
    const URL = 'https://stockx.com/kith-x-knicks-satin-bomber-jacket-sandrift';

    test('is still a product page', () => {
        const { detect } = mountFixture('no-asks-pdp', { url: URL });
        assert.equal(detect.isProductPage(), true, 'out of stock is a stock state');
    });

    test('recognised by its size control, not by a buy word', () => {
        // The one thing an article never has. Found by shape - a control whose
        // label starts with "Size" - rather than by searching page text for the
        // word, which matches a shipping FAQ on any page of any site.
        const { detect } = mountFixture('no-asks-pdp', { url: URL });
        assert.equal(detect.hasSizeControl(), true);
        assert.equal(detect.sellsOneThing(), true);
    });

    test('"Make Offer" counts as a buy control', () => {
        // Along with sold out, pre-order and notify me: only a page selling one
        // item ever says any of them.
        const { detect } = mountFixture('no-asks-pdp', { url: URL });
        const cart = detect.findCartButton();
        assert.ok(cart, 'a way to transact is a buy control even when it is a bid');
        assert.match(cart.innerText, /Make Offer/i);
    });

    test('a listing page is still not one product', () => {
        // The false positive this nearly created. A real StockX category page
        // has forty cards, so it shows prices and carries og:title and og:image
        // - which is exactly why a visible price was rejected as evidence.
        const { detect } = mountFixture('listing-grid', {
            url: 'https://stockx.com/apparel/jackets-and-coats',
        });
        assert.equal(detect.hasSizeControl(), false);
        assert.equal(detect.sellsOneThing(), false);
    });
});

describe('image ranking', () => {
    test('prefers the largest on-screen image', () => {
        const { detect, document } = mountFixture('shopify-pdp', { url: SHOPIFY_URL });
        const best = detect.largestImage(document);

        assert.ok(best, 'a PDP has a hero image');
        assert.match(best, /jacket-front/);
    });

    test('ignores the header logo', () => {
        // 120x40 and an <svg> — it is not a garment, and it sits above every
        // product image in the DOM, which is exactly why a naive "first big
        // image" heuristic picks it.
        const { detect, document } = mountFixture('shopify-pdp', { url: SHOPIFY_URL });
        assert.doesNotMatch(detect.largestImage(document), /logo/i);
    });

    test('does not offer a hidden hover image as a candidate', () => {
        // The second <img> in a swap card is display:none until hover. Offering
        // it as an alternate means the shopper picks a view that is not visible.
        const { detect, document } = mountFixture('listing-grid');
        const card = document.querySelector('.card');
        const candidates = detect.imageCandidates(card).map((c) => c.src);

        assert.ok(candidates.some((s) => /wool-blazer-1/.test(s)));
        assert.ok(
            !candidates.some((s) => /wool-blazer-2/.test(s)),
            'the hidden hover image must not be a candidate'
        );
    });
});

describe('button placement', () => {
    test('anchors on the buy control when there is one', () => {
        const { detect } = mountFixture('shopify-pdp', { url: SHOPIFY_URL });
        const anchor = detect.findAnchor();

        assert.ok(anchor);
        assert.equal(anchor.el.getAttribute('name'), 'add');
    });

    test('falls back to the heading when there is no buy control', () => {
        // Gucci: no button matching any keyword until a size is chosen. The old
        // scan gave up and no buttons appeared on a page the detector was
        // certain about.
        const { detect } = mountFixture('collection-page');
        const anchor = detect.findAnchor();

        assert.ok(anchor, 'a page with no cart button still needs an anchor');
        assert.equal(anchor.el.tagName, 'H1');
    });
});

describe('resilience', () => {
    test('malformed JSON-LD is skipped, not thrown on', () => {
        // Truncated and comment-laden JSON-LD is common in the wild. An
        // exception here kills the content script for the whole page — which is
        // precisely what the `images is not defined` incident did, on every site
        // at once.
        const html = `<html><head>
            <script type="application/ld+json">{"@type":"Product", oops</script>
            <script type="application/ld+json">
              {"@context":"https://schema.org","@type":"Product","name":"Recovered Tee",
               "image":"https://cdn.example.com/tee.jpg",
               "offers":{"price":"40.00","priceCurrency":"USD"}}
            </script>
        </head><body><h1 data-rect="0,0,400,40">Recovered Tee</h1></body></html>`;

        const { detect } = mount(html);
        const product = detect.detectProduct();

        assert.ok(product, 'a later valid block must still be read');
        assert.equal(product.title, 'Recovered Tee');
    });

    test('an empty page returns null rather than throwing', () => {
        const { detect } = mount('<html><body></body></html>');
        assert.doesNotThrow(() => detect.detectProduct());
        assert.equal(detect.detectProduct(), null);
    });

    test('every exported helper survives a page with nothing on it', () => {
        // The whole detector runs inside one try/catch per scan; a throw from
        // any helper takes the extension off the page. Cheap to assert, and it
        // is the exact class of failure that has hurt most.
        const { detect, document } = mount('<html><body><div id="x"></div></body></html>');
        const el = document.getElementById('x');

        for (const [name, fn] of Object.entries(detect)) {
            assert.doesNotThrow(() => {
                if (fn.length === 0) fn();
                else if (name === 'linksElsewhere') fn(el, el);
                else fn(el);
            }, `${name}() threw on an empty page`);
        }
    });
});
