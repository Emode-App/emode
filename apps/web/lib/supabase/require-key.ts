/**
 * The service-role key, or a refusal to start.
 *
 * Every server client was built as:
 *
 *     SUPABASE_SERVICE_ROLE_KEY || NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * so a missing service key stopped nothing. The app boots, routes answer 200,
 * and every privileged write silently fails RLS instead: orders not recorded,
 * codes not redeemed, entitlements not granted, nothing anywhere saying why.
 *
 * Quietly downgrading to a weaker credential is never the safe default. A
 * misconfiguration should be loud and immediate.
 */
export function requireServiceRoleKey(): string {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) {
        throw new Error(
            'SUPABASE_SERVICE_ROLE_KEY is not set. Refusing to fall back to the anon key: ' +
            'privileged writes would fail RLS silently rather than erroring.'
        );
    }
    return key;
}
