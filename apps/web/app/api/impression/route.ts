import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resolveOrCaptureProduct } from '../../../lib/product-capture';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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

        return NextResponse.json({ ok: true }, { headers: corsHeaders });
    } catch (err) {
        console.error('[API/Impression]', err);
        // Still 200: this is analytics, and the storefront should never see a
        // failure from it.
        return NextResponse.json({ ok: false }, { headers: corsHeaders });
    }
}
