'use client';

import { useState } from 'react';
import { Sparkles, Users, ShoppingBag, ArrowRight, Check } from 'lucide-react';

/**
 * The consumer app, on the merchant landing page.
 *
 * Two audiences share this page now, and they want opposite things: a brand is
 * here to install try-on on their own storefront, a shopper is here for the app.
 * Kept as one clearly-bounded section below the merchant pitch rather than
 * threaded through it, so neither reads as a digression from the other.
 *
 * Store buttons render as real buttons and say "Coming soon" on hover, per the
 * brief. Linking to store pages that 404 would be worse than not linking, and a
 * greyed-out rectangle communicates less than a button that tells you why it is
 * not working yet.
 */

const PILLARS = [
    {
        icon: <Sparkles className="w-5 h-5" />,
        title: 'AI virtual try-on',
        body: 'Drop a photo, drop a fit, see yourself wearing it. The same engine merchants run on their storefronts, pointed at anything you find.',
    },
    {
        icon: <Users className="w-5 h-5" />,
        title: 'A feed built on outfits',
        body: 'Follow people whose taste you trust, post your looks, and see clothes on bodies that look like yours instead of on a model who was cast.',
    },
    {
        icon: <ShoppingBag className="w-5 h-5" />,
        title: 'Shop what you see',
        body: 'Every piece in a post is linked. Try it on before you buy it — new or secondhand.',
    },
];

function StoreButton({ label, sub }: { label: string; sub: string }) {
    return (
        <div className="group relative">
            <button
                type="button"
                aria-disabled="true"
                className="w-full sm:w-auto flex items-center gap-3 px-6 py-3.5 bg-obsidian text-white rounded-xl cursor-default transition-colors group-hover:bg-black/70"
            >
                <span className="text-left leading-tight">
                    <span className="block text-[10px] uppercase tracking-widest text-white/50 group-hover:opacity-0 transition-opacity">
                        {sub}
                    </span>
                    <span className="block text-sm font-bold group-hover:opacity-0 transition-opacity">{label}</span>
                </span>
            </button>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold uppercase tracking-widest text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Coming soon
            </span>
        </div>
    );
}

export function ConsumerApp() {
    const [email, setEmail] = useState('');
    const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
    const [error, setError] = useState<string | null>(null);

    const join = async (e: React.FormEvent) => {
        e.preventDefault();
        setState('sending');
        setError(null);
        try {
            const res = await fetch('/api/waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, source: 'landing' }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Could not add you just now.');
            setState('done');
        } catch (err: any) {
            setError(err.message);
            setState('idle');
        }
    };

    return (
        <section id="app" className="py-24 bg-obsidian text-white">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[10px] font-bold uppercase tracking-widest mb-8">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent-gold" />
                            Now in private beta
                        </div>

                        <h2 className="text-5xl md:text-6xl font-heading font-bold leading-[0.95] tracking-tighter mb-6">
                            And one for<br />
                            <span className="text-accent-gold">everyone else.</span>
                        </h2>

                        <p className="text-lg text-white/60 leading-relaxed mb-10 max-w-xl">
                            emode is also an app. The try-on engine brands put on their storefronts,
                            plus a social feed and a marketplace — so you can see a piece on yourself,
                            share the look, and shop it, wherever you found it.
                        </p>

                        <div className="space-y-8 mb-12">
                            {PILLARS.map((p) => (
                                <div key={p.title} className="flex gap-4">
                                    <div className="p-2 h-fit bg-white/10 rounded-lg text-accent-gold shrink-0">{p.icon}</div>
                                    <div>
                                        <h3 className="font-bold mb-1">{p.title}</h3>
                                        <p className="text-sm text-white/50 leading-relaxed max-w-md">{p.body}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <p className="text-xs uppercase tracking-widest text-white/30 mb-4">iOS · Android · Web</p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <StoreButton sub="Download on the" label="App Store" />
                            <StoreButton sub="Get it on" label="Google Play" />
                        </div>
                    </div>

                    <div className="lg:pt-24">
                        <div className="p-8 sm:p-10 bg-white/5 border border-white/10 rounded-3xl">
                            {state === 'done' ? (
                                <div className="text-center py-6">
                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent-gold text-black mb-6">
                                        <Check className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-2xl font-heading font-bold mb-3">You&apos;re on the list.</h3>
                                    <p className="text-sm text-white/50 leading-relaxed">
                                        We let people in a few at a time, so it stays good. You&apos;ll hear
                                        from us when your spot opens.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <h3 className="text-2xl font-heading font-bold mb-3">Get early access</h3>
                                    <p className="text-sm text-white/50 leading-relaxed mb-8">
                                        We let people in a few at a time. No spam — you&apos;ll hear from us
                                        when your spot opens, and not otherwise.
                                    </p>

                                    <form onSubmit={join} className="space-y-3">
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="you@example.com"
                                            aria-label="Email address"
                                            className="w-full bg-white/5 border border-white/15 rounded-xl py-4 px-5 text-white placeholder:text-white/25 focus:outline-none focus:border-accent-gold transition-colors"
                                        />
                                        <button
                                            type="submit"
                                            disabled={state === 'sending'}
                                            className="w-full py-4 bg-accent-gold text-black rounded-xl text-xs font-bold uppercase tracking-widest hover:scale-[1.01] transition-transform disabled:opacity-50 inline-flex items-center justify-center gap-2"
                                        >
                                            {state === 'sending' ? 'Joining…' : <>Join the waitlist <ArrowRight className="w-4 h-4" /></>}
                                        </button>
                                        {error && <p className="text-xs text-red-300 pt-1">{error}</p>}
                                    </form>

                                    <div className="mt-8 pt-8 border-t border-white/10">
                                        <div className="group relative">
                                            <button
                                                type="button"
                                                aria-disabled="true"
                                                className="w-full py-4 border border-white/15 rounded-xl text-xs font-bold uppercase tracking-widest cursor-default transition-colors group-hover:bg-white/5"
                                            >
                                                <span className="group-hover:opacity-0 transition-opacity">Join the Discord</span>
                                            </button>
                                            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                Coming soon
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-white/30 mt-3 text-center">
                                            Drops, previews, and the styling chaos.
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
