import { NextResponse } from 'next/server';
import { clientIp, hashIp, rateLimit } from '../../../lib/request-guard';
import { createClient } from '@supabase/supabase-js';
import { requireServiceRoleKey } from '../../../lib/supabase/require-key';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    requireServiceRoleKey()
);

// Deliberately loose. Strict email regexes reject valid addresses — plus tags,
// new TLDs, unicode local parts — and the cost of a bad address here is one
// bounced launch email, while the cost of rejecting a real one is a lost user.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Consumer app waitlist.
 *
 * Open endpoint by necessity: it collects addresses from people who have no
 * account yet, which is the entire point. Abuse is bounded by the unique index —
 * the worst a script achieves is filling a table with addresses it made up,
 * which no more than costs storage, and never emails anyone twice.
 */
export async function POST(request: Request) {
    try {
        // Signing up for a waitlist is a once-per-person act.
        if (!rateLimit(`wl:${hashIp(clientIp(request))}`, 5, 60_000)) {
            return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
        }
        const body = await request.json();
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        const source = typeof body.source === 'string' ? body.source.slice(0, 40) : 'landing';

        if (!EMAIL_RE.test(email) || email.length > 254) {
            return NextResponse.json({ error: 'That email doesn’t look right.' }, { status: 400 });
        }

        const { error } = await supabase.from('waitlist').insert({ email, source });

        // Already on the list. Say the same thing as a fresh signup: telling a
        // stranger which addresses are already registered leaks the list one
        // guess at a time, and being told "you already did this" helps nobody.
        if (error && (error as any).code !== '23505') {
            console.error('[API/Waitlist]', error.message);
            return NextResponse.json({ error: 'Could not add you just now. Try again?' }, { status: 500 });
        }

        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }
}
