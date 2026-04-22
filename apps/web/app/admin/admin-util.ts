import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';

export const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function getMerchantForUser() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            global: {
                headers: {
                    cookie: (await cookies()).toString(),
                },
            },
        }
    );

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
