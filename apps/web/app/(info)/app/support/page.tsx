import { Metadata } from 'next';
import Link from 'next/link';
import { SUPPORT_EMAIL } from '../../../../lib/site';

export const metadata: Metadata = {
    title: 'Emode App Support | emode',
    description:
        'Get help with the Emode iOS app: account access, safety reports, purchases, subscriptions and privacy.',
};

/**
 * Support landing page for the Emode iOS app.
 *
 * Points at the in-app form first on purpose: a request sent from a signed-in
 * session is already tied to an account, which means no identity guessing on our
 * side and no account details in an unauthenticated email. Email is the fallback
 * for the people who cannot sign in — which is exactly the population the in-app
 * form cannot serve.
 *
 * This is the URL given to App Store Connect as the app's support page.
 */

export default function AppSupportPage() {
    return (
        <article className="max-w-3xl mx-auto py-8">
            <h1 className="text-4xl md:text-5xl font-heading font-bold tracking-tighter mb-8 text-obsidian">
                Emode App Support
            </h1>

            <div className="space-y-6">
                <p>
                    For account access, safety reports, purchases, subscriptions, styling sessions,
                    privacy questions or technical problems, use the <strong>Support</strong> form
                    inside the app while signed in. That ties your request to your account securely,
                    so we are not verifying who you are over email before we can help.
                </p>

                <p>
                    If you cannot sign in, email{' '}
                    <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">{SUPPORT_EMAIL}</a>{' '}
                    from the address on the account.
                </p>

                <div className="rounded-2xl bg-off-white border border-black/5 p-6 space-y-3">
                    <h2 className="font-heading font-bold text-lg text-obsidian">Common requests</h2>
                    <p>
                        <strong>Delete your account.</strong> Settings → Privacy → Delete Account in
                        the app, or the{' '}
                        <Link href="/app/delete-account" className="underline">deletion request form</Link>{' '}
                        if you no longer have access.
                    </p>
                    <p>
                        <strong>Revoke AI face consent.</strong> Settings → Privacy. This deletes
                        your stored face photo and the try-ons generated from it.
                    </p>
                    <p>
                        <strong>Report content or block someone.</strong> Long-press any post,
                        comment, message, listing or profile.
                    </p>
                    <p>
                        <strong>Subscriptions and refunds.</strong> Managed by Apple in your App
                        Store settings. Refunds follow Apple&apos;s rules — we cannot issue them.
                    </p>
                    <p>
                        <strong>A styling session went wrong.</strong> Contact us with the session
                        details. Your card is only charged when a stylist delivers inside the
                        session window; if that did not happen, the hold is released.
                    </p>
                </div>

                <p className="text-charcoal/70">
                    See also the <Link href="/app/privacy" className="underline">App Privacy Policy</Link>{' '}
                    and the <Link href="/app/terms" className="underline">App Terms of Use</Link>.
                </p>
            </div>
        </article>
    );
}
