import { NextResponse } from 'next/server';
import Stripe from 'stripe';

import { PLAN_CONFIG } from '../../../../lib/stripe-plan-config';

// Constructed on first request, not at module load. `next build` imports every
// route to collect page data, so a module-scope `new Stripe(undefined)` throws
// and fails the whole build — which is what happens on any host that does not
// expose STRIPE_SECRET_KEY to the build step.
let _stripe: Stripe | null = null;
function stripe(): Stripe {
    if (!_stripe) {
        const key = process.env.STRIPE_SECRET_KEY;
        if (!key) throw new Error('STRIPE_SECRET_KEY is not configured.');
        _stripe = new Stripe(key, { apiVersion: '2023-10-16' as any });
    }
    return _stripe;
}

export async function POST(request: Request) {
    try {
        const { planId, shopDomain, platform = 'widget', userId } = await request.json();

        const planConfig = PLAN_CONFIG[planId];
        if (!planConfig) {
            return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
        }

        if (planConfig.subjectType === 'user' && !userId) {
            return NextResponse.json({ error: 'Sign in required to subscribe.' }, { status: 401 });
        }

        const origin = request.headers.get('origin') || 'http://localhost:3001';

        // Create Stripe Checkout Session
        const session = await stripe().checkout.sessions.create({
            mode: planConfig.mode,
            payment_method_types: ['card'],
            // customer_creation is only valid in payment mode; subscription mode always creates a customer
            ...(planConfig.mode === 'payment' ? { customer_creation: 'always' } : {}),
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `emodeAI ${planConfig.name}`,
                            description: `emodeAI virtual try-on — ${planConfig.name} plan`,
                        },
                        unit_amount: planConfig.priceInCents,
                        ...(planConfig.mode === 'subscription' && planConfig.interval
                            ? { recurring: { interval: planConfig.interval } }
                            : {}),
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                planId,
                shopDomain: shopDomain || '',
                platform,
                userId: userId || '',
                marketplaceAccess: planConfig.marketplaceAccess ? 'true' : 'false',
            },
            // Also stamp metadata onto the Subscription itself (session metadata is
            // NOT copied there automatically) — subscription.deleted/invoice webhooks
            // only receive the Subscription/Invoice object, not the original session,
            // so this is how we know which user/plan a cancellation belongs to.
            ...(planConfig.mode === 'subscription'
                ? { subscription_data: { metadata: { planId, userId: userId || '' } } }
                : {}),
            // Merchant plans land in onboarding; consumer plans have no merchant flow.
            success_url: planConfig.subjectType === 'user'
                ? `${origin}/?checkout=success&plan=${planId}`
                : `${origin}/admin/onboarding?checkout=success&plan=${planId}`,
            cancel_url: `${origin}/?checkout=cancelled`,
        });

        return NextResponse.json({ url: session.url });
    } catch (error: any) {
        console.error('[Stripe Checkout]', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create checkout session' },
            { status: 500 }
        );
    }
}
