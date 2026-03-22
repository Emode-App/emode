import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET() {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
        }

        const { data, error } = await supabase
            .from('dressing_room_items')
            .select(`
                id,
                product:products(title, primary_image_url, source_url),
                variant:variants(price)
            `)
            .eq('dressing_rooms(user_id)', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const items = data.map((item: any) => ({
            id: item.id,
            title: item.product.title,
            image: item.product.primary_image_url,
            price: item.variant.price ? `$${item.variant.price}` : 'N/A',
            url: item.product.source_url
        }));

        return NextResponse.json({ items }, { headers: corsHeaders });

    } catch (err: any) {
        console.error('[DressingRoomList]', err);
        return NextResponse.json({ error: err.message }, { status: 500, headers: corsHeaders });
    }
}
