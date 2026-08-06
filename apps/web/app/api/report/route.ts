import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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
export async function POST(request: Request) {
    try {
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
            diagnostics: body.diagnostics && typeof body.diagnostics === 'object'
                ? body.diagnostics
                : null,
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
