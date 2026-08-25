import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'emode Support',
    description: 'Get in touch with the emode team.',
};

/**
 * Support page for the emode iOS app. App Store Connect's Support URL field
 * is mandatory, and this route 404'd before now -- nothing else on this
 * domain was a plain, no-login contact page a reviewer could open cold.
 */
export default function SupportPage() {
    return (
        <article className="max-w-3xl mx-auto py-8">
            <div className="mb-12">
                <h1 className="text-4xl md:text-5xl font-heading font-bold tracking-tighter mb-4 text-obsidian">
                    emode Support
                </h1>
            </div>

            <div className="space-y-6 text-charcoal/80 leading-relaxed text-lg">
                <p>
                    emode is a fashion social app with AI virtual try-on, direct messaging, a
                    marketplace, and bookable stylist sessions.
                </p>
                <p>
                    For account, billing, safety, or technical questions, email{' '}
                    <a href="mailto:support@emode.style" className="underline">support@emode.style</a>
                    {' '}and we&apos;ll get back to you.
                </p>
                <p>
                    See also our{' '}
                    <Link href="/app/privacy" className="underline">Privacy Policy</Link> and{' '}
                    <Link href="/app/terms" className="underline">Terms of Use</Link>.
                </p>
            </div>
        </article>
    );
}
