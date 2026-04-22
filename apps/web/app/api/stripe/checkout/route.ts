import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16' as any,
});

import { PLAN_CONFIG } from '../../../../lib/stripe-plan-config';

export async function POST(request: Request) {
    try {
        const { planId, shopDomain, platform = 'widget' } = await request.json();

        const planConfig = PLAN_CONFIG[planId];
        if (!planConfig) {
            return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
        }

        const origin = request.headers.get('origin') || 'http://localhost:3001';

        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
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
                marketplaceAccess: planConfig.marketplaceAccess ? 'true' : 'false',
            },
            // Redirect to onboarding after successful checkout
            success_url: `${origin}/admin/onboarding?checkout=success&plan=${planId}`,
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
