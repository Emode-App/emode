import { Metadata } from 'next';
import Link from 'next/link';
import { SUPPORT_EMAIL } from '../../../../lib/site';

export const metadata: Metadata = {
    title: 'Delete your Emode account | emode',
    description:
        'Request deletion of your Emode app account, including your profile, posts, messages and saved face media.',
};

/**
 * External account deletion request for the Emode iOS app.
 *
 * App Store Guideline 5.1.1(v) requires in-app deletion, which the app has. This
 * page exists for the case that requirement does not cover: someone who has
 * already deleted the app, or cannot sign in, and therefore cannot reach the
 * in-app control at all.
 *
 * Posts to /api/app-deletion rather than inserting here — this site runs against
 * a different Supabase project and has no business holding write access to the
 * consumer app's database.
 */

export default async function DeleteAccountPage({
    searchParams,
}: {
    searchParams: Promise<{ submitted?: string; error?: string }>;
}) {
    const params = await searchParams;
    const submitted = params.submitted === '1';
    const failed = params.error === '1';

    return (
        <article className="max-w-3xl mx-auto py-8">
            <h1 className="text-4xl md:text-5xl font-heading font-bold tracking-tighter mb-8 text-obsidian">
                Delete your Emode account
            </h1>

            {submitted ? (
                <div className="rounded-2xl bg-off-white border border-black/5 p-6 mb-8">
                    <p>
                        If an account matches that address, the deletion request is queued. We may
                        email you to verify ownership before anything is deleted.
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {failed && (
                        <div className="rounded-2xl bg-off-white border border-black/5 p-6">
                            <p>
                                Something went wrong submitting that. Please try again, or email{' '}
                                <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">{SUPPORT_EMAIL}</a>.
                            </p>
                        </div>
                    )}

                    <p>
                        The fastest route is inside the app: <strong>Settings → Privacy → Delete
                        Account</strong>. That removes your login, profile, posts, messages, saved
                        face media, generated try-ons and other app content straight away.
                    </p>
                    <p>
                        Use this form only if you can no longer access the app. We will verify that
                        you own the account before deleting it. Limited transaction, fraud,
                        dispute, tax, moderation or legal records may be retained where the law
                        requires, as described in the{' '}
                        <Link href="/app/privacy" className="underline">App Privacy Policy</Link>.
                    </p>

                    <form method="post" action="/api/app-deletion" className="space-y-5 pt-2">
                        <div>
                            <label htmlFor="email" className="block font-bold mb-2">
                                Account email
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                maxLength={320}
                                required
                                className="w-full px-4 py-3 rounded-xl border border-black/15 bg-white"
                            />
                        </div>

                        <div>
                            <label htmlFor="note" className="block font-bold mb-2">
                                Optional details
                            </label>
                            <textarea
                                id="note"
                                name="note"
                                rows={5}
                                maxLength={2000}
                                className="w-full px-4 py-3 rounded-xl border border-black/15 bg-white"
                            />
                        </div>

                        {/* Honeypot: a real person never fills this in. */}
                        <input
                            name="website"
                            tabIndex={-1}
                            autoComplete="off"
                            aria-hidden="true"
                            className="absolute -left-[9999px]"
                        />

                        <button
                            type="submit"
                            className="px-6 py-3 rounded-xl bg-obsidian text-white font-bold"
                        >
                            Request account deletion
                        </button>
                    </form>
                </div>
            )}

            <p className="mt-10 text-charcoal/70">
                Questions:{' '}
                <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">{SUPPORT_EMAIL}</a>.
                See also the <Link href="/app/support" className="underline">app support page</Link>.
            </p>
        </article>
    );
}
