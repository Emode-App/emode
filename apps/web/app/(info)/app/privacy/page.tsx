import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'emode Privacy Policy',
    description: 'How the emode iOS app collects, uses, shares, retains, and deletes information.',
};

/**
 * Privacy Policy for the emode iOS app (the consumer fashion social app),
 * distinct from /privacy which describes the Shopify app and storefront
 * widget, where merchants -- not emode -- are the data controller. This app
 * is a completely different product surface: it retains a face photo the
 * user chooses to save, runs direct messages, a marketplace and paid styling
 * sessions, and emode is the controller itself. Reusing /privacy would have
 * described the wrong product to App Review.
 *
 * Content is published verbatim from docs/app-privacy-policy.md in the
 * fitted-mobile repo, laid out with the same Section pattern as /terms and
 * /privacy for visual consistency.
 *
 * The one adjustment from the source markdown: "external deletion request"
 * was a relative link (./delete-account) meant to sit beside this document on
 * the Supabase edge function that serves it today. Hosted here instead, a
 * relative link would 404 -- so it points straight at that function's own
 * delete-account route instead. Deliberately not proxied through a new page
 * on this domain: the account_deletion_requests insert and its throttling
 * already live there, and duplicating it would be a second copy to keep in
 * sync for no benefit, since Apple only requires that the flow work end to
 * end, not that every step share a domain.
 */

const EFFECTIVE = 'August 17, 2026';
const DELETE_ACCOUNT_URL = 'https://scvvbjheyfnxlsiiozta.supabase.co/functions/v1/legal/delete-account';

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

export default function AppPrivacyPage() {
    return (
        <article className="max-w-3xl mx-auto py-8">
            <div className="mb-12">
                <h1 className="text-4xl md:text-5xl font-heading font-bold tracking-tighter mb-4 text-obsidian">
                    emode Privacy Policy
                </h1>
                <p className="text-charcoal/50 text-sm font-bold uppercase tracking-widest">
                    Effective {EFFECTIVE}
                </p>
            </div>

            <div className="space-y-12 text-charcoal/80 leading-relaxed">
                <p className="text-lg">
                    This policy explains how emode collects, uses, shares, retains, and deletes
                    information when you use our fashion social, marketplace, messaging, and AI
                    virtual try-on services.
                </p>

                <Section n={1} title="Information we collect">
                    <p>
                        We collect account and profile information; posts, comments, messages,
                        reports, wardrobe and product content; purchase, order, subscription, and
                        seller-onboarding records; device push tokens and login-session details;
                        support requests; and diagnostic events.
                    </p>
                    <p>
                        If you opt in to AI face processing, we process the face photo you select
                        and clothing images to generate an outfit image. A face photo can be
                        sensitive personal data. We do not use it to identify you, authenticate
                        you, or train our own model.
                    </p>
                </Section>

                <Section n={2} title="How information is used">
                    <p>
                        We use information to operate accounts and social features, generate
                        requested AI images, fulfill marketplace orders, verify subscriptions,
                        prevent fraud and abuse, enforce our rules, provide support, send
                        notifications you enable, and diagnose reliability or security problems.
                    </p>
                </Section>

                <Section n={3} title="Service providers and sharing">
                    <p>
                        We share only the information needed for a service with: Supabase for
                        authentication, database, storage, and server functions; Google Gemini for
                        requested AI generation and product-search prompts; RevenueCat and Apple
                        or Google for subscriptions; Stripe for marketplace and styling-session
                        payments and for seller and stylist onboarding; Expo for push delivery;
                        and Sentry for diagnostics when enabled. Sellers receive the shipping and
                        order details needed to fulfill purchases. A stylist you book receives the
                        styling context you choose to share with them during your session,
                        including a face photo if you send one. We may also disclose information
                        when legally required or necessary to protect users and the service.
                    </p>
                    <p>
                        Your profile and content you intentionally publish are public, subject to
                        blocking and moderation. Direct messages, stored face photos, and
                        face-derived try-on outputs are access-controlled and are not public posts
                        unless you separately choose to publish content.
                    </p>
                </Section>

                <Section n={4} title="Choices and controls">
                    <p>
                        You can edit your profile, control notification categories, block users,
                        report content, revoke AI face consent, remove your saved face photo and
                        generated try-ons, or permanently delete your account in the app. You can
                        also submit an external deletion request below. Device settings control
                        camera, photo, and notification permissions.
                    </p>
                </Section>

                <Section n={5} title="Retention and deletion">
                    <p>
                        Account content is retained while your account is active. In-app deletion
                        removes the account and app content, including private face media and
                        generated try-ons. We may retain limited transaction, fraud-prevention,
                        tax, dispute, moderation, or legal records where required, then delete or
                        de-identify them when no longer necessary. Processor systems may retain
                        backups for a limited period under their own retention controls.
                    </p>
                </Section>

                <Section n={6} title="Security, children, and changes">
                    <p>
                        We use access controls, private storage, encrypted transport, server-side
                        payment and entitlement verification, and monitoring. No system is
                        perfectly secure. emode is not directed to children under 13; users must
                        be old enough to consent under applicable law. We will post material
                        policy changes here and update the effective date.
                    </p>
                </Section>

                <Section n={7} title="Contact">
                    <p>
                        Use in-app Support, email{' '}
                        <a href="mailto:support@emode.style" className="underline">support@emode.style</a>,
                        or use the{' '}
                        <a href={DELETE_ACCOUNT_URL} className="underline">external deletion request</a>.
                    </p>
                    <p>
                        See also our <Link href="/app/terms" className="underline">Terms of
                        Use</Link> and <Link href="/support" className="underline">Support</Link>.
                    </p>
                </Section>
            </div>
        </article>
    );
}
