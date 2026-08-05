'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase/browser';

/**
 * Heart a marketplace piece into your closet.
 *
 * Writes go straight from the browser — saved_items carries RLS policies scoping
 * every row to auth.uid(), so there is nothing an API route would add here
 * except a hop.
 *
 * Sits outside the card's hover overlay on purpose. That overlay only appears on
 * hover, which does not exist on touch, and saving is the one action here a
 * shopper on a phone is most likely to want.
 */
export function SaveButton({
    productId,
    merchantId,
    initiallySaved,
}: {
    productId: string;
    merchantId: string | null;
    initiallySaved: boolean;
}) {
    const [saved, setSaved] = useState(initiallySaved);
    const [busy, setBusy] = useState(false);
    const router = useRouter();

    const toggle = async (e: React.MouseEvent) => {
        // The card is wrapped in links; saving is not navigation.
        e.preventDefault();
        e.stopPropagation();
        if (busy) return;

        setBusy(true);
        const next = !saved;
        setSaved(next); // Optimistic: a heart that lags feels broken.

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                // Send them to sign in rather than silently doing nothing.
                router.push('/login');
                return;
            }

            if (next) {
                const { error } = await supabase.from('saved_items').upsert(
                    { user_id: user.id, product_id: productId, merchant_id: merchantId },
                    { onConflict: 'user_id,product_id' }
                );
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('saved_items')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('product_id', productId);
                if (error) throw error;
            }
        } catch (err) {
            console.error('[marketplace] Could not update saved item:', err);
            setSaved(!next); // Put the heart back where it was.
        } finally {
            setBusy(false);
        }
    };

    return (
        <button
            onClick={toggle}
            aria-label={saved ? 'Remove from your closet' : 'Save to your closet'}
            aria-pressed={saved}
            className="absolute top-3 right-3 z-20 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-sm flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
        >
            <Heart
                className={`w-5 h-5 transition-colors ${
                    saved ? 'fill-accent-gold text-accent-gold' : 'text-charcoal/40'
                }`}
            />
        </button>
    );
}
