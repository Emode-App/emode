import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Build the catalogue for widget merchants out of what shoppers look at.
 *
 * Shopify merchants get a catalogue from the app's product sync. Widget
 * merchants had no equivalent and no way to get one: /api/generate and
 * /api/impression only ever LOOKED UP products, and the single place that
 * created them fired only for signed-in shoppers — who are close to nobody on a
 * real storefront. So a widget merchant's dashboard reported try-ons with
 * "Your Products: 0" and an empty top-products table permanently, and
 * marketplace_visible could never be set on anything, making the marketplace
 * listing sold with Pro and Growth literally unreachable.
 *
 * The widget already scrapes title, image, price and URL to render the modal.
 * This records what it found.
 */

export interface CapturedProduct {
    /** Merchant's own id when the platform exposes one (Shopify's product.id). */
    platformRef?: string | null;
    title?: string | null;
    image?: string | null;
    price?: string | number | null;
    /** The product page the shopper was on. */
    url?: string | null;
}

/**
 * A stable per-merchant identity for a scraped product.
 *
 * The product URL, minus query and hash: it survives a retitled product, a
 * changed price and a swapped photo, none of which make it a different product.
 * Marketing parameters (?utm_source, ?variant) would otherwise mint a new row
 * per campaign and per colourway.
 *
 * Falls back to a title slug when there is no usable URL — worse, because
 * renaming the product then orphans its history, but better than dropping it.
 */
export function productKey(input: CapturedProduct): string | null {
    if (input.platformRef) return String(input.platformRef).slice(0, 255);

    if (input.url) {
        try {
            const u = new URL(input.url);
            const key = `${u.host}${u.pathname}`.replace(/\/+$/, '');
            if (key) return key.slice(0, 255);
        } catch {
            // Unparseable URL — fall through to the title.
        }
    }

    if (input.title) {
        return input.title.toLowerCase().trim().replace(/\s+/g, '-').slice(0, 255);
    }

    return null;
}

function parsePrice(raw: CapturedProduct['price']): number | null {
    if (raw == null) return null;
    if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
    // Scraped strings look like "$1,290", "USD 1290", "1.290,00 €".
    const cleaned = String(raw).replace(/[^\d.,]/g, '').replace(/,(?=\d{3}\b)/g, '');
    const n = parseFloat(cleaned.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
}

/**
 * Resolve a product to our own products.id, creating it if this merchant has not
 * been seen selling it before.
 *
 * Returns null rather than throwing. This runs inside try-on and impression
 * logging, and a shopper's try-on must never fail because bookkeeping did.
 */
export async function resolveOrCaptureProduct(
    supabase: SupabaseClient,
    merchantId: string,
    input: CapturedProduct
): Promise<string | null> {
    if (!merchantId) return null;

    const key = productKey(input);
    if (!key) return null;

    // Shopify sends a bare numeric id while the sync stores the GID form, so a
    // Shopify reference has to be tried both ways before concluding it is new.
    const candidates = /^\d+$/.test(key)
        ? [`gid://shopify/Product/${key}`, key]
        : [key];

    try {
        const { data: existing } = await supabase
            .from('products')
            .select('id, primary_image_url')
            .eq('merchant_id', merchantId) // Scoped: another store's row is not ours.
            .in('platform_product_id', candidates)
            .limit(1)
            .maybeSingle();

        if (existing) {
            // Backfill an image if we have one and the row is missing it — early
            // Shopify rows and anything captured before the modal handoff can be
            // imageless, which makes the dashboard look broken.
            if (!existing.primary_image_url && input.image) {
                await supabase
                    .from('products')
                    .update({ primary_image_url: input.image })
                    .eq('id', existing.id);
            }
            return existing.id;
        }

        if (!input.title) return null; // Nothing worth creating a row from.

        const { data: created, error } = await supabase
            .from('products')
            .insert({
                merchant_id: merchantId,
                platform_product_id: key,
                title: input.title.slice(0, 500),
                primary_image_url: input.image || null,
                buy_url: input.url || null,
                // Not marketplace_visible. Appearing in a public marketplace is a
                // decision for the merchant to make in their dashboard, not
                // something a shopper's page view opts them into.
                marketplace_visible: false,
            })
            .select('id')
            .single();

        if (error) {
            // Two page views landing at once both miss the select and both
            // insert; the unique index rejects the loser. Re-read rather than
            // report a failure — the row exists, which is all the caller wanted.
            if ((error as any).code === '23505') {
                const { data: raced } = await supabase
                    .from('products')
                    .select('id')
                    .eq('merchant_id', merchantId)
                    .eq('platform_product_id', key)
                    .maybeSingle();
                return raced?.id || null;
            }
            console.error('[product-capture] Insert failed:', error.message);
            return null;
        }

        const price = parsePrice(input.price);
        if (created && price != null) {
            // Best effort: a missing price costs a number on a dashboard, and is
            // not worth failing a try-on over.
            const { error: vErr } = await supabase
                .from('variants')
                .insert({ product_id: created.id, price, buy_url: input.url || null });
            if (vErr) console.error('[product-capture] Variant insert failed:', vErr.message);
        }

        return created?.id || null;
    } catch (err: any) {
        console.error('[product-capture] Unexpected failure:', err?.message || err);
        return null;
    }
}
