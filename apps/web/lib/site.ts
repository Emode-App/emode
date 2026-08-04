/**
 * Single source of truth for emode's public origin.
 *
 * This was hardcoded as "https://emode.app" in ~10 places across the web app,
 * the widget, the Shopify theme extension and the Chrome extension. That domain
 * turned out to belong to someone else, and finding every copy was its own
 * small archaeology project — so anything user-facing should read from here.
 *
 * Set NEXT_PUBLIC_EMODE_URL in the environment to override (no trailing slash).
 * It is NEXT_PUBLIC_ because client components render install snippets with it.
 */
export const SITE_URL = (
    process.env.NEXT_PUBLIC_EMODE_URL || 'https://emode.style'
).replace(/\/+$/, '');

/** Bare host, for copy that reads better without the scheme ("emode.style/login"). */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, '');

/** Support/contact addresses, derived so they follow the domain automatically. */
export const SUPPORT_EMAIL = `support@${SITE_HOST}`;
export const API_EMAIL = `api@${SITE_HOST}`;
export const FOUNDERS_EMAIL = `founders@${SITE_HOST}`;
