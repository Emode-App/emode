'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { supabase } from '../../../lib/supabase/browser';

/**
 * Must agree with PLAN_CONFIG in lib/stripe-plan-config.ts, which is what
 * /api/generate actually enforces.
 *
 * Growth used to say "Unlimited try-ons" and "Unlimited generations". No plan
 * has been unlimited since allowances moved to 500/2000/5000 — an unbounded
 * tier is an unbounded bill for us, because every try-on is a paid image
 * generation. So the page promised something the system stops, and the person
 * who found out would be a Growth customer mid-campaign, which is a refund and
 * a bad review rather than a support ticket.
 */
const PLANS = [
    {
        planId: 'starter',
        name: 'Starter',
        price: '$29',
        period: '/mo',
        blurb: 'Let customers see it on themselves.',
        features: ['500 try-ons a day', 'Virtual try-on widget', 'Embed on any website', 'Basic analytics'],
    },
    {
        planId: 'pro',
        name: 'Pro',
        price: '$79',
        period: '/mo',
        blurb: 'For brands that are scaling.',
        features: ['2,000 try-ons a day', 'Everything in Starter', 'Marketplace listing', 'Advanced analytics', 'No emode branding'],
        featured: true,
    },
    {
        planId: 'growth',
        name: 'Growth',
        price: '$149',
        period: '/mo',
        blurb: 'For high-traffic catalogues.',
        features: ['5,000 try-ons a day', 'Everything in Pro', 'Model photography', 'Priority processing'],
    },
];

/**
 * What a merchant sees between signing up and buying.
 *
 * That state had no screen of its own. Someone who hit "Join emode" first landed
 * on a dashboard built for a merchant they were not yet, with no route to
 * becoming one — no plan, no key, no call to action. The only way to buy was to
 * go back out to the marketing page and find the pricing section again.
 *
 * Checkout carries the signed-in user id, so the Stripe webhook links the new
 * merchant to this account directly instead of hoping the address they type into
 * Stripe matches the one they signed up with.
 */
export function ChoosePlan({ email }: { email?: string }) {
    const [loading, setLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const buy = async (planId: string) => {
        setLoading(planId);
        setError(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const res = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId, platform: 'widget', userId: user?.id }),
            });
            const data = await res.json();
            if (data.url) window.location.href = data.url;
            else throw new Error(data.error || 'Could not start checkout.');
        } catch (err: any) {
            setError(err.message || 'Something went wrong. Please try again.');
            setLoading(null);
        }
    };

    return (
        <div className="max-w-6xl">
            <header className="mb-12">
                <h1 className="text-4xl font-heading font-bold tracking-tighter uppercase mb-3">
                    Choose your plan
                </h1>
                <p className="text-charcoal/50 max-w-xl">
                    You&apos;re signed in{email ? <> as <b className="text-charcoal">{email}</b></> : null}.
                    Pick a plan to get your store key — then it&apos;s one line of code on your site
                    and the try-on buttons appear on every product page.
                </p>
            </header>

            {error && (
                <div className="mb-8 p-5 rounded-2xl bg-red-50 border border-red-100 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                {PLANS.map((plan) => (
                    <div
                        key={plan.planId}
                        className={`p-8 rounded-2xl border transition-all ${
                            plan.featured
                                ? 'bg-obsidian text-white border-transparent shadow-xl'
                                : 'bg-white border-black/5 shadow-sm'
                        }`}
                    >
                        <h3 className="text-xl font-heading font-bold mb-1">{plan.name}</h3>
                        <p className={`text-sm mb-6 ${plan.featured ? 'text-white/50' : 'text-charcoal/50'}`}>
                            {plan.blurb}
                        </p>
                        <div className="flex items-baseline gap-1 mb-8">
                            <span className="text-4xl font-heading font-bold tracking-tighter">{plan.price}</span>
                            <span className={plan.featured ? 'text-white/40' : 'text-charcoal/40'}>{plan.period}</span>
                        </div>
                        <ul className="space-y-3 mb-8">
                            {plan.features.map((f) => (
                                <li key={f} className="flex items-start gap-2 text-sm">
                                    <Check className={`w-4 h-4 mt-0.5 shrink-0 ${plan.featured ? 'text-accent-gold' : 'text-charcoal/40'}`} />
                                    <span className={plan.featured ? 'text-white/80' : 'text-charcoal/70'}>{f}</span>
                                </li>
                            ))}
                        </ul>
                        <button
                            onClick={() => buy(plan.planId)}
                            disabled={loading !== null}
                            className={`w-full py-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all inline-flex items-center justify-center gap-2 disabled:opacity-50 ${
                                plan.featured
                                    ? 'bg-accent-gold text-black hover:scale-[1.02]'
                                    : 'bg-obsidian text-white hover:bg-black'
                            }`}
                        >
                            {loading === plan.planId ? 'Starting checkout…' : <>Get {plan.name} <ArrowRight className="w-4 h-4" /></>}
                        </button>
                    </div>
                ))}
            </div>

            <p className="text-sm text-charcoal/40">
                Prefer to pay once?{' '}
                <Link href="/#pricing" className="underline font-medium text-charcoal/60 hover:text-charcoal">
                    Lifetime plans are on the pricing page.
                </Link>
            </p>
        </div>
    );
}
