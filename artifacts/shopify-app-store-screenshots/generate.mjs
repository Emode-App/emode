import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");
const outDir = scriptDir;

const W = 1600;
const H = 900;

const C = {
  bg: "#f6f4ef",
  paper: "#fffdf8",
  off: "#f5f5f5",
  ink: "#0a0a0a",
  charcoal: "#2d2d2d",
  muted: "#7b776f",
  line: "#e4dfd4",
  gold: "#c5a059",
  gold2: "#e1c777",
  purple: "#6366f1",
  violet: "#a855f7",
  green: "#12a267",
  amber: "#b87916",
  blue: "#2f6fed",
};

const assets = {
  logo: asset("apps/web/public/brand/emode-logo.png"),
  mark: asset("apps/web/public/brand/emode-mark.png"),
  denim: asset("apps/web/public/demo/denim-jacket.png"),
  pants: asset("apps/web/public/demo/hybrid-pants.png"),
  sherpa: asset("apps/web/public/demo/sherpa-bomber.png"),
  suede: asset("apps/web/public/demo/suede-bomber.png"),
  personStreet: asset("../../../../Downloads/e47f7b0a2711e1ec926196f52cff5e7e.jpg"),
  personMirror: asset("../../../../Downloads/images (1).jpg"),
  streetTryon: asset("artifacts/shopify-app-store-screenshots/tryon-renders/street-suede-hybrid.png"),
  mirrorTryon: asset("artifacts/shopify-app-store-screenshots/tryon-renders/mirror-denim-hybrid.png"),
};

const shots = [
  {
    file: "01-admin-installation.png",
    title: "Launch virtual try-on from your store admin",
    alt: "Emode installation dashboard with connected status and setup steps",
    render: screenshotInstall,
  },
  {
    file: "02-storefront-buttons.png",
    title: "Add try-on buttons to product pages",
    alt: "Storefront product page showing Try This On and Dressing Room buttons",
    render: screenshotStorefront,
  },
  {
    file: "03-tryon-modal.png",
    title: "Let shoppers generate looks in a focused modal",
    alt: "Emode try-on modal with photo upload, product preview, and action buttons",
    render: screenshotTryon,
  },
  {
    file: "04-dressing-room.png",
    title: "Build outfits in the dressing room",
    alt: "Dressing room grid with selected products ready to try together",
    render: screenshotDressingRoom,
  },
  {
    file: "05-analytics-funnel.png",
    title: "Measure try-on intent by product",
    alt: "Analytics dashboard with views, try-ons, dressing room adds, and product table",
    render: screenshotAnalytics,
  },
  {
    file: "06-product-catalog.png",
    title: "Keep your catalog and widget install in one place",
    alt: "Product catalog dashboard with item status and widget install code",
    render: screenshotCatalog,
  },
];

function asset(rel) {
  const file = path.join(repoRoot, rel);
  const ext = path.extname(file).toLowerCase();
  const mime = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png";
  return `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
}

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderSvg(ctx, body) {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="tryonGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${C.purple}"/>
      <stop offset="100%" stop-color="${C.violet}"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${C.gold}"/>
      <stop offset="100%" stop-color="${C.gold2}"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="0" dy="18" stdDeviation="24" flood-color="#0a0a0a" flood-opacity="0.12"/>
    </filter>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#0a0a0a" flood-opacity="0.10"/>
    </filter>
    ${ctx.defs.join("\n")}
  </defs>
  <rect width="${W}" height="${H}" fill="${C.bg}"/>
  ${body}
</svg>`;
}

function newCtx() {
  return { defs: [], id: 0 };
}

function uid(ctx, prefix = "clip") {
  ctx.id += 1;
  return `${prefix}-${ctx.id}`;
}

function image(ctx, href, x, y, w, h, opts = {}) {
  const fit = opts.fit === "contain" ? "xMidYMid meet" : "xMidYMid slice";
  const bg = opts.bg ? rect(x, y, w, h, opts.r ?? 0, opts.bg, "none") : "";
  if (opts.r) {
    const id = uid(ctx);
    ctx.defs.push(`<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${opts.r}" ry="${opts.r}"/></clipPath>`);
    return `${bg}<image href="${href}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="${fit}" clip-path="url(#${id})"/>`;
  }
  return `${bg}<image href="${href}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="${fit}"/>`;
}

function rect(x, y, w, h, r = 0, fill = "none", stroke = "none", attrs = "") {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ry="${r}" fill="${fill}" stroke="${stroke}" ${attrs}/>`;
}

function line(x1, y1, x2, y2, color = C.line, width = 1, attrs = "") {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" ${attrs}/>`;
}

function text(value, x, y, size = 20, fill = C.ink, weight = 400, attrs = "") {
  return `<text x="${x}" y="${y}" font-family="Inter, Arial, sans-serif" font-size="${size}" fill="${fill}" font-weight="${weight}" ${attrs}>${esc(value)}</text>`;
}

function mono(value, x, y, size = 13, fill = C.ink, weight = 700, attrs = "") {
  return `<text x="${x}" y="${y}" font-family="Consolas, 'Courier New', monospace" font-size="${size}" fill="${fill}" font-weight="${weight}" ${attrs}>${esc(value)}</text>`;
}

function heading(value, x, y, size = 44, fill = C.ink, attrs = "") {
  return `<text x="${x}" y="${y}" font-family="Outfit, Inter, Arial, sans-serif" font-size="${size}" fill="${fill}" font-weight="800" letter-spacing="-1" ${attrs}>${esc(value)}</text>`;
}

function smallCaps(value, x, y, fill = C.muted, size = 13) {
  return text(value, x, y, size, fill, 800, `letter-spacing="2.4"`);
}

function copy(lines, x, y, size = 20, fill = C.muted, gap = 30) {
  return lines.map((l, i) => text(l, x, y + i * gap, size, fill, 500)).join("");
}

function header(ctx, title, sub) {
  return `
    ${image(ctx, assets.logo, 78, 34, 104, 34, { fit: "contain" })}
    ${heading(title, 78, 118, 42)}
    ${text(sub, 80, 154, 18, C.muted, 500)}
  `;
}

function pill(label, x, y, w, h, fill = C.off, stroke = C.line, color = C.charcoal, attrs = "") {
  return `
    ${rect(x, y, w, h, h / 2, fill, stroke, attrs)}
    ${text(label, x + w / 2, y + h / 2 + 5, 13, color, 800, `text-anchor="middle" letter-spacing="1.2"`)}
  `;
}

function button(label, x, y, w, h, fill, color = "#ffffff", attrs = "") {
  return `
    ${rect(x, y, w, h, 8, fill, "none", attrs)}
    ${text(label, x + w / 2, y + h / 2 + 5, 15, color, 800, `text-anchor="middle" letter-spacing="1.1"`)}
  `;
}

function card(x, y, w, h, r = 18, fill = "#ffffff", stroke = C.line, shadow = true) {
  return rect(x, y, w, h, r, fill, stroke, shadow ? `filter="url(#softShadow)"` : "");
}

function appShell(ctx, active, content) {
  const x = 76;
  const y = 188;
  const w = 1448;
  const h = 650;
  const nav = [
    "Overview",
    "Products",
    "Studio",
    "Install Widget",
    "Analytics",
  ];
  const navItems = nav.map((n, i) => {
    const yy = y + 138 + i * 52;
    const isActive = n === active;
    return `
      ${rect(x + 28, yy, 178, 40, 10, isActive ? "#ffffff" : "transparent", "none", `opacity="${isActive ? 0.11 : 1}"`)}
      ${iconDot(x + 48, yy + 20, isActive ? C.gold2 : "#ffffff", isActive ? 1 : 0.45)}
      ${text(n, x + 72, yy + 25, 15, "#ffffff", isActive ? 800 : 600, `opacity="${isActive ? 0.98 : 0.60}"`)}
    `;
  }).join("");

  return `
    ${rect(x, y, w, h, 30, "#ffffff", "none", `filter="url(#shadow)"`)}
    ${rect(x, y, 236, h, 30, C.ink, "none")}
    ${rect(x + 206, y, 30, h, 0, C.ink, "none")}
    ${rect(x + 26, y + 28, 58, 58, 15, "#ffffff", "none")}
    ${image(ctx, assets.mark, x + 35, y + 37, 40, 40, { fit: "contain" })}
    ${text("Admin", x + 98, y + 54, 13, "#ffffff", 800, `letter-spacing="2.6" opacity="0.45"`)}
    ${text("emode", x + 98, y + 78, 24, "#ffffff", 800)}
    ${navItems}
    ${rect(x + 236, y, w - 236, h, 0, C.off, "none")}
    ${content(x + 276, y + 46, w - 318, h - 92)}
  `;
}

function iconDot(cx, cy, color, opacity = 1) {
  return `<circle cx="${cx}" cy="${cy}" r="6" fill="${color}" opacity="${opacity}"/>`;
}

function metricCard(label, value, sub, x, y, w, h, accent = C.ink) {
  return `
    ${card(x, y, w, h, 18)}
    ${rect(x + 24, y + 24, 40, 40, 10, C.off, "none")}
    ${iconDot(x + 44, y + 44, accent, 0.95)}
    ${smallCaps(label, x + 24, y + 90, C.muted, 11)}
    ${heading(value, x + 24, y + 128, 31)}
    ${text(sub, x + 24, y + 154, 13, C.muted, 600)}
  `;
}

function productThumb(ctx, href, x, y, w, h, r = 12) {
  return `
    ${rect(x, y, w, h, r, "#f2f0ea", "none")}
    ${image(ctx, href, x + 8, y + 8, w - 16, h - 16, { fit: "contain" })}
  `;
}

function checklist(items, x, y) {
  return items.map((item, i) => {
    const yy = y + i * 42;
    return `
      <circle cx="${x + 12}" cy="${yy - 5}" r="10" fill="${item.done ? C.green : C.amber}" opacity="${item.done ? 0.14 : 0.16}"/>
      <path d="${item.done ? `M${x + 7},${yy - 5} l4,4 l8,-9` : `M${x + 12},${yy - 12} v8 M${x + 12},${yy + 1} v1`}" fill="none" stroke="${item.done ? C.green : C.amber}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
      ${text(item.label, x + 34, yy, 15, C.charcoal, 700)}
    `;
  }).join("");
}

function screenshotInstall() {
  const ctx = newCtx();
  const body = `
    ${header(ctx, shots[0].title, "Embedded setup, product sync, and theme extension status.")}
    ${appShell(ctx, "Overview", (x, y, w) => `
      ${heading("emodeAI Dashboard", x, y + 8, 35)}
      ${text("Store setup and live storefront readiness.", x, y + 42, 16, C.muted, 500)}

      ${card(x, y + 76, 676, 210, 20)}
      ${text("Installation Status", x + 28, y + 115, 21, C.ink, 800)}
      ${pill("CONNECTED", x + 510, y + 94, 128, 34, "#e8f8f0", "#c8eedb", C.green)}
      ${copy(["Your store is correctly linked to the emode backend.", "Virtual try-on is ready once the app block is active."], x + 28, y + 153, 17, C.charcoal, 30)}
      ${rect(x + 28, y + 227, 248, 42, 10, C.off, "none")}
      ${text("42 products synced", x + 50, y + 254, 15, C.charcoal, 800)}

      ${card(x + 704, y + 76, 426, 210, 20)}
      ${text("Theme Extension", x + 732, y + 115, 21, C.ink, 800)}
      ${checklist([
        { label: "App installed", done: true },
        { label: "Catalog synced", done: true },
        { label: "Try-on buttons enabled", done: true },
        { label: "First shopper try-on pending", done: false },
      ], x + 732, y + 148)}

      ${card(x, y + 314, 518, 224, 20)}
      ${text("Action Required", x + 28, y + 354, 20, C.ink, 800)}
      ${copy(["Open the theme editor and place the emodeAI Buttons", "block on product pages."], x + 28, y + 391, 16, C.charcoal, 28)}
      ${button("OPEN THEME EDITOR", x + 28, y + 462, 190, 48, C.ink)}

      ${card(x + 546, y + 314, 278, 224, 20)}
      ${smallCaps("USAGE TODAY", x + 574, y + 356, C.muted, 12)}
      ${heading("18", x + 574, y + 408, 52)}
      ${text("generated looks", x + 574, y + 439, 17, C.muted, 600)}
      ${rect(x + 574, y + 472, 202, 10, 5, "#e7e2d6", "none")}
      ${rect(x + 574, y + 472, 92, 10, 5, "url(#tryonGrad)", "none")}

      ${card(x + 852, y + 314, 278, 224, 20)}
      ${smallCaps("STORE STATUS", x + 880, y + 356, C.muted, 12)}
      ${heading("Live", x + 880, y + 408, 52, C.green)}
      ${text("awaiting order data", x + 880, y + 439, 17, C.muted, 600)}
      ${pill("READY TO TEST", x + 880, y + 472, 154, 34, C.off, C.line, C.muted)}
    `)}
  `;
  return renderSvg(ctx, body);
}

function screenshotStorefront() {
  const ctx = newCtx();
  const body = `
    ${header(ctx, shots[1].title, "A theme app extension places branded try-on actions beside the store's buy flow.")}
    ${rect(76, 188, 1448, 650, 30, "#ffffff", "none", `filter="url(#shadow)"`)}
    ${rect(76, 188, 1448, 86, 30, C.paper, "none")}
    ${text("Sartorial & State", 122, 240, 26, C.ink, 800)}
    ${smallCaps("COLLECTIONS", 600, 240, C.muted, 12)}
    ${smallCaps("ABOUT", 760, 240, C.muted, 12)}
    ${smallCaps("STUDIO", 870, 240, C.muted, 12)}
    ${smallCaps("CONTACT", 990, 240, C.muted, 12)}
    ${pill("CART 2", 1360, 216, 104, 36, C.off, C.line, C.charcoal)}
    ${line(76, 274, 1524, 274, C.line, 1)}

    ${smallCaps("MENSWEAR / OUTERWEAR / FEATURED", 122, 326, C.muted, 12)}
    ${rect(122, 360, 650, 410, 24, "#f3f1ec", "none")}
    ${image(ctx, assets.suede, 220, 392, 454, 344, { fit: "contain" })}
    ${rect(122, 790, 118, 8, 4, C.ink, "none", `opacity="0.16"`)}
    ${rect(252, 790, 118, 8, 4, C.ink, "none", `opacity="0.08"`)}
    ${rect(382, 790, 118, 8, 4, C.ink, "none", `opacity="0.08"`)}

    ${smallCaps("LIMITED EDITION", 854, 353, C.gold, 13)}
    ${heading("Suede Bomber", 854, 415, 58)}
    ${copy(["A clean product page with emode try-on", "actions placed near existing cart controls."], 856, 462, 19, C.charcoal, 31)}
    ${line(854, 532, 1420, 532, C.line, 1)}
    ${smallCaps("SELECTED FIT", 854, 578, C.muted, 12)}
    ${pill("REGULAR", 854, 594, 104, 38, C.off, C.line, C.charcoal)}
    ${pill("RELAXED", 970, 594, 108, 38, "#ffffff", C.line, C.muted)}
    ${button("ADD TO CART", 854, 674, 566, 58, C.ink)}
    ${button("TRY THIS ON", 854, 750, 276, 54, "url(#tryonGrad)")}
    ${button("DRESSING ROOM", 1144, 750, 276, 54, "#ffffff", "#98701a")}
    ${rect(1144, 750, 276, 54, 8, "none", C.gold, `stroke-width="2"`)}

  `;
  return renderSvg(ctx, body);
}

function silhouette(x, y, scale = 1, color = "#dad5ca") {
  return `
    <circle cx="${x + 70 * scale}" cy="${y + 38 * scale}" r="${29 * scale}" fill="${color}"/>
    <path d="M${x + 36 * scale},${y + 95 * scale} C${x + 48 * scale},${y + 68 * scale} ${x + 92 * scale},${y + 68 * scale} ${x + 104 * scale},${y + 95 * scale} L${x + 124 * scale},${y + 235 * scale} L${x + 93 * scale},${y + 235 * scale} L${x + 84 * scale},${y + 140 * scale} L${x + 58 * scale},${y + 140 * scale} L${x + 48 * scale},${y + 235 * scale} L${x + 18 * scale},${y + 235 * scale} Z" fill="${color}"/>
  `;
}

function modalTabs(x, y, active) {
  return `
    ${rect(x, y, 278, 48, 24, C.off, "none")}
    ${rect(x + (active === "try" ? 4 : 139), y + 4, 135, 40, 20, "#ffffff", "none", `filter="url(#softShadow)"`)}
    ${text("Try On", x + 72, y + 31, 14, active === "try" ? C.ink : C.muted, 800, `text-anchor="middle"`)}
    ${text("Dressing Room", x + 208, y + 31, 14, active === "room" ? C.ink : C.muted, 800, `text-anchor="middle"`)}
  `;
}

function screenshotTryon() {
  const ctx = newCtx();
  const body = `
    ${header(ctx, shots[2].title, "The storefront modal keeps shoppers in context while they upload, preview, and act.")}
    ${rect(92, 176, 1416, 678, 30, "#ffffff", "none", `filter="url(#shadow)"`)}
    ${rect(92, 176, 1416, 82, 30, C.paper, "none")}
    ${text("emode Try-On", 136, 228, 25, C.ink, 800)}
    ${modalTabs(612, 193, "try")}
    ${pill("POWERED BY EMODE", 1286, 202, 172, 36, C.off, C.line, C.muted)}
    ${line(92, 258, 1508, 258, C.line, 1)}

    ${rect(132, 296, 842, 506, 22, C.off, "none")}
    ${smallCaps("AI TRY-ON RESULT", 168, 344, C.muted, 12)}
    ${rect(168, 374, 346, 360, 18, "#ffffff", C.line)}
    ${image(ctx, assets.personStreet, 184, 390, 314, 304, { fit: "contain", r: 12, bg: "#f6f4ef" })}
    ${pill("SHOPPER PHOTO", 268, 706, 132, 30, C.off, C.line, C.muted)}

    ${rect(550, 374, 386, 360, 18, "#ffffff", C.line)}
    ${image(ctx, assets.streetTryon, 568, 390, 350, 304, { fit: "contain", r: 12, bg: "#f6f4ef" })}
    ${pill("GENERATED LOOK", 664, 706, 154, 30, "#efe7ff", "#ddcffc", C.purple)}

    ${rect(998, 296, 470, 506, 0, "#ffffff", "none")}
    ${smallCaps("TRYING ON", 1034, 344, C.gold, 12)}
    ${productThumb(ctx, assets.suede, 1034, 372, 120, 142, 14)}
    ${productThumb(ctx, assets.pants, 1168, 372, 120, 142, 14)}
    ${heading("Suede Bomber", 1034, 554, 28)}
    ${text("with Hybrid Pants", 1034, 584, 16, C.muted, 700)}
    ${line(1034, 616, 1428, 616, C.line, 1)}
    ${text("Shoppers can preview a realistic result,", 1034, 654, 16, C.charcoal, 600)}
    ${text("save the look, then add the variant to cart.", 1034, 680, 16, C.charcoal, 600)}
    ${button("TRY THIS ON", 1034, 720, 394, 54, "url(#tryonGrad)")}
    ${button("ADD TO CART", 1034, 786, 394, 46, C.ink)}
  `;
  return renderSvg(ctx, body);
}

function roomItem(ctx, href, title, x, y, selected = false) {
  return `
    ${rect(x, y, 214, 274, 18, "#ffffff", selected ? C.gold : C.line, `stroke-width="${selected ? 3 : 1}" filter="url(#softShadow)"`)}
    ${rect(x + 16, y + 16, 182, 184, 14, C.off, "none")}
    ${image(ctx, href, x + 30, y + 28, 154, 158, { fit: "contain" })}
    ${selected ? `<circle cx="${x + 184}" cy="${y + 30}" r="18" fill="${C.gold}"/><path d="M${x + 176},${y + 30} l6,6 l12,-14" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>` : `<circle cx="${x + 184}" cy="${y + 30}" r="17" fill="#ffffff" stroke="${C.line}" stroke-width="2"/>`}
    ${text(title, x + 18, y + 232, 16, C.ink, 800)}
    ${text("Ready to combine", x + 18, y + 256, 13, C.muted, 600)}
  `;
}

function screenshotDressingRoom() {
  const ctx = newCtx();
  const body = `
    ${header(ctx, shots[3].title, "Guests and signed-in shoppers can save items and combine pieces before buying.")}
    ${rect(92, 176, 1416, 678, 30, "#ffffff", "none", `filter="url(#shadow)"`)}
    ${rect(92, 176, 1416, 82, 30, C.paper, "none")}
    ${text("emode Dressing Room", 136, 228, 25, C.ink, 800)}
    ${modalTabs(612, 193, "room")}
    ${line(92, 258, 1508, 258, C.line, 1)}

    ${rect(132, 296, 792, 506, 22, C.off, "none")}
    ${heading("Your Dressing Room", 170, 350, 34)}
    ${text("Pick the pieces you want to see on at once, then try them together.", 172, 383, 17, C.muted, 600)}
    ${roomItem(ctx, assets.denim, "Denim Jacket", 170, 426, true)}
    ${roomItem(ctx, assets.pants, "Hybrid Pants", 414, 426, true)}
    ${rect(658, 426, 214, 274, 18, "#ffffff", C.line, `filter="url(#softShadow)"`)}
    ${text("More product pages", 686, 540, 16, C.charcoal, 800)}
    ${text("add pieces here", 686, 565, 13, C.muted, 600)}
    ${rect(170, 724, 702, 58, 18, "#ffffff", C.line)}
    ${text("Guest rooms persist while shoppers browse the same brand.", 206, 760, 15, C.charcoal, 700)}

    ${rect(956, 296, 512, 506, 22, "#ffffff", C.line)}
    ${smallCaps("GENERATED OUTFIT", 994, 344, C.gold, 12)}
    ${rect(994, 368, 230, 356, 18, C.off, "none")}
    ${image(ctx, assets.mirrorTryon, 1008, 382, 202, 328, { fit: "contain", r: 12, bg: "#f6f4ef" })}
    ${heading("2 pieces", 1254, 398, 42)}
    ${text("Denim Jacket", 1254, 446, 17, C.ink, 800)}
    ${text("Hybrid Pants", 1254, 486, 17, C.ink, 800)}
    ${line(1254, 528, 1430, 528, C.line, 1)}
    ${text("Try items together,", 1254, 566, 16, C.charcoal, 600)}
    ${text("then checkout the look.", 1254, 592, 16, C.charcoal, 600)}
    ${button("TRY TOGETHER", 1254, 640, 176, 52, "url(#goldGrad)", C.ink)}
    ${button("CHECKOUT", 1254, 708, 176, 48, C.ink)}
  `;
  return renderSvg(ctx, body);
}

function screenshotAnalytics() {
  const ctx = newCtx();
  const body = `
    ${header(ctx, shots[4].title, "Every product view, try-on, and dressing-room add feeds merchant reporting.")}
    ${appShell(ctx, "Analytics", (x, y) => `
      ${heading("Analytics", x, y + 8, 35)}
      ${text("How shoppers use try-on in your store.", x, y + 42, 16, C.muted, 500)}
      ${metricCard("PRODUCT VIEWS", "6,420", "4,118 shoppers", x, y + 76, 258, 174, C.blue)}
      ${metricCard("TRY-ONS", "1,184", "856 shoppers", x + 290, y + 76, 258, 174, C.purple)}
      ${metricCard("TRY-ON RATE", "20.8%", "shoppers who tried something on", x + 580, y + 76, 258, 174, C.gold)}
      ${metricCard("ROOM ADDS", "392", "pieces saved together", x + 870, y + 76, 258, 174, C.green)}

      ${card(x, y + 280, 1128, 258, 20)}
      ${text("By Product", x + 28, y + 323, 22, C.ink, 800)}
      ${text("Which pieces shoppers want to see on themselves.", x + 28, y + 352, 15, C.muted, 500)}
      ${productRow(ctx, assets.denim, "Denim Jacket", "1,842", "418", "22.7%", x + 28, y + 390, 1072)}
      ${productRow(ctx, assets.suede, "Suede Bomber", "1,316", "266", "20.2%", x + 28, y + 448, 1072)}
      ${productRow(ctx, assets.pants, "Hybrid Pants", "1,088", "204", "18.8%", x + 28, y + 506, 1072, false)}
    `)}
  `;
  return renderSvg(ctx, body);
}

function productRow(ctx, href, title, views, tryons, rate, x, y, w, border = true) {
  return `
    ${border ? line(x, y + 52, x + w, y + 52, C.line, 1) : ""}
    ${productThumb(ctx, href, x, y - 32, 44, 48, 8)}
    ${text(title, x + 62, y, 16, C.ink, 800)}
    ${smallCaps("VIEWS", x + w - 394, y - 3, C.muted, 10)}
    ${text(views, x + w - 260, y, 16, C.charcoal, 800, `text-anchor="end"`)}
    ${smallCaps("TRY-ONS", x + w - 218, y - 3, C.muted, 10)}
    ${text(tryons, x + w - 96, y, 16, C.charcoal, 800, `text-anchor="end"`)}
    ${text(rate, x + w, y, 16, C.green, 800, `text-anchor="end"`)}
  `;
}

function screenshotCatalog() {
  const ctx = newCtx();
  const body = `
    ${header(ctx, shots[5].title, "Synced products, visibility controls, and install code live together.")}
    ${appShell(ctx, "Products", (x, y) => `
      ${heading("Your Products", x, y + 8, 35)}
      ${text("Manage product readiness and marketplace visibility.", x, y + 42, 16, C.muted, 500)}

      ${card(x, y + 76, 736, 462, 20)}
      ${text("Synced Catalog", x + 28, y + 119, 22, C.ink, 800)}
      ${catalogHeader(x + 28, y + 160, 680)}
      ${catalogRow(ctx, assets.denim, "Denim Jacket", "outerwear", "418", "Visible", "Ready", x + 28, y + 214, 680)}
      ${catalogRow(ctx, assets.pants, "Hybrid Pants", "bottoms", "204", "Visible", "Ready", x + 28, y + 292, 680)}
      ${catalogRow(ctx, assets.sherpa, "Sherpa Bomber", "outerwear", "126", "Hidden", "Check image", x + 28, y + 370, 680, false)}

      ${card(x + 770, y + 76, 358, 214, 20)}
      ${smallCaps("WIDGET INSTALL", x + 798, y + 119, C.gold, 12)}
      ${text("Universal embed code", x + 798, y + 154, 21, C.ink, 800)}
      ${rect(x + 798, y + 178, 302, 74, 12, C.ink, "none")}
      ${mono("<script src=\"/widget.js\"", x + 816, y + 207, 13, "#e9e1d2", 700)}
      ${mono("data-emode-merchant=\"...\">", x + 816, y + 232, 13, "#e9e1d2", 700)}

      ${card(x + 770, y + 324, 358, 214, 20)}
      ${smallCaps("QUALITY CHECKS", x + 798, y + 367, C.muted, 12)}
      ${checklist([
        { label: "Product image present", done: true },
        { label: "Variant connected", done: true },
        { label: "Marketplace reviewed", done: false },
      ], x + 798, y + 405)}
      ${button("OPEN STORE PREVIEW", x + 798, y + 480, 226, 44, C.ink)}
    `)}
  `;
  return renderSvg(ctx, body);
}

function catalogHeader(x, y, w) {
  return `
    ${rect(x, y, w, 42, 10, C.off, "none")}
    ${smallCaps("PRODUCT", x + 16, y + 27, C.muted, 10)}
    ${smallCaps("CATEGORY", x + 300, y + 27, C.muted, 10)}
    ${smallCaps("TRY-ONS", x + 430, y + 27, C.muted, 10)}
    ${smallCaps("STATUS", x + 548, y + 27, C.muted, 10)}
  `;
}

function catalogRow(ctx, href, title, category, tryons, visible, status, x, y, w, border = true) {
  const statusColor = status === "Ready" ? C.green : C.amber;
  return `
    ${border ? line(x, y + 62, x + w, y + 62, C.line, 1) : ""}
    ${productThumb(ctx, href, x, y - 32, 48, 54, 9)}
    ${text(title, x + 64, y, 15, C.ink, 800)}
    ${text("Synced product", x + 64, y + 23, 12, C.muted, 600)}
    ${pill(category, x + 292, y - 22, 96, 30, C.off, C.line, C.charcoal)}
    ${text(tryons, x + 464, y, 15, C.charcoal, 800, `text-anchor="end"`)}
    ${pill(visible, x + 510, y - 22, 80, 30, visible === "Visible" ? "#e8f8f0" : C.off, visible === "Visible" ? "#c8eedb" : C.line, visible === "Visible" ? C.green : C.muted)}
    ${pill(status, x + 604, y - 22, 92, 30, status === "Ready" ? "#e8f8f0" : "#fff4df", status === "Ready" ? "#c8eedb" : "#f0d296", statusColor)}
  `;
}

async function writePng(file, svg) {
  const out = path.join(outDir, file);
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(out);
  return out;
}

async function makeContactSheet(files) {
  const thumbW = 480;
  const thumbH = 270;
  const pad = 40;
  const topPad = 86;
  const labelH = 42;
  const sheetW = pad * 2 + thumbW * 2 + 32;
  const sheetH = topPad + pad + (thumbH + labelH) * 3 + 32 * 2;

  const composites = [];
  for (let i = 0; i < files.length; i += 1) {
    const img = await sharp(files[i])
      .resize(thumbW, thumbH)
      .png()
      .toBuffer();
    const col = i % 2;
    const row = Math.floor(i / 2);
    const left = pad + col * (thumbW + 32);
    const top = topPad + row * (thumbH + labelH + 32);
    composites.push({ input: img, left, top });
  }

  const labels = shots.map((s, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const left = pad + col * (thumbW + 32);
    const top = topPad + row * (thumbH + labelH + 32) + thumbH + 28;
    return `<text x="${left}" y="${top}" font-family="Inter, Arial, sans-serif" font-size="18" fill="${C.ink}" font-weight="800">${esc(String(i + 1).padStart(2, "0"))} ${esc(s.title)}</text>`;
  }).join("");

  const labelSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${sheetW}" height="${sheetH}" viewBox="0 0 ${sheetW} ${sheetH}">
    <rect width="${sheetW}" height="${sheetH}" fill="${C.bg}"/>
    <text x="40" y="42" font-family="Outfit, Inter, Arial, sans-serif" font-size="28" fill="${C.ink}" font-weight="800">Emode Shopify App Store Screenshots</text>
    <text x="40" y="66" font-family="Inter, Arial, sans-serif" font-size="14" fill="${C.muted}" font-weight="600">Six desktop PNGs at 1600 x 900. Contact sheet is for review only.</text>
    ${labels}
  </svg>`;

  const base = await sharp(Buffer.from(labelSvg)).png().toBuffer();

  await sharp({
    create: {
      width: sheetW,
      height: sheetH,
      channels: 4,
      background: C.bg,
    },
  })
    .composite([{ input: base, left: 0, top: 0 }, ...composites])
    .png({ compressionLevel: 9 })
    .toFile(path.join(outDir, "contact-sheet.png"));
}

async function main() {
  const files = [];
  for (const shot of shots) {
    const svg = shot.render();
    const out = await writePng(shot.file, svg);
    files.push(out);
    const meta = await sharp(out).metadata();
    if (meta.width !== W || meta.height !== H) {
      throw new Error(`${shot.file} rendered at ${meta.width}x${meta.height}`);
    }
  }

  await makeContactSheet(files);

  const manifest = {
    generatedAt: new Date().toISOString(),
    spec: {
      width: W,
      height: H,
      aspectRatio: "16:9",
      format: "PNG",
    },
    notes: [
      "Designed as Shopify App Store desktop screenshots.",
      "No browser chrome, desktop wallpaper, pricing, reviews, or outcome guarantees are included.",
      "Screenshots are unique and centered on actual emode UI/features found in the codebase.",
      "Try-on modal screenshots include generated try-on renders saved under tryon-renders.",
    ],
    screenshots: shots.map(({ file, title, alt }) => ({ file, title, alt })),
  };

  fs.writeFileSync(
    path.join(outDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8"
  );

  const readme = `# Emode Shopify App Store Screenshots

Generated desktop listing screenshots for the Shopify App Store.

## Specs

- Size: ${W} x ${H}
- Aspect ratio: 16:9
- Format: PNG

## Files

${shots.map((s) => `- \`${s.file}\` - ${s.title}\n  Alt text: ${s.alt}`).join("\n")}

## Notes

- Images avoid browser chrome, desktop backgrounds, pricing, reviews, and outcome guarantees.
- Each image shows a distinct app surface or state: setup, storefront buttons, try-on modal, dressing room, analytics, and catalog/install.
- The modal and dressing-room screenshots use generated try-on renders in \`tryon-renders/\`.
- \`contact-sheet.png\` is for quick review only; upload the numbered PNGs.
`;

  fs.writeFileSync(path.join(outDir, "README.md"), readme, "utf8");

  console.log(`Generated ${shots.length} screenshots in ${outDir}`);
  for (const shot of shots) console.log(`- ${shot.file}`);
  console.log("- contact-sheet.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
