import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { requireServiceRoleKey } from '../../../../lib/supabase/require-key';

// Constructed on first request, not at module load: `next build` imports every
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

/**
 * Stripe's customer portal: manage payment method, see invoices, cancel.
 *
 * Cancelling had no self-serve path at all — a merchant who wanted out had to
 * email and wait for a person. That is a bad experience on its own, and in a
 * growing number of places it is also not lawful: if signing up takes two
 * clicks, cancelling cannot take an email and a wait.
 *
 * Stripe's portal is the right answer rather than a bespoke cancel button. It
 * handles proration, dunning, invoices and payment-method updates, and the
 * cancellation flows back through the webhook we already handle — so entitlement
 * revocation stays on one path instead of two that can disagree.
 */
export async function POST(request: Request) {
    try {
        const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
        if (!token) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });

        const { data: { user } } = await supabase.auth.getUser(token);
        if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });

        const { data: owned } = await supabase
            .from('merchants')
            .select('id, stripe_customer_id, platform')
            .eq('owner_user_id', user.id)
            .order('created_at', { ascending: false });

        const merchant = owned?.[0];
        if (!merchant) return NextResponse.json({ error: 'No store found.' }, { status: 404 });

        // Shopify bills through Shopify, not Stripe. Sending a Shopify merchant
        // to a Stripe portal that knows nothing about their subscription would
        // be worse than telling them where to go.
        if (merchant.platform === 'shopify') {
            return NextResponse.json(
                {
                    error: 'Your subscription is billed by Shopify. Manage it in your Shopify admin under Settings → Apps and sales channels.',
                    shopify: true,
                },
                { status: 409 }
            );
        }

        if (!merchant.stripe_customer_id) {
            return NextResponse.json(
                { error: 'No billing account found. If you redeemed a lifetime code there is nothing to cancel.' },
                { status: 404 }
            );
        }

        const origin = request.headers.get('origin') || 'https://www.emode.style';

        const session = await stripe().billingPortal.sessions.create({
            customer: merchant.stripe_customer_id,
            return_url: `${origin}/admin/settings`,
        });

        return NextResponse.json({ url: session.url });
    } catch (err: any) {
        console.error('[API/StripePortal]', err?.message || err);
        return NextResponse.json(
            { error: err?.message || 'Could not open billing.' },
            { status: 500 }
        );
    }
}
