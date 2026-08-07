import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireServiceRoleKey } from '../../../lib/supabase/require-key';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    requireServiceRoleKey()
);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Outbound click from the marketplace to a merchant's store.
 *
 * The marketplace links straight out and emode is not a party to the sale, so
 * there is no transaction to observe. What there IS, is the click — and without
 * recording it there is no way to say the marketplace sent anybody anywhere.
 * That matters twice: a merchant paying for a marketplace listing deserves to
 * see what it returned, and no future arrangement based on referred sales can
 * exist without attribution underneath it.
 *
 * The destination is read from the database, never from the query string. Taking
 * a URL from the caller and redirecting to it turns this into an open redirect —
 * a link that begins with emode.style and ends somewhere else entirely, which is
 * exactly the shape a phishing link wants.
 */
export async function GET(request: Request) {
    const url = new URL(request.url);
    const productId = url.searchParams.get('p') || '';
    const visitorId = (url.searchParams.get('v') || '').slice(0, 64);
    const home = new URL('/marketplace', url.origin);

    if (!UUID_RE.test(productId)) return NextResponse.redirect(home);

    const { data: product } = await supabase
        .from('products')
        .select('id, merchant_id, buy_url, marketplace_visible')
        .eq('id', productId)
        .maybeSingle();

    // Only publish a redirect for something actually listed. Otherwise an
    // unlisted or deleted product's URL would still be reachable through us.
    if (!product?.marketplace_visible || !product.merchant_id) {
        return NextResponse.redirect(home);
    }

    let destination = product.buy_url;
    if (!destination) {
        const { data: variant } = await supabase
            .from('variants')
            .select('buy_url')
            .eq('product_id', productId)
            .not('buy_url', 'is', null)
            .limit(1)
            .maybeSingle();
        destination = variant?.buy_url || null;
    }

    if (!destination) return NextResponse.redirect(home);

    // Even from our own database, only http(s) leaves here. A javascript: or
    // data: URL stored by a compromised or careless write would otherwise
    // execute on click.
    let target: URL;
    try {
        target = new URL(destination);
        if (target.protocol !== 'http:' && target.protocol !== 'https:') {
            return NextResponse.redirect(home);
        }
    } catch {
        return NextResponse.redirect(home);
    }

    // Recorded before redirecting, but never allowed to delay it: a shopper who
    // clicked through should not wait on our bookkeeping.
    supabase
        .from('marketplace_clicks')
        .insert({
            merchant_id: product.merchant_id,
            product_id: product.id,
            visitor_id: visitorId || null,
            referrer: request.headers.get('referer')?.slice(0, 500) || null,
        })
        .then(({ error }) => {
            if (error) console.error('[API/Out] Click insert failed:', error.message);
        });

    return NextResponse.redirect(target.toString(), 302);
}
