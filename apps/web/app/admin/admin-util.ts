import { createClient } from '@supabase/supabase-js';
import { requireServiceRoleKey } from '../../lib/supabase/require-key';
import { createSupabaseServerClient } from '../../lib/supabase/server';
import { redirect } from 'next/navigation';

export const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    requireServiceRoleKey()
);

export async function getMerchantForUser() {
    // Previously this forwarded a raw `cookie` header into createClient() and
    // called getUser(). That never worked: the browser client stored sessions in
    // localStorage, so there were no auth cookies to forward, and getUser()
    // reads its own stored session rather than the header. Every signed-in user
    // resolved to null and the dashboard always showed the empty state.
    const supabase = await createSupabaseServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Find merchant by owner_user_id.
    //
    // Not .single(): one person can genuinely own more than one store — a Shopify
    // shop and a custom storefront is an ordinary situation, and each gets its own
    // merchant row. PostgREST's .single() treats a second row as an error and
    // returns null, so the moment a merchant opened a second store their dashboard
    // would go blank and report nothing wrong. Take the newest and carry on; a
    // real store switcher is the eventual answer, but silently losing the whole
    // dashboard is not an acceptable stand-in for one.
    const { data: owned, error: ownedError } = await serviceClient
        .from('merchants')
        .select('*')
        .eq('owner_user_id', user.id)
        .order('created_at', { ascending: false });

    if (ownedError) console.error('[admin] Merchant lookup failed:', ownedError.message);
    if (owned && owned.length > 1) {
        console.warn(`[admin] User ${user.id} owns ${owned.length} merchants; showing the newest.`);
    }
    if (owned?.length) return owned[0];

    // Fallback: find by email. This is how a merchant created by the Stripe
    // webhook is found when the buyer paid before they had an emode account —
    // the webhook stores their email as shop_domain and leaves owner_user_id null.
    const { data: merchantByEmail } = await serviceClient
        .from('merchants')
        .select('*')
        .eq('shop_domain', user.email || '')
        .maybeSingle(); // No row is the normal case for a user with no purchase yet.

    if (!merchantByEmail) return null;

    // Claim it on the first visit, so the merchant is genuinely owned rather than
    // depending on an email string matching forever. Otherwise owner_user_id stays
    // null for the whole life of the account, and anything keyed on it — RLS
    // policies, ownership checks — quietly treats the merchant as unowned.
    if (!merchantByEmail.owner_user_id) {
        const { error } = await serviceClient
            .from('merchants')
            .update({ owner_user_id: user.id })
            .eq('id', merchantByEmail.id)
            .is('owner_user_id', null); // Never take an account someone already owns.

        if (error) console.error('[admin] Could not claim merchant for user:', error.message);
        else merchantByEmail.owner_user_id = user.id;
    }

    return merchantByEmail;
}
