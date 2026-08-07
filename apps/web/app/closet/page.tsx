import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Shirt, Sparkles, Store, ShoppingBag } from 'lucide-react';
import { createSupabaseServerClient } from '../../lib/supabase/server';
import { serviceClient } from '../admin/admin-util';
import { UpgradeButton } from './UpgradeButton';

export const dynamic = 'force-dynamic';

// Mirrors FREE_TIER_DAILY_LIMIT in app/api/generate/route.ts. Shown, not
// enforced, here — the server is the only place that decides.
const FREE_TIER_DAILY_LIMIT = 5;

/**
 * Home for people who use emode as shoppers rather than sell with it.
 *
 * Not everyone signing up is a brand. Some are here for the closet, the Chrome
 * extension, or to browse the marketplace — and they had nowhere to land. The
 * login page has always promised "Welcome to your Closet" and then delivered a
 * merchant admin dashboard, which after the plan-picker change meant a shopper
 * was met with a $29/month B2B pricing table for something they never wanted.
 *
 * Queries go through the service client filtered explicitly on user_id, the same
 * pattern the admin pages use, so this does not depend on RLS policy coverage
 * that may not exist for every one of these tables yet.
 */
export default async function ClosetPage() {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const today = new Date().toISOString().split('T')[0];

    const [{ data: rooms }, { data: usageRows }] = await Promise.all([
        serviceClient
            .from('dressing_rooms')
            .select('id')
            .eq('user_id', user.id),
        serviceClient
            .from('usage_counters')
            .select('generations_used')
            .eq('subject_type', 'user')
            .eq('subject_id', user.id)
            .eq('date', today),
    ]);

    const roomIds = (rooms || []).map((r: any) => r.id);

    const [{ data: roomItems }, { data: hearted }] = await Promise.all([
        roomIds.length
            ? serviceClient
                .from('dressing_room_items')
                .select('id, created_at, product:products(title, primary_image_url), variant:variants(price)')
                .in('dressing_room_id', roomIds)
                .order('created_at', { ascending: false })
            : Promise.resolve({ data: [] as any[] }),
        serviceClient
            .from('saved_items')
            .select('id, saved_at, product:products(title, primary_image_url), variant:variants(price)')
            .eq('user_id', user.id)
            .order('saved_at', { ascending: false }),
    ]);

    // One shelf, two sources. A shopper does not think of "the thing I hearted
    // in the marketplace" and "the thing I added on a brand's site" as living in
    // different places — they think of it as what they saved.
    const seen = new Set<string>();
    const items = [...(hearted || []), ...(roomItems || [])].filter((item: any) => {
        const title = item.product?.title;
        if (!title || seen.has(title)) return false;
        seen.add(title);
        return true;
    });

    const usedToday = (usageRows || []).reduce(
        (sum: number, row: any) => sum + (row.generations_used || 0),
        0
    );
    const remaining = Math.max(0, FREE_TIER_DAILY_LIMIT - usedToday);

    return (
        <div className="min-h-screen bg-off-white">
            <div className="max-w-6xl mx-auto px-6 py-16">
                <header className="mb-12">
                    <h1 className="text-4xl font-heading font-bold tracking-tighter uppercase mb-2">
                        Your Closet
                    </h1>
                    <p className="text-charcoal/50">{user.email}</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div className="p-8 bg-white rounded-2xl shadow-sm border border-black/5">
                        <div className="p-2 bg-off-white rounded-lg w-fit mb-4"><Shirt className="w-5 h-5" /></div>
                        <p className="text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-1">Saved pieces</p>
                        <h3 className="text-3xl font-heading font-bold tracking-tighter">{items?.length || 0}</h3>
                    </div>
                    <div className="p-8 bg-white rounded-2xl shadow-sm border border-black/5">
                        <div className="p-2 bg-off-white rounded-lg w-fit mb-4"><Sparkles className="w-5 h-5" /></div>
                        <p className="text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-1">Try-ons left today</p>
                        <h3 className="text-3xl font-heading font-bold tracking-tighter">{remaining}</h3>
                        <p className="text-xs text-charcoal/40 mt-1">of {FREE_TIER_DAILY_LIMIT} on the free plan</p>
                    </div>
                    <div className="p-8 bg-obsidian text-white rounded-2xl shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-1">Unlimited</p>
                        <h3 className="text-3xl font-heading font-bold tracking-tighter mb-4">$5<span className="text-base text-white/40">/mo</span></h3>
                        <UpgradeButton userId={user.id} />
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-8 mb-8">
                    <h3 className="text-xl font-heading font-bold mb-6">SAVED PIECES</h3>

                    {!items?.length ? (
                        <div className="text-center py-16">
                            <ShoppingBag className="w-12 h-12 text-black/10 mx-auto mb-6" />
                            <p className="text-charcoal/50 mb-8 max-w-md mx-auto leading-relaxed">
                                Nothing saved yet. Add pieces to your dressing room from any store
                                running emode, then try them on together.
                            </p>
                            <Link
                                href="/marketplace"
                                className="inline-flex items-center gap-2 px-8 py-4 bg-obsidian text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors"
                            >
                                Browse the marketplace
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {items.map((item: any) => (
                                <div key={item.id} className="rounded-xl border border-black/5 overflow-hidden">
                                    <div className="aspect-[3/4] bg-off-white">
                                        {item.product?.primary_image_url && (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img
                                                src={item.product.primary_image_url}
                                                alt={item.product?.title || ''}
                                                className="w-full h-full object-contain"
                                            />
                                        )}
                                    </div>
                                    <div className="p-4">
                                        <p className="font-bold text-sm truncate">{item.product?.title || 'Untitled'}</p>
                                        {item.variant?.price != null && (
                                            <p className="text-xs text-charcoal/50">${item.variant.price}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quiet, and deliberately last. Most people here are shopping. */}
                <div className="flex items-center gap-4 p-6 bg-white rounded-2xl border border-black/5">
                    <div className="p-2 bg-off-white rounded-lg"><Store className="w-5 h-5" /></div>
                    <div className="flex-1">
                        <p className="font-bold text-sm">Do you sell clothes?</p>
                        <p className="text-sm text-charcoal/50">
                            Put virtual try-on on your own store in one line of code.
                        </p>
                    </div>
                    <Link
                        href="/admin"
                        className="px-6 py-3 border border-black/10 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-black/5 transition-colors whitespace-nowrap"
                    >
                        For brands
                    </Link>
                </div>
            </div>
        </div>
    );
}
