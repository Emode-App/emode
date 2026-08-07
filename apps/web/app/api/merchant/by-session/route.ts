import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { requireServiceRoleKey } from '../../../../lib/supabase/require-key';

// Constructed on first request, not at module load — `next build` imports every
// route to collect page data, and a module-scope `new Stripe(undefined)` fails
// the whole build on any host that withholds STRIPE_SECRET_KEY from the build.
let _stripe: Stripe | null = null;
function stripe(): Stripe {
    if (!_stripe) {
        const key = process.env.STRIPE_SECRET_KEY;
        if (!key) throw new Error('STRIPE_SECRET_KEY is not configured.');
        _stripe = new Stripe(key, { apiVersion: '2023-10-16' as any });
    }
    return _stripe;
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    requireServiceRoleKey()
);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Resolve the merchant belonging to a just-completed Stripe Checkout session.
 *
 * A first-time merchant has no emode account at the moment they pay — they came
 * from the pricing page, not from a signup. They land on onboarding signed out,
 * so nothing there can identify them, and the install step used to hand them a
 * snippet reading YOUR_MERCHANT_ID. That is the worst possible place to lose
 * someone: they have paid and cannot install.
 *
 * Access control is the session id itself, which only the buyer has, only right
 * after paying. Narrowed further: the session must be paid, and recent. It
 * returns the merchant's public key — the same value that ends up in a script
 * tag on their public storefront — and nothing else.
 */
export async function GET(request: Request) {
    const sessionId = new URL(request.url).searchParams.get('session_id') || '';
    if (!sessionId.startsWith('cs_')) {
        return NextResponse.json({ error: 'A checkout session id is required.' }, { status: 400 });
    }

    try {
        const session = await stripe().checkout.sessions.retrieve(sessionId);

        if (session.payment_status !== 'paid') {
            return NextResponse.json({ error: 'This checkout is not paid.' }, { status: 402 });
        }

        // A session id is a bearer token here, so do not let an old one keep
        // working. Onboarding is used minutes after payment, never days later.
        const ageMs = Date.now() - session.created * 1000;
        if (ageMs > 6 * 60 * 60 * 1000) {
            return NextResponse.json(
                { error: 'This checkout link has expired. Sign in to see your key.' },
                { status: 410 }
            );
        }

        const email = session.customer_details?.email || session.customer_email;
        if (!email) {
            return NextResponse.json({ error: 'No email on this checkout.' }, { status: 404 });
        }

        // The merchant row is written by the webhook, which is racing this page
        // load. Retry briefly rather than reporting a missing account for what is
        // usually a second of lag.
        for (let attempt = 0; attempt < 5; attempt++) {
            const { data: merchant } = await supabase
                .from('merchants')
                .select('id, brand_name')
                .eq('shop_domain', email)
                .maybeSingle();

            if (merchant) {
                return NextResponse.json({
                    merchantId: merchant.id,
                    brandName: merchant.brand_name || '',
                    email,
                });
            }
            if (attempt < 4) await sleep(1200);
        }

        return NextResponse.json(
            { error: 'Your account is still being set up. Refresh in a moment.' },
            { status: 202 }
        );
    } catch (err: any) {
        console.error('[API/MerchantBySession]', err?.message || err);
        return NextResponse.json({ error: 'Could not look up this checkout.' }, { status: 500 });
    }
}
