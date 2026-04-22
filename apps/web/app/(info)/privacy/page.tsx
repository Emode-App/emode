import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Privacy Policy | emodeAI',
    description: 'How we handle your data, images, and biometric privacy.',
};

export default function PrivacyPage() {
    return (
        <article className="max-w-3xl mx-auto py-8">
            <div className="mb-12">
                <h1 className="text-4xl md:text-5xl font-heading font-bold tracking-tighter mb-4 text-obsidian">Privacy Policy</h1>
                <p className="text-charcoal/50 text-sm font-bold uppercase tracking-widest">Effective Date: March 24, 2026</p>
            </div>

            <div className="space-y-12 text-charcoal/80 leading-relaxed">
                <section>
                    <h2 className="text-2xl font-heading font-bold mb-4 text-obsidian flex items-center gap-3">
                        <span className="w-8 h-[2px] bg-accent-gold inline-block"></span>
                        1. Data Collection & Image Processing
                    </h2>
                    <p className="mb-4">
                        At emodeAI, we understand the sensitive nature of personal imagery. When you or your customers use our virtual try-on technology, we process uploaded photos strictly for the purpose of generating the requested try-on image.
                    </p>
                    <p>
                        We do not train our foundational AI models on your personal photos without explicit, separate consent. Images are processed ephemerally using secure, encrypted endpoints and are actively flushed from active generation memory following the request lifecycle.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-heading font-bold mb-4 text-obsidian flex items-center gap-3">
                        <span className="w-8 h-[2px] bg-accent-gold inline-block"></span>
                        2. Marketplace and Merchant Data
                    </h2>
                    <p className="mb-4">
                        For merchants subscribing to our platform, we collect operational data necessary for service provision, including store identifiers, product imagery, and generation volume analytics via Stripe and our internal usage counters. 
                    </p>
                    <p>
                        Products marked as "Marketplace Visible" by merchants will be indexed in our global marketplace. Merchants retain full control over this visibility and can toggle it at any time from their dashboard.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-heading font-bold mb-4 text-obsidian flex items-center gap-3">
                        <span className="w-8 h-[2px] bg-accent-gold inline-block"></span>
                        3. Security & Infrastructure
                    </h2>
                    <p className="mb-4">
                        Our database is hosted securely via Supabase and employs robust Row Level Security (RLS) policies to ensure that merchants can only access their own analytics and product data. Customer try-on sessions act within isolated contexts.
                    </p>
                    <div className="p-6 bg-off-white rounded-xl border border-black/5 mt-6">
                        <p className="text-sm font-semibold italic">
                            For deeper insights into our security architecture or to issue a Data Subject Access Request (DSAR), please contact our privacy compliance team via the Contact page.
                        </p>
                    </div>
                </section>
            </div>
        </article>
    );
}
