#!/usr/bin/env node
/**
 * Revoke a refunded AppSumo code and re-settle the buyer's tier.
 *
 *   node scripts/revoke-appsumo-code.mjs --code EMODE-XXXX-XXXX-XXXX
 *   node scripts/revoke-appsumo-code.mjs --code ... --note "AppSumo refund #123"
 *
 * AppSumo lets buyers refund for 60 days, and a refunded code has to stop
 * granting anything. Revoking alone does not do that: the tier is computed at
 * redemption time, so without this the entitlement would sit at the old level
 * until the buyer happened to redeem another code — which someone who just
 * refunded will never do.
 *
 * So revocation and recomputation are the same operation. Downgrade rather than
 * delete when codes remain: a buyer who refunds one of three has paid for two
 * and should land on Pro, not on nothing.
 */

import { createClient } from '@supabase/supabase-js';

const TIER_PLANS = ['lifetime_starter', 'lifetime_pro', 'lifetime_founder'];
const LIMITS = {
    lifetime_starter: { dailyLimit: 50, unlimited: false, marketplace: false },
    lifetime_pro: { dailyLimit: 200, unlimited: false, marketplace: true },
    lifetime_founder: { dailyLimit: 0, unlimited: true, marketplace: true },
};

function arg(name, fallback) {
    const i = process.argv.indexOf(`--${name}`);
    return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function normalise(raw) {
    const cleaned = String(raw || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
    const body = cleaned.replace(/^EM[O0]DE/, '');
    return 'EMODE' + body.replace(/I/g, '1').replace(/L/g, '1').replace(/O/g, '0').replace(/U/g, 'V');
}

const code = normalise(arg('code', ''));
const note = arg('note', 'Refunded');

if (code.length < 8) {
    console.error('Usage: --code EMODE-XXXX-XXXX-XXXX [--note "reason"]');
    process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
    console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
    process.exit(1);
}
const supabase = createClient(url, key);

// Wrapped so the early exits can return rather than call process.exit while
// the Supabase client still holds open handles - which aborts the process on
// Windows with a libuv assertion instead of exiting cleanly.
async function main() {
const { data: row } = await supabase
    .from('appsumo_codes')
    .select('code, status, redeemed_by, merchant_id')
    .eq('code', code)
    .maybeSingle();

if (!row) {
    console.error(`No such code: ${code}`);
    return 1;
}
if (row.status === 'revoked') {
    console.log(`${code} is already revoked. Nothing to do.`);
    return 0;
}

const { redeemed_by: userId, merchant_id: merchantId } = row;

await supabase
    .from('appsumo_codes')
    .update({ status: 'revoked', revoked_at: new Date().toISOString(), note })
    .eq('code', code);

console.log(`Revoked ${code}.`);

if (!userId) {
    console.log('It had never been redeemed, so no entitlement to re-settle.');
    return 0;
}

const { count } = await supabase
    .from('appsumo_codes')
    .select('code', { count: 'exact', head: true })
    .eq('redeemed_by', userId)
    .eq('status', 'redeemed');

const remaining = count || 0;
const plan = remaining >= 1 ? TIER_PLANS[Math.min(remaining, TIER_PLANS.length) - 1] : null;

if (!merchantId) {
    console.log(`User now holds ${remaining} codes; no merchant was attached.`);
    return 0;
}

await supabase
    .from('entitlements')
    .delete()
    .eq('subject_type', 'merchant')
    .eq('subject_id', merchantId);

if (plan) {
    const limits = LIMITS[plan];
    await supabase.from('entitlements').insert({
        subject_type: 'merchant',
        subject_id: merchantId,
        plan,
        daily_generation_limit: limits.dailyLimit,
        unlimited: limits.unlimited,
        renews_at: null,
    });
    await supabase.from('merchants').update({ plan }).eq('id', merchantId);

    // Marketplace visibility is a grant, not a default. Losing the tier that
    // included it has to pull the listings back down, or a refunded buyer keeps
    // a paid placement indefinitely.
    if (!limits.marketplace) {
        await supabase.from('products').update({ marketplace_visible: false }).eq('merchant_id', merchantId);
    }
    console.log(`${remaining} codes remain -> ${plan}.`);
} else {
    await supabase.from('merchants').update({ plan: 'free' }).eq('id', merchantId);
    await supabase.from('products').update({ marketplace_visible: false }).eq('merchant_id', merchantId);
    console.log('No codes remain -> entitlement removed, listings unpublished.');
}
    return 0;
}

process.exitCode = await main();
