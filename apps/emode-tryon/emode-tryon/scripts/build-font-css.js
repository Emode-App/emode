/**
 * Regenerates extensions/emode-extension/assets/emode-fonts.css from the source
 * woff2 in fonts/.
 *
 * Why this exists: Shopify theme app extensions only permit .jpg .jpeg .json
 * .js .css .png .svg .wasm inside assets/, so a font cannot ship as a .woff2.
 * Embedding it as a data URI inside a .css asset is the way around it — still
 * self-hosted on Shopify's CDN, still one cacheable file, and still no
 * third-party request to fonts.googleapis.com on the merchant's storefront.
 *
 * Run after replacing or adding a font:
 *   node scripts/build-font-css.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'fonts', 'syne-bold.woff2');
const OUT = path.join(ROOT, 'extensions', 'emode-extension', 'assets', 'emode-fonts.css');

if (!fs.existsSync(SRC)) {
    console.error(`Missing ${SRC}. Download the Latin subset of Syne Bold from Google Fonts.`);
    process.exit(1);
}

const b64 = fs.readFileSync(SRC).toString('base64');

const css = `/* GENERATED — do not edit by hand.
 * Rebuild with: node scripts/build-font-css.js
 *
 * Shopify theme app extensions only permit .jpg .jpeg .json .js .css .png .svg
 * .wasm in assets/, so the font cannot ship as a .woff2 file. Embedding it as a
 * data URI inside a .css asset is the way around that: still self-hosted on
 * Shopify's CDN, still cached by the browser as one file, and still no
 * third-party request to fonts.googleapis.com on the merchant's storefront.
 *
 * Syne Bold, Latin subset. SIL Open Font License 1.1 — see fonts/SYNE-OFL.txt.
 * Copyright 2017 The Syne Project Authors.
 */
@font-face {
  font-family: 'Syne';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url(data:font/woff2;base64,${b64}) format('woff2');
}
`;

fs.writeFileSync(OUT, css);
console.log(`Wrote ${path.relative(ROOT, OUT)} — ${Math.round(css.length / 1024)}KB`);
