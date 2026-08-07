import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireServiceRoleKey } from '../../../../lib/supabase/require-key';
import { clientIp, rateLimit } from '../../../../lib/request-guard';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    requireServiceRoleKey()
);

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

export function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * Resolve a Shopify shop domain to its merchant id.
 *
 * The modal did this itself, from the browser, with the anon key:
 *
 *     supabase.from('merchants').select('id').eq('shop_domain', shop).single()
 *
 * That stopped working the moment RLS was locked down. The only SELECT policy
 * on `merchants` is "you own it, or your JWT email matches shop_domain", and a
 * shopper on a storefront is neither — so the query matched zero rows and
 * `.single()` answered 406.
 *
 * The failure was silent and expensive. `merchantId` stayed empty, so every
 * Shopify try-on was billed against the shopper's personal free tier instead of
 * the merchant's paid entitlement, generations carried no merchant, and the
 * merchant's own analytics never saw the try-ons their customers were doing.
 * Nothing surfaced except a 406 in a console nobody had open.
 *
 * Reading it server-side is the fix rather than loosening the policy: shoppers
 * have no business holding a general read over the merchants table, and a
 * policy written to allow this lookup would allow enumerating every store.
 *
 * The id itself is not a secret — it ships in a script tag on the widget's own
 * public storefront, which is the same reasoning `by-session` uses. Rate
 * limited anyway, because enumerating shop domains to collect merchant ids is
 * the one thing this makes easier.
 */
export async function GET(request: Request) {
    const shop = (new URL(request.url).searchParams.get('shop') || '').trim().toLowerCase();

    // A myshopify domain, and nothing else. This is a service-role read, so the
    // shape of what we accept is the only thing standing between it and an
    // arbitrary lookup.
    if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)) {
        return NextResponse.json(
            { error: 'A myshopify shop domain is required.' },
            { status: 400, headers: corsHeaders }
        );
    }

    const ip = clientIp(request);
    if (!rateLimit(`by-shop:${ip}`, 60, 60_000)) {
        return NextResponse.json(
            { error: 'Too many lookups. Try again shortly.' },
            { status: 429, headers: corsHeaders }
        );
    }

    // maybeSingle, not single: a shop we have never seen is an ordinary answer
    // for a storefront that has the block but has not opened the app yet, and
    // it should not read as a server error.
    const { data, error } = await supabase
        .from('merchants')
        .select('id')
        .eq('shop_domain', shop)
        .maybeSingle();

    if (error) {
        console.error('[API/MerchantByShop]', error.message);
        return NextResponse.json(
            { error: 'Could not look up that shop.' },
            { status: 500, headers: corsHeaders }
        );
    }

    return NextResponse.json({ merchantId: data?.id ?? null }, { headers: corsHeaders });
}
