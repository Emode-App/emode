'use client';

import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import Link from 'next/link';
import { Hero } from '../components/Hero';
import { Sparkles, Zap, Shield, Globe, Check, X, ArrowRight, ShoppingCart, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase/browser';
import { ConsumerApp } from '../components/ConsumerApp';
import { FAQ } from '../components/FAQ';
import { SHOPIFY_APP_STORE_URL } from '../lib/site';

export default function Home() {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'lifetime'>('monthly');
    const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

    // Catch sign-ins that were dropped here instead of on /auth/callback.
    //
    // Supabase redirects to the Site URL — this page — whenever the requested
    // redirect is not in its allowlist, and it does so silently. The browser
    // client still picks the code up off the URL, so the user IS signed in; they
    // are just standing on the landing page wondering why clicking a sign-in link
    // did nothing. Send them where they were going.
    //
    // This is a net, not the fix: the allowlist should contain the callback URL.
    // But an auth config typo should not be able to strand a paying merchant.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));

        // An expired or already-used link arrives as a hash fragment, which never
        // reaches the server — so nothing has ever reported these to the user.
        const authError = hash.get('error_description') || hash.get('error');
        if (authError) {
            window.location.replace(`/login?error=${encodeURIComponent(authError)}`);
            return;
        }

        if (!params.get('code')) return;

        // The client exchanges the code on init, so wait for the session rather
        // than racing it. Give up quietly if it never arrives — the page is
        // perfectly usable signed out.
        let attempts = 0;
        const timer = setInterval(async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                clearInterval(timer);
                window.location.replace('/auth/home');
            } else if (++attempts > 20) {
                clearInterval(timer);
            }
        }, 250);

        return () => clearInterval(timer);
    }, []);

    const handleCheckout = async (planId: string) => {
        setCheckoutLoading(planId);
        try {
            // Pass the signed-in user (if any) so the webhook can link the new
            // merchant to their emode account deterministically, instead of hoping
            // their Stripe checkout email matches their login email.
            const { data: { user } } = await supabase.auth.getUser();
            const res = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId, platform: 'widget', userId: user?.id }),
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                alert(data.error || 'Failed to start checkout');
            }
        } catch (err) {
            alert('Something went wrong. Please try again.');
        } finally {
            setCheckoutLoading(null);
        }
    };

    const features = [
        { icon: <Sparkles className="w-6 h-6" />, title: "Precision Generation", description: "Studio-grade virtual try-ons that respect fabric texture and drape." },
        { icon: <Zap className="w-6 h-6" />, title: "Real-time Dressing", description: "Instant visualizations across entire collections with zero latency." },
        { icon: <Shield className="w-6 h-6" />, title: "Secure Data", description: "Your customers' biometric data is encrypted and protected by RLS." },
        { icon: <Globe className="w-6 h-6" />, title: "Global Marketplace", description: "List your products in the emode marketplace for worldwide discovery." },
    ];

    const monthlyPlans = [
        {
            planId: 'starter',
            name: "Starter",
            price: "$29",
            period: "/mo",
            description: "Let customers see it on themselves.",
            features: ["Virtual try-on widget", "Embed on your website", "Basic analytics", "Emode branding"],
            notIncluded: ["AI model image generation", "Marketplace access", "Storefront"],
            cta: "Get Started",
            popular: false
        },
        {
            planId: 'pro',
            name: "Pro",
            price: "$79",
            period: "/mo",
            description: "Replace photoshoots with AI.",
            features: ["Everything in Starter", "AI-generated model images", "Asset library & management", "Advanced analytics", "Faster processing", "Remove Emode branding"],
            notIncluded: ["Marketplace access", "Storefront"],
            cta: "Go Pro",
            popular: true
        },
        {
            planId: 'growth',
            name: "Growth",
            price: "$149",
            period: "/mo",
            description: "Unlock distribution when it launches.",
            features: ["Everything in Pro", "Priority processing", "Early access features", "Marketplace access", "Dedicated Support"],
            notIncluded: [],
            cta: "Scale Growth",
            popular: false
        }
    ];

    const lifetimePlans = [
        {
            planId: 'lifetime_starter',
            name: "Lifetime Starter",
            price: "$299",
            period: "once",
            description: "Lock in the widget forever.",
            features: ["Lifetime Starter features", "Virtual try-on widget", "All future Starter updates"],
            notIncluded: ["AI model image generation", "Marketplace access", "Storefront"],
            cta: "Buy Starter",
            popular: false
        },
        {
            planId: 'lifetime_pro',
            name: "Lifetime Pro",
            price: "$699",
            period: "once",
            description: "Own your production pipeline.",
            features: ["Lifetime Pro features", "AI-generated model images (forever)", "Unlimited asset creation", "Locked-in Pro pricing for life"],
            notIncluded: ["Marketplace access", "Storefront"],
            cta: "Buy Pro",
            popular: false
        },
        {
            planId: 'lifetime_founder',
            name: "Lifetime Founder",
            price: "$1,299",
            period: "once",
            description: "Permanent distribution access.",
            features: ["EVERYTHING Included", "Lifetime access to all features", "Permanent marketplace access", "Guaranteed storefront", "Priority placement", "Custom domain support", "Founder badge"],
            notIncluded: [],
            cta: "Become Founder",
            popular: true
        }
    ];

    const currentPlans = billingCycle === 'monthly' ? monthlyPlans : lifetimePlans;

    return (
        <div className="min-h-screen">
            <Navbar />
            <Hero />

            {/* Features Section */}
            <section className="py-24 bg-off-white">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                        {features.map((feature, idx) => (
                            <div key={idx} className="group p-8 bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-black/5 hover:-translate-y-1">
                                <div className="w-12 h-12 rounded-xl bg-black/5 flex items-center justify-center mb-6 group-hover:bg-purple-gradient group-hover:text-white transition-colors duration-300">
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-heading font-bold mb-3">{feature.title}</h3>
                                <p className="text-charcoal/60 leading-relaxed text-sm">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Extensions Section */}
            <section className="py-24 bg-white" id="extensions">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-heading font-bold tracking-tighter mb-4">TRY ON ANYTHING, ANYWHERE</h2>
                        <p className="text-charcoal/50 max-w-2xl mx-auto">Access emodeAI through your favorite platforms and transform your shopping experience.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="p-10 bg-off-white rounded-[32px] border border-black/5 hover:shadow-xl transition-all group">
                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-8 shadow-sm group-hover:bg-accent-gold group-hover:text-white transition-colors">
                                <ShoppingCart className="w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-heading font-bold mb-4">Shopify Store</h3>
                            <p className="text-charcoal/60 text-sm leading-relaxed mb-8">Integrated directly into your product pages for seamless conversion.</p>
                            {/* Was href="#" -- a literal dead link on the actual
                                landing page. Clicking "Shopify App Store" did
                                nothing at all. */}
                            <a
                                href={SHOPIFY_APP_STORE_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm font-bold tracking-widest uppercase hover:gap-4 transition-all"
                            >
                                Shopify App Store <ArrowRight className="w-4 h-4" />
                            </a>
                        </div>
                        <div className="p-10 bg-off-white rounded-[32px] border border-black/5 hover:shadow-xl transition-all group">
                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-8 shadow-sm group-hover:bg-purple-gradient group-hover:text-white transition-colors">
                                <Globe className="w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-heading font-bold mb-4">Chrome Extension</h3>
                            <p className="text-charcoal/60 text-sm leading-relaxed mb-8">Try on clothing across any website with AI directly in your browser.</p>
                            <a href="#" className="inline-flex items-center gap-2 text-sm font-bold tracking-widest uppercase hover:gap-4 transition-all">Chrome Web Store <ArrowRight className="w-4 h-4" /></a>
                        </div>
                        <div className="p-10 bg-off-white rounded-[32px] border border-black/5 hover:shadow-xl transition-all group">
                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-8 shadow-sm group-hover:bg-purple-gradient group-hover:text-white transition-colors">
                                <Plus className="w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-heading font-bold mb-4">Embedded Widget</h3>
                            <p className="text-charcoal/60 text-sm leading-relaxed mb-8">Customizable JS injection for direct deployment. Restricted to Growth plans.</p>
                            <a href="#pricing" className="inline-flex items-center gap-2 text-sm font-bold tracking-widest uppercase hover:gap-4 transition-all text-accent-gold">View Plans <ArrowRight className="w-4 h-4" /></a>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section className="py-24 bg-off-white" id="pricing">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-5xl font-heading font-bold tracking-tighter mb-6">INVEST IN YOUR BRAND</h2>
                        <div className="flex items-center justify-center gap-4">
                            <span className={`text-sm font-bold tracking-widest uppercase ${billingCycle === 'monthly' ? 'text-black' : 'text-charcoal/40'}`}>Monthly</span>
                            <button
                                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'lifetime' : 'monthly')}
                                className="w-14 h-8 bg-black/5 rounded-full p-1 transition-all relative"
                            >
                                <div className={`w-6 h-6 bg-obsidian rounded-full transition-all ${billingCycle === 'lifetime' ? 'translate-x-6' : ''}`}></div>
                            </button>
                            <span className={`text-sm font-bold tracking-widest uppercase ${billingCycle === 'lifetime' ? 'text-black' : 'text-charcoal/40'}`}>Lifetime</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {currentPlans.map((plan, idx) => (
                            <div key={idx} className={`relative p-8 rounded-3xl border bg-white ${plan.popular ? 'border-accent-gold shadow-2xl' : 'border-black/5 shadow-sm'} flex flex-col`}>
                                {plan.popular && (
                                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-accent-gold text-black text-[10px] font-bold tracking-widest uppercase px-4 py-1 rounded-full">
                                        Most Popular
                                    </span>
                                )}
                                <div className="mb-8">
                                    <h3 className="text-2xl font-heading font-bold mb-2">{plan.name}</h3>
                                    <p className="text-charcoal/50 text-sm mb-6">{plan.description}</p>
                                    <div className="flex items-end gap-1">
                                        <span className="text-4xl font-heading font-bold">{plan.price}</span>
                                        <span className="text-charcoal/40 font-bold mb-1">{plan.period}</span>
                                    </div>
                                </div>

                                <ul className="flex-1 space-y-4 mb-10">
                                    {plan.features.map((feat, i) => (
                                        <li key={i} className="flex gap-3 text-sm">
                                            <Check className="w-4 h-4 text-green-500 shrink-0" />
                                            <span className="font-medium">{feat}</span>
                                        </li>
                                    ))}
                                    {plan.notIncluded.map((feat, i) => (
                                        <li key={i} className="flex gap-3 text-sm opacity-30">
                                            <X className="w-4 h-4 text-red-500 shrink-0" />
                                            <span className="font-medium line-through">{feat}</span>
                                        </li>
                                    ))}
                                </ul>

                                <div className="flex justify-center mt-auto pt-8">
                                    <button
                                        onClick={() => handleCheckout(plan.planId)}
                                        disabled={checkoutLoading === plan.planId}
                                        className={`w-fit px-12 py-4 rounded-xl font-bold tracking-widest uppercase text-sm transition-all disabled:opacity-50 ${plan.popular ? 'bg-accent-gold text-black hover:bg-yellow-500 shadow-lg shadow-accent-gold/20' : 'bg-obsidian text-white hover:bg-black'}`}
                                    >
                                        {checkoutLoading === plan.planId ? 'Loading...' : plan.cta}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-24 p-12 bg-off-white rounded-[40px] text-center max-w-4xl mx-auto border border-black/5">
                        <h4 className="text-sm font-bold tracking-[0.2em] text-accent-gold uppercase mb-6">Phase 2: Emode Marketplace</h4>
                        <p className="text-xl font-medium leading-relaxed mb-10">
                            The Emode marketplace connects shoppers with brands through permanent, priority access and preferential placement.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                            <div className="bg-white p-6 rounded-2xl border border-black/5">
                                <p className="text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-2">Growth (Monthly)</p>
                                <p className="text-sm font-medium">Marketplace access unlocks at launch and remains active while subscribed.</p>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-black/5">
                                <p className="text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-2">Lifetime Founder</p>
                                <p className="text-sm font-medium">Permanent, priority access with preferential placement and storefront.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Objections answered before the pitch for a different product. */}
            <FAQ />

            {/* After pricing: a brand reading this page came to install try-on,
                and should reach the plans before being told about an app they
                are not the customer for. */}
            <ConsumerApp />

            <Footer />
        </div>
    );
}
