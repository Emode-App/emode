/**
 * Regression tests for the content script's own decisions.
 *
 * Not detection — that is detect.test.mjs — but the judgements content.js makes
 * on top of it: whether to draw anything at all, what a search result resolves
 * to, and whether an order actually happened.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mountContent, mountContentFixture } from './harness.mjs';

const GOOGLE = 'https://www.google.com/search?q=stockx';

// content.js keeps its helpers as file-scoped functions rather than exports, so
// reach them through the window it was evaluated into.
const call = (ctx, expression) => ctx.window.eval(expression);

describe('Google results adapter', () => {
    test('unwraps an /aclk redirect to the merchant URL', () => {
        // A pill whose destination is google.com/aclk cannot be attributed and
        // is not "a real item" in the sense that matters.
        const ctx = mountContentFixture('google-results', { url: GOOGLE });
        try {
            const dest = call(ctx, `googleDestination(document.querySelector('.pla-unit a').getAttribute('href'))`);
            assert.equal(dest, 'https://stockx.com/nike-air-max-plus-homecoming-safety-orange?size=10');
        } finally { ctx.close(); }
    });

    test('refuses a destination that is still Google', () => {
        const ctx = mountContent('<html><body></body></html>', { url: GOOGLE });
        try {
            assert.equal(call(ctx, `googleDestination('/aclk?adurl=https%3A%2F%2Fwww.google.com%2Fnope')`), null);
            assert.equal(call(ctx, `googleDestination('/search?q=shoes')`), null);
        } finally { ctx.close(); }
    });

    test('refuses a javascript: destination', () => {
        // The href comes off a page we do not control, and the pill's whole job
        // is to send someone to it.
        const ctx = mountContent('<html><body></body></html>', { url: GOOGLE });
        try {
            assert.equal(call(ctx, `googleDestination('/aclk?adurl=javascript:alert(1)')`), null);
        } finally { ctx.close(); }
    });

    test('a lookalike host is not Google', () => {
        const ctx = mountContent('<html><body></body></html>', { url: GOOGLE });
        try {
            assert.equal(ctx.constants.GOOGLE_HOST_RE.test('google.evil.com'), false);
            assert.equal(ctx.constants.GOOGLE_HOST_RE.test('google.co.uk'), true);
        } finally { ctx.close(); }
    });

    test('reads title and price off a sponsored card', () => {
        const ctx = mountContentFixture('google-results', { url: GOOGLE });
        try {
            const card = call(ctx, `JSON.stringify(extractFromGoogleCard(document.querySelector('.pla-unit img')))`);
            const parsed = JSON.parse(card);

            assert.ok(parsed, 'a priced card with a real destination is a product');
            assert.equal(parsed.price, '$882');
            assert.match(parsed.sourceUrl, /^https:\/\/stockx\.com\//);
            // Google truncates mid-word; the ellipsis must not reach the model.
            assert.doesNotMatch(parsed.title, /\.\.\.|…/);
            assert.match(parsed.title, /Nike Air Max Plus/);
        } finally { ctx.close(); }
    });

    test('a card with no price gets nothing', () => {
        // "so its not just pills on bullshit items" — no price, no listing.
        const ctx = mountContentFixture('google-results', { url: GOOGLE });
        try {
            const result = call(ctx,
                `extractFromGoogleCard(document.querySelectorAll('.pla-unit')[2].querySelector('img'))`);
            assert.equal(result, null);
        } finally { ctx.close(); }
    });

    test('the knowledge panel photo gets nothing', () => {
        // Large, prominent, and about a company rather than a garment.
        const ctx = mountContentFixture('google-results', { url: GOOGLE });
        try {
            const result = call(ctx, `extractFromGoogleCard(document.querySelector('.kp-wholepage img'))`);
            assert.equal(result, null);
        } finally { ctx.close(); }
    });

    test('an organic result favicon gets nothing', () => {
        const ctx = mountContentFixture('google-results', { url: GOOGLE });
        try {
            assert.equal(call(ctx, `extractFromGoogleCard(document.querySelector('.g img'))`), null);
        } finally { ctx.close(); }
    });

    test('the adapter is inert away from a search page', () => {
        // It exists to loosen a rule in one place. Everywhere else the strict
        // rule is the one that keeps pills off magazine photos.
        const ctx = mountContentFixture('google-results', { url: 'https://shop.example.com/products/x' });
        try {
            assert.equal(call(ctx, 'isGoogleSearch()'), false);
        } finally { ctx.close(); }
    });
});

describe('order confirmation', () => {
    const confirms = [
        '/checkouts/c1-abc123/thank_you',
        '/checkout/order-received/4821',
        '/thank-you',
        '/thankyou/',
        '/order-confirmation',
        '/order-complete',
        '/checkout/success',
        '/orders/a1b2c3d4e5f60718',
    ];

    // Every one of these contains a confirmation word and is not a confirmation.
    const doesNot = [
        '/products/thank-you-tee',
        '/collections/receipts-and-more',
        '/account/orders',
        '/blog/thank-you-for-shopping-with-us',
        '/orders',
        '/pages/thank-you-to-our-makers',
    ];

    for (const path of confirms) {
        test(`${path} is an order confirmation`, () => {
            const ctx = mountContent('<html><body></body></html>', { url: `https://shop.example.com${path}` });
            try {
                const { ORDER_CONFIRMED_RE, SHOPIFY_CONFIRMED_RE } = ctx.constants;
                assert.equal(
                    ORDER_CONFIRMED_RE.test(path) || SHOPIFY_CONFIRMED_RE.test(path),
                    true
                );
            } finally { ctx.close(); }
        });
    }

    for (const path of doesNot) {
        test(`${path} is not`, () => {
            // A false positive here marks something purchased that was not,
            // which is worse than missing one: it removes the BUY button from an
            // item the shopper still wants.
            const ctx = mountContent('<html><body></body></html>', { url: `https://shop.example.com${path}` });
            try {
                const { ORDER_CONFIRMED_RE, SHOPIFY_CONFIRMED_RE } = ctx.constants;
                assert.equal(
                    ORDER_CONFIRMED_RE.test(path) || SHOPIFY_CONFIRMED_RE.test(path),
                    false
                );
            } finally { ctx.close(); }
        });
    }

    test('reaching one reports the host', () => {
        const ctx = mountContent('<html><body></body></html>', {
            url: 'https://shop.example.com/checkouts/abc/thank_you',
        });
        try {
            const marks = ctx.sent.filter((m) => m.type === 'CART_MARK_PURCHASED');
            assert.equal(marks.length, 1);
            assert.equal(marks[0].host, 'shop.example.com');
        } finally { ctx.close(); }
    });

    test('an ordinary page reports nothing', () => {
        const ctx = mountContent('<html><body></body></html>', {
            url: 'https://shop.example.com/products/jacket',
        });
        try {
            assert.equal(ctx.sent.filter((m) => m.type === 'CART_MARK_PURCHASED').length, 0);
        } finally { ctx.close(); }
    });
});

describe('not competing with the merchant', () => {
    // A store that pays for emode already has emode on the page. Two sets of
    // try-on buttons on one product is worse than none: it looks broken, and it
    // is the merchant's install that looks broken.
    const installs = [
        ['the widget script, before it draws', '<script data-emode-merchant="m_123"></script>'],
        ['the widget, once drawn', '<div class="emode-integration-container"></div>'],
        ['the Shopify theme extension', '<div class="emode-buttons"></div>'],
        ['the older theme markup', '<div id="emode-try-on"></div>'],
    ];

    for (const [label, markup] of installs) {
        test(`stands down for ${label}`, () => {
            const ctx = mountContent(`<html><body>${markup}</body></html>`, {
                url: 'https://shop.example.com/products/jacket',
            });
            try {
                assert.equal(call(ctx, 'storeHasEmode()'), true);
            } finally { ctx.close(); }
        });
    }

    test('draws on a store with no install', () => {
        const ctx = mountContent('<html><body><h1>Jacket</h1></body></html>', {
            url: 'https://shop.example.com/products/jacket',
        });
        try {
            assert.equal(call(ctx, 'storeHasEmode()'), false);
        } finally { ctx.close(); }
    });
});

describe('actually drawing the buttons', () => {
    // Detection being right is not the same as buttons appearing, and until now
    // only detection was tested. Every "there are no buttons on this site"
    // report lands in this gap.
    test('a product page gets buttons', () => {
        const ctx = mountContentFixture('shopify-pdp', {
            url: 'https://lukes.store/products/dior-b31-teal-hiking-sneakers',
        });
        try {
            assert.equal(ctx.window.isPDP(), true, 'a PDP must be recognised');
            ctx.window.injectButtons();
            assert.ok(
                ctx.document.querySelector('[class*="emode"], [id*="emode"]'),
                'buttons must be inserted into the page'
            );
        } finally { ctx.close(); }
    });

    test('buttons land next to the buy control, not at the end of the page', () => {
        const ctx = mountContentFixture('shopify-pdp', {
            url: 'https://lukes.store/products/dior-b31-teal-hiking-sneakers',
        });
        try {
            ctx.window.injectButtons();
            const group = ctx.document.querySelector('[class*="emode"]');
            const form = ctx.document.querySelector('form');
            assert.ok(form.contains(group), 'the try-on buttons belong beside Add to cart');
        } finally { ctx.close(); }
    });

    test('a store with emode already installed gets none', () => {
        // Two sets of try-on buttons on one product looks broken, and it is the
        // paying merchant's install that looks broken.
        const ctx = mountContent(
            `<html><body><div class="emode-buttons"></div>
             <h1 data-rect="0,0,400,40">Jacket</h1>
             <button data-rect="0,60,200,50">Add to cart</button></body></html>`,
            { url: 'https://shop.example.com/products/jacket' }
        );
        try {
            ctx.window.injectButtons();
            assert.equal(ctx.document.querySelectorAll('.emode-extension-injected').length, 0);
        } finally { ctx.close(); }
    });
});
