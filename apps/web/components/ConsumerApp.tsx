'use client';

import { useState } from 'react';
import { Sparkles, Users, Tag, Scissors, ArrowRight, Check } from 'lucide-react';
import { DISCORD_INVITE_URL, TESTFLIGHT_URL } from '../lib/site';

/**
 * The consumer app, on the merchant landing page.
 *
 * Two audiences share this page now and want opposite things: a brand is here to
 * put try-on on their own storefront, a shopper is here for the app. Kept as one
 * bounded section after pricing rather than threaded through the merchant pitch.
 *
 * Framed as phase three deliberately. The app is real and in private beta, and
 * saying where it sits in the plan is what makes the merchant pitch above it read
 * as the first step of something rather than as the whole idea.
 */

const SCREENS = [
    { src: '/app/01-feed.jpg', alt: 'The emode feed: an outfit post tagged with the brands worn', tilt: '-rotate-2' },
    { src: '/app/02-tryon.jpg', alt: 'AI try-on: two secondhand items rendered onto a person as one outfit', tilt: 'rotate-1' },
    { src: '/app/03-shop.jpg', alt: 'Tapping a post reveals the exact pieces in it, with prices and links', tilt: '-rotate-1' },
    { src: '/app/04-sell.jpg', alt: 'A profile selling listings directly, with sizes, condition and prices', tilt: 'rotate-2' },
];

const PILLARS = [
    {
        icon: <Sparkles className="w-5 h-5" />,
        title: 'Try it on before you buy it',
        body: 'Drop a photo, drop a fit, see yourself wearing it. The same engine brands run on their storefronts, pointed at anything you find anywhere.',
    },
    {
        icon: <Users className="w-5 h-5" />,
        title: 'A feed built on outfits',
        body: 'Follow people whose taste you trust. See clothes on bodies that look like yours, instead of on a model who was cast.',
    },
    {
        icon: <Tag className="w-5 h-5" />,
        title: 'Sell your closet — and let buyers try it on',
        body: 'List secondhand pieces the way you would anywhere else. The difference: a buyer can see the piece on themselves before they commit. Nobody else can do that, because nobody else has the try-on engine underneath the marketplace.',
    },
    {
        icon: <Scissors className="w-5 h-5" />,
        title: 'Style other people',
        body: 'Build looks on someone else and send them. Stylists get a storefront where the work is the product, and a client sees the fit on themselves before a single piece is bought.',
    },
];

/**
 * The official Apple and Google store badges.
 *
 * Rendered unmodified, which both companies require — no recolouring, no
 * redrawing, no squashing to fit. Both supplied lockups are black on black, and
 * this section is near-black, so they sit on a light plate rather than being
 * altered to suit the background. Apple ships a white lockup for dark surfaces
 * if that reads better; swapping the file is the only change needed.
 *
 * Sized by height so the two match optically, since their artboards differ
 * (119.66x40 against 180x53.33).
 */
function StoreBadges() {
    return (
        <div className="group relative">
            <div className="flex items-center justify-center gap-3 p-4 bg-white rounded-2xl transition-opacity group-hover:opacity-25">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/badges/app-store.svg" alt="Download on the App Store" className="h-10 w-auto" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/badges/google-play.svg" alt="Get it on Google Play" className="h-10 w-auto" />
            </div>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold uppercase tracking-widest text-obsidian opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Coming soon
            </span>
        </div>
    );
}

function ComingSoonButton({
    label,
    variant = 'solid',
}: {
    label: string;
    variant?: 'solid' | 'outline';
}) {
    const base =
        variant === 'solid'
            ? 'bg-white text-obsidian group-hover:bg-white/80'
            : 'border border-white/15 text-white group-hover:bg-white/5';

    return (
        <div className="group relative">
            <button
                type="button"
                aria-disabled="true"
                aria-label={`${label} — coming soon`}
                className={`w-full flex items-center justify-center px-6 py-3.5 rounded-xl cursor-default transition-colors ${base}`}
            >
                <span className="text-sm font-bold group-hover:opacity-0 transition-opacity">{label}</span>
            </button>
            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
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
        <section id="app" className="py-24 bg-obsidian text-white overflow-hidden">
            <div className="max-w-7xl mx-auto px-6">
                <div className="max-w-3xl mb-16">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[10px] font-bold uppercase tracking-widest mb-8">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-gold" />
                        Phase 3 · Now in private beta
                    </div>

                    <h2 className="text-5xl md:text-7xl font-heading font-bold leading-[0.92] tracking-tighter mb-6">
                        The storefront is<br />
                        <span className="text-accent-gold">where it starts.</span>
                    </h2>

                    <p className="text-lg text-white/60 leading-relaxed">
                        First the widget, then the marketplace, then this: emode as an app.
                        The try-on engine brands put on their product pages, plus a social feed
                        and a place to buy and sell — so you can see a piece on yourself, share
                        the look, and shop it, wherever you found it.
                    </p>
                </div>

                {/* Screens before the feature list. A try-on app is a visual claim,
                    and describing it in prose to someone who has not seen it asks
                    them to take the whole thing on faith.

                    No border: these are already cards on a cream ground, and a
                    white hairline around each one reads as a rendering artefact
                    rather than a frame. Depth comes from the shadow.

                    Tilted, and straightening on hover. Vertical padding on the
                    scroller so the rotated corners are not clipped by it. */}
                <div className="-mx-6 px-6 py-6 mb-16 overflow-x-auto">
                    <div className="flex gap-5 min-w-max sm:min-w-0 sm:grid sm:grid-cols-2 lg:grid-cols-4">
                        {SCREENS.map((s) => (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                                key={s.src}
                                src={s.src}
                                alt={s.alt}
                                loading="lazy"
                                className={`w-64 sm:w-full rounded-2xl shadow-2xl transition-transform duration-500 ease-out hover:rotate-0 hover:scale-[1.03] ${s.tilt}`}
                            />
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
                    <div className="space-y-8">
                        {PILLARS.map((p) => (
                            <div key={p.title} className="flex gap-4">
                                <div className="p-2 h-fit bg-white/10 rounded-lg text-accent-gold shrink-0">{p.icon}</div>
                                <div>
                                    <h3 className="font-bold mb-1.5">{p.title}</h3>
                                    <p className="text-sm text-white/50 leading-relaxed max-w-md">{p.body}</p>
                                </div>
                            </div>
                        ))}
                    </div>

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
                                    {/* The one CTA here that isn't "coming soon" — the iOS
                                        build is real and installable today via TestFlight,
                                        which is why it gets the solid gold treatment the
                                        greyed-out store badges below deliberately don't. */}
                                    <a
                                        href={TESTFLIGHT_URL}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-accent-gold text-black hover:scale-[1.01] transition-transform"
                                    >
                                        <span className="text-sm font-bold">Join the iOS Beta</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </a>
                                    <p className="text-[11px] text-white/30 mt-3 mb-6 text-center">
                                        iOS only for now, via TestFlight.
                                    </p>

                                    <p className="text-[10px] uppercase tracking-widest text-white/30 mb-3">
                                        iOS · Android · Web
                                    </p>
                                    <div className="mb-3">
                                        <StoreBadges />
                                    </div>
                                    {/* Was a ComingSoonButton. The server exists now, so
                                        this is a real link — a disabled button on a
                                        landing page teaches people the brand is not
                                        ready yet, and that is expensive to unlearn. */}
                                    <a
                                        href={DISCORD_INVITE_URL}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full flex items-center justify-center px-6 py-3.5 rounded-xl border border-white/15 text-white hover:bg-white/5 transition-colors"
                                    >
                                        <span className="text-sm font-bold">Join the Discord</span>
                                    </a>
                                    <p className="text-[11px] text-white/30 mt-3 text-center">
                                        Drops, previews, and the styling chaos.
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
