'use client';

import Link from 'next/link';
import { ArrowRight, Store, Code2 } from 'lucide-react';
import { ChoosePlan } from './ChoosePlan';

/**
 * Signed in, but no store connected yet.
 *
 * This state used to render the plan picker on its own, which was wrong twice
 * over.
 *
 * For a Shopify merchant it was worse than confusing, it was a compliance
 * problem. They arrive here straight after installing the app, are shown Stripe
 * plans, and buying one is off-platform billing for a Shopify app. Requirement
 * 1.2.1 forbids exactly that, and the merchant would be paying twice, since
 * their real subscription is raised through the Billing API inside the Shopify
 * admin.
 *
 * For an App Store reviewer it was a dead end: they sign in with the credentials
 * supplied on the submission form, land on a paywall, and have nothing to do
 * except pay. Nothing on the screen said "install the app and this fills in".
 *
 * So the Shopify path comes first and explicitly does not sell anything. The
 * plan picker stays, below, for merchants who are not on Shopify and genuinely
 * do buy here.
 */
export function NoMerchantYet({ email }: { email?: string }) {
    return (
        <div className="max-w-6xl">
            <header className="mb-10">
                <h1 className="text-4xl font-heading font-bold tracking-tighter uppercase mb-3">
                    Connect your store
                </h1>
                <p className="text-charcoal/50 max-w-xl leading-relaxed">
                    You&apos;re signed in{email ? <> as <b className="text-charcoal">{email}</b></> : null}.
                    There&apos;s no store attached to this account yet, so there&apos;s nothing to
                    report on. Pick whichever of these describes your shop.
                </p>
            </header>

            <div className="grid md:grid-cols-2 gap-6 mb-14">
                <div className="p-8 bg-white rounded-2xl border border-black/5">
                    <div className="p-2 bg-off-white rounded-lg w-fit mb-4">
                        <Store className="w-5 h-5" />
                    </div>
                    <h2 className="font-bold text-lg mb-2">I sell on Shopify</h2>
                    <p className="text-sm text-charcoal/50 leading-relaxed mb-6">
                        Install emodeAI from the Shopify App Store. Your store, products and
                        plan all come across on their own, and this dashboard fills in the
                        first time you open the app. Billing is handled inside Shopify, so
                        there is nothing to buy on this page.
                    </p>
                    <a
                        href="https://apps.shopify.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-obsidian text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors"
                    >
                        Get it on Shopify <ArrowRight className="w-4 h-4" />
                    </a>
                </div>

                <div className="p-8 bg-white rounded-2xl border border-black/5">
                    <div className="p-2 bg-off-white rounded-lg w-fit mb-4">
                        <Code2 className="w-5 h-5" />
                    </div>
                    <h2 className="font-bold text-lg mb-2">I sell somewhere else</h2>
                    <p className="text-sm text-charcoal/50 leading-relaxed mb-6">
                        WooCommerce, Squarespace, BigCommerce or your own build. Choose a plan
                        below to get your store key, then add one line of script to your
                        product pages.
                    </p>
                    <Link
                        href="#plans"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-black/10 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-black/[0.03] transition-colors"
                    >
                        See plans <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>

            <div id="plans" className="pt-4 border-t border-black/5">
                <ChoosePlan email={email} />
            </div>
        </div>
    );
}
