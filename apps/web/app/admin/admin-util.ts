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

    // Fallback: find by email
    const { data: merchantByEmail } = await serviceClient
        .from('merchants')
        .select('*')
        .eq('shop_domain', user.email || '')
        .single();

    return merchantByEmail;
}
