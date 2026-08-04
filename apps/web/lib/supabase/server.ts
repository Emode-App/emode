import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Server-side Supabase client bound to the request's cookies.
 *
 * Use this anywhere a server component, route handler or server action needs to
 * know *who is signed in*. For privileged reads that bypass RLS, keep using the
 * service-role client in app/admin/admin-util.ts — this one runs as the user.
 */
export async function createSupabaseServerClient() {
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        // Server components cannot set cookies. That is fine —
                        // middleware refreshes the session on every request, so
                        // the write here is only ever a nice-to-have.
                    }
                },
            },
        }
    );
}
