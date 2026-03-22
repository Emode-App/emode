'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@emode/database';
import { Check, Copy, Sparkles, ArrowRight, Store } from 'lucide-react';
import Link from 'next/link';

export default function OnboardingPage() {
    const searchParams = useSearchParams();
    const plan = searchParams.get('plan') || 'starter';
    const isCheckoutSuccess = searchParams.get('checkout') === 'success';

    const [merchantId, setMerchantId] = useState<string | null>(null);
    const [brandName, setBrandName] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [copied, setCopied] = useState(false);
    const [step, setStep] = useState<'welcome' | 'brand' | 'install'>(isCheckoutSuccess ? 'welcome' : 'install');

    useEffect(() => {
        // Try to find merchant for current user
        const loadMerchant = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: merchant } = await supabase
                    .from('merchants')
                    .select('id, brand_name')
                    .eq('owner_user_id', user.id)
                    .single();

                if (merchant) {
                    setMerchantId(merchant.id);
                    if (merchant.brand_name) setBrandName(merchant.brand_name);
                } else {
                    // Merchant may have been created by webhook with email match
                    // Try matching by email
                    const { data: merchantByEmail } = await supabase
                        .from('merchants')
                        .select('id, brand_name')
                        .eq('shop_domain', user.email || '')
                        .single();

                    if (merchantByEmail) {
                        setMerchantId(merchantByEmail.id);
                        if (merchantByEmail.brand_name) setBrandName(merchantByEmail.brand_name);
                    }
                }
            }
        };
        loadMerchant();
    }, []);

    const handleSaveBrand = async () => {
        if (!merchantId || !brandName.trim()) return;
        setSaving(true);

        const brandSlug = brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

        await supabase
            .from('merchants')
            .update({ brand_name: brandName.trim(), brand_slug: brandSlug })
            .eq('id', merchantId);

        setSaved(true);
        setSaving(false);
        setTimeout(() => setStep('install'), 1000);
    };

    const widgetCode = `<script src="${typeof window !== 'undefined' ? window.location.origin : 'https://emode.app'}/widget.js" data-emode-merchant="${merchantId || 'YOUR_MERCHANT_ID'}"></script>`;

    const handleCopy = () => {
        navigator.clipboard.writeText(widgetCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const planNames: Record<string, string> = {
        starter: 'Starter', pro: 'Pro', growth: 'Growth',
        lifetime_starter: 'Lifetime Starter', lifetime_pro: 'Lifetime Pro', lifetime_founder: 'Lifetime Founder',
    };

    if (step === 'welcome') {
        return (
            <div className="max-w-2xl mx-auto text-center py-20">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-bold mb-8">
                    <Check className="w-4 h-4" /> Payment Successful
                </div>
                <h1 className="text-5xl font-heading font-bold tracking-tighter mb-4">
                    Welcome to emodeAI
                </h1>
                <p className="text-xl text-charcoal/50 mb-2">
                    You're on the <span className="font-bold text-charcoal">{planNames[plan] || plan}</span> plan.
                </p>
                <p className="text-charcoal/40 mb-12">
                    Let's get your virtual try-on widget set up in under 2 minutes.
                </p>
                <button
                    onClick={() => setStep('brand')}
                    className="btn-generate px-8 py-4 text-sm font-bold uppercase tracking-widest inline-flex items-center gap-3"
                >
                    Let's Go <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        );
    }

    if (step === 'brand') {
        return (
            <div className="max-w-xl mx-auto py-20">
                <div className="flex items-center gap-3 mb-8">
                    <Store className="w-6 h-6 text-accent-gold" />
                    <h2 className="text-3xl font-heading font-bold tracking-tighter">Name Your Brand</h2>
                </div>
                <p className="text-charcoal/50 mb-8">
                    This is how your store will appear in the emode marketplace.
                </p>
                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-3">
                            Brand Name
                        </label>
                        <input
                            type="text"
                            value={brandName}
                            onChange={(e) => setBrandName(e.target.value)}
                            placeholder="e.g. Midnight Studios"
                            className="w-full bg-white border border-black/10 rounded-2xl py-4 px-6 focus:ring-2 focus:ring-purple-500 outline-none transition-all font-medium text-lg"
                        />
                    </div>
                    <button
                        onClick={handleSaveBrand}
                        disabled={saving || !brandName.trim()}
                        className="w-full btn-generate py-4 font-bold uppercase tracking-widest text-sm disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                        {saved ? (
                            <><Check className="w-4 h-4" /> Saved!</>
                        ) : saving ? 'Saving...' : (
                            <>Continue <ArrowRight className="w-4 h-4" /></>
                        )}
                    </button>
                </div>
            </div>
        );
    }

    // step === 'install'
    return (
        <div className="max-w-3xl mx-auto py-20">
            <div className="flex items-center gap-3 mb-4">
                <Sparkles className="w-6 h-6 text-accent-gold" />
                <h2 className="text-3xl font-heading font-bold tracking-tighter">Install Your Widget</h2>
            </div>
            <p className="text-charcoal/50 mb-10">
                Paste this single line of code into your website's HTML, just before the closing <code className="bg-black/5 px-2 py-1 rounded text-sm">&lt;/body&gt;</code> tag.
            </p>

            {/* Code Block */}
            <div className="relative bg-obsidian rounded-2xl p-6 mb-8 group">
                <pre className="text-green-400 text-sm font-mono overflow-x-auto whitespace-pre-wrap break-all">
                    {widgetCode}
                </pre>
                <button
                    onClick={handleCopy}
                    className="absolute top-4 right-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2"
                >
                    {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                </button>
            </div>

            {/* Platform Instructions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="p-6 bg-white rounded-2xl border border-black/5">
                    <h4 className="font-bold text-sm mb-2">Shopify</h4>
                    <p className="text-xs text-charcoal/50">
                        Go to Online Store → Themes → Edit code → Find <code>theme.liquid</code> → Paste before <code>&lt;/body&gt;</code>
                    </p>
                </div>
                <div className="p-6 bg-white rounded-2xl border border-black/5">
                    <h4 className="font-bold text-sm mb-2">WordPress</h4>
                    <p className="text-xs text-charcoal/50">
                        Go to Appearance → Theme Editor → footer.php → Paste before <code>&lt;/body&gt;</code>
                    </p>
                </div>
                <div className="p-6 bg-white rounded-2xl border border-black/5">
                    <h4 className="font-bold text-sm mb-2">Custom HTML</h4>
                    <p className="text-xs text-charcoal/50">
                        Add the script tag to every page where you want virtual try-on buttons to appear.
                    </p>
                </div>
            </div>

            <div className="flex gap-4">
                <Link
                    href="/admin"
                    className="btn-generate px-8 py-4 text-sm font-bold uppercase tracking-widest inline-flex items-center gap-3"
                >
                    Go to Dashboard <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                    href="/admin/install"
                    className="px-8 py-4 bg-white border border-black/10 rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-black/5 transition-colors"
                >
                    View Later
                </Link>
            </div>
        </div>
    );
}
