import { createClient } from '@supabase/supabase-js';

/**
 * Supabase for Emode Mirror pages only.
 *
 * Deliberately not the site's usual client. The site is wired to the merchant
 * project; Emode Mirror -- like the consumer app -- lives in the other one
 * (scvvbjheyfnxlsiiozta), which is where `mirror_inquiries` exists. Using the
 * default client here would send every store inquiry to a project without
 * that table, and the form would fail for everyone.
 *
 * Both values are public by design. The key can only insert inquiries; it
 * cannot read a single one back.
 */
const URL = 'https://scvvbjheyfnxlsiiozta.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_xBWtFjEoKrG4wCSzGVkigw_A-i0UfJi';

export const mirrorSupabase = createClient(URL, PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
});
