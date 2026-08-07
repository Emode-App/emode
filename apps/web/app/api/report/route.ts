import { NextResponse } from 'next/server';
import { clientIp, hashIp, rateLimit } from '../../../lib/request-guard';
import { createClient } from '@supabase/supabase-js';
import { requireServiceRoleKey } from '../../../lib/supabase/require-key';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    requireServiceRoleKey()
);

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * "There are no buttons on this page."
 *
 * Detection will always be wrong on some shops — there are millions of them and
 * no rule covers every one. What decides whether that is a slow leak or a
 * fixable backlog is whether the failures get written down. A shopper who hits a
 * broken shop and can only shrug leaves it broken for everyone after them.
 *
 * Takes host and path, never the full URL: a product URL routinely carries a
 * click id, a session token or an email address in its query string, and none of
 * that helps explain a missing button. The extension already strips it; this
 * strips it again, because a client-side promise is not a guarantee.
 */
const MAX_DIAGNOSTICS_BYTES = 8_000;

/** Keep a diagnostics blob only if it is small enough to be genuine. */
function boundedDiagnostics(value: unknown): unknown {
    if (!value || typeof value !== 'object') return null;
    try {
        const serialised = JSON.stringify(value);
        if (!serialised || serialised.length > MAX_DIAGNOSTICS_BYTES) {
            return { truncated: true, bytes: serialised?.length ?? 0 };
        }
        return value;
    } catch {
        // Circular or otherwise unserialisable: not something we can store.
        return null;
    }
}

export async function POST(request: Request) {
    try {
        // A shopper reports a broken shop once. Anything past a handful a minute
        // is a script, and diagnostics is a jsonb column with no natural bound.
        if (!rateLimit(`rep:${hashIp(clientIp(request))}`, 10, 60_000)) {
            return NextResponse.json(
                { error: 'Too many reports. Try again shortly.' },
                { status: 429, headers: corsHeaders }
            );
        }

        const body = await request.json();

        const host = String(body.host || '').trim().toLowerCase().slice(0, 253);
        if (!host || !/^[a-z0-9.-]+$/.test(host)) {
            return NextResponse.json(
                { error: 'A site is required.' },
                { status: 400, headers: corsHeaders }
            );
        }

        // Belt and braces on the path: strip anything after ? or # even though
        // the caller is supposed to have done it.
        const path = String(body.path || '').split(/[?#]/)[0].slice(0, 200) || null;

        const { error } = await supabase.from('site_reports').insert({
            host,
            path,
            // Capped by rejecting rather than truncating. This is caller-supplied
            // and lands in jsonb with no natural bound, but cutting JSON in half
            // and trying to repair it produces either an exception or a
            // plausible-looking object that says something the reporter did not.
            // Oversized diagnostics are worth less than a wrong one.
            diagnostics: boundedDiagnostics(body.diagnostics),
            note: typeof body.note === 'string' ? body.note.slice(0, 500) : null,
        });

        if (error) {
            console.error('[API/Report] insert failed:', error.message);
            return NextResponse.json(
                { error: 'Could not save that report.' },
                { status: 500, headers: corsHeaders }
            );
        }

        return NextResponse.json({ ok: true }, { headers: corsHeaders });
    } catch {
        return NextResponse.json(
            { error: 'Malformed report.' },
            { status: 400, headers: corsHeaders }
        );
    }
}
