/**
 * Single source of truth for emode's public origin.
 *
 * This was hardcoded as "https://emode.app" in ~10 places across the web app,
 * the widget, the Shopify theme extension and the Chrome extension. That domain
 * turned out to belong to someone else, and finding every copy was its own
 * small archaeology project — so anything user-facing should read from here.
 *
 * Must be the CANONICAL host, i.e. www. The apex 308-redirects to it, and
 * browsers treat a redirect on a CORS preflight as a fatal error — so any
 * cross-origin POST (the theme extension's impression logging, the widget)
 * fails silently if this points at the apex.
 *
 * Set NEXT_PUBLIC_EMODE_URL in the environment to override (no trailing slash).
 * It is NEXT_PUBLIC_ because client components render install snippets with it.
 */
export const SITE_URL = (
    process.env.NEXT_PUBLIC_EMODE_URL || 'https://www.emode.style'
).replace(/\/+$/, '');

/** Bare host, for copy that reads better without the scheme ("emode.style/login"). */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, '');

/** Support/contact addresses, derived so they follow the domain automatically. */
export const SUPPORT_EMAIL = `support@${SITE_HOST}`;
export const API_EMAIL = `api@${SITE_HOST}`;
export const FOUNDERS_EMAIL = `founders@${SITE_HOST}`;

/**
 * The community. Server id 1535443895146647562.
 *
 * Kept here rather than inline because the invite is a rotatable credential of
 * sorts: revoking it and issuing another is a normal thing to do, and it should
 * be one edit when that happens.
 *
 * NOTE: this link currently expires. Discord's default is 30 days and its
 * expiry dropdown cannot be driven from a script, so it was left as created.
 * Set Expire After to **Never** in the invite settings, or the button on the
 * landing page becomes a dead link a month after launch — which is the usual
 * reason a Discord link in a store listing does not work.
 */
export const DISCORD_INVITE_URL = 'https://discord.gg/6XVUMVtvF';

/**
 * The public Shopify App Store listing. `emode-tryon` is the listing's own
 * handle, not the app's client_id or internal name (that's `emodeai`
 * elsewhere in this repo) -- Shopify assigns the storefront slug separately
 * from the app identity, and the two do not have to match.
 *
 * Every "Get it on Shopify" / "Shopify App Store" link in the product used to
 * point at bare apps.shopify.com (the store's homepage) or, on the landing
 * page, at a literal href="#" that did nothing at all when clicked. One place
 * to fix that, and one place if the listing URL is ever regenerated.
 */
export const SHOPIFY_APP_STORE_URL = 'https://apps.shopify.com/emode-tryon';
