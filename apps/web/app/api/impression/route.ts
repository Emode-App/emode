import { NextResponse } from 'next/server';
import { clientIp, hashIp, rateLimit, originMatchesMerchant } from '../../../lib/request-guard';
import { createClient } from '@supabase/supabase-js';
import { requireServiceRoleKey } from '../../../lib/supabase/require-key';
import { resolveOrCaptureProduct } from '../../../lib/product-capture';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    requireServiceRoleKey()
);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * Records that a shopper SAW the try-on button.
 *
 * This is the control group. Conversion among shoppers who tried on is not a
 * claim a merchant can act on without "…versus shoppers who saw it and didn't",
 * and that denominator cannot be reconstructed retroactively — which is why
 * this ships before anything reads it.
 *
 * Fire-and-forget by design: the theme extension does not await the response,
 * and a failure here must never affect the storefront.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();

        const visitorId = typeof body.visitorId === 'string' ? body.visitorId.slice(0, 64) : '';
        if (!visitorId) {
            return NextResponse.json({ ok: false }, { status: 400, headers: corsHeaders });
        }

        // This endpoint CREATES product rows, so an unlimited unauthenticated
        // caller could fill any merchant's catalogue with anything. A real
        // shopper fires a handful of impressions a minute; 120 leaves that
        // untouched and stops a script cold.
        if (!rateLimit(`imp:${hashIp(clientIp(request))}`, 120, 60_000)) {
            return NextResponse.json({ ok: false }, { status: 429, headers: corsHeaders });
        }

        // Accept either a merchant UUID (widget) or a shop domain (Shopify theme
        // extension). Resolving the domain here means merchants never have to
        // paste an ID into the theme editor — the block works on install.
        let merchantId = typeof body.merchantId === 'string' && UUID_RE.test(body.merchantId)
            ? body.merchantId
            : '';

        if (!merchantId && typeof body.shop === 'string' && body.shop) {
            const { data } = await supabase
                .from('merchants')
                .select('id')
                .eq('shop_domain', body.shop)
                .limit(1)
                .maybeSingle();
            merchantId = data?.id || '';
        }

        if (!merchantId) {
            return NextResponse.json({ ok: false }, { status: 400, headers: corsHeaders });
        }

        // A merchantId is public: it sits in a script tag on the merchant's own
        // storefront. Knowing one was never permission to write to their
        // catalogue, so require the call to come from a page on their site.
        const { data: owner } = await supabase
            .from('merchants')
            .select('shop_domain')
            .eq('id', merchantId)
            .maybeSingle();

        if (!originMatchesMerchant(request, owner?.shop_domain ?? null)) {
            return NextResponse.json({ ok: false }, { status: 403, headers: corsHeaders });
        }

        // Resolve the product, creating it when this merchant has not been seen
        // selling it before. Impressions fire on every product page view, so the
        // catalogue fills in from browsing rather than waiting for someone to
        // complete a try-on.
        const productId = await resolveOrCaptureProduct(supabase, merchantId, {
            platformRef: body.productId ? String(body.productId).trim() : null,
            title: typeof body.title === 'string' ? body.title : null,
            image: typeof body.image === 'string' ? body.image : null,
            price: typeof body.price === 'string' ? body.price : null,
            url: typeof body.url === 'string' ? body.url : null,
        });

        // UNIQUE (merchant_id, visitor_id, product_id) makes this idempotent, so
        // a shopper reloading a product page twenty times counts once and cannot
        // inflate the denominator.
        await supabase
            .from('tryon_impressions')
            .upsert(
                { merchant_id: merchantId, visitor_id: visitorId, product_id: productId },
                { onConflict: 'merchant_id,visitor_id,product_id', ignoreDuplicates: true }
            );

        // Tell the widget whether this merchant still has a plan.
        //
        // Cancelling revokes the entitlement, so /api/generate already refuses —
        // a merchant who leaves the script in place gets no free try-ons. But the
        // BUTTONS still rendered, so their shoppers would upload a photo, wait,
        // and be told the store has no active plan. That is worse than the
        // buttons being absent: it is the shopper who eats it, on the merchant's
        // storefront, and it looks like the store is broken.
        //
        // Impression already fires on every product page, so the answer rides
        // back on a request that was happening anyway.
        const { data: entitlement } = await supabase
            .from('entitlements')
            .select('subject_id')
            .eq('subject_id', merchantId)
            .eq('subject_type', 'merchant')
            .limit(1)
            .maybeSingle();

        return NextResponse.json(
            { ok: true, active: Boolean(entitlement) },
            { headers: corsHeaders }
        );
    } catch (err) {
        console.error('[API/Impression]', err);
        // Still 200: this is analytics, and the storefront should never see a
        // failure from it.
        return NextResponse.json({ ok: false }, { headers: corsHeaders });
    }
}
