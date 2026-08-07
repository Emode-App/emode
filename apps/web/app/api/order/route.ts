import { NextResponse } from 'next/server';
import { clientIp, hashIp, rateLimit, originMatchesMerchant } from '../../../lib/request-guard';
import { createClient } from '@supabase/supabase-js';
import { requireServiceRoleKey } from '../../../lib/supabase/require-key';

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
 * Purchase hook for non-Shopify merchants, called via window.emode.trackOrder().
 *
 * Shopify stores get attribution for free: the theme extension writes a cart
 * attribute and the orders/create webhook reads it back. A custom storefront has
 * no equivalent, so without this the whole analytics story would be
 * Shopify-only — try-on counts for everyone, conversion and revenue for Shopify
 * merchants alone.
 *
 * Trust model: the totals are as trustworthy as the merchant's own site, and
 * the numbers are reported back to that same merchant. Deliberately NOT used
 * for billing.
 *
 * That reasoning only holds if the caller IS the merchant's site, which it did
 * not previously have to be. CORS is '*' and a merchantId is public, so anyone
 * could post orders with any total against any merchant and poison their
 * attribution. The origin check below is what makes the paragraph above true.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();

        const merchantId = typeof body.merchantId === 'string' ? body.merchantId : '';
        const orderId = body.orderId ? String(body.orderId).slice(0, 128) : '';
        if (!UUID_RE.test(merchantId) || !orderId) {
            return NextResponse.json(
                { error: 'merchantId and orderId are required.' },
                { status: 400, headers: corsHeaders }
            );
        }

        // Only record orders for merchants that exist. Otherwise a stray or
        // mistyped id would create rows attributable to nobody.
        if (!rateLimit(`ord:${hashIp(clientIp(request))}`, 60, 60_000)) {
            return NextResponse.json(
                { error: 'Too many requests.' },
                { status: 429, headers: corsHeaders }
            );
        }

        const { data: merchant } = await supabase
            .from('merchants')
            .select('id, shop_domain')
            .eq('id', merchantId)
            .maybeSingle();

        if (merchant && !originMatchesMerchant(request, merchant.shop_domain)) {
            return NextResponse.json(
                { error: 'Not permitted from this origin.' },
                { status: 403, headers: corsHeaders }
            );
        }

        if (!merchant) {
            return NextResponse.json(
                { error: 'Unknown merchant.' },
                { status: 404, headers: corsHeaders }
            );
        }

        const total = Number(body.total);
        const productIds = Array.isArray(body.productIds)
            ? body.productIds.slice(0, 100).map((p: unknown) => String(p).slice(0, 128))
            : [];

        // upsert on (merchant_id, platform_order_id): a confirmation page can be
        // refreshed, and double-counting revenue is worse than missing it.
        const { error } = await supabase.from('orders').upsert(
            {
                merchant_id: merchantId,
                platform_order_id: orderId,
                visitor_id: typeof body.visitorId === 'string' ? body.visitorId.slice(0, 64) : null,
                total_price: Number.isFinite(total) && total >= 0 ? total : 0,
                currency: typeof body.currency === 'string' ? body.currency.slice(0, 8) : 'USD',
                line_item_product_ids: productIds,
                ordered_at: new Date().toISOString(),
            },
            { onConflict: 'merchant_id,platform_order_id' }
        );

        if (error) {
            console.error('[API/Order] Upsert failed:', error);
            return NextResponse.json({ error: 'Could not record order.' }, { status: 500, headers: corsHeaders });
        }

        return NextResponse.json({ ok: true }, { headers: corsHeaders });
    } catch (err) {
        console.error('[API/Order]', err);
        return NextResponse.json({ error: 'Invalid request.' }, { status: 400, headers: corsHeaders });
    }
}
