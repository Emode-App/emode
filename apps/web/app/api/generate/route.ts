import { NextResponse } from 'next/server';
import { aiEngine } from '../../../lib/ai-engine';
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Service role client for entitlement checks
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

async function checkEntitlement(merchantId: string): Promise<{ allowed: boolean; error?: string; status?: number }> {
    if (!merchantId) return { allowed: false, error: 'Missing or inactive merchant ID.', status: 401 };
    
    // Exception for the landing page interactive demo
    if (merchantId === 'demo_hero_interactive') return { allowed: true };

    // 1. Get merchant's entitlement
    const { data: entitlement } = await supabase
        .from('entitlements')
        .select('daily_generation_limit, unlimited')
        .eq('subject_id', merchantId)
        .eq('subject_type', 'merchant')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (!entitlement) {
        return { allowed: false, error: 'No active plan found. Please subscribe at emode.app', status: 401 };
    }

    // Unlimited plan — always allowed
    if (entitlement.unlimited) return { allowed: true };

    // 2. Check today's usage
    const today = new Date().toISOString().split('T')[0];
    const { data: usage } = await supabase
        .from('usage_counters')
        .select('generations_used')
        .eq('subject_id', merchantId)
        .eq('subject_type', 'merchant')
        .eq('date', today)
        .single();

    const used = usage?.generations_used || 0;

    if (used >= entitlement.daily_generation_limit) {
        return {
            allowed: false,
            error: `Daily limit reached (${used}/${entitlement.daily_generation_limit}). Resets at midnight UTC.`,
            status: 429
        };
    }

    return { allowed: true };
}

async function incrementUsage(merchantId: string) {
    if (!merchantId) return;

    const today = new Date().toISOString().split('T')[0];

    // Try to update existing counter
    const { data: existing } = await supabase
        .from('usage_counters')
        .select('id, generations_used')
        .eq('subject_id', merchantId)
        .eq('subject_type', 'merchant')
        .eq('date', today)
        .single();

    if (existing) {
        await supabase
            .from('usage_counters')
            .update({ generations_used: existing.generations_used + 1 })
            .eq('id', existing.id);
    } else {
        await supabase
            .from('usage_counters')
            .insert({
                subject_type: 'merchant',
                subject_id: merchantId,
                date: today,
                generations_used: 1,
            });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Basic validation
        if (!body.userImage || !body.productImages || !Array.isArray(body.productImages)) {
            return NextResponse.json(
                { error: 'Missing required images (userImage or productImages array)' },
                { status: 400, headers: corsHeaders }
            );
        }

        // Entitlement check
        const merchantId = body.merchantId || '';
        const entitlementCheck = await checkEntitlement(merchantId);
        if (!entitlementCheck.allowed) {
            return NextResponse.json(
                { error: entitlementCheck.error },
                { status: entitlementCheck.status || 429, headers: corsHeaders }
            );
        }

        // Trigger AI Generation
        const result = await aiEngine.generateTryOn({
            userImage: body.userImage,
            productImages: body.productImages,
            category: body.category,
            bodyMetadata: body.bodyMetadata
        });

        // Track usage
        await incrementUsage(merchantId);

        return NextResponse.json(result, { headers: corsHeaders });
    } catch (error: any) {
        console.error('[API/Generate] Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', details: error.message },
            { status: 500, headers: corsHeaders }
        );
    }
}
