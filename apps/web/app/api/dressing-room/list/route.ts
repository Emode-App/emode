import { createClient } from '@supabase/supabase-js';
import { requireServiceRoleKey } from '../../../../lib/supabase/require-key';
import { NextResponse } from 'next/server';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Service role client — this route is called cross-origin (e.g. from the Chrome
// extension's side panel, which has no access to the web app's session cookies/
// localStorage), so identity comes from a bearer token, not an ambient session.
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    requireServiceRoleKey()
);

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: Request) {
    try {
        const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
        }

        const { data, error } = await supabase
            .from('dressing_room_items')
            .select(`
                id,
                product:products(title, primary_image_url, buy_url),
                variant:variants(price),
                dressing_rooms!inner(user_id)
            `)
            .eq('dressing_rooms.user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const items = data.map((item: any) => ({
            id: item.id,
            title: item.product.title,
            image: item.product.primary_image_url,
            price: item.variant.price ? `$${item.variant.price}` : 'N/A',
            url: item.product.buy_url
        }));

        return NextResponse.json({ items }, { headers: corsHeaders });

    } catch (err: any) {
        console.error('[DressingRoomList]', err);
        return NextResponse.json({ error: err.message }, { status: 500, headers: corsHeaders });
    }
}
