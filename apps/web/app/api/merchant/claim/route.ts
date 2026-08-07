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

/**
 * Attach a just-paid purchase to whichever account the buyer actually signs up
 * with.
 *
 * Until this existed, the payment email *was* the account. The webhook wrote it
 * to `shop_domain`, and `getMerchantForUser()` found the merchant by matching a
 * login email against that column — so signing up with any other address left
 * the purchase orphaned, owned by nobody and findable by no one. The buyer had
 * paid and had nothing.
 *
 * That is not an edge case, because of how wallets work. Link, Apple Pay and
 * Google Pay fill the email in themselves, from whatever address the wallet was
 * set up with — routinely a personal one. Somebody buying for their business
 * has every reason to want the account under a work address, and would not
 * necessarily even notice which email the wallet used. Onboarding told them to
 * "sign in with the email you paid with", which is an instruction to work
 * around the software rather than a feature.
 *
 * ## Why a session id is enough to prove this
 *
 * Same model as `by-session`, which already hands out the merchant key on this
 * basis. The id is only ever given to the buyer, in a redirect immediately
 * after payment. On top of that:
 *
 *   - the session must be genuinely paid,
 *   - it must be recent, so a stale id in someone's history is not a key,
 *   - and the merchant must currently be unowned.
 *
 * That last one is the important one. Claiming can only ever fill a null, never
 * move ownership, so a leaked id cannot take a store off the person who already
 * has it. It is the same guard `getMerchantForUser()` uses when it claims by
 * email, for the same reason.
 */
export async function POST(request: Request) {
    try {
        const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
        if (!token) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });

        const { data: { user } } = await supabase.auth.getUser(token);
        if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });

        const { sessionId } = await request.json().catch(() => ({ sessionId: '' }));
        if (!sessionId || !String(sessionId).startsWith('cs_')) {
            return NextResponse.json({ error: 'A checkout session id is required.' }, { status: 400 });
        }

        const session = await stripe().checkout.sessions.retrieve(String(sessionId));

        if (session.payment_status !== 'paid') {
            return NextResponse.json({ error: 'This checkout is not paid.' }, { status: 402 });
        }

        // A session id is a bearer token here, so do not let an old one keep
        // working. This runs minutes after payment, never days later.
        const ageMs = Date.now() - session.created * 1000;
        if (ageMs > 6 * 60 * 60 * 1000) {
            return NextResponse.json(
                { error: 'This checkout link has expired. Contact support to link your purchase.' },
                { status: 410 }
            );
        }

        const paidEmail = session.customer_details?.email || session.customer_email;
        if (!paidEmail) {
            return NextResponse.json({ error: 'No email on this checkout.' }, { status: 404 });
        }

        // The webhook keys the merchant on the paid email. That is the row this
        // session is entitled to claim, whatever the buyer's account email is.
        const { data: merchant } = await supabase
            .from('merchants')
            .select('id, owner_user_id')
            .eq('shop_domain', paidEmail)
            .maybeSingle();

        if (!merchant) {
            // The webhook is racing this. Saying "not yet" is honest and lets
            // the caller retry, where "no such purchase" would send someone to
            // support over a second of lag.
            return NextResponse.json(
                { error: 'Your purchase is still being set up. Try again in a moment.' },
                { status: 202 }
            );
        }

        if (merchant.owner_user_id) {
            // Already theirs: report success so a double-submit or a refresh is
            // harmless rather than alarming.
            if (merchant.owner_user_id === user.id) {
                return NextResponse.json({ merchantId: merchant.id, claimed: false, alreadyYours: true });
            }
            return NextResponse.json(
                { error: 'This purchase is already linked to another account.' },
                { status: 409 }
            );
        }

        // `.is('owner_user_id', null)` makes the write itself the check, so two
        // simultaneous claims cannot both succeed.
        const { data: updated } = await supabase
            .from('merchants')
            .update({ owner_user_id: user.id })
            .eq('id', merchant.id)
            .is('owner_user_id', null)
            .select('id')
            .maybeSingle();

        if (!updated) {
            return NextResponse.json(
                { error: 'This purchase is already linked to another account.' },
                { status: 409 }
            );
        }

        console.log(`[API/MerchantClaim] merchant=${merchant.id} claimed by user=${user.id} (paid as ${paidEmail})`);
        return NextResponse.json({ merchantId: merchant.id, claimed: true });
    } catch (err: any) {
        console.error('[API/MerchantClaim]', err?.message || err);
        return NextResponse.json({ error: 'Could not link this purchase.' }, { status: 500 });
    }
}
