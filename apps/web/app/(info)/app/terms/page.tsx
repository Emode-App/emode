import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'emode Terms of Use',
    description:
        'The terms that apply to the emode iOS app: community rules, AI features, subscriptions, styling sessions and the marketplace.',
};

/**
 * Terms of Use for the emode iOS app (the consumer fashion social app),
 * distinct from /terms which governs the Shopify app and storefront widget --
 * a merchant integration agreement, not a consumer social product's terms.
 * The app has three payment surfaces the widget does not: StoreKit
 * subscriptions, Stripe marketplace orders, and paid styling sessions.
 *
 * The styling section matters beyond contract: charging for those sessions
 * outside in-app purchase relies on App Review Guideline 3.1.3(d), which only
 * covers real-time person-to-person services. The description here has to
 * keep matching what the app actually does.
 *
 * An earlier draft of this page (branch app-legal-pages, commit 3036650)
 * linked its Termination section at an /app/delete-account page that was
 * planned but never built, and 404'd. That page now exists for real --
 * app/(info)/app/delete-account, a same-origin form relayed through
 * app/api/app/delete-account to the Supabase edge function that already does
 * the validation and the DB insert.
 *
 * Not legal advice and not reviewed by a lawyer.
 */

const EFFECTIVE = 'August 17, 2026';

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
    return (
        <section>
            <h2 className="text-2xl font-heading font-bold mb-4 text-obsidian flex items-center gap-3">
                <span className="w-8 h-[2px] bg-accent-gold inline-block" />
                {n}. {title}
            </h2>
            <div className="space-y-4">{children}</div>
        </section>
    );
}

export default function AppTermsPage() {
    return (
        <article className="max-w-3xl mx-auto py-8">
            <div className="mb-12">
                <h1 className="text-4xl md:text-5xl font-heading font-bold tracking-tighter mb-4 text-obsidian">
                    emode Terms of Use
                </h1>
                <p className="text-charcoal/50 text-sm font-bold uppercase tracking-widest">
                    Effective {EFFECTIVE}
                </p>
                <p className="mt-6 text-charcoal/70 leading-relaxed">
                    These apply to the emode iOS app. If you are a merchant using the emode
                    try-on widget, Shopify app or browser extension, see the{' '}
                    <Link href="/terms" className="underline">widget terms</Link> instead.
                </p>
            </div>

            <div className="space-y-12 text-charcoal/80 leading-relaxed">
                <Section n={1} title="Agreement">
                    <p>
                        By creating an account or using emode you agree to these Terms and to the{' '}
                        <Link href="/app/privacy" className="underline">Privacy Policy</Link>. You
                        must be legally able to agree and must provide accurate account and
                        transaction information.
                    </p>
                </Section>

                <Section n={2} title="Community safety and your content">
                    <p>
                        emode has zero tolerance for objectionable content and abusive users. Do
                        not post, message, sell, or generate content involving child sexual
                        exploitation, credible threats, targeted harassment, hate-based abuse,
                        non-consensual sexual content, fraud, illegal goods, impersonation, or
                        infringement. You retain ownership of your content and grant emode a
                        limited license to host, display, process, and moderate it to operate the
                        service.
                    </p>
                    <p>
                        Users can report content and block other users. We may filter, remove,
                        restrict, preserve as evidence, or report content; suspend or terminate
                        accounts; cancel listings; and cooperate with lawful requests. Repeated or
                        severe violations may result in immediate termination.
                    </p>
                </Section>

                <Section n={3} title="AI features">
                    <p>
                        AI results can be inaccurate, unflattering, inappropriate, or unrealistic
                        and are for creative visualization, not a guarantee of product fit or
                        appearance. You must have permission to upload each image. Face
                        processing requires separate consent, which you can revoke at any time.
                        Do not use AI features to create deceptive, exploitative, or unlawful
                        content.
                    </p>
                </Section>

                <Section n={4} title="Subscriptions">
                    <p>
                        Digital subscriptions are purchased through Apple and renew until you
                        cancel in your App Store settings. Prices and billing periods shown by
                        the store at purchase control. Restore Purchases can recover access
                        you&apos;re entitled to. Refunds follow Apple&apos;s rules, not ours.
                    </p>
                </Section>

                <Section n={5} title="Styling sessions">
                    <p>
                        A styling session is a live, one-to-one service between you and a verified
                        stylist, booked at the price that stylist sets and held open for the
                        length you choose. Your card is authorized when you book and is only
                        charged once your stylist delivers a look inside that window. If the
                        window closes without a delivery, or if either of you cancels first, the
                        authorization is released and you are not charged. emode keeps a platform
                        fee from each completed session and pays the remainder to the stylist
                        through Stripe.
                    </p>
                    <p>
                        Stylists are independent of emode and are responsible for the advice they
                        give, their own taxes, and their own conduct. emode does not employ
                        stylists, does not guarantee any particular result, and is not a party to
                        the advice given in a session. Sessions are subject to the same community
                        rules as the rest of the service, and a session can be cancelled or an
                        account restricted for abuse. If a stylist processes your face photo
                        during a session, that requires your separate AI face consent, which you
                        can revoke at any time.
                    </p>
                </Section>

                <Section n={6} title="Marketplace">
                    <p>
                        Marketplace payments are for physical goods. Sellers are responsible for
                        accurate listings, lawful goods, fulfillment, shipping, returns, and
                        applicable taxes. Buyers are responsible for accurate shipping
                        information. Stripe processes payments and seller verification. We may
                        hold, refund, reverse, or cancel transactions to address disputes, fraud,
                        unavailable inventory, or legal requirements.
                    </p>
                </Section>

                <Section n={7} title="Disclaimers and limits">
                    <p>
                        The service is provided &ldquo;as is&rdquo; to the extent permitted by
                        law. We do not guarantee uninterrupted operation, AI results, listings,
                        sellers, or third-party services. Nothing here limits rights that cannot
                        legally be limited.
                    </p>
                </Section>

                <Section n={8} title="Termination and contact">
                    <p>
                        You may stop using the service or delete your account at any time, from
                        Settings in the app or, if you no longer have the app installed, through
                        the{' '}
                        <Link href="/app/delete-account" className="underline">deletion
                        request</Link>. We may restrict access for safety, legal, payment, or
                        Terms violations.
                    </p>
                    <p>
                        Questions can be sent through in-app{' '}
                        <Link href="/support" className="underline">Support</Link> or to{' '}
                        <a href="mailto:support@emode.style" className="underline">support@emode.style</a>.
                    </p>
                </Section>
            </div>
        </article>
    );
}
