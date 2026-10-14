import { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { TESTFLIGHT_URL } from '../../lib/site';
import { ArrowRight, ScanLine, Send, PersonStanding, ShieldCheck, Store } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Emode Mirror | emode',
    description:
        'A life-size mirror that dresses you in anything — screenshots from any store, product links, or your own Emode wardrobe. No changing room.',
};

/**
 * Emode Mirror.
 *
 * Two readers: someone who just stood in front of one and wants to know what
 * it was, and a store wondering whether to get one. The first is answered in
 * three steps; the second is sent to /mirror/business. Every claim here is
 * something the mirror actually does today -- the privacy section especially,
 * because it is the part a shopper and a store's lawyer will both check.
 *
 * No product imagery yet, on purpose: there are no photos of a real mirror
 * running it, and a render presented as the thing would be a promise.
 */

const STEPS = [
    {
        icon: <ScanLine className="w-5 h-5" />,
        title: 'Scan the code on the mirror',
        body: 'Point your phone’s camera at it. A page opens — no app or account needed to start.',
    },
    {
        icon: <Send className="w-5 h-5" />,
        title: 'Send the clothes',
        body: 'Screenshots from any store, product links, or — if you’re on Emode — pieces straight from your wardrobe. They appear on the mirror as you send them.',
    },
    {
        icon: <PersonStanding className="w-5 h-5" />,
        title: 'Step back and see it on you',
        body: 'The mirror takes one photo and shows you wearing what you picked, life-size, head to toe. Swap pieces, try combinations, keep the looks you love on your phone.',
    },
];

const PRIVACY = [
    'One photo, taken only after you agree to it.',
    'Deleted the moment you finish — or if you walk away.',
    'Your looks wait on your phone for an hour so you can save them, then they’re deleted too.',
    'No account needed. Nothing about you is shown on the mirror.',
];

export default function MirrorPage() {
    return (
        <div className="min-h-screen bg-off-white text-charcoal">
            <Navbar />
            <main className="pt-32 pb-24 px-6">
                <div className="max-w-3xl mx-auto">
                    <header className="mb-16">
                        <p className="text-xs font-bold uppercase tracking-[0.25em] text-accent-gold mb-4">
                            Emode Mirror
                        </p>
                        <h1 className="text-5xl md:text-6xl font-heading font-bold tracking-tighter leading-[0.95] mb-6">
                            Your wardrobe.<br />Larger than life.
                        </h1>
                        <p className="text-lg text-charcoal/50 leading-relaxed mb-10">
                            A life-size mirror that dresses you in anything — from any store, or from your
                            own Emode wardrobe — without ever stepping into a changing room.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Link href="/mirror/business" className="btn-primary py-3 px-7 rounded-full font-semibold inline-flex items-center justify-center gap-2">
                                Bring Emode Mirror to your store <ArrowRight className="w-4 h-4" />
                            </Link>
                            <a href={TESTFLIGHT_URL} target="_blank" rel="noopener noreferrer"
                                className="py-3 px-7 rounded-full font-semibold border border-black/15 hover:border-black/40 transition-colors text-center">
                                Get the Emode app
                            </a>
                        </div>
                        <p className="mt-5 text-sm text-charcoal/40">Pilot locations coming soon.</p>
                    </header>

                    <section className="mb-20">
                        <h2 className="text-xs font-bold uppercase tracking-[0.25em] text-charcoal/40 mb-8">How it works</h2>
                        <ol className="space-y-10">
                            {STEPS.map((step, i) => (
                                <li key={step.title} className="flex gap-5">
                                    <div className="shrink-0 w-11 h-11 rounded-full bg-obsidian text-white flex items-center justify-center">
                                        {step.icon}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-heading font-semibold mb-2">
                                            <span className="text-charcoal/30 mr-2">{i + 1}</span>{step.title}
                                        </h3>
                                        <p className="text-charcoal/60 leading-relaxed">{step.body}</p>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </section>

                    <section className="mb-20 rounded-3xl bg-obsidian text-white p-8 md:p-10">
                        <div className="flex items-center gap-3 mb-5">
                            <ShieldCheck className="w-5 h-5 text-accent-gold" />
                            <p className="text-xs font-bold uppercase tracking-[0.25em] text-accent-gold">Private by design</p>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-heading font-bold tracking-tight mb-6">One photo. Then it’s gone.</h2>
                        <ul className="space-y-3">
                            {PRIVACY.map((line) => (
                                <li key={line} className="flex gap-3 text-white/75 leading-relaxed">
                                    <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-accent-gold shrink-0" />
                                    {line}
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section className="rounded-3xl border border-black/10 p-8 md:p-10">
                        <Store className="w-6 h-6 text-accent-gold mb-4" />
                        <h2 className="text-3xl font-heading font-bold tracking-tight mb-3">Run a clothing store?</h2>
                        <p className="text-charcoal/60 leading-relaxed mb-6">
                            Put an Emode Mirror on your floor. Shoppers try your pieces on life-size in seconds,
                            with their own wardrobe alongside — and every look goes home with them, linked back to you.
                        </p>
                        <Link href="/mirror/business" className="inline-flex items-center gap-2 font-semibold hover:text-accent-gold transition-colors">
                            Talk to us about a mirror <ArrowRight className="w-4 h-4" />
                        </Link>
                    </section>
                </div>
            </main>
            <Footer />
        </div>
    );
}
