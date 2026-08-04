import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Refreshes the Supabase session cookie on every request.
 *
 * Without this, access tokens expire after an hour and server components start
 * seeing a signed-out user even though the browser still believes it is logged
 * in. getUser() below is what actually triggers the refresh — do not remove it.
 */
export async function middleware(request: NextRequest) {
    // Server components cannot see the current pathname. Pass it down so the
    // admin layout can exempt /admin/onboarding from the auth guard.
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-pathname', request.nextUrl.pathname);

    let response = NextResponse.next({ request: { headers: requestHeaders } });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    response = NextResponse.next({ request: { headers: requestHeaders } });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    await supabase.auth.getUser();

    return response;
}

export const config = {
    matcher: [
        /*
         * Everything except static assets and the embeddable surfaces.
         *
         * /modal and /widget.js are deliberately excluded: they are loaded
         * cross-origin from merchant storefronts where no emode cookie exists,
         * so running a session refresh on them adds latency for nothing.
         */
        '/((?!_next/static|_next/image|favicon.ico|widget.js|modal|demo/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
