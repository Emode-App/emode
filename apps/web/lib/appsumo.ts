import { PLAN_CONFIG } from './stripe-plan-config';

/**
 * AppSumo lifetime deals, and what a code is worth.
 *
 * AppSumo buyers STACK codes: one buys the entry tier, a second upgrades, a
 * third upgrades again. So a code is not a plan — it is one unit of entitlement,
 * and the plan is a function of how many a person holds.
 *
 * Deriving the plan from a count rather than storing it on the code is what
 * makes refunds work. AppSumo lets buyers refund for 60 days; revoking a code
 * lowers the count, the tier is recomputed, and the merchant lands on the right
 * plan with no separate downgrade path to get wrong.
 */

/** Codes redeemed → plan. Index 0 is one code. */
const TIER_PLANS = ['lifetime_starter', 'lifetime_pro', 'lifetime_founder'] as const;

export type AppSumoPlan = (typeof TIER_PLANS)[number];

export function planForCodeCount(count: number): AppSumoPlan | null {
    if (count < 1) return null;
    // Beyond the top tier the extra codes buy nothing more. AppSumo caps stacking
    // at the highest tier, and a buyer who somehow redeems four should land on the
    // best plan rather than on undefined.
    return TIER_PLANS[Math.min(count, TIER_PLANS.length) - 1];
}

export function limitsForPlan(plan: AppSumoPlan) {
    const config = PLAN_CONFIG[plan];
    return {
        dailyLimit: config?.dailyLimit ?? 0,
        unlimited: config?.unlimited ?? false,
        marketplaceAccess: config?.marketplaceAccess ?? false,
        name: config?.name ?? plan,
    };
}

export function tierLabel(count: number): string {
    const plan = planForCodeCount(count);
    if (!plan) return 'No codes redeemed';
    return `${limitsForPlan(plan).name} · ${count} code${count === 1 ? '' : 's'}`;
}

/**
 * Crockford base32: no I, L, O or U, so a code read off a screen or a printed
 * insert cannot be mistyped into a different valid code — and cannot
 * accidentally spell anything.
 */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** Normalise user input before lookup. */
export function normaliseCode(raw: string): string {
    return String(raw || '')
        .toUpperCase()
        .replace(/[^0-9A-Z]/g, '')
        // The four characters the alphabet omits are exactly the four people
        // confuse, so map them to what the writer meant rather than rejecting.
        .replace(/I/g, '1')
        .replace(/L/g, '1')
        .replace(/O/g, '0')
        .replace(/U/g, 'V');
}

/** Group into readable quads: EMODEXXXXXXXXXXXX -> EMODE-XXXX-XXXX-XXXX */
export function formatCode(normalised: string): string {
    const body = normalised.replace(/^EMODE/, '');
    const groups = body.match(/.{1,4}/g) || [];
    return ['EMODE', ...groups].join('-');
}

export { ALPHABET, TIER_PLANS };
