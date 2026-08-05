import { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { ArrowRight, Code2, Sparkles, LayoutGrid, BarChart3, ShoppingBag, Store } from 'lucide-react';

export const metadata: Metadata = {
    title: 'How it works | emode',
    description:
        'What happens when a shopper taps Try This On, how emode finds your products, and what you get back.',
};

/**
 * How it works.
 *
 * Written for a merchant deciding whether to install, so it follows the order
 * they will actually experience: install, what a shopper sees, what comes back.
 * Concrete throughout — the real snippet, the real button labels, the real
 * detection order — because vagueness on this page reads as evasion about
 * whether the thing works.
 */

const STEPS = [
    {
        icon: <Code2 className="w-5 h-5" />,
        title: 'One line on your store',
        body: (
            <>
                <p className="mb-4">
                    On Shopify, install the app and add the block to your product page —
                    no code at all. Everywhere else, this goes before your closing
                    <code className="mx-1 px-1.5 py-0.5 bg-black/5 rounded text-[13px]">&lt;/body&gt;</code>
                    tag:
                </p>
                <pre className="p-4 bg-obsidian text-gray-300 rounded-xl text-xs overflow-x-auto font-mono">
{`<script src="https://www.emode.style/widget.js"
        data-emode-merchant="YOUR_KEY"></script>`}
                </pre>
                <p className="mt-4">
                    That is the whole installation. There is no per-product setup, no
                    catalogue upload, and nothing to keep in sync.
                </p>
            </>
        ),
    },
    {
        icon: <LayoutGrid className="w-5 h-5" />,
        title: 'It finds your products by itself',
        body: (
            <>
                <p className="mb-4">
                    On every page it looks for a product in three ways, best first:
                </p>
                <ol className="space-y-2 list-decimal ml-5 marker:text-charcoal/30">
                    <li>
                        <b>Structured data</b> — the schema.org product markup your store
                        already publishes for Google. Shopify, WooCommerce, Squarespace and
                        most luxury houses all emit it.
                    </li>
                    <li>
                        <b>OpenGraph tags</b> — the same metadata that builds a link preview
                        when someone shares your product.
                    </li>
                    <li>
                        <b>The page itself</b> — anchored on your add-to-cart button, which is
                        what actually distinguishes a product page from a collection grid.
                    </li>
                </ol>
                <p className="mt-4">
                    If none of the three finds a product, nothing is drawn. The buttons never
                    appear on your homepage or your journal.
                </p>
            </>
        ),
    },
    {
        icon: <Sparkles className="w-5 h-5" />,
        title: 'A shopper sees it on themselves',
        body: (
            <>
                <p className="mb-4">
                    Two buttons appear beside your buy button:{' '}
                    <b>Try This On</b> and <b>Dressing Room</b>. Tapping the first opens a
                    panel over your page — your storefront stays where it is.
                </p>
                <p className="mb-4">
                    The shopper uploads a photo and sees your garment on their own body a few
                    seconds later. No account, no measurements, no app to install.
                </p>
                <p>
                    The Dressing Room is where it stops being a gimmick: they add several
                    pieces, then see the whole outfit on themselves at once. That is the
                    thing a photograph on a model cannot do.
                </p>
            </>
        ),
    },
    {
        icon: <BarChart3 className="w-5 h-5" />,
        title: 'You find out whether it sold anything',
        body: (
            <>
                <p className="mb-4">
                    From the first page view: product views, try-ons, try-on rate, and a
                    per-product breakdown of which pieces people want to see on themselves.
                    A piece with heavy views and a low try-on rate usually means the
                    photography is already doing its job.
                </p>
                <p>
                    Conversion, order value, time from try-on to purchase and return rates
                    need order data — automatic on Shopify, one function call on your
                    confirmation page everywhere else. The dashboard tells you which of those
                    it has rather than showing zeros as though they were findings.
                </p>
            </>
        ),
    },
];

const SURFACES = [
    {
        icon: <Store className="w-5 h-5" />,
        title: 'Your storefront',
        body: 'The widget or the Shopify app, on your own product pages, under your own brand.',
    },
    {
        icon: <ShoppingBag className="w-5 h-5" />,
        title: 'The marketplace',
        body: 'A shared storefront where shoppers browse across brands and try pieces on before clicking through to you. Pro and above.',
    },
    {
        icon: <Sparkles className="w-5 h-5" />,
        title: 'The browser extension',
        body: 'Try-on buttons on any clothing site a shopper visits — which is how people find brands they were not looking for.',
    },
];

export default function HowItWorksPage() {
    return (
        <div className="min-h-screen bg-off-white text-charcoal">
            <Navbar />

            <main className="pt-32 pb-24 px-6">
                <div className="max-w-3xl mx-auto">
                    <header className="mb-16">
                        <p className="text-xs font-bold uppercase tracking-[0.25em] text-accent-gold mb-4">
                            How it works
                        </p>
                        <h1 className="text-5xl md:text-6xl font-heading font-bold tracking-tighter leading-[0.95] mb-6">
                            One line of code.<br />Then they can see it on.
                        </h1>
                        <p className="text-lg text-charcoal/50 leading-relaxed">
                            Shoppers buy the wrong size, or don&apos;t buy at all, because they
                            cannot picture the thing on themselves. emode removes the guess —
                            without a fitting room, a body scan, or a single measurement.
                        </p>
                    </header>

                    <div className="space-y-14 mb-20">
                        {STEPS.map((step, i) => (
                            <section key={step.title} className="flex gap-6">
                                <div className="flex flex-col items-center shrink-0">
                                    <div className="w-11 h-11 rounded-xl bg-obsidian text-white flex items-center justify-center">
                                        {step.icon}
                                    </div>
                                    {i < STEPS.length - 1 && (
                                        <div className="w-px flex-1 bg-black/10 mt-3" />
                                    )}
                                </div>
                                <div className="pb-2">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-charcoal/30 mb-2">
                                        Step {i + 1}
                                    </p>
                                    <h2 className="text-2xl font-heading font-bold tracking-tight mb-4">
                                        {step.title}
                                    </h2>
                                    <div className="text-charcoal/60 leading-relaxed">{step.body}</div>
                                </div>
                            </section>
                        ))}
                    </div>

                    <section className="mb-20">
                        <h2 className="text-2xl font-heading font-bold tracking-tight mb-2">
                            Three places it runs
                        </h2>
                        <p className="text-charcoal/50 mb-8">
                            Same try-on engine behind all of them.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                            {SURFACES.map((s) => (
                                <div key={s.title} className="p-6 bg-white rounded-2xl border border-black/5">
                                    <div className="p-2 w-fit bg-off-white rounded-lg mb-4">{s.icon}</div>
                                    <h3 className="font-bold text-sm mb-2">{s.title}</h3>
                                    <p className="text-sm text-charcoal/50 leading-relaxed">{s.body}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Said plainly rather than buried. A merchant weighing this up is
                        deciding whether to put their customers' photographs through
                        someone else's system, and evasiveness here is what makes that
                        feel risky. */}
                    <section className="mb-20 p-8 bg-white rounded-2xl border border-black/5">
                        <h2 className="text-xl font-heading font-bold tracking-tight mb-4">
                            About your customers&apos; photos
                        </h2>
                        <ul className="space-y-3 text-charcoal/60 leading-relaxed text-sm">
                            <li>Used to generate the try-on they asked for, and nothing else.</li>
                            <li>Never sold, never shared with other merchants, never used to train models.</li>
                            <li>No account required, so there is no profile built from them.</li>
                            <li>
                                Generating an image involves a third-party model provider — named,
                                with what they receive, in the{' '}
                                <Link href="/privacy" className="underline hover:text-charcoal">
                                    privacy policy
                                </Link>.
                            </li>
                        </ul>
                    </section>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <Link
                            href="/#pricing"
                            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-obsidian text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors"
                        >
                            See pricing <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link
                            href="/#faq"
                            className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-black/10 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-black/5 transition-colors"
                        >
                            Read the questions
                        </Link>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
