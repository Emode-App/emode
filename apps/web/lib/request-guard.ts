import { createHmac } from 'crypto';

/**
 * Guards for endpoints a merchant's storefront calls directly.
 *
 * These routes are unauthenticated by necessity: they run from a shopper's
 * browser on someone else's domain, and there is no credential to present. What
 * they had instead was nothing at all. A merchantId is not a secret, it sits in
 * a script tag on every page of the merchant's public storefront, so "knows the
 * merchantId" was never an access control.
 *
 * Two things replace it. A merchant-scoped call has to come from a page on a
 * host that merchant actually uses, and every caller gets a rate limit whether
 * or not they claim to be anyone.
 */

/* ------------------------------------------------------------------ *
 * Who is calling
 * ------------------------------------------------------------------ */

/**
 * The caller's IP, as seen through Vercel's proxy.
 *
 * x-forwarded-for is a chain (client, proxy1, proxy2...) and only the first
 * entry is the real client. Everything after it is infrastructure, and trusting
 * the last would rate-limit our own edge.
 */
export function clientIp(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        const first = forwarded.split(',')[0]?.trim();
        if (first) return first;
    }
    return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

/** Never store a raw address. Keyed, because the IPv4 space is small enough to brute-force a bare digest. */
export function hashIp(ip: string): string {
    const secret = process.env.EMODE_IP_HASH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'emode';
    return createHmac('sha256', secret).update(ip).digest('hex').slice(0, 32);
}

/* ------------------------------------------------------------------ *
 * Rate limiting
 * ------------------------------------------------------------------ */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/**
 * A fixed-window counter held in module memory.
 *
 * Serverless means one of these per warm instance, so the real ceiling is the
 * limit times however many instances are live. That is a genuine weakness and
 * it is still the difference between "a script can write a million rows before
 * anyone notices" and "a script gets a few hundred through". A shared store is
 * the correct fix and this is the version that ships today.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || now >= bucket.resetAt) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        // Opportunistic sweep: without it the map grows for the life of the
        // instance, which on a busy host is a slow memory leak.
        if (buckets.size > 10_000) {
            for (const [k, v] of buckets) if (now >= v.resetAt) buckets.delete(k);
        }
        return true;
    }

    if (bucket.count >= limit) return false;
    bucket.count += 1;
    return true;
}

export function tooManyRequests(headers: Record<string, string> = {}) {
    return new Response(
        JSON.stringify({ error: 'Too many requests. Try again shortly.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', ...headers } }
    );
}

/* ------------------------------------------------------------------ *
 * Origin binding
 * ------------------------------------------------------------------ */

/** The registrable-ish host, so shop.example.com and www.example.com match. */
function baseHost(host: string): string {
    const clean = host.toLowerCase().replace(/:\d+$/, '');
    const parts = clean.split('.');
    return parts.length > 2 ? parts.slice(-2).join('.') : clean;
}

function hostOf(value: string | null): string | null {
    if (!value) return null;
    try {
        return new URL(value).hostname.toLowerCase();
    } catch {
        return null;
    }
}

/**
 * Does this request come from a page on the merchant's own site?
 *
 * `shopDomain` is what the merchant registered: a myshopify domain for Shopify
 * installs, or an email address for widget merchants, which is not a host at
 * all. So this cannot be strict for everyone yet, and pretending otherwise
 * would silently break every widget merchant.
 *
 * The rule: if we know the merchant's host, the caller must match it. If we do
 * not, the caller is allowed but is not treated as trusted, and the caller-side
 * rate limit still applies. Recording allowed hosts at install is the change
 * that makes this strict everywhere, and it belongs with onboarding rather than
 * here.
 */
export function originMatchesMerchant(request: Request, shopDomain: string | null): boolean {
    if (!shopDomain || shopDomain.includes('@')) return true; // no host on file

    const claimed = baseHost(shopDomain);
    const from = hostOf(request.headers.get('origin')) || hostOf(request.headers.get('referer'));

    // No Origin and no Referer means a non-browser caller: curl, a server, a
    // script. Those are exactly the callers this is meant to stop.
    if (!from) return false;

    return baseHost(from) === claimed;
}
