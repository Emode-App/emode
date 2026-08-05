'use client';
import { SITE_URL } from '../../../lib/site';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase/browser';
import { Check, Copy, Sparkles, ArrowRight, Store } from 'lucide-react';
import Link from 'next/link';
import { WidgetInstallCode } from '../components/WidgetInstallCode';

export default function OnboardingPage() {
    const searchParams = useSearchParams();
    const plan = searchParams.get('plan') || 'starter';
    const isCheckoutSuccess = searchParams.get('checkout') === 'success';

    const [merchantId, setMerchantId] = useState<string | null>(null);
    const [brandName, setBrandName] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [copied, setCopied] = useState(false);
    const [lookupError, setLookupError] = useState<string | null>(null);
    const [buyerEmail, setBuyerEmail] = useState('');
    const [signedIn, setSignedIn] = useState(false);
    const [step, setStep] = useState<'welcome' | 'brand' | 'install'>(isCheckoutSuccess ? 'welcome' : 'install');

    useEffect(() => {
        // Try to find merchant for current user
        const loadMerchant = async () => {
            const { data: { user } } = await supabase.auth.getUser();

            // Signed out, straight off a payment. This is the common case for a
            // brand that found emode on the pricing page: they have a merchant
            // account created by the webhook and no login yet, so the checkout
            // session is the only thing that can identify them. Without this the
            // install snippet says YOUR_MERCHANT_ID and they are stuck holding a
            // receipt.
            if (!user) {
                const sessionId = searchParams.get('session_id');
                if (!sessionId) return;
                try {
                    const res = await fetch(`/api/merchant/by-session?session_id=${encodeURIComponent(sessionId)}`);
                    const data = await res.json();
                    if (res.ok && data.merchantId) {
                        setMerchantId(data.merchantId);
                        setBuyerEmail(data.email || '');
                        if (data.brandName) setBrandName(data.brandName);
                    } else {
                        setLookupError(data.error || 'Could not find your account.');
                    }
                } catch {
                    setLookupError('Could not reach emode. Check your connection and refresh.');
                }
                return;
            }

            if (user) {
                setSignedIn(true);
                setBuyerEmail(user.email || '');
                // Newest first rather than .single(): owning two stores is ordinary,
                // and .single() would treat the second as an error and find nothing.
                // Right after a purchase the newest is the one just bought.
                const { data: owned } = await supabase
                    .from('merchants')
                    .select('id, brand_name')
                    .eq('owner_user_id', user.id)
                    .order('created_at', { ascending: false });

                const merchant = owned?.[0];
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
                        .maybeSingle();

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

    const widgetCode = `<script src="${typeof window !== 'undefined' ? window.location.origin : SITE_URL}/widget.js" data-emode-merchant="${merchantId || 'YOUR_MERCHANT_ID'}"></script>`;

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
                {/* Naming the brand writes to the merchants table, which RLS blocks
                    for a buyer who has not signed in yet. Sending them into a step
                    that cannot save would be worse than skipping it — the name is
                    editable later in Settings. */}
                <button
                    onClick={() => setStep(signedIn ? 'brand' : 'install')}
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

            {lookupError && (
                <div className="mb-8 p-5 rounded-2xl bg-red-50 border border-red-100 text-sm text-red-700">
                    {lookupError}{' '}
                    <Link href="/login" className="underline font-bold">Sign in</Link> with the email
                    you paid with to get your key.
                </div>
            )}

            {/* Code Block */}
            <div className="mb-8">
                <WidgetInstallCode merchantId={merchantId || ''} />
            </div>

            {/* Paying does not create a login, so a merchant can be correctly
                installed and still have no way back to their own dashboard. */}
            {merchantId && !signedIn && (
                <div className="mb-12 p-6 rounded-2xl bg-white border border-black/5">
                    <h4 className="font-bold text-sm mb-2">Create your account</h4>
                    <p className="text-sm text-charcoal/50 mb-4">
                        Your widget works right now without one. Sign in with
                        {buyerEmail ? <b> {buyerEmail}</b> : ' the email you paid with'} to see try-on
                        counts, conversion and revenue, and to manage your plan.
                    </p>
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-obsidian text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors"
                    >
                        Sign in <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            )}

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
