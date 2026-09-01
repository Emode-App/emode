import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'emode Privacy Policy',
    description:
        'What the emode iOS app collects, who processes it, how long it is kept, and how to have it deleted.',
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
 * This is also the URL given to App Store Connect, so the enumeration in
 * "What we collect" is written to match the app's privacy nutrition labels
 * field for field -- the two have to move together. An earlier draft of this
 * page (branch app-legal-pages, commits 1e20309/3036650) went further than
 * the source markdown in docs/app-privacy-policy.md on exactly this kind of
 * specific, checkable claim -- private-bucket storage, server-side session
 * consent enforcement, no ad SDK. Verified each one against the current
 * fitted-mobile code before folding it back in here (see below); the
 * shorter source markdown was a simplification pass, not a correction, so
 * where it dropped detail that's still true, the detail is worth keeping.
 *
 * The deletion request routes through /app/delete-account, a same-origin
 * page with a real form (see app/(info)/app/delete-account and
 * app/api/app/delete-account) rather than linking straight at the Supabase
 * function that does the actual work -- that function's own confirmation
 * page sits behind the same gateway that rewrites *.supabase.co responses to
 * text/plain, which is the exact problem the rest of this work exists to
 * avoid.
 *
 *   - Signed URLs for private media: services/privateMedia.ts
 *   - Session-scoped face consent enforced server-side: supabase/functions/ai-proxy
 *   - Revoking consent deletes stored + generated face media: supabase/functions/revoke-ai-consent
 *   - No advertising SDK / no ad identifier: package.json has none
 *   - styling_sessions carries amount + status, matching the retention claim: supabase/styling_payments.sql
 *
 * Not legal advice and not reviewed by a lawyer. Everything asserted here has
 * to stay true of the code -- if retention, a subprocessor or a collected
 * data type changes in the app, this changes too.
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
                <p className="mt-6 text-charcoal/70 leading-relaxed">
                    This covers the emode iOS app — the fashion social, marketplace, messaging,
                    styling and AI virtual try-on features. If you are a merchant using the emode
                    try-on widget, Shopify app or browser extension, the policy that applies to
                    you is the <Link href="/privacy" className="underline">widget privacy
                    policy</Link> instead.
                </p>
            </div>

            <div className="space-y-12 text-charcoal/80 leading-relaxed">
                <Section n={1} title="What we collect">
                    <p>
                        <b>Account and profile information</b> you enter: email address,
                        username, bio, location text, links and any avatar or header image.
                    </p>
                    <p>
                        <b>Content you create:</b> posts, comments, direct messages, product
                        listings, wardrobe items, saved looks, reports you file and support
                        requests you send.
                    </p>
                    <p>
                        <b>Commerce records:</b> marketplace orders including the shipping
                        address you enter, subscription status, and stylist payout onboarding
                        records. Card details are entered into Stripe and never reach our
                        servers.
                    </p>
                    <p>
                        <b>Technical data:</b> a device push token if you enable notifications,
                        login-session details, and crash and performance diagnostics.
                    </p>
                </Section>

                <Section n={2} title="Face photos and AI try-on">
                    <p>
                        AI try-on is optional and requires separate, explicit consent before any
                        face photo is processed. A face photo can be sensitive personal data, so
                        we are specific about what happens to it.
                    </p>
                    <p>
                        We process the face photo you select together with the clothing images
                        you choose to generate an outfit image. We do not use it to identify you,
                        we do not use it to authenticate you, and we do not train any model on
                        it.
                    </p>
                    <p>
                        Face photos and the images generated from them are stored in a private
                        bucket and served through short-lived signed links. They are not public
                        posts unless you separately choose to publish something.
                    </p>
                    <p>
                        You can revoke AI face consent at any time in Settings. Revoking deletes
                        the stored face photo and every generated try-on along with it.
                    </p>
                </Section>

                <Section n={3} title="Styling sessions">
                    <p>
                        When you book a live styling session, the stylist you booked receives the
                        context you choose to share during that session — including a face photo
                        if you send one, and any photos or messages you exchange.
                    </p>
                    <p>
                        A stylist can only run AI generation with your face while a session
                        between you is open, and only if you have given AI face consent. That is
                        enforced on our servers, not in the app.
                    </p>
                    <p>
                        We keep a record of the session itself — who, when, how long, the amount
                        and its outcome — for payment, dispute and tax purposes.
                    </p>
                </Section>

                <Section n={4} title="How information is used">
                    <p>
                        To operate your account and the social features, generate the AI images
                        you ask for, run styling sessions, fulfill marketplace orders, verify
                        subscriptions, prevent fraud and abuse, enforce our rules, answer support
                        requests, send the notifications you have enabled, and diagnose
                        reliability and security problems.
                    </p>
                    <p>
                        We do not sell your data, we do not share it with data brokers, and we do
                        not use it for advertising or cross-app tracking. The app contains no
                        advertising SDK and does not request the advertising identifier.
                    </p>
                </Section>

                <Section n={5} title="Service providers and sharing">
                    <p>
                        We share only what a given service needs: Supabase for authentication,
                        database, storage and server functions; Google Gemini for the AI
                        generation and product-search prompts you request; RevenueCat and Apple
                        for subscriptions; Stripe for marketplace and styling-session payments and
                        for seller and stylist onboarding; Expo for push delivery; and Sentry for
                        crash and performance diagnostics.
                    </p>
                    <p>
                        Sellers receive the shipping and order details needed to fulfill a
                        purchase. We may also disclose information where legally required or
                        necessary to protect users and the service.
                    </p>
                </Section>

                <Section n={6} title="What is public and what is not">
                    <p>
                        Your profile and content you intentionally publish are public, subject to
                        blocking and moderation.
                    </p>
                    <p>
                        Direct messages, stored face photos, styling-session deliveries and
                        face-derived try-on outputs are access-controlled and are not public
                        unless you separately choose to publish them.
                    </p>
                </Section>

                <Section n={7} title="Your controls">
                    <p>
                        You can edit your profile, choose which notification categories you
                        receive, block other users, report content, revoke AI face consent,
                        remove your saved face photo and generated try-ons, and permanently
                        delete your account — all from inside the app. Device settings control
                        camera, photo, and notification permissions.
                    </p>
                    <p>
                        If you no longer have the app installed, you can also submit an{' '}
                        <Link href="/app/delete-account" className="underline">external deletion
                        request</Link>.
                    </p>
                </Section>

                <Section n={8} title="Retention and deletion">
                    <p>
                        Account content is retained while your account is active. Deleting your
                        account removes the account and its content, including private face media
                        and generated try-ons. We may retain limited transaction,
                        fraud-prevention, tax, dispute, moderation, or legal records where
                        required, then delete or de-identify them when no longer necessary.
                        Processor systems may retain backups for a limited period under their own
                        retention controls.
                    </p>
                </Section>

                <Section n={9} title="Security, children, and changes">
                    <p>
                        Data is encrypted in transit. Database access is restricted by row-level
                        security, private media is served only through short-lived signed links,
                        and payments and subscription entitlements are verified on our servers
                        rather than trusted from the app. No system is perfectly secure — if we
                        discover a breach affecting personal data we will notify those affected
                        and the relevant authority as required by law.
                    </p>
                    <p>
                        emode is not directed to children under 13 and we do not knowingly
                        collect their data; users must be old enough to consent under applicable
                        law. We will post material policy changes here and update the effective
                        date above.
                    </p>
                </Section>

                <Section n={10} title="Contact">
                    <p>
                        Use in-app Support, or email{' '}
                        <a href="mailto:support@emode.style" className="underline">support@emode.style</a>.
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
