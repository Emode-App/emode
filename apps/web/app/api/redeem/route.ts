import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireServiceRoleKey } from '../../../lib/supabase/require-key';
import { normaliseCode, planForCodeCount, limitsForPlan, tierLabel } from '../../../lib/appsumo';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    requireServiceRoleKey()
);

/**
 * Redeem an AppSumo code.
 *
 * Requires a signed-in user, because a code has to attach to somebody — an
 * anonymous redemption would burn the code with no way to give anyone the plan.
 *
 * Codes stack: the plan is recomputed from the user's total redeemed count each
 * time, rather than being written onto the code. That is what makes AppSumo's
 * 60-day refund window survivable — revoking a code lowers the count and the
 * tier follows, with no separate downgrade path to get wrong.
 */
export async function POST(request: Request) {
    try {
        const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
        if (!token) {
            return NextResponse.json({ error: 'Sign in to redeem a code.' }, { status: 401 });
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return NextResponse.json({ error: 'Sign in to redeem a code.' }, { status: 401 });
        }

        const body = await request.json();
        const code = normaliseCode(body.code);
        if (code.length < 8) {
            return NextResponse.json({ error: 'That code doesn’t look right.' }, { status: 400 });
        }

        // Claim the code and mark it in one statement.
        //
        // The WHERE clause carries the guard, so two requests racing on the same
        // code cannot both succeed: Postgres serialises them and the loser
        // matches no row. Reading the row first and then updating it would leave
        // a window where one code grants two entitlements — which on a deal
        // where codes ARE the product is the whole failure mode worth designing
        // against.
        const { data: claimed, error: claimError } = await supabase
            .from('appsumo_codes')
            .update({
                status: 'redeemed',
                redeemed_by: user.id,
                redeemed_at: new Date().toISOString(),
            })
            .eq('code', code)
            .eq('status', 'unredeemed')
            .select('code')
            .maybeSingle();

        if (claimError) {
            console.error('[API/Redeem] Claim failed:', claimError.message);
            return NextResponse.json({ error: 'Could not redeem that code. Try again?' }, { status: 500 });
        }

        if (!claimed) {
            // Distinguish the two cases a buyer can actually act on: their own
            // already-redeemed code (nothing to do, reassure them) versus one
            // that is unknown or belongs to someone else.
            const { data: existing } = await supabase
                .from('appsumo_codes')
                .select('status, redeemed_by')
                .eq('code', code)
                .maybeSingle();

            if (existing?.status === 'redeemed' && existing.redeemed_by === user.id) {
                return NextResponse.json(
                    { error: 'You’ve already redeemed that code.' },
                    { status: 409 }
                );
            }
            if (existing?.status === 'redeemed') {
                return NextResponse.json(
                    { error: 'That code has already been redeemed on another account.' },
                    { status: 409 }
                );
            }
            if (existing?.status === 'revoked') {
                return NextResponse.json(
                    { error: 'That code was refunded and is no longer valid.' },
                    { status: 409 }
                );
            }
            return NextResponse.json({ error: 'We don’t recognise that code.' }, { status: 404 });
        }

        // Everything below is recovery-safe: the code is already claimed, so a
        // failure here must not lose it. Each step is idempotent and the user can
        // re-run redemption of any other code to have the tier recomputed.
        const { count } = await supabase
            .from('appsumo_codes')
            .select('code', { count: 'exact', head: true })
            .eq('redeemed_by', user.id)
            .eq('status', 'redeemed');

        const codeCount = count || 1;
        const plan = planForCodeCount(codeCount)!;
        const limits = limitsForPlan(plan);

        // A redeemer may have no merchant yet — they came from AppSumo, not from
        // checkout. Keyed on email, matching how the Stripe webhook creates one.
        let merchantId: string | null = null;

        const { data: owned } = await supabase
            .from('merchants')
            .select('id')
            .eq('owner_user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1);

        merchantId = owned?.[0]?.id || null;

        if (!merchantId) {
            const { data: upserted, error: merchantError } = await supabase
                .from('merchants')
                .upsert(
                    {
                        shop_domain: user.email || `appsumo-${user.id}`,
                        platform: 'widget',
                        plan,
                        owner_user_id: user.id,
                        brand_name: (user.email || 'Your store').split('@')[0],
                    },
                    { onConflict: 'shop_domain' }
                )
                .select('id')
                .single();

            if (merchantError || !upserted) {
                console.error('[API/Redeem] Merchant creation failed:', merchantError?.message);
                return NextResponse.json(
                    { error: 'Code redeemed, but we could not set up your store. Contact support.' },
                    { status: 500 }
                );
            }
            merchantId = upserted.id;
        } else {
            await supabase.from('merchants').update({ plan }).eq('id', merchantId);
        }

        await supabase.from('appsumo_codes').update({ merchant_id: merchantId }).eq('code', code);

        // Replace rather than add: entitlement is derived from the tier, so
        // stacking a second code must not leave the first tier's row behind for
        // the generate endpoint to find.
        await supabase
            .from('entitlements')
            .delete()
            .eq('subject_type', 'merchant')
            .eq('subject_id', merchantId);

        await supabase.from('entitlements').insert({
            subject_type: 'merchant',
            subject_id: merchantId,
            plan,
            daily_generation_limit: limits.dailyLimit,
            unlimited: limits.unlimited,
            renews_at: null, // Lifetime.
        });

        if (limits.marketplaceAccess) {
            await supabase
                .from('products')
                .update({ marketplace_visible: true })
                .eq('merchant_id', merchantId);
        }

        return NextResponse.json({
            ok: true,
            codeCount,
            plan,
            planName: limits.name,
            tier: tierLabel(codeCount),
            merchantId,
        });
    } catch (err: any) {
        console.error('[API/Redeem]', err?.message || err);
        return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }
}

/** What the signed-in user has already redeemed, for the redemption page. */
export async function GET(request: Request) {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return NextResponse.json({ codeCount: 0 });

    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return NextResponse.json({ codeCount: 0 });

    const { count } = await supabase
        .from('appsumo_codes')
        .select('code', { count: 'exact', head: true })
        .eq('redeemed_by', user.id)
        .eq('status', 'redeemed');

    const codeCount = count || 0;
    const plan = planForCodeCount(codeCount);

    return NextResponse.json({
        codeCount,
        plan,
        planName: plan ? limitsForPlan(plan).name : null,
        tier: tierLabel(codeCount),
    });
}
