import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Terms of Service | emodeAI',
    description: 'The terms governing your usage of the emodeAI try-on platform.',
};

export default function TermsPage() {
    return (
        <article className="max-w-3xl mx-auto py-8">
            <div className="mb-12">
                <h1 className="text-4xl md:text-5xl font-heading font-bold tracking-tighter mb-4 text-obsidian">Terms of Service</h1>
                <p className="text-charcoal/50 text-sm font-bold uppercase tracking-widest">Effective Date: March 24, 2026</p>
            </div>

            <div className="space-y-12 text-charcoal/80 leading-relaxed">
                <section>
                    <h2 className="text-2xl font-heading font-bold mb-4 text-obsidian flex items-center gap-3">
                        <span className="w-8 h-[2px] bg-accent-gold inline-block"></span>
                        1. Acceptance of Terms
                    </h2>
                    <p className="mb-4">
                        By accessing or using the emodeAI API, dashboard, or embedded widget suite, you agree to be bound by these Terms. If you do not agree to all of the terms and conditions, you may not access our services.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-heading font-bold mb-4 text-obsidian flex items-center gap-3">
                        <span className="w-8 h-[2px] bg-accent-gold inline-block"></span>
                        2. Acceptable Use Policy
                    </h2>
                    <p className="mb-4">
                        Our generative AI technology is designed strictly for fashion and apparel visualization. It is strictly prohibited to use our services to:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 mb-4">
                        <li>Generate non-consensual explicit imagery (NSFW content).</li>
                        <li>Bypass, disable, or tamper with our content moderation filters.</li>
                        <li>Attempt to reverse engineer the generation endpoints or diffusion models.</li>
                    </ul>
                    <p>
                        Violation of this Acceptable Use Policy will result in immediate API key revocation and permanent account termination without refund.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-heading font-bold mb-4 text-obsidian flex items-center gap-3">
                        <span className="w-8 h-[2px] bg-accent-gold inline-block"></span>
                        3. Billing and Entitlements
                    </h2>
                    <p className="mb-4">
                        Merchants are billed recursively based on their selected tier. Usage counters restrict the volume of virtual try-ons generated per month (e.g., Starter tier allows 1,000 generations). Exceeding these limits will result in HTTP 429 Too Many Requests errors until the cycle resets or the plan is upgraded.
                    </p>
                </section>
                
                <section>
                    <h2 className="text-2xl font-heading font-bold mb-4 text-obsidian flex items-center gap-3">
                        <span className="w-8 h-[2px] bg-accent-gold inline-block"></span>
                        4. Intellectual Property
                    </h2>
                    <p className="mb-4">
                        Merchants retain all intellectual property rights to the garment images they upload. Buyers utilizing "Try It On" retain rights to their personal source imagery. The AI-generated output is provided as an ephemeral visualization tool and carries a joint non-exclusive license for rendering purposes.
                    </p>
                </section>
            </div>
        </article>
    );
}
