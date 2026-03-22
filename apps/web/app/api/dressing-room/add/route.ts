import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: Request) {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
        }

        const body = await request.json();
        const { title, image, price, url } = body;

        if (!title || !image) {
            return NextResponse.json({ error: 'Missing product data' }, { status: 400, headers: corsHeaders });
        }

        // 1. Upsert Product
        const productId = title.toLowerCase().replace(/\s+/g, '-').substring(0, 50);
        const { data: pData, error: pError } = await supabase
            .from('products')
            .upsert({
                platform_product_id: productId,
                title: title,
                primary_image_url: image,
                source_url: url || ''
            }, { onConflict: 'platform_product_id' })
            .select()
            .single();

        if (pError || !pData) throw pError || new Error('Failed to upsert product');

        // 2. Upsert Variant
        const { data: vData, error: vError } = await supabase
            .from('variants')
            .upsert({
                product_id: pData.id,
                platform_variant_id: 'default',
                price: typeof price === 'string' ? parseFloat(price.replace(/[^0-9.-]+/g, "")) : price,
                image_url: image
            }, { onConflict: 'platform_variant_id' })
            .select()
            .single();

        if (vError || !vData) throw vError || new Error('Failed to upsert variant');

        // 3. Get/Create Active Dressing Room
        let { data: drData } = await supabase
            .from('dressing_rooms')
            .select('id')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .single();

        if (!drData) {
            const { data: newDr } = await supabase
                .from('dressing_rooms')
                .insert({ user_id: user.id })
                .select()
                .single();
            drData = newDr;
        }

        if (!drData) throw new Error('Failed to secure dressing room');

        // 4. Add Item
        const { error: itemError } = await supabase
            .from('dressing_room_items')
            .insert({
                dressing_room_id: drData.id,
                product_id: pData.id,
                variant_id: vData.id
            });

        if (itemError) throw itemError;

        return NextResponse.json({ success: true, item: pData }, { headers: corsHeaders });

    } catch (err: any) {
        console.error('[DressingRoomAdd]', err);
        return NextResponse.json({ error: err.message }, { status: 500, headers: corsHeaders });
    }
}
