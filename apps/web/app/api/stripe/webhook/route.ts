import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16' as any,
});
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Plan limits matching checkout route config
const PLAN_LIMITS: Record<string, { dailyLimit: number; unlimited: boolean }> = {
    starter: { dailyLimit: 50, unlimited: false },
    pro: { dailyLimit: 200, unlimited: false },
    growth: { dailyLimit: 0, unlimited: true },
    lifetime_starter: { dailyLimit: 50, unlimited: false },
    lifetime_pro: { dailyLimit: 200, unlimited: false },
    lifetime_founder: { dailyLimit: 0, unlimited: true },
};

// Plans that include marketplace visibility
const MARKETPLACE_PLANS = ['pro', 'growth', 'lifetime_pro', 'lifetime_founder'];

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
        event = stripe.webhooks.constructEvent(
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
                const { planId, shopDomain, platform, marketplaceAccess } = session.metadata || {};

                if (!planId) break;

                const limits = PLAN_LIMITS[planId] || { dailyLimit: 5, unlimited: false };
                const customerEmail = session.customer_details?.email || session.customer_email;
                const stripeCustomerId = session.customer as string;

                // Try to find existing Supabase user by email to link
                let ownerUserId: string | null = null;
                if (customerEmail) {
                    try {
                        const { data: authData } = await supabase.auth.admin.listUsers();
                        const users = (authData as any)?.users || [];
                        const matchingUser = users.find((u: any) => u.email === customerEmail);
                        if (matchingUser) {
                            ownerUserId = matchingUser.id;
                        }
                    } catch (e) {
                        console.warn('[Stripe Webhook] Could not list auth users:', e);
                    }
                }

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
                    if (marketplaceAccess === 'true' || MARKETPLACE_PLANS.includes(planId)) {
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

            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice;
                const stripeCustomerId = invoice.customer as string;

                // Find merchant and log the failure
                const { data: merchant } = await supabase
                    .from('merchants')
                    .select('id')
                    .eq('stripe_customer_id', stripeCustomerId)
                    .single();

                if (merchant) {
                    console.error(`[Stripe Webhook] Payment failed: merchant=${merchant.id}, amount=${invoice.amount_due}`);
                    // Optionally suspend after N failures — for now just log
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
