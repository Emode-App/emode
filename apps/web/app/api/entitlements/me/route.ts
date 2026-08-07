import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireServiceRoleKey } from '../../../../lib/supabase/require-key';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const FREE_TIER_DAILY_LIMIT = 5;

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    requireServiceRoleKey()
);

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

// Reports the calling consumer's own generation usage/limit for today. Used by
// the modal and the Chrome extension side panel to render a real usage bar and
// decide when to show the upgrade prompt (mirrors the entitlement logic in
// /api/generate — keep both in sync if the free tier or plans change).
export async function GET(request: Request) {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const { data: entitlement } = await supabase
        .from('entitlements')
        .select('plan, daily_generation_limit, unlimited')
        .eq('subject_id', user.id)
        .eq('subject_type', 'user')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    const dailyLimit = entitlement?.daily_generation_limit ?? FREE_TIER_DAILY_LIMIT;
    const unlimited = entitlement?.unlimited ?? false;
    const plan = entitlement?.plan ?? 'free';

    const today = new Date().toISOString().split('T')[0];
    const { data: usage } = await supabase
        .from('usage_counters')
        .select('generations_used')
        .eq('subject_id', user.id)
        .eq('subject_type', 'user')
        .eq('date', today)
        .single();

    return NextResponse.json({
        plan,
        unlimited,
        dailyLimit,
        used: usage?.generations_used || 0,
    }, { headers: corsHeaders });
}
