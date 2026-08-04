import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Service role client — see list/route.ts for why identity comes from a bearer
// token rather than an ambient session (this is called cross-origin from the
// Chrome extension, which has no access to the web app's cookies/localStorage).
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: Request) {
    try {
        const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
        }

        const body = await request.json();
        const { title, image, price, url, merchantId } = body;

        if (!title || !image) {
            return NextResponse.json({ error: 'Missing product data' }, { status: 400, headers: corsHeaders });
        }

        const resolvedMerchantId = typeof merchantId === 'string' && UUID_RE.test(merchantId) ? merchantId : null;

        // 1. Find or create Product.
        // Note: select-then-insert, NOT upsert — platform_product_id has no unique
        // constraint, so ON CONFLICT would be rejected by Postgres.
        const productId = title.toLowerCase().replace(/\s+/g, '-').substring(0, 50);
        let { data: pData } = await supabase
            .from('products')
            .select('id, merchant_id')
            .eq('platform_product_id', productId)
            .limit(1)
            .maybeSingle();

        if (!pData) {
            const { data: inserted, error: pError } = await supabase
                .from('products')
                .insert({
                    platform_product_id: productId,
                    title: title,
                    primary_image_url: image,
                    buy_url: url || '',
                    merchant_id: resolvedMerchantId,
                })
                .select('id, merchant_id')
                .single();
            if (pError || !inserted) throw pError || new Error('Failed to create product');
            pData = inserted;
        } else if (!pData.merchant_id && resolvedMerchantId) {
            // Product was first discovered without merchant context (e.g. via the
            // Chrome extension) — claim it for the merchant now that we know them.
            await supabase.from('products').update({ merchant_id: resolvedMerchantId }).eq('id', pData.id);
        }

        // 2. Find or create Variant (same constraint caveat as products)
        let { data: vData } = await supabase
            .from('variants')
            .select('id')
            .eq('product_id', pData.id)
            .eq('platform_variant_id', 'default')
            .limit(1)
            .maybeSingle();

        if (!vData) {
            const { data: inserted, error: vError } = await supabase
                .from('variants')
                .insert({
                    product_id: pData.id,
                    platform_variant_id: 'default',
                    price: typeof price === 'string' ? parseFloat(price.replace(/[^0-9.-]+/g, "")) : price,
                    image_url: image,
                })
                .select('id')
                .single();
            if (vError || !inserted) throw vError || new Error('Failed to create variant');
            vData = inserted;
        }

        // 3. Get/Create Active Dressing Room
        let { data: drData } = await supabase
            .from('dressing_rooms')
            .select('id')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .limit(1)
            .maybeSingle();

        if (!drData) {
            const { data: newDr } = await supabase
                .from('dressing_rooms')
                .insert({ user_id: user.id, merchant_id: resolvedMerchantId })
                .select('id')
                .single();
            drData = newDr;
        }

        if (!drData) throw new Error('Failed to secure dressing room');

        // 4. Add Item (skip if this product is already in the room)
        const { data: existingItem } = await supabase
            .from('dressing_room_items')
            .select('id')
            .eq('dressing_room_id', drData.id)
            .eq('product_id', pData.id)
            .limit(1)
            .maybeSingle();

        if (!existingItem) {
            const { error: itemError } = await supabase
                .from('dressing_room_items')
                .insert({
                    dressing_room_id: drData.id,
                    product_id: pData.id,
                    variant_id: vData.id,
                });
            if (itemError) throw itemError;
        }

        return NextResponse.json({ success: true, item: pData }, { headers: corsHeaders });

    } catch (err: any) {
        console.error('[DressingRoomAdd]', err);
        return NextResponse.json({ error: err.message }, { status: 500, headers: corsHeaders });
    }
}
