import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';

export const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16' as any,
});

export const PLANS = {
    STARTER: 'starter',
    PRO: 'pro',
    GROWTH: 'growth',
    LIFETIME_STARTER: 'lifetime_starter',
    LIFETIME_PRO: 'lifetime_pro',
    LIFETIME_FOUNDER: 'lifetime_founder',
    CONSUMER_PRO: 'consumer_pro',
};
