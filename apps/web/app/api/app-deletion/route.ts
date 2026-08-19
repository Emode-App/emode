import { NextRequest, NextResponse } from 'next/server';

/**
 * Forwards an account deletion request for the Emode iOS app.
 *
 * The app lives in its own Supabase project, which this web app holds no
 * credentials for — and it should not: a marketing site does not need write
 * access to the consumer product's database. So rather than inserting here, this
 * posts to the app's own `legal` edge function, which already owns the
 * validation, the honeypot, the service-role insert and the duplicate handling.
 *
 * Server-side so there is no cross-origin request from the browser, and so the
 * function's origin is never exposed to the page.
 */

const LEGAL_FUNCTION_URL =
    process.env.EMODE_APP_LEGAL_URL ||
    'https://scvvbjheyfnxlsiiozta.supabase.co/functions/v1/legal/delete-account';

export async function POST(request: NextRequest) {
    let email = '';
    let note = '';
    let honeypot = '';

    try {
        const form = await request.formData();
        email = String(form.get('email') || '').trim();
        note = String(form.get('note') || '').trim();
        honeypot = String(form.get('website') || '');
    } catch {
        return NextResponse.redirect(new URL('/app/delete-account?error=1', request.url), 303);
    }

    // Mirror the edge function's bounds so an oversized body never leaves this
    // process. It re-checks everything regardless; this just fails faster.
    const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (honeypot || !looksLikeEmail || email.length > 320 || note.length > 2000) {
        // Deliberately indistinguishable from success: whether an address is
        // valid, or was caught by the honeypot, is not something to disclose.
        return NextResponse.redirect(new URL('/app/delete-account?submitted=1', request.url), 303);
    }

    try {
        await fetch(LEGAL_FUNCTION_URL, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email, note }),
            // The edge function answers with a 303 of its own; we only care that
            // it was accepted, not where it wants to send a browser.
            redirect: 'manual',
        });
    } catch (error) {
        console.error('[app-deletion] could not forward request', error);
        return NextResponse.redirect(new URL('/app/delete-account?error=1', request.url), 303);
    }

    return NextResponse.redirect(new URL('/app/delete-account?submitted=1', request.url), 303);
}
