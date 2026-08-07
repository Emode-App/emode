import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { requireServiceRoleKey } from '../../../../lib/supabase/require-key';
import { PLAN_CONFIG } from '../../../../lib/stripe-plan-config';

// Lazy for the same reason as the checkout route: `next build` imports this
// module to collect page data, and a module-scope `new Stripe(undefined)`
// would throw and fail the build.
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

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export async function POST(request: Request) {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
        event = stripe().webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (err: any) {
        console.error('[Stripe Webhook] Signature verification failed:', err.message);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const { planId, shopDomain, platform, marketplaceAccess, userId } = session.metadata || {};

                if (!planId) break;

                const planConfig = PLAN_CONFIG[planId];
                const limits = planConfig
                    ? {
                        dailyLimit: planConfig.dailyLimit,
                        overageDaily: planConfig.overageDaily,
                        unlimited: planConfig.unlimited,
                    }
                    : { dailyLimit: 5, overageDaily: 0, unlimited: false };
                const stripeCustomerId = session.customer as string;

                // ── Consumer plan: attach the entitlement directly to the buyer's
                // Supabase user id. No merchant/shop is involved (e.g. Chrome extension).
                if (planConfig?.subjectType === 'user') {
                    if (!userId) {
                        console.error('[Stripe Webhook] Consumer checkout completed with no userId in metadata — cannot grant entitlement.');
                        break;
                    }

                    await supabase.from('entitlements').insert({
                        subject_type: 'user',
                        subject_id: userId,
                        plan: planId,
                        daily_generation_limit: limits.dailyLimit,
                        overage_daily: limits.overageDaily ?? 0,
                        unlimited: limits.unlimited,
                        renews_at: session.mode === 'subscription'
                            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                            : null,
                    });

                    console.log(`[Stripe Webhook] Consumer checkout completed: plan=${planId}, user=${userId}`);
                    break;
                }

                // ── Merchant plan (existing B2B flow)
                const customerEmail = session.customer_details?.email || session.customer_email;

                // Link the merchant to the buyer's emode account: prefer the userId the
                // checkout was initiated with (deterministic); fall back to matching the
                // Stripe email against Supabase auth users.
                // Only the userId the checkout actually carried. There used to
                // be a fallback here that listed every auth user and matched the
                // Stripe email, which handed the purchase to whichever account
                // happened to share an address with the payment method.
                //
                // Wallets make that the wrong guess. Link, Apple Pay and Google
                // Pay fill the email in themselves, so someone who already has a
                // personal account and is buying for their business had the
                // store attached to the personal one, silently, before they had
                // even finished signing up — and nothing could move it
                // afterwards, because ownership is deliberately one-way.
                //
                // Leaving it null loses nothing. getMerchantForUser() already
                // claims an unowned merchant whose shop_domain matches the
                // login email, so paying and signing in with the same address
                // still resolves on the first visit. What changes is that a
                // different address is now also possible, through
                // /api/merchant/claim and the checkout session. The decision
                // moves to the buyer instead of being made by their wallet.
                const ownerUserId: string | null = userId || null;

                // Generate brand slug from shop domain or email
                const shopId = shopDomain || customerEmail || session.id;
                const brandSlug = slugify(shopId.replace(/@.*$/, '').replace(/\..*$/, ''));

                // 1. Upsert merchant with all identity fields
                const { data: merchant } = await supabase
                    .from('merchants')
                    .upsert(
                        {
                            shop_domain: shopId,
                            platform: (platform as 'shopify' | 'widget') || 'widget',
                            plan: planId,
                            stripe_customer_id: stripeCustomerId || null,
                            owner_user_id: ownerUserId,
                            brand_name: shopId.split('@')[0].split('.')[0],
                            brand_slug: brandSlug,
                        },
                        { onConflict: 'shop_domain' }
                    )
                    .select()
                    .single();

                if (merchant) {
                    // 2. Create entitlement
                    await supabase.from('entitlements').insert({
                        subject_type: 'merchant',
                        subject_id: merchant.id,
                        plan: planId,
                        daily_generation_limit: limits.dailyLimit,
                        overage_daily: limits.overageDaily ?? 0,
                        unlimited: limits.unlimited,
                        renews_at: session.mode === 'subscription'
                            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                            : null,
                    });

                    // 3. Record installation
                    await supabase.from('merchant_installations').insert({
                        merchant_id: merchant.id,
                    });

                    // 4. If plan includes marketplace, mark existing products as visible
                    if (marketplaceAccess === 'true' || planConfig?.marketplaceAccess) {
                        await supabase
                            .from('products')
                            .update({ marketplace_visible: true })
                            .eq('merchant_id', merchant.id);
                    }
                }

                console.log(`[Stripe Webhook] Checkout completed: plan=${planId}, merchant=${merchant?.id}, email=${customerEmail}`);
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                const stripeCustomerId = subscription.customer as string;
                const subUserId = subscription.metadata?.userId;

                // Consumer plan: revoke the user's own entitlement directly (no merchant involved)
                if (subUserId) {
                    await supabase
                        .from('entitlements')
                        .delete()
                        .eq('subject_id', subUserId)
                        .eq('subject_type', 'user');
                    console.log(`[Stripe Webhook] Consumer subscription cancelled: user=${subUserId}, entitlement revoked`);
                    break;
                }

                // Find merchant by stripe_customer_id
                const { data: merchant } = await supabase
                    .from('merchants')
                    .select('id')
                    .eq('stripe_customer_id', stripeCustomerId)
                    .single();

                if (merchant) {
                    // Revoke entitlements
                    await supabase
                        .from('entitlements')
                        .delete()
                        .eq('subject_id', merchant.id)
                        .eq('subject_type', 'merchant');

                    // Downgrade plan
                    await supabase
                        .from('merchants')
                        .update({ plan: 'cancelled' })
                        .eq('id', merchant.id);

                    // Hide products from marketplace
                    await supabase
                        .from('products')
                        .update({ marketplace_visible: false })
                        .eq('merchant_id', merchant.id);

                    console.log(`[Stripe Webhook] Subscription cancelled: merchant=${merchant.id}, entitlements revoked`);
                } else {
                    console.warn(`[Stripe Webhook] Subscription cancelled but no merchant found for customer=${stripeCustomerId}`);
                }
                break;
            }

            /**
             * A failed payment is not a cancellation.
             *
             * This used to write a console line and nothing else, so a merchant
             * whose card expired kept full service indefinitely and nobody found
             * out until someone happened to read the Stripe dashboard.
             *
             * The opposite reflex is worse. Cards fail for expiries and bank
             * hiccups constantly, and switching off a paying merchant's
             * storefront widget over one declined charge breaks THEIR customers'
             * checkout, not ours — the blast radius of a false positive here
             * lands on someone who did nothing wrong.
             *
             * Stripe already models the middle: it retries across a dunning
             * window and reports the last attempt by leaving next_payment_attempt
             * null. So mark the state, keep serving, and only revoke once Stripe
             * itself has given up.
             */
            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice;
                const stripeCustomerId = invoice.customer as string;
                // Null means Stripe has exhausted its retries — this was the
                // last attempt, not another one in a sequence.
                const willRetry = !!invoice.next_payment_attempt;

                const { data: merchant } = await supabase
                    .from('merchants')
                    .select('id, dunning_since')
                    .eq('stripe_customer_id', stripeCustomerId)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (!merchant) {
                    console.warn(`[Stripe Webhook] Payment failed but no merchant for customer=${stripeCustomerId}`);
                    break;
                }

                await supabase
                    .from('merchants')
                    .update({
                        payment_state: 'past_due',
                        // Preserved across retries so the dashboard can say how
                        // long this has been going on, not merely that it is.
                        dunning_since: merchant.dunning_since || new Date().toISOString(),
                        last_payment_failure: new Date().toISOString(),
                    })
                    .eq('id', merchant.id);

                if (willRetry) {
                    console.warn(
                        `[Stripe Webhook] Payment failed, Stripe will retry: merchant=${merchant.id}, ` +
                        `amount=${invoice.amount_due}, next=${new Date(invoice.next_payment_attempt * 1000).toISOString()}`
                    );
                    break;
                }

                // Final attempt. Same revocation as a cancellation — the
                // subscription is not being paid for and will not be.
                await supabase
                    .from('entitlements')
                    .delete()
                    .eq('subject_id', merchant.id)
                    .eq('subject_type', 'merchant');

                await supabase
                    .from('products')
                    .update({ marketplace_visible: false })
                    .eq('merchant_id', merchant.id);

                console.error(
                    `[Stripe Webhook] Payment failed finally, entitlements revoked: merchant=${merchant.id}`
                );
                break;
            }

            /**
             * Recovery. Without this a merchant whose retry succeeded stays
             * flagged past_due forever, which is a support ticket from someone
             * who has already paid.
             */
            case 'invoice.payment_succeeded': {
                const invoice = event.data.object as Stripe.Invoice;
                const stripeCustomerId = invoice.customer as string;

                const { data: merchant } = await supabase
                    .from('merchants')
                    .select('id, payment_state')
                    .eq('stripe_customer_id', stripeCustomerId)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (merchant?.payment_state) {
                    await supabase
                        .from('merchants')
                        .update({ payment_state: null, dunning_since: null })
                        .eq('id', merchant.id);
                    console.log(`[Stripe Webhook] Payment recovered: merchant=${merchant.id}`);
                }
                break;
            }

            default:
                console.log(`[Stripe Webhook] Unhandled event: ${event.type}`);
        }

        return NextResponse.json({ received: true });
    } catch (error: any) {
        console.error('[Stripe Webhook] Processing error:', error);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}
