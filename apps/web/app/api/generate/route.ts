import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { aiEngine } from '../../../lib/ai-engine';
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Free tier default for consumers with no entitlement row yet (mirrors docs/prd.md — 5/day)
const FREE_TIER_DAILY_LIMIT = 5;

// Hard per-IP ceiling applied to every request regardless of plan. This is not
// the product's rate limit — it is the abuse backstop that stops one client
// from running up an unbounded Gemini bill, either by cycling guestIds (which
// are client-generated and therefore free to forge) or by hammering an
// unlimited merchant's widget. Set high enough that a real shopper, or a
// household/office behind one NAT, never reaches it.
const IP_DAILY_CEILING = Number(process.env.EMODE_IP_DAILY_CEILING || 40);

// Service role client for entitlement checks
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

async function getUserIdFromRequest(request: Request): Promise<string | null> {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return null;
    const { data: { user } } = await supabase.auth.getUser(token);
    return user?.id || null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Subject = { type: 'merchant' | 'user' | 'ip'; id: string };

// The caller's IP, as seen through Vercel's proxy. x-forwarded-for is a chain
// (client, proxy1, proxy2...) and only the first entry is the real client.
function getClientIp(request: Request): string | null {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        const first = forwarded.split(',')[0]?.trim();
        if (first) return first;
    }
    return request.headers.get('x-real-ip')?.trim() || null;
}

// Fold an IP into a stable UUID so it fits usage_counters.subject_id (a uuid
// column) without ever storing a raw address. Keyed HMAC, not a bare hash —
// the IPv4 space is small enough to brute-force a plain digest back to the
// original address.
function ipToSubjectId(ip: string): string {
    const secret = process.env.EMODE_IP_HASH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const h = createHmac('sha256', secret).update(ip).digest('hex');
    return [
        h.slice(0, 8),
        h.slice(8, 12),
        // Stamp version/variant nibbles so this is a well-formed UUID and can
        // never collide with a real Supabase user or merchant id.
        '5' + h.slice(13, 16),
        ((parseInt(h[16], 16) & 0x3 | 0x8).toString(16)) + h.slice(17, 20),
        h.slice(20, 32),
    ].join('-');
}

// Resolves who this generation is billed to and what their daily cap is. It
// does NOT decide whether the request is allowed — enforcement happens in
// consume_generation(), which checks and increments under a row lock. Doing the
// comparison here as a separate read would reintroduce the race where two
// concurrent requests both read "4 used" and both proceed.
//
// A negative limit means unlimited (usage is still counted, never denied).
//
// Flat shape with optional fields rather than a discriminated union: this
// project compiles with `strict: false`, so strictNullChecks is off and TS will
// not narrow a union on a boolean `ok` discriminant.
type Resolution = {
    error?: string;
    status?: number;
    subject?: Subject;
    limit: number;
    overMessage?: (used: number, limit: number) => string;
};

async function resolveSubject(merchantId: string, userId: string | null): Promise<Resolution> {
    // Exception for the landing page interactive demo
    if (merchantId === 'demo_hero_interactive') return { limit: -1 };

    // Merchant-scoped call (Shopify extension / widget with a merchantId in context)
    if (merchantId) {
        const { data: entitlement } = await supabase
            .from('entitlements')
            .select('daily_generation_limit, unlimited')
            .eq('subject_id', merchantId)
            .eq('subject_type', 'merchant')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (!entitlement) {
            return { error: 'No active plan found. Please subscribe at emode.app', status: 401, limit: 0 };
        }

        return {
            subject: { type: 'merchant', id: merchantId },
            limit: entitlement.unlimited ? -1 : entitlement.daily_generation_limit,
            overMessage: (used, limit) =>
                `Daily limit reached (${used}/${limit}). Resets at midnight UTC.`,
        };
    }

    // Consumer call (Chrome extension / logged-in shopper on the web app, no merchant context)
    if (userId) {
        const { data: entitlement } = await supabase
            .from('entitlements')
            .select('daily_generation_limit, unlimited')
            .eq('subject_id', userId)
            .eq('subject_type', 'user')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        // No entitlement row yet just means "free tier", not "no access"
        return {
            subject: { type: 'user', id: userId },
            limit: entitlement?.unlimited ? -1 : (entitlement?.daily_generation_limit ?? FREE_TIER_DAILY_LIMIT),
            overMessage: (used, limit) =>
                `Daily limit reached (${used}/${limit}). Upgrade for unlimited generations, or wait until midnight UTC.`,
        };
    }

    return { error: 'Sign in required, or missing merchant ID.', status: 401, limit: 0 };
}

// Atomically reserve one generation against a subject's daily cap.
async function consume(subject: Subject, limit: number): Promise<{ allowed: boolean; used: number }> {
    const { data, error } = await supabase.rpc('consume_generation', {
        p_subject_type: subject.type,
        p_subject_id: subject.id,
        p_limit: limit,
    });

    if (error) {
        // Fail closed: if we cannot account for the request we do not spend a
        // Gemini call on it.
        console.error('[API/Generate] consume_generation failed:', error);
        return { allowed: false, used: 0 };
    }

    const row = Array.isArray(data) ? data[0] : data;
    return { allowed: !!row?.allowed, used: row?.used ?? 0 };
}

// Give a reserved credit back when the generation itself fails.
async function release(subject: Subject) {
    const { error } = await supabase.rpc('release_generation', { p_subject_id: subject.id });
    if (error) console.error('[API/Generate] release_generation failed:', error);
}

export async function POST(request: Request) {
    // Credits reserved before generation, released again if it fails.
    const reserved: Subject[] = [];

    try {
        const body = await request.json();

        // Basic validation
        if (!body.userImage || !body.productImages || !Array.isArray(body.productImages)) {
            return NextResponse.json(
                { error: 'Missing required images (userImage or productImages array)' },
                { status: 400, headers: corsHeaders }
            );
        }

        // ── 1. Per-IP ceiling, applied to everyone ──
        // Deliberately ahead of the entitlement lookup: it is the only limit a
        // caller cannot influence, so it has to hold even for requests that
        // forge a guestId or ride an unlimited merchant plan.
        const ip = getClientIp(request);
        if (ip) {
            const ipSubject: Subject = { type: 'ip', id: ipToSubjectId(ip) };
            const ipCheck = await consume(ipSubject, IP_DAILY_CEILING);
            if (!ipCheck.allowed) {
                console.warn(`[API/Generate] IP ceiling hit (${ipCheck.used}/${IP_DAILY_CEILING})`);
                return NextResponse.json(
                    { error: 'Too many try-ons from this network today. Please try again tomorrow.' },
                    { status: 429, headers: corsHeaders }
                );
            }
            reserved.push(ipSubject);
        }

        // ── 2. Who is this billed to? ──
        // Merchant context takes priority; otherwise fall back to the calling
        // user's own (free or paid) consumer entitlement. Anonymous shoppers may
        // pass a client-generated guestId (UUID) so a no-signup try-on still
        // gets a stable counter — it is forgeable, which is exactly why the IP
        // ceiling above exists.
        const merchantId = body.merchantId || '';
        const authedUserId = merchantId ? null : await getUserIdFromRequest(request);
        const guestId = !merchantId && !authedUserId && typeof body.guestId === 'string' && UUID_RE.test(body.guestId)
            ? body.guestId
            : null;

        const resolution = await resolveSubject(merchantId, authedUserId || guestId);
        if (resolution.error) {
            // Nothing was generated, so hand back the IP credit taken above.
            await Promise.all(reserved.map(release));
            return NextResponse.json(
                { error: resolution.error },
                { status: resolution.status, headers: corsHeaders }
            );
        }

        // ── 3. Reserve against their plan ──
        if (resolution.subject) {
            const check = await consume(resolution.subject, resolution.limit);
            if (!check.allowed) {
                await Promise.all(reserved.map(release));
                return NextResponse.json(
                    {
                        error: resolution.overMessage
                            ? resolution.overMessage(check.used, resolution.limit)
                            : 'Daily limit reached.',
                    },
                    { status: 429, headers: corsHeaders }
                );
            }
            reserved.push(resolution.subject);
        }

        // ── 4. Generate ──
        const result = await aiEngine.generateTryOn({
            userImage: body.userImage,
            productImages: body.productImages,
            category: body.category,
            bodyMetadata: body.bodyMetadata
        });

        return NextResponse.json(result, { headers: corsHeaders });
    } catch (error: any) {
        console.error('[API/Generate] Error:', error);
        // A failed generation should not cost anyone a try-on.
        await Promise.all(reserved.map(release));
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500, headers: corsHeaders }
        );
    }
}
