import { NextResponse } from 'next/server';
import { clientIp, hashIp, rateLimit } from '../../../../lib/request-guard';

/**
 * Relays the emode iOS app's web account-deletion form to the Supabase edge
 * function that already does the real work (account_deletion.sql +
 * account_deletion_requests). Deliberately not a re-implementation: that
 * function owns the validation, the honeypot check, and the DB insert, and a
 * second copy of that logic in a different repo is a second place for it to
 * drift out of sync with no benefit.
 *
 * What this route adds is a submit target that stays on emode.style, so
 * /app/delete-account itself renders as real HTML before *and* after
 * submitting -- POSTing straight at the Supabase function would have worked
 * too, but the browser ends up on its confirmation page, which is behind the
 * same gateway that rewrites everything on *.supabase.co to text/plain that
 * the rest of this work was about avoiding.
 */

const TARGET_URL = 'https://scvvbjheyfnxlsiiozta.supabase.co/functions/v1/legal/delete-account';

export async function POST(request: Request) {
    const redirectHome = (query: string) =>
        NextResponse.redirect(new URL(`/app/delete-account${query}`, request.url), { status: 303 });

    if (!rateLimit(`delacct:${hashIp(clientIp(request))}`, 5, 60_000)) {
        return redirectHome('?error=rate_limited');
    }

    let form: FormData;
    try {
        form = await request.formData();
    } catch {
        return redirectHome('?error=bad_request');
    }

    const email = String(form.get('email') || '').trim();
    const note = String(form.get('note') || '').trim();
    const honeypot = String(form.get('website') || '');

    // The target silently no-ops on a filled honeypot rather than erroring, so
    // it never tips off whatever filled the field. Do the same here: skip the
    // network call entirely and still land on the same confirmation.
    if (honeypot) return redirectHome('?submitted=1');

    try {
        // The target's own response doesn't distinguish "request accepted" from
        // "silently ignored because the address didn't validate" -- that's
        // deliberate, so an attacker can't use this form to enumerate accounts.
        // Matching that here: any response short of a network failure lands on
        // the same confirmation.
        await fetch(TARGET_URL, {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ email, note }),
            redirect: 'manual',
        });
        return redirectHome('?submitted=1');
    } catch (error) {
        console.error('[api/app/delete-account] relay failed:', error);
        return redirectHome('?error=unavailable');
    }
}
