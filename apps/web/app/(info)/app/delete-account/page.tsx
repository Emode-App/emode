import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Delete Your emode Account',
    description: 'Request deletion of your emode iOS app account and data.',
};

/**
 * Web fallback for account deletion, for someone who no longer has the app
 * installed. In-app deletion (Settings -> Account -> Delete Account) is the
 * primary path required by Guideline 5.1.1(v) and is already built; this is
 * the secondary path the guideline also expects for people who can't reach
 * that screen.
 *
 * The form POSTs to /api/app/delete-account, a thin same-origin relay to the
 * Supabase edge function that already validates input, checks the honeypot,
 * and inserts into account_deletion_requests (see supabase/account_deletion.sql
 * and supabase/functions/legal/index.ts in fitted-mobile). No new backend
 * logic here -- this repo's Supabase project isn't even the same one that
 * table lives in.
 *
 * Plain HTML form, no client JS: works exactly the same whether or not
 * scripts run, which matters here more than on the prose-only legal pages
 * since App Review may actually submit it.
 */
export default async function DeleteAccountPage({
    searchParams,
}: {
    searchParams: Promise<{ submitted?: string; error?: string }>;
}) {
    const params = await searchParams;
    const submitted = params.submitted === '1';
    const errorMessage = params.error === 'rate_limited'
        ? 'Too many requests from this connection. Try again in a minute.'
        : params.error
            ? 'Something went wrong on our side. Try again, or email us directly.'
            : null;

    return (
        <article className="max-w-3xl mx-auto py-8">
            <div className="mb-12">
                <h1 className="text-4xl md:text-5xl font-heading font-bold tracking-tighter mb-4 text-obsidian">
                    Delete Your emode Account
                </h1>
            </div>

            <div className="space-y-8 text-charcoal/80 leading-relaxed">
                {submitted ? (
                    <div className="p-6 bg-off-white rounded-2xl border border-black/5">
                        <p>
                            If an account matches that address, the deletion request is queued.
                            We may email you to verify ownership before deletion completes.
                        </p>
                    </div>
                ) : (
                    <>
                        <p>
                            The fastest option is in the app: <b>Settings → Account → Delete
                            Account</b>. In-app deletion removes your login, profile, posts,
                            messages, saved face media, generated try-ons, and other app content
                            immediately.
                        </p>
                        <p>
                            If you can&apos;t access the app, submit this form instead. We&apos;ll
                            verify account ownership before deleting anything. Limited
                            transaction, fraud, dispute, tax, moderation, or legal records may be
                            retained where required, as described in the{' '}
                            <Link href="/app/privacy" className="underline">Privacy Policy</Link>.
                        </p>

                        {errorMessage && (
                            <p className="p-4 bg-red-50 text-red-700 rounded-xl text-sm font-medium">
                                {errorMessage}
                            </p>
                        )}

                        <form method="post" action="/api/app/delete-account" className="space-y-5">
                            <div>
                                <label htmlFor="email" className="block text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-2">
                                    Account email
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    maxLength={320}
                                    required
                                    className="w-full bg-off-white border border-black/10 rounded-xl py-3 px-4 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label htmlFor="note" className="block text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-2">
                                    Optional details
                                </label>
                                <textarea
                                    id="note"
                                    name="note"
                                    rows={4}
                                    maxLength={2000}
                                    className="w-full bg-off-white border border-black/10 rounded-xl py-3 px-4 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                />
                            </div>
                            {/* Honeypot: real users never see or fill this. */}
                            <input
                                type="text"
                                name="website"
                                tabIndex={-1}
                                autoComplete="off"
                                aria-hidden="true"
                                style={{ position: 'absolute', left: '-9999px' }}
                            />
                            <button
                                type="submit"
                                className="px-6 py-3 bg-obsidian text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors"
                            >
                                Request account deletion
                            </button>
                        </form>
                    </>
                )}

                <p className="text-sm text-charcoal/50">
                    See also our <Link href="/app/privacy" className="underline">Privacy
                    Policy</Link> and <Link href="/support" className="underline">Support</Link>.
                </p>
            </div>
        </article>
    );
}
