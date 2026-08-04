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

    if (!code) {
        return NextResponse.redirect(
            new URL('/login?error=Missing+sign-in+code.+Please+request+a+new+link.', requestUrl.origin)
        );
    }

    const supabase = await createSupabaseServerClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
        return NextResponse.redirect(
            new URL(`/login?error=${encodeURIComponent(exchangeError.message)}`, requestUrl.origin)
        );
    }

    return NextResponse.redirect(new URL(next, requestUrl.origin));
}
