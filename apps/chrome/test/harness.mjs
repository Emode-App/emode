/**
 * A DOM to run the detectors against.
 *
 * The detectors were only ever verified by hand, on live sites, one at a time.
 * That stopped being coverage the moment the extension started shipping to
 * strangers browsing stores nobody here has seen. Worse, the review cycle for
 * a broad-host-permission extension runs into weeks — a detection bug caught
 * by a user is a bug that stays shipped for a fortnight.
 *
 * Two things jsdom does not give us, both of which the detectors lean on:
 *
 *   1. Layout. getBoundingClientRect() returns all zeros and offsetWidth is 0,
 *      so every image would look invisible and every ranking-by-area would tie.
 *      Fixtures declare geometry with data-rect="x,y,w,h" and this file makes
 *      the layout APIs report it.
 *
 *   2. innerText. jsdom implements textContent only, which does not collapse
 *      whitespace or insert breaks between blocks — and the card readers split
 *      on newlines to separate a title from a price from a merchant name.
 *
 * Neither is a real rendering engine and neither pretends to be. They are
 * enough to test the decisions, which is what actually breaks.
 */

import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, '..');

const BLOCK = new Set([
    'ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'DIV', 'DL', 'DD', 'DT',
    'FIELDSET', 'FIGCAPTION', 'FIGURE', 'FOOTER', 'FORM', 'H1', 'H2', 'H3',
    'H4', 'H5', 'H6', 'HEADER', 'HR', 'LI', 'MAIN', 'NAV', 'OL', 'P', 'PRE',
    'SECTION', 'TABLE', 'TR', 'UL',
]);

function installInnerText(win) {
    const { Element, HTMLElement } = win;

    function render(node, out) {
        for (const child of node.childNodes) {
            if (child.nodeType === 3) {
                out.text += child.nodeValue.replace(/\s+/g, ' ');
                continue;
            }
            if (child.nodeType !== 1) continue;
            const tag = child.tagName;
            if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') continue;
            if (child.hidden || child.getAttribute('aria-hidden') === 'true') continue;

            if (tag === 'BR') { out.text += '\n'; continue; }
            const block = BLOCK.has(tag);
            if (block && out.text && !out.text.endsWith('\n')) out.text += '\n';
            render(child, out);
            if (block && out.text && !out.text.endsWith('\n')) out.text += '\n';
        }
        return out;
    }

    Object.defineProperty(HTMLElement.prototype, 'innerText', {
        configurable: true,
        get() {
            return render(this, { text: '' }).text
                .split('\n')
                .map((line) => line.trim())
                .filter((line, i, all) => line || (i > 0 && i < all.length - 1 && all[i - 1]))
                .join('\n')
                .trim();
        },
    });
    // SVG and other non-HTML elements still need the property to exist.
    if (!Object.getOwnPropertyDescriptor(Element.prototype, 'innerText')) {
        Object.defineProperty(Element.prototype, 'innerText', {
            configurable: true,
            get() { return this.textContent; },
        });
    }
}

/**
 * data-rect="x,y,w,h" becomes real geometry.
 *
 * Anything without one is treated as present but zero-area: visible enough to
 * be walked, never large enough to be chosen as a product image. That default
 * is deliberate — a fixture must opt an image IN to being big, so a test can
 * never pass because of a size the fixture never claimed.
 */
function installLayout(win) {
    const { HTMLElement, Element } = win;

    const rectOf = (el) => {
        const raw = el.getAttribute?.('data-rect');
        if (!raw) return null;
        const [x, y, w, h] = raw.split(',').map((n) => Number(n.trim()));
        return { x, y, w, h };
    };

    Element.prototype.getBoundingClientRect = function () {
        const r = rectOf(this) || { x: 0, y: 0, w: 0, h: 0 };
        return {
            x: r.x, y: r.y, width: r.w, height: r.h,
            top: r.y, left: r.x, right: r.x + r.w, bottom: r.y + r.h,
            toJSON() { return this; },
        };
    };

    for (const [prop, pick] of [['offsetWidth', 'w'], ['offsetHeight', 'h'],
        ['offsetTop', 'y'], ['offsetLeft', 'x']]) {
        Object.defineProperty(HTMLElement.prototype, prop, {
            configurable: true,
            get() { return rectOf(this)?.[pick] ?? 0; },
        });
    }

    // offsetParent is null for display:none subtrees — that is the check the
    // detectors use for "is this actually on the page".
    Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
        configurable: true,
        get() {
            let el = this;
            while (el) {
                if (el.getAttribute?.('data-hidden') !== null &&
                    el.getAttribute?.('data-hidden') !== undefined) return null;
                const style = el.getAttribute?.('style') || '';
                if (/display:\s*none/i.test(style)) return null;
                el = el.parentElement;
            }
            return this.ownerDocument.body;
        },
    });

    // Images: naturalWidth/Height mirror the declared rect unless the fixture
    // says otherwise with data-natural="w,h" (for testing upscaled thumbnails).
    const { HTMLImageElement } = win;
    for (const [prop, pick] of [['naturalWidth', 0], ['naturalHeight', 1]]) {
        Object.defineProperty(HTMLImageElement.prototype, prop, {
            configurable: true,
            get() {
                const nat = this.getAttribute('data-natural');
                if (nat) return Number(nat.split(',')[pick]);
                const r = rectOf(this);
                return r ? (pick === 0 ? r.w : r.h) : 0;
            },
        });
    }
    Object.defineProperty(HTMLImageElement.prototype, 'currentSrc', {
        configurable: true,
        get() { return this.src; },
    });

    // getComputedStyle in jsdom does not resolve inline shorthand reliably;
    // the detectors only ever ask for position/display/visibility.
    const native = win.getComputedStyle.bind(win);
    win.getComputedStyle = function (el, pseudo) {
        const style = native(el, pseudo);
        const inline = el.getAttribute?.('style') || '';
        const read = (prop, fallback) => {
            const m = inline.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, 'i'));
            return m ? m[1].trim() : (style[prop] || fallback);
        };
        return new Proxy(style, {
            get(target, key) {
                if (key === 'position') return read('position', 'static');
                if (key === 'display') return read('display', 'block');
                if (key === 'visibility') return read('visibility', 'visible');
                if (key === 'getPropertyValue') return (p) => read(p, '');
                const value = target[key];
                return typeof value === 'function' ? value.bind(target) : value;
            },
        });
    };
}

/**
 * Build a window from fixture HTML and load the extension's detectors into it.
 * Returns { window, document, detect } where detect is window.emodeDetect.
 */
export function mount(html, { url = 'https://shop.example.com/products/thing', viewport = [1440, 900] } = {}) {
    // runScripts:'outside-only' gives the window a real JS realm we can eval
    // into, without executing any <script> the fixture happens to contain.
    // Fixtures carry JSON-LD, which must be parsed by the detector rather than
    // run, so 'dangerously' would be both unnecessary and wrong.
    const dom = new JSDOM(html, { url, pretendToBeVisual: true, runScripts: 'outside-only' });
    const win = dom.window;

    Object.defineProperty(win, 'innerWidth', { configurable: true, value: viewport[0] });
    Object.defineProperty(win, 'innerHeight', { configurable: true, value: viewport[1] });

    installInnerText(win);
    installLayout(win);

    // detect.js is a plain IIFE that hangs itself off the global it is handed.
    const source = readFileSync(join(EXT, 'detect.js'), 'utf8');
    win.eval(source);

    return { window: win, document: win.document, detect: win.emodeDetect };
}

export function fixture(name) {
    return readFileSync(join(HERE, 'fixtures', `${name}.html`), 'utf8');
}

export function mountFixture(name, options) {
    return mount(fixture(name), options);
}

/**
 * A minimal chrome.* so the content script can be loaded at all.
 *
 * content.js registers listeners and reads storage at the top level, so without
 * this the file throws on line one and nothing in it is testable. Messages are
 * recorded rather than delivered — what the content script decides to SEND is
 * usually the thing worth asserting.
 */
export function stubChrome(win, { onMessage } = {}) {
    const sent = [];
    win.chrome = {
        runtime: {
            id: 'test-extension',
            lastError: null,
            sendMessage(message, callback) {
                sent.push(message);
                const reply = onMessage?.(message);
                if (typeof callback === 'function') callback(reply);
            },
            onMessage: { addListener() {} },
        },
        storage: {
            local: {
                get(_keys, callback) { callback?.({}); },
                set(_items, callback) { callback?.(); },
                remove(_keys, callback) { callback?.(); },
            },
            onChanged: { addListener() {} },
        },
        tabs: { query() {}, sendMessage() {} },
        sidePanel: { open() {}, setOptions() {} },
    };
    return sent;
}

/**
 * Mount a fixture and load BOTH detect.js and content.js into it.
 *
 * content.js is a script with top-level side effects, not a module: it installs
 * document listeners and starts a polling interval. `close()` tears the window
 * down so those timers cannot outlive the test.
 */
export function mountContent(html, options = {}) {
    const mounted = mount(html, options);
    const sent = stubChrome(mounted.window, options);

    // `let`/`const` declared at the top level of an indirect eval live in that
    // eval's own lexical scope and are gone the moment it returns - only `var`
    // and function declarations reach the global object. content.js keeps its
    // patterns in consts, so they are handed back explicitly here rather than
    // being made global in the shipping code purely to be testable.
    const source = readFileSync(join(EXT, 'content.js'), 'utf8');
    mounted.window.eval(`${source}
        ;window.__emodeTest = {
            ORDER_CONFIRMED_RE, SHOPIFY_CONFIRMED_RE, GOOGLE_HOST_RE,
            PRICE_RE, EDITORIAL_HREF_RE,
            STORE_EMODE_SELECTORS,
        };`);

    return {
        ...mounted,
        sent,
        constants: mounted.window.__emodeTest,
        close: () => mounted.window.close(),
    };
}

export function mountContentFixture(name, options) {
    return mountContent(fixture(name), options);
}
