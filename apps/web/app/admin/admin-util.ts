import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '../../lib/supabase/server';
import { redirect } from 'next/navigation';

export const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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

    // Find merchant by owner_user_id
    const { data: merchant } = await serviceClient
        .from('merchants')
        .select('*')
        .eq('owner_user_id', user.id)
        .single();

    if (merchant) return merchant;

    // Fallback: find by email. This is how a merchant created by the Stripe
    // webhook is found when the buyer paid before they had an emode account —
    // the webhook stores their email as shop_domain and leaves owner_user_id null.
    const { data: merchantByEmail } = await serviceClient
        .from('merchants')
        .select('*')
        .eq('shop_domain', user.email || '')
        .single();

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
