// Shared plan configuration for Stripe Checkout and Webhook

export const PLAN_CONFIG: Record<string, {
    name: string;
    priceInCents: number;
    mode: 'subscription' | 'payment';
    interval?: 'month';
    /** Included in the price. The merchant never thinks about this number. */
    dailyLimit: number;
    /**
     * How far past the allowance this plan may run, billed per generation.
     *
     * Zero on lifetime and AppSumo tiers: there is no subscription to charge, so
     * for those the allowance is the ceiling. That is also why none of them say
     * "unlimited" any more — unlimited generation against a one-time payment is
     * an unbounded liability that grows with the customer's success.
     */
    overageDaily: number;
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
        dailyLimit: 500,
        overageDaily: 500,
        unlimited: false,
        marketplaceAccess: false,
        subjectType: 'merchant',
    },
    pro: {
        name: 'Pro',
        priceInCents: 7900,
        mode: 'subscription',
        interval: 'month',
        dailyLimit: 2000,
        overageDaily: 2000,
        unlimited: false,
        marketplaceAccess: true,
        subjectType: 'merchant',
    },
    growth: {
        name: 'Growth',
        priceInCents: 14900,
        mode: 'subscription',
        interval: 'month',
        dailyLimit: 5000,
        overageDaily: 5000,
        unlimited: false,
        marketplaceAccess: true,
        subjectType: 'merchant',
    },
    lifetime_starter: {
        name: 'Lifetime Starter',
        priceInCents: 29900,
        mode: 'payment',
        dailyLimit: 500,
        overageDaily: 0,
        unlimited: false,
        marketplaceAccess: false,
        subjectType: 'merchant',
    },
    lifetime_pro: {
        name: 'Lifetime Pro',
        priceInCents: 79900,
        mode: 'payment',
        dailyLimit: 2000,
        overageDaily: 0,
        unlimited: false,
        marketplaceAccess: true,
        subjectType: 'merchant',
    },
    lifetime_founder: {
        name: 'Lifetime Founder',
        priceInCents: 149900,
        mode: 'payment',
        dailyLimit: 5000,
        overageDaily: 0,
        unlimited: false,
        marketplaceAccess: true,
        subjectType: 'merchant',
    },
    chrome_unlimited: {
        name: 'Unlimited (Chrome Extension)',
        priceInCents: 500,
        mode: 'subscription',
        interval: 'month',
        // Fair use rather than literally boundless. Nobody tries on a hundred
        // garments in a day, so this is invisible to a real shopper, and it
        // stops one scripted account costing more than a $5 plan can carry.
        dailyLimit: 100,
        overageDaily: 100,
        unlimited: false,
        marketplaceAccess: false,
        subjectType: 'user',
    },
};
