// Shared plan configuration for Stripe Checkout and Webhook

export const PLAN_CONFIG: Record<string, {
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
