import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabase/server';

/**
 * Magic-link landing route.
 *
 * Requires the PKCE flow, which is what @supabase/ssr's browser client uses.
 * Under the old implicit flow Supabase returned the token in a URL *fragment*
 * (#access_token=...), and fragments are never sent to servers — so this route
 * saw no `code`, silently established nothing, and bounced the user to a page
 * that still considered them signed out.
 */
export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const tokenHash = requestUrl.searchParams.get('token_hash');
    const otpType = requestUrl.searchParams.get('type');
    const next = requestUrl.searchParams.get('next') || '/admin';

    // Supabase reports link problems (expired, already used) here rather than
    // by omitting the code, so surface them instead of failing silently.
    const error = requestUrl.searchParams.get('error_description')
        || requestUrl.searchParams.get('error');
    if (error) {
        return NextResponse.redirect(
            new URL(`/login?error=${encodeURIComponent(error)}`, requestUrl.origin)
        );
    }

    const supabase = await createSupabaseServerClient();

    /**
     * Email links: token_hash, verified server-side.
     *
     * PKCE cannot carry an email link. Its code is worthless without the code
     * verifier, which lives in a cookie in the browser context that asked for the
     * link — and an email link is opened wherever the mail client decides, which
     * is routinely somewhere else: another profile, an incognito window, the
     * webmail app's in-app browser, a different device entirely. Supabase still
     * confirms the address server-side, so the account appears created while
     * last_sign_in_at stays null and the user is bounced back to a login form
     * that insists they are a stranger.
     *
     * verifyOtp has no verifier and no browser affinity: the token in the URL is
     * the whole credential, so the link works from anywhere. Requires the Magic
     * Link email template to send token_hash — see docs/auth-email-template.md.
     */
    if (tokenHash) {
        // Try the type the template sent, then the other name for the same thing.
        // Supabase accepts both 'email' and 'magiclink' for a magic-link token
        // depending on how the link was minted, and getting it wrong reads as an
        // invalid token — indistinguishable, to the user, from an expired link.
        const candidates = otpType
            ? [otpType, otpType === 'email' ? 'magiclink' : 'email']
            : ['email', 'magiclink'];

        let lastError: string | null = null;
        for (const type of candidates) {
            const { error } = await supabase.auth.verifyOtp({
                type: type as any,
                token_hash: tokenHash,
            });
            if (!error) return NextResponse.redirect(new URL(next, requestUrl.origin));
            lastError = error.message;
        }

        return NextResponse.redirect(
            new URL(`/login?error=${encodeURIComponent(lastError || 'Sign-in link is invalid.')}`,
                requestUrl.origin)
        );
    }

    if (!code) {
        return NextResponse.redirect(
            new URL('/login?error=Missing+sign-in+code.+Please+request+a+new+link.', requestUrl.origin)
        );
    }

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
        return NextResponse.redirect(
            new URL(`/login?error=${encodeURIComponent(exchangeError.message)}`, requestUrl.origin)
        );
    }

    return NextResponse.redirect(new URL(next, requestUrl.origin));
}
