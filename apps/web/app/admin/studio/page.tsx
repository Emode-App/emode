import Link from 'next/link';
import { ArrowRight, Lock } from 'lucide-react';
import { getMerchantForUser, serviceClient } from '../admin-util';
import { StudioClient, StudioProduct, StudioAsset } from './StudioClient';

export const dynamic = 'force-dynamic';

/** Kept in step with app/api/assets/model-shot/route.ts. */
const ASSET_PLANS = new Set(['pro', 'growth', 'lifetime_pro', 'lifetime_founder']);
const SCENE_PLANS = new Set(['growth', 'lifetime_founder']);

/** House model, batch, and multiple takes. Capability, not convenience. */
const PREMIUM_PLANS = new Set(['growth', 'lifetime_founder']);

export default async function StudioPage() {
    const merchant = await getMerchantForUser();

    if (!merchant) {
        return (
            <div className="max-w-xl">
                <h1 className="text-4xl font-heading font-bold tracking-tighter uppercase mb-3">Studio</h1>
                <p className="text-charcoal/50">Choose a plan first and your catalogue will show up here.</p>
            </div>
        );
    }

    // The gate is enforced server-side in the API too. This is only so a merchant
    // on a plan without it is told why, rather than shown a button that fails.
    if (!ASSET_PLANS.has(merchant.plan)) {
        return (
            <div className="max-w-2xl">
                <h1 className="text-4xl font-heading font-bold tracking-tighter uppercase mb-3">Studio</h1>
                <p className="text-charcoal/50 mb-10 leading-relaxed">
                    Generate a model wearing your own products — from the product images you
                    already have, with no shoot, no studio and no model booking.
                </p>

                <div className="p-8 bg-white rounded-2xl border border-black/5">
                    <div className="w-10 h-10 rounded-full bg-off-white flex items-center justify-center mb-5">
                        <Lock className="w-4 h-4 text-charcoal/40" />
                    </div>
                    <h2 className="font-bold mb-2">Included on Pro and above</h2>
                    <p className="text-sm text-charcoal/50 leading-relaxed mb-6">
                        You&apos;re on {merchant.plan?.replace(/_/g, ' ') || 'a free plan'}. Model
                        shots, an asset library, and unlimited generation come with Pro.
                    </p>
                    <Link
                        href="/#pricing"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-obsidian text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors"
                    >
                        See plans <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        );
    }

    const [{ data: products }, { data: assets }] = await Promise.all([
        serviceClient
            .from('products')
            .select('id, title, primary_image_url')
            .eq('merchant_id', merchant.id)
            .order('created_at', { ascending: false })
            .limit(60),
        serviceClient
            .from('product_assets')
            .select('id, product_id, public_url, options, created_at')
            .eq('merchant_id', merchant.id)
            .order('created_at', { ascending: false })
            .limit(60),
    ]);

    return (
        <div>
            <header className="mb-10">
                <h1 className="text-4xl font-heading font-bold tracking-tighter uppercase mb-2">Studio</h1>
                <p className="text-charcoal/50 max-w-2xl leading-relaxed">
                    A model wearing your own products, generated from the product images you
                    already have. No shoot, no studio, no booking.
                </p>
            </header>

            <StudioClient
                products={(products || []) as StudioProduct[]}
                initialAssets={(assets || []) as StudioAsset[]}
                canDescribeScene={SCENE_PLANS.has(merchant.plan)}
                isPremium={PREMIUM_PLANS.has(merchant.plan)}
                initialHouseModelUrl={merchant.house_model_url || null}
            />
        </div>
    );
}
