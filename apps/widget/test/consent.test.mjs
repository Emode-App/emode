/**
 * Consent behaviour for the embeddable widget.
 *
 * These assert the answers emode gives Shopify on the protected customer data
 * questionnaire — "do you respect and apply customers' consent decisions" — so
 * the attestation and the code cannot drift apart silently.
 *
 * Run against the BUILT bundle rather than the source, because the bundle is
 * what merchants actually load. Writing the methods and forgetting to rebuild
 * is a real failure mode; it happened while writing this.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const BUNDLE = readFileSync(join(HERE, '..', 'dist', 'index.global.js'), 'utf8');

const PAGE = (attrs = '') => `<html><body>
    <script data-emode-merchant="m_test"${attrs}></script>
    <h1>Merino Jacket</h1>
    <span>$120.00</span>
    <button>Add to cart</button>
</body></html>`;

function load({ attrs = '', gpc = false } = {}) {
    const dom = new JSDOM(PAGE(attrs), {
        url: 'https://shop.example.com/products/jacket',
        runScripts: 'outside-only',
        pretendToBeVisual: true,
    });
    const win = dom.window;

    Object.defineProperty(win.navigator, 'globalPrivacyControl', {
        value: gpc, configurable: true,
    });
    // Nothing here should reach the network; a stub also proves it is not the
    // network that decides whether an identifier is stored.
    win.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    Object.defineProperty(win.document, 'currentScript', {
        value: win.document.querySelector('script'), configurable: true,
    });

    win.eval(BUNDLE);
    return {
        win,
        storedId: () => win.localStorage.getItem('emode_visitor_id'),
        close: () => win.close(),
    };
}

describe('the visitor identifier and consent', () => {
    test('an ordinary browser is attributed', () => {
        // The common case must keep working. Most storefronts have no consent
        // requirement at all, and gating on one that does not exist would turn
        // every merchant's analytics off.
        const ctx = load();
        try {
            assert.ok(ctx.storedId(), 'an identifier is minted normally');
        } finally { ctx.close(); }
    });

    test('Global Privacy Control is honoured', () => {
        // A real signal a real browser sends, and in several jurisdictions a
        // legal opt-out rather than a preference. The widget used to mint on
        // load regardless, so a shopper who had opted out still got an
        // identifier written to their storage before anything asked.
        const ctx = load({ gpc: true });
        try {
            assert.equal(ctx.storedId(), null, 'nothing is stored for a GPC browser');
        } finally { ctx.close(); }
    });

    test('deferred consent stores nothing until granted', () => {
        // For a merchant running their own banner: emode sits behind it rather
        // than beside it.
        const ctx = load({ attrs: ' data-emode-consent="deferred"' });
        try {
            assert.equal(ctx.storedId(), null, 'nothing before the banner is answered');
        } finally { ctx.close(); }
    });

    test('granting consent starts attribution', () => {
        const ctx = load({ attrs: ' data-emode-consent="deferred"' });
        try {
            ctx.win.emode.grantConsent();
            assert.ok(ctx.storedId(), 'accepting the banner begins attribution');
        } finally { ctx.close(); }
    });

    test('revoking consent removes what was already stored', () => {
        // The part that makes the answer mean something. Stopping at "we will
        // not add any more" leaves the same identifier in place, which is not
        // withdrawal of anything.
        const ctx = load();
        try {
            assert.ok(ctx.storedId(), 'precondition: an id exists');
            ctx.win.emode.revokeConsent();
            assert.equal(ctx.storedId(), null, 'the identifier is deleted, not merely unused');
        } finally { ctx.close(); }
    });

    test('the public consent API exists', () => {
        // It is named in the terms as the mechanism merchants integrate against,
        // so its absence would make that section untrue.
        const ctx = load();
        try {
            assert.equal(typeof ctx.win.emode.grantConsent, 'function');
            assert.equal(typeof ctx.win.emode.revokeConsent, 'function');
        } finally { ctx.close(); }
    });
});
