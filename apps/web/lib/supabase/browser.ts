'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-side Supabase client.
 *
 * Replaces the plain createClient() from @emode/database for anything auth
 * related. The difference matters: the default client stores the session in
 * localStorage, which server components physically cannot read — so
 * getMerchantForUser() returned null for every signed-in user and /admin always
 * showed the "no merchant linked" state.
 *
 * createBrowserClient stores the session in cookies instead, so the same session
 * is visible to middleware, route handlers and server components. It also uses
 * the PKCE flow, which is what makes /auth/callback's `?code` exchange work —
 * the implicit flow returns the token in a URL fragment that never reaches the
 * server.
 *
 * Every client component in this app must use THIS client. Mixing it with the
 * localStorage one produces two independent session stores, where signing in on
 * one leaves the other logged out.
 */
export const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
