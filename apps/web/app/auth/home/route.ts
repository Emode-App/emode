import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { getMerchantForUser } from '../../admin/admin-util';

/**
 * Where signing in should take you.
 *
 * Everything used to redirect to /admin, which assumes every account is a brand.
 * Plenty are not: people sign up for the closet, the Chrome extension, or to
 * browse the marketplace. Sending a shopper to a merchant dashboard was already
 * odd, and once that page started showing a plan picker it actively told them to
 * buy a $29/month B2B subscription they have no use for.
 *
 * Resolved server-side because owning a merchant is not something the browser
 * can be trusted to know, and getMerchantForUser also claims an unowned merchant
 * on first sign-in — which is exactly the moment to do it.
 */
export async function GET(request: Request) {
    const origin = new URL(request.url).origin;

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(new URL('/login', origin));

    const merchant = await getMerchantForUser();
    if (merchant) return NextResponse.redirect(new URL('/admin', origin));

    // No merchant yet. A shopper and a merchant who has not connected a store
    // are indistinguishable at this point, so the closet stays the default and
    // carries a link to the dashboard, where /admin now explains how to connect
    // one rather than presenting a bare paywall.
    return NextResponse.redirect(new URL('/closet', origin));
}
