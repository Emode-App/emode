import { Metadata } from 'next';
import { Navbar } from '../../../components/Navbar';
import { Footer } from '../../../components/Footer';
import { Shirt, Store, Layers, Link2, BarChart3, ShieldCheck } from 'lucide-react';
import { InquiryForm } from './InquiryForm';

export const metadata: Metadata = {
    title: 'Emode Mirror for stores | emode',
    description:
        'Put a life-size, Emode-branded try-on mirror on your store floor. Shoppers try your pieces on in seconds — no changing room queue.',
};

/**
 * Emode Mirror for stores.
 *
 * Written for a clothing retailer deciding whether to talk to us. It does not
 * assume they own a Proto display: most won't, and the form asks rather than
 * presumes. No prices yet -- pilots first.
 *
 * Each point is something the mirror does now: the rack is the store's Emode
 * shop listings, the name and logo show on the mirror's welcome screen, and
 * the dashboard is a private link per store. Setting a store up is still done
 * by us, which is why the page leads to a conversation rather than a sign-up.
 */

const POINTS = [
    {
        icon: <Shirt className="w-5 h-5" />,
        title: 'Your pieces, life-size',
        body: 'List your pieces in your Emode shop and they’re on the mirror. Shoppers tap one and see it on themselves, head to toe, in seconds — no phone needed, no changing-room queue.',
    },
    {
        icon: <Store className="w-5 h-5" />,
        title: 'Your store’s name on it',
        body: 'The mirror welcomes shoppers to Emode Mirror at your store, with your logo.',
    },
    {
        icon: <Layers className="w-5 h-5" />,
        title: 'With everything they already own',
        body: 'Shoppers on Emode bring their whole wardrobe to the mirror, so they see your jacket with their own jeans — the question every changing room is really answering.',
    },
    {
        icon: <Link2 className="w-5 h-5" />,
        title: 'Every look leads back to you',
        body: 'Looks go home on the shopper’s phone, with links to the pieces in them.',
    },
    {
        icon: <BarChart3 className="w-5 h-5" />,
        title: 'Your own dashboard',
        body: 'Visits, looks, the pieces people reach for most and whether each mirror is online — counted without keeping anyone’s photo.',
    },
    {
        icon: <ShieldCheck className="w-5 h-5" />,
        title: 'Private by design',
        body: 'One photo per visit, taken only with consent and deleted when the visit ends. No account needed for shoppers.',
    },
];

export default function MirrorBusinessPage() {
    return (
        <div className="min-h-screen bg-off-white text-charcoal">
            <Navbar />
            <main className="pt-32 pb-24 px-6">
                <div className="max-w-3xl mx-auto">
                    <header className="mb-14">
                        <p className="text-xs font-bold uppercase tracking-[0.25em] text-accent-gold mb-4">
                            Emode Mirror for stores
                        </p>
                        <h1 className="text-5xl md:text-6xl font-heading font-bold tracking-tighter leading-[0.95] mb-6">
                            A fitting room that never runs out of sizes.
                        </h1>
                        <p className="text-lg text-charcoal/50 leading-relaxed">
                            Put a life-size, Emode-branded try-on mirror on your floor. We&apos;re setting up our first
                            pilot stores now — tell us about yours.
                        </p>
                    </header>

                    <section className="grid sm:grid-cols-2 gap-x-10 gap-y-9 mb-20">
                        {POINTS.map((p) => (
                            <div key={p.title}>
                                <div className="w-10 h-10 rounded-full bg-obsidian text-white flex items-center justify-center mb-4">
                                    {p.icon}
                                </div>
                                <h2 className="text-lg font-heading font-semibold mb-1.5">{p.title}</h2>
                                <p className="text-charcoal/60 leading-relaxed text-[15px]">{p.body}</p>
                            </div>
                        ))}
                    </section>

                    <section id="inquire" className="rounded-3xl bg-white border border-black/5 shadow-sm p-7 md:p-10">
                        <h2 className="text-3xl font-heading font-bold tracking-tight mb-2">Talk to us</h2>
                        <p className="text-charcoal/50 mb-8">A few details and we&apos;ll be in touch about a pilot.</p>
                        <InquiryForm />
                    </section>
                </div>
            </main>
            <Footer />
        </div>
    );
}
