import { getMerchantForUser, serviceClient } from '../admin-util';
import { Settings, Save, AlertCircle } from 'lucide-react';
import { revalidatePath } from 'next/cache';
import { SITE_HOST } from '../../../lib/site';
import { ManageBilling } from './ManageBilling';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
    const merchant = await getMerchantForUser();

    // Server Action for updating settings
    async function updateSettings(formData: FormData) {
        'use server';

        if (!merchant) return;

        const brandName = formData.get('brandName') as string;
        if (!brandName) return;

        // Simple slug generation: lowercase and replace non-alphanumeric with hyphens
        const brandSlug = brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        await serviceClient
            .from('merchants')
            .update({
                brand_name: brandName,
                brand_slug: brandSlug,
            })
            .eq('id', merchant.id);

        revalidatePath('/admin/settings');
        revalidatePath('/admin');
    }

    if (!merchant) {
        return (
            <div className="p-12 text-center">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-charcoal/40" />
                <h2 className="text-2xl font-heading font-bold mb-2">No Merchant Profile</h2>
                <p className="text-charcoal/60">
                    You are logged in but not associated with a merchant account.
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl">
            <header className="mb-12">
                <h1 className="text-4xl font-heading font-bold tracking-tighter uppercase mb-2">
                    Store Settings
                </h1>
                <p className="text-charcoal/50">
                    Manage your brand identity and view your subscription details.
                </p>
            </header>

            <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-8 mb-8">
                <h3 className="text-xl font-heading font-bold mb-6 flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    BRAND PROFILE
                </h3>

                <form action={updateSettings} className="space-y-6">
                    <div>
                        <label htmlFor="brandName" className="block text-xs font-bold uppercase tracking-widest text-charcoal/60 mb-2">
                            Brand Name
                        </label>
                        <input
                            type="text"
                            id="brandName"
                            name="brandName"
                            defaultValue={merchant.brand_name || ''}
                            className="w-full px-4 py-3 bg-off-white border border-black/10 rounded-lg font-bold text-sm focus:outline-none focus:border-accent-gold transition-colors"
                            placeholder="Enter your brand name"
                            required
                        />
                        <p className="text-xs text-charcoal/40 mt-2">
                            This name will be displayed to customers in the marketplace.
                        </p>
                    </div>

                    <div className="pt-4">
                        <label className="block text-xs font-bold uppercase tracking-widest text-charcoal/60 mb-2">
                            Marketplace URL Slug
                        </label>
                        <div className="w-full px-4 py-3 bg-black/5 border border-black/5 rounded-lg font-mono text-sm text-charcoal/60 flex items-center gap-2">
                            <span className="opacity-50">{SITE_HOST}/marketplace/</span>
                            <span className="font-bold text-charcoal">{merchant.brand_slug || 'not-set'}</span>
                        </div>
                        <p className="text-xs text-charcoal/40 mt-2">
                            Your storefront URL is automatically generated from your brand name.
                        </p>
                    </div>

                    <div className="pt-6 border-t border-black/5 flex justify-end">
                        <button
                            type="submit"
                            className="px-6 py-3 bg-obsidian text-white rounded-lg font-bold text-sm shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" /> Save Changes
                        </button>
                    </div>
                </form>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-8">
                <h3 className="text-xl font-heading font-bold mb-6">
                    SUBSCRIPTION DETAILS
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-1">Current Plan</p>
                        <p className="font-mono font-bold text-lg uppercase">{merchant.plan || 'Free'}</p>
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-1">Stripe Customer ID</p>
                        <p className="font-mono text-sm text-charcoal/60 bg-off-white px-3 py-2 rounded break-all mt-1">
                            {merchant.stripe_customer_id || 'Not connected'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="mt-8">
                <ManageBilling />
            </div>
        </div>
    );
}
