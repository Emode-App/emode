'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

/**
 * Answers to what people actually ask before buying.
 *
 * Written to the objections rather than to the features: how good the images
 * are, what happens to a shopper's photo, whether it works on their stack,
 * whether it slows their store down. Vague answers here cost more trust than no
 * FAQ at all, so where the honest answer is a limitation it says so — the
 * marketplace one in particular.
 */
const FAQS = [
    {
        q: 'What does a shopper actually do?',
        a: 'They open a product page, tap Try This On, and upload a photo of themselves. A few seconds later they see that garment on their own body. No app, no account, no measurements — and they can add several pieces to a dressing room and see the whole outfit at once.',
    },
    {
        q: 'How good are the results?',
        a: 'Good enough to answer "does this suit me" — the cut, the colour, the proportions on your body. It is not a tailoring tool and will not tell anyone their exact size. Results are best from a full-body photo, taken straight on, in even light. Shoppers get an unlimited number of attempts against their daily allowance, so a bad photo is one retry away from a good one.',
    },
    {
        q: 'What happens to my customers’ photos?',
        a: 'The photo is used to generate the try-on and nothing else. It is not sold, not shared with other merchants, and not used to train models. We do not build a profile of the person from it. Full detail is in the privacy policy, including the third parties involved in generating an image.',
    },
    {
        q: 'Will it work on my store?',
        a: 'Shopify has a dedicated app. Everywhere else — Webflow, Squarespace, WooCommerce, BigCartel, a custom Next.js build — it is one line of script before your closing body tag. It finds your products on its own from the structured data your store already publishes, so there is nothing to configure and no per-product setup.',
    },
    {
        q: 'Will it slow my store down?',
        a: 'The script is under 10KB and loads after your page. It renders two buttons and does nothing else until somebody taps one — the try-on itself runs on our servers, in a panel over your page, not in your storefront.',
    },
    {
        q: 'Can I see whether it actually sells anything?',
        a: 'Product views, try-ons, try-on rate and a per-product breakdown are there from the first page view. Conversion, order value and returns need order data: automatic for Shopify, or one function call on your confirmation page for everyone else. The dashboard tells you which of those it has rather than showing you zeros as though they were findings.',
    },
    {
        q: 'What is the marketplace?',
        a: 'A shared storefront where shoppers browse pieces from every brand on emode and try them on before clicking through to buy. It is included on Pro and above. It is new, so it is small — you would be early rather than joining something busy.',
    },
    {
        q: 'What if my product photos are on models, not flat lays?',
        a: 'Both work. A flat lay or a cutout on white gives the cleanest result, because there is no second body for the model to reason about. If your catalogue is shot on models, it still works — just expect the occasional retry.',
    },
    {
        q: 'Can I cancel?',
        a: 'Monthly plans cancel any time and run to the end of the period you have paid for. Lifetime plans are one payment with no renewal. Removing emode from your store is deleting one line of code.',
    },
];

export function FAQ() {
    // Single-open accordion. All-collapsed is a wall of questions nobody reads;
    // all-expanded is a wall of text.
    const [open, setOpen] = useState<number | null>(0);

    return (
        <section id="faq" className="py-24 bg-off-white">
            <div className="max-w-3xl mx-auto px-6">
                <h2 className="text-4xl md:text-5xl font-heading font-bold tracking-tighter mb-4">
                    Questions
                </h2>
                <p className="text-charcoal/50 mb-12">
                    Still stuck? <a href="mailto:support@emode.style" className="underline hover:text-charcoal">Email us</a>.
                </p>

                <div className="divide-y divide-black/5 border-y border-black/5">
                    {FAQS.map((item, i) => {
                        const isOpen = open === i;
                        return (
                            <div key={item.q}>
                                <button
                                    onClick={() => setOpen(isOpen ? null : i)}
                                    aria-expanded={isOpen}
                                    className="w-full flex items-start justify-between gap-6 py-6 text-left group"
                                >
                                    <span className="font-bold text-lg group-hover:text-charcoal/70 transition-colors">
                                        {item.q}
                                    </span>
                                    <Plus
                                        className={`w-5 h-5 shrink-0 mt-1 text-charcoal/30 transition-transform duration-300 ${
                                            isOpen ? 'rotate-45' : ''
                                        }`}
                                    />
                                </button>
                                <div
                                    className={`grid transition-all duration-300 ease-out ${
                                        isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                                    }`}
                                >
                                    <div className="overflow-hidden">
                                        <p className="pb-6 pr-12 text-charcoal/60 leading-relaxed">{item.a}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
