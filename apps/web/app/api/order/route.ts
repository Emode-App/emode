import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
 * Purchase hook for non-Shopify merchants, called via window.emode.trackOrder().
 *
 * Shopify stores get attribution for free: the theme extension writes a cart
 * attribute and the orders/create webhook reads it back. A custom storefront has
 * no equivalent, so without this the whole analytics story would be
 * Shopify-only — try-on counts for everyone, conversion and revenue for Shopify
 * merchants alone.
 *
 * Trust model: this is a public endpoint called from the merchant's own page,
 * so the totals are as trustworthy as the merchant's own site. That is
 * acceptable — the numbers are reported back to the same merchant, and nobody
 * gains anything by inflating their own dashboard. It is deliberately NOT used
 * for billing.
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
        const { data: merchant } = await supabase
            .from('merchants')
            .select('id')
            .eq('id', merchantId)
            .maybeSingle();

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
