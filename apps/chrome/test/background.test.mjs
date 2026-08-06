/**
 * Regression tests for the service worker.
 *
 * Two jobs live here that nothing else can do: reading a product image out of a
 * page fetched cross-origin, and deciding which saved items an order covered.
 * Both are pure functions of their input, and both are the kind of thing that
 * fails quietly — a bad parse just means a slightly worse try-on, and a bad host
 * match just means the wrong thing greys out.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const EXT = join(dirname(fileURLToPath(import.meta.url)), '..');

// background.js is a service worker script, not a module. Slice out the pure
// helpers and import them as one.
const source = readFileSync(join(EXT, 'background.js'), 'utf8');
const helpers = source.slice(
    source.indexOf('const MAX_HTML_BYTES'),
    source.indexOf('async function resolveProductImage')
);
const bg = await import(
    'data:text/javascript,' +
    encodeURIComponent(`${helpers}\nexport { absolutise, imageFromJsonLd, metaContent };`)
);

const BASE = 'https://stockx.com/nike-air-max-plus';

describe('reading a product image out of fetched HTML', () => {
    test('prefers schema.org Product.image', () => {
        // The same first-tier signal the on-page detector trusts. Merchants
        // maintain it for Google, which is exactly why it is reliable.
        const html = `
            <meta property="og:image" content="//images.stockx.com/og-card.jpg" />
            <script type="application/ld+json">
            {"@context":"https://schema.org","@graph":[
              {"@type":"BreadcrumbList","itemListElement":[]},
              {"@type":["Product"],"name":"Nike Air Max Plus Homecoming",
               "image":["https://images.stockx.com/real-1200.jpg","https://x/2.jpg"]}]}
            </script>`;

        assert.deepEqual(bg.imageFromJsonLd(html, BASE), {
            image: 'https://images.stockx.com/real-1200.jpg',
            title: 'Nike Air Max Plus Homecoming',
        });
    });

    test('handles image given as an ImageObject', () => {
        const html = `<script type="application/ld+json">
            {"@type":"Product","name":"Tee","image":{"@type":"ImageObject","url":"/img/tee.jpg"}}
            </script>`;

        assert.deepEqual(bg.imageFromJsonLd(html, 'https://shop.example.com/p/1'), {
            image: 'https://shop.example.com/img/tee.jpg',
            title: 'Tee',
        });
    });

    test('malformed JSON-LD yields null rather than throwing', () => {
        // A throw here is not a soft failure: it rejects the promise the pill is
        // awaiting, and the try-on never opens.
        assert.doesNotThrow(() => bg.imageFromJsonLd('<script type="application/ld+json">{oops</script>', BASE));
        assert.equal(bg.imageFromJsonLd('<script type="application/ld+json">{oops</script>', BASE), null);
        assert.equal(bg.imageFromJsonLd('<p>no structured data at all</p>', BASE), null);
    });

    test('falls back to OpenGraph, protocol-relative included', () => {
        const html = `<meta property="og:image" content="//images.stockx.com/big.jpg?w=1200" />`;
        assert.equal(
            bg.absolutise(bg.metaContent(html, 'og:image'), BASE),
            'https://images.stockx.com/big.jpg?w=1200'
        );
    });

    test('reads name= as well as property=', () => {
        // Half the web writes name="twitter:image" and property="og:image".
        const html = `<meta name="twitter:image" content="https://cdn.example.com/t.jpg">`;
        assert.equal(bg.metaContent(html, 'twitter:image'), 'https://cdn.example.com/t.jpg');
    });

    test('refuses a non-http scheme', () => {
        // This URL is about to be handed to an <img> in a privileged context.
        assert.equal(bg.absolutise('javascript:alert(1)', BASE), null);
        assert.equal(bg.absolutise('data:text/html,<script>x</script>', BASE), null);
    });
});

describe('which saved items an order covered', () => {
    // The same rule the worker applies, kept here as the thing under test: an
    // order at a host covers that host's items, allowing for the checkout
    // subdomains stores bounce through.
    const strip = (h) => h.replace(/^(?:www|checkout|secure|shop|store)\./, '');
    const covers = (itemUrl, orderHost) => {
        try {
            return strip(new URL(itemUrl).host.toLowerCase()) === strip(orderHost.toLowerCase());
        } catch { return false; }
    };

    test('an order at the apex covers an item saved from www', () => {
        assert.equal(covers('https://www.gucci.com/us/en/pr/123', 'gucci.com'), true);
    });

    test('an order on the checkout subdomain covers the store', () => {
        // Shopify Plus and most hosted carts bounce through one of these.
        assert.equal(covers('https://shop.example.com/products/x', 'checkout.example.com'), true);
        assert.equal(covers('https://store.example.com/products/x', 'secure.example.com'), true);
    });

    test('an order at one shop does not cover another shop', () => {
        // The failure that matters: greying out an item the shopper still wants
        // is worse than missing one they bought.
        assert.equal(covers('https://www.gucci.com/us/en/pr/123', 'stockx.com'), false);
        assert.equal(covers('https://gucci.com.evil.example/pr/1', 'gucci.com'), false);
    });

    test('an item with no URL is never covered', () => {
        assert.equal(covers('', 'gucci.com'), false);
        assert.equal(covers('not a url', 'gucci.com'), false);
    });
});
