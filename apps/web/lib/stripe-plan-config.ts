// Shared plan configuration for Stripe Checkout and Webhook

export const PLAN_CONFIG: Record<string, {
    name: string;
    priceInCents: number;
    mode: 'subscription' | 'payment';
    interval?: 'month';
    dailyLimit: number;
    unlimited: boolean;
    marketplaceAccess: boolean;
    // 'merchant' plans (default) upsert a merchants row keyed by shop domain.
    // 'user' plans attach the entitlement directly to the buyer's Supabase user id
    // instead — there is no merchant/shop involved (e.g. the Chrome extension).
    subjectType: 'merchant' | 'user';
}> = {
    starter: {
        name: 'Starter',
        priceInCents: 2900,
        mode: 'subscription',
        interval: 'month',
        dailyLimit: 50,
        unlimited: false,
        marketplaceAccess: false,
        subjectType: 'merchant',
    },
    pro: {
        name: 'Pro',
        priceInCents: 7900,
        mode: 'subscription',
        interval: 'month',
        dailyLimit: 200,
        unlimited: false,
        marketplaceAccess: true,
        subjectType: 'merchant',
    },
    growth: {
        name: 'Growth',
        priceInCents: 14900,
        mode: 'subscription',
        interval: 'month',
        dailyLimit: 0,
        unlimited: true,
        marketplaceAccess: true,
        subjectType: 'merchant',
    },
    lifetime_starter: {
        name: 'Lifetime Starter',
        priceInCents: 29900,
        mode: 'payment',
        dailyLimit: 50,
        unlimited: false,
        marketplaceAccess: false,
        subjectType: 'merchant',
    },
    lifetime_pro: {
        name: 'Lifetime Pro',
        priceInCents: 79900,
        mode: 'payment',
        dailyLimit: 200,
        unlimited: false,
        marketplaceAccess: true,
        subjectType: 'merchant',
    },
    lifetime_founder: {
        name: 'Lifetime Founder',
        priceInCents: 149900,
        mode: 'payment',
        dailyLimit: 0,
        unlimited: true,
        marketplaceAccess: true,
        subjectType: 'merchant',
    },
    chrome_unlimited: {
        name: 'Unlimited (Chrome Extension)',
        priceInCents: 500,
        mode: 'subscription',
        interval: 'month',
        dailyLimit: 0,
        unlimited: true,
        marketplaceAccess: false,
        subjectType: 'user',
    },
};
