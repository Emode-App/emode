import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16' as any,
});

// Plan configuration matching pricing.md
const PLAN_CONFIG: Record<string, {
    name: string;
    priceInCents: number;
    mode: 'subscription' | 'payment';
    interval?: 'month';
    dailyLimit: number;
    unlimited: boolean;
    marketplaceAccess: boolean;
}> = {
    starter: {
        name: 'Starter',
        priceInCents: 2900,
        mode: 'subscription',
        interval: 'month',
        dailyLimit: 50,
        unlimited: false,
        marketplaceAccess: false,
    },
    pro: {
        name: 'Pro',
        priceInCents: 7900,
        mode: 'subscription',
        interval: 'month',
        dailyLimit: 200,
        unlimited: false,
        marketplaceAccess: true,
    },
    growth: {
        name: 'Growth',
        priceInCents: 14900,
        mode: 'subscription',
        interval: 'month',
        dailyLimit: 0,
        unlimited: true,
        marketplaceAccess: true,
    },
    lifetime_starter: {
        name: 'Lifetime Starter',
        priceInCents: 29900,
        mode: 'payment',
        dailyLimit: 50,
        unlimited: false,
        marketplaceAccess: false,
    },
    lifetime_pro: {
        name: 'Lifetime Pro',
        priceInCents: 79900,
        mode: 'payment',
        dailyLimit: 200,
        unlimited: false,
        marketplaceAccess: true,
    },
    lifetime_founder: {
        name: 'Lifetime Founder',
        priceInCents: 149900,
        mode: 'payment',
        dailyLimit: 0,
        unlimited: true,
        marketplaceAccess: true,
    },
};

// Export for use by webhook
export { PLAN_CONFIG };

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
            customer_creation: 'always',
            // Require email so we can link merchant to Supabase user
            ...(planConfig.mode === 'subscription'
                ? {}
                : { customer_email: undefined }),
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
