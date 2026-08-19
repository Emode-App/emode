import { Metadata } from 'next';
import Link from 'next/link';
import { SUPPORT_EMAIL } from '../../../../lib/site';

export const metadata: Metadata = {
    title: 'Emode App Privacy Policy | emode',
    description:
        'What the Emode iOS app collects, who processes it, how long it is kept, and how to have it deleted.',
};

/**
 * Privacy policy for the Emode consumer iOS app.
 *
 * Deliberately separate from /privacy, which covers the try-on widget, the
 * Shopify app and the browser extension. The two products have genuinely
 * different data stories and conflating them would make both descriptions
 * false: the widget does not retain shopper photographs and acts as a processor
 * for the merchant, while the app retains a face photo the user chooses to
 * save, runs direct messages and a marketplace, and is the controller itself.
 *
 * This is the URL given to App Store Connect, so it has to stay reachable and
 * has to keep matching the app's privacy nutrition labels. If retention, a
 * subprocessor or a collected data type changes in the app, it changes here.
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

export default function AppPrivacyPage() {
    return (
        <article className="max-w-3xl mx-auto py-8">
            <div className="mb-12">
                <h1 className="text-4xl md:text-5xl font-heading font-bold tracking-tighter mb-4 text-obsidian">
                    Emode App Privacy Policy
                </h1>
                <p className="text-charcoal/50 text-sm font-bold uppercase tracking-widest">
                    Effective {UPDATED}
                </p>
                <p className="mt-6 text-charcoal/70">
                    This covers the Emode iOS app — the fashion social, marketplace, messaging,
                    styling and AI virtual try-on features. If you are a merchant using the
                    emode try-on widget, Shopify app or browser extension, the policy that
                    applies to you is the{' '}
                    <Link href="/privacy" className="underline">widget privacy policy</Link>.
                </p>
            </div>

            <div className="space-y-12">
                <Section n={1} title="What we collect">
                    <p>
                        Account and profile information you enter: email address, username,
                        handle, bio, location text, links and any avatar or header image.
                    </p>
                    <p>
                        Content you create: posts, comments, direct messages, product listings,
                        wardrobe items, saved looks, reports you file and support requests you
                        send.
                    </p>
                    <p>
                        Commerce records: marketplace orders including the shipping address you
                        enter, subscription status, and stylist payout onboarding records.
                        Card details are entered into Stripe and never reach our servers.
                    </p>
                    <p>
                        Technical data: a device push token if you enable notifications, login
                        session details, and crash and performance diagnostics.
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
                        you choose in order to generate an outfit image. We do not use it to
                        identify you, we do not use it to authenticate you, and we do not train
                        any model on it.
                    </p>
                    <p>
                        Face photos and the images generated from them are stored in a private
                        bucket and served through short-lived signed links. They are not public
                        posts unless you separately choose to publish something.
                    </p>
                    <p>
                        You can revoke AI face consent at any time in Settings. Revoking deletes
                        the stored face photo and the generated try-ons along with it.
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

                <Section n={4} title="How we use it">
                    <p>
                        To operate your account and the social features, generate the AI images
                        you ask for, run styling sessions, fulfil marketplace orders, verify
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

                <Section n={5} title="Who processes it">
                    <p>
                        We share only what a given service needs: Supabase for authentication,
                        database, storage and server functions; Google Gemini for the AI
                        generation and product searches you request; RevenueCat with Apple for
                        subscriptions; Stripe for marketplace and styling payments and for seller
                        and stylist onboarding; Expo for push delivery; and Sentry for crash and
                        performance diagnostics.
                    </p>
                    <p>
                        Sellers receive the order and shipping details needed to fulfil a
                        purchase. We may disclose information where legally required or where
                        necessary to protect users and the service.
                    </p>
                </Section>

                <Section n={6} title="What is public and what is not">
                    <p>
                        Your profile and anything you intentionally publish are public, subject
                        to blocking and moderation.
                    </p>
                    <p>
                        Direct messages, stored face photos, styling deliveries and generated
                        try-ons are access-controlled and are not public.
                    </p>
                </Section>

                <Section n={7} title="Your controls">
                    <p>
                        You can edit your profile, choose which notification categories you
                        receive, block other users, report content, revoke AI face consent,
                        delete your saved face photo and generated try-ons, and permanently
                        delete your account — all from inside the app.
                    </p>
                    <p>
                        Account deletion is also available from the web if you no longer have the
                        app installed. Camera, photo library and notification access are
                        controlled by your device settings.
                    </p>
                </Section>

                <Section n={8} title="Retention">
                    <p>
                        Content is retained while your account is active. Deleting your account
                        removes the account and its content, including private face media and
                        generated try-ons.
                    </p>
                    <p>
                        We may retain limited transaction, fraud-prevention, tax, dispute,
                        moderation or legal records where the law requires it, then delete or
                        de-identify them once they are no longer needed. Our processors may hold
                        backups for a limited period under their own retention schedules.
                    </p>
                </Section>

                <Section n={9} title="Children">
                    <p>
                        Emode is not directed to children under 13 and we do not knowingly
                        collect their data. You must be old enough to consent under the law where
                        you live. If you believe a child has created an account, email us and we
                        will remove it.
                    </p>
                </Section>

                <Section n={10} title="Security">
                    <p>
                        Data is encrypted in transit. Database access is restricted by row-level
                        security, private media is served only through short-lived signed links,
                        and payments and subscription entitlements are verified on our servers
                        rather than trusted from the app.
                    </p>
                    <p>
                        No system is perfectly secure. If we discover a breach affecting personal
                        data we will notify those affected and the relevant authority as required
                        by law.
                    </p>
                </Section>

                <Section n={11} title="Changes, and how to reach us">
                    <p>
                        If this policy changes materially we will update the date above and, for
                        significant changes, notify you in the app.
                    </p>
                    <p>
                        Questions, requests or complaints:{' '}
                        <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">{SUPPORT_EMAIL}</a>.
                        See also our <Link href="/terms" className="underline">Terms of Service</Link>.
                    </p>
                </Section>
            </div>
        </article>
    );
}
