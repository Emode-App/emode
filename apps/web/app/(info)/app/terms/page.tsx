import { Metadata } from 'next';
import Link from 'next/link';
import { SUPPORT_EMAIL } from '../../../../lib/site';

export const metadata: Metadata = {
    title: 'Emode App Terms of Use | emode',
    description:
        'The terms that apply to the Emode iOS app: community rules, AI features, subscriptions, styling sessions and the marketplace.',
};

/**
 * Terms of use for the Emode consumer iOS app.
 *
 * Separate from /terms, which governs the try-on widget and the Shopify app —
 * a merchant integration agreement and a consumer social product need different
 * terms, and the app has three payment surfaces the widget does not: StoreKit
 * subscriptions, Stripe marketplace orders, and paid styling sessions.
 *
 * The styling section matters beyond contract: charging for those sessions
 * outside in-app purchase relies on App Review Guideline 3.1.3(d), which only
 * covers real-time person-to-person services. The description here has to keep
 * matching what the app actually does.
 *
 * Not legal advice and not reviewed by a lawyer.
 */

const UPDATED = 'August 17, 2026';

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
                    Emode App Terms of Use
                </h1>
                <p className="text-charcoal/50 text-sm font-bold uppercase tracking-widest">
                    Effective {UPDATED}
                </p>
                <p className="mt-6 text-charcoal/70">
                    These apply to the Emode iOS app. If you are a merchant using the emode
                    try-on widget, Shopify app or browser extension, see the{' '}
                    <Link href="/terms" className="underline">widget terms</Link>.
                </p>
            </div>

            <div className="space-y-12">
                <Section n={1} title="Agreement">
                    <p>
                        By creating an account or using Emode you agree to these Terms and to the{' '}
                        <Link href="/app/privacy" className="underline">App Privacy Policy</Link>.
                        You must be legally able to agree and must provide accurate account and
                        transaction information.
                    </p>
                </Section>

                <Section n={2} title="Community safety and your content">
                    <p>
                        Emode has zero tolerance for objectionable content and abusive users. Do
                        not post, message, sell, or generate content involving child sexual
                        exploitation, credible threats, targeted harassment, hate-based abuse,
                        non-consensual sexual content, fraud, illegal goods, impersonation or
                        infringement.
                    </p>
                    <p>
                        You keep ownership of your content and grant Emode a limited licence to
                        host, display, process and moderate it in order to run the service.
                    </p>
                    <p>
                        You can report content and block other users from anywhere it appears. We
                        may filter, remove, restrict, preserve as evidence or report content;
                        suspend or terminate accounts; cancel listings; and cooperate with lawful
                        requests. Repeated or severe violations can mean immediate termination.
                    </p>
                </Section>

                <Section n={3} title="AI features">
                    <p>
                        AI results can be inaccurate, unflattering or unrealistic. They are for
                        creative visualisation and are not a guarantee of how a garment fits or
                        looks in person.
                    </p>
                    <p>
                        You must have permission to upload each image. Face processing requires
                        separate consent, which you can revoke at any time. Do not use AI features
                        to create deceptive, exploitative or unlawful content.
                    </p>
                </Section>

                <Section n={4} title="Subscriptions">
                    <p>
                        Digital subscriptions are purchased through Apple and renew until you
                        cancel in your App Store settings. The price and billing period shown by
                        the store at purchase control. Restore Purchases recovers access you are
                        entitled to. Refunds follow Apple&apos;s rules, not ours.
                    </p>
                </Section>

                <Section n={5} title="Styling sessions">
                    <p>
                        A styling session is a live, one-to-one service between you and a verified
                        stylist, booked at the price that stylist sets and held open for the
                        length you choose. You and your stylist are in the conversation together
                        for the duration.
                    </p>
                    <p>
                        Your card is authorised when you book and is only charged once your
                        stylist delivers a look inside that window. If the window closes without a
                        delivery, or if either of you cancels first, the authorisation is released
                        and you are not charged. Emode keeps a platform fee from each completed
                        session and pays the remainder to the stylist through Stripe.
                    </p>
                    <p>
                        Stylists are independent of Emode. They are responsible for the advice
                        they give, their own taxes and their own conduct. Emode does not employ
                        stylists, does not guarantee any particular result, and is not a party to
                        the advice given in a session. Sessions follow the same community rules as
                        the rest of the service, and a session can be cancelled or an account
                        restricted for abuse. If a stylist processes your face photo during a
                        session, that requires your separate AI face consent.
                    </p>
                </Section>

                <Section n={6} title="Marketplace">
                    <p>
                        Marketplace payments are for physical goods. Sellers are responsible for
                        accurate listings, lawful goods, fulfilment, shipping, returns and
                        applicable taxes. Buyers are responsible for accurate shipping
                        information. Stripe processes payments and seller verification.
                    </p>
                    <p>
                        We may hold, refund, reverse or cancel transactions to deal with disputes,
                        fraud, unavailable inventory or legal requirements.
                    </p>
                </Section>

                <Section n={7} title="Disclaimers and limits">
                    <p>
                        The service is provided &ldquo;as is&rdquo; to the extent the law allows.
                        We do not guarantee uninterrupted operation, AI results, listings, sellers
                        or third-party services. Nothing here limits rights that cannot legally be
                        limited.
                    </p>
                </Section>

                <Section n={8} title="Termination and contact">
                    <p>
                        You can stop using Emode or delete your account at any time, from Settings
                        in the app or through the{' '}
                        <Link href="/app/delete-account" className="underline">deletion request form</Link>.
                        We may restrict access for safety, legal, payment or Terms reasons.
                    </p>
                    <p>
                        Questions go through in-app Support or to{' '}
                        <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">{SUPPORT_EMAIL}</a>.
                    </p>
                </Section>
            </div>
        </article>
    );
}
