'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Store, Code2 } from 'lucide-react';
import { ChoosePlan } from './ChoosePlan';
import { supabase } from '../../../lib/supabase/browser';
import { SHOPIFY_APP_STORE_URL } from '../../../lib/site';

/** Set by /admin/onboarding when a signed-out buyer lands there after paying. */
const PENDING_CLAIM_KEY = 'emode.pendingClaimSessionId';

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
    const [claiming, setClaiming] = useState(false);

    /**
     * Redeem a purchase made before this account existed.
     *
     * This screen is exactly where a buyer whose wallet email differs from
     * their account email ends up: they paid, the webhook keyed the merchant on
     * the address Link or Apple Pay supplied, they signed up with the address
     * they actually wanted, and nothing connects the two. Server-side lookup
     * cannot fix it, because the only proof lives in localStorage in this
     * browser.
     *
     * It runs here rather than back on onboarding because that is not where
     * they land. The login page sends everyone to /auth/home regardless of
     * where they came from, so this is the first screen they see — and the
     * screen that would otherwise tell a paying customer they have no store.
     */
    useEffect(() => {
        let sessionId: string | null = null;
        try { sessionId = localStorage.getItem(PENDING_CLAIM_KEY); } catch { return; }
        if (!sessionId) return;

        (async () => {
            setClaiming(true);
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.access_token) return;

                const res = await fetch('/api/merchant/claim', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({ sessionId }),
                });

                if (res.ok) {
                    try { localStorage.removeItem(PENDING_CLAIM_KEY); } catch { /* private mode */ }
                    // The merchant is resolved server-side, so the page has to be
                    // re-rendered by the server to stop showing this screen.
                    window.location.reload();
                    return;
                }

                // 202 means the webhook has not landed yet — leave the key in
                // place so a refresh retries. Anything else is terminal for this
                // receipt, and keeping it would retry forever on every visit.
                if (res.status !== 202) {
                    try { localStorage.removeItem(PENDING_CLAIM_KEY); } catch { /* private mode */ }
                }
            } catch {
                // Offline or blocked. Keep the key; the next load tries again.
            } finally {
                setClaiming(false);
            }
        })();
    }, []);

    if (claiming) {
        return (
            <div className="max-w-6xl">
                <p className="text-charcoal/50">Linking your purchase…</p>
            </div>
        );
    }

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
                    {/* Was bare apps.shopify.com -- the store's own homepage,
                        not this app's listing. Someone who clicked "Get it on
                        Shopify" landed on Shopify's App Store front page with
                        no idea what to search for. */}
                    <a
                        href={SHOPIFY_APP_STORE_URL}
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
