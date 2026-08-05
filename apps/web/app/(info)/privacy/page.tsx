import { Metadata } from 'next';
import Link from 'next/link';
import { SUPPORT_EMAIL, SITE_HOST } from '../../../lib/site';

export const metadata: Metadata = {
    title: 'Privacy Policy | emode',
    description:
        'What emode collects, who processes it, how long it is kept, and how to have it deleted.',
};

/**
 * Privacy policy.
 *
 * Written against what the product actually does rather than from a template:
 * the named model provider that receives shopper photographs, the browser
 * extension's access to page content, the visitor identifier used for
 * attribution, and the fact that generated images are not retained. A policy
 * describing a generic SaaS would be both useless to a reader and untrue here.
 *
 * Not legal advice and not reviewed by a lawyer. Everything asserted has to stay
 * true of the code — if retention or a subprocessor changes, this changes too.
 */

const UPDATED = 'August 5, 2026';

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

export default function PrivacyPage() {
    return (
        <article className="max-w-3xl mx-auto py-8">
            <div className="mb-12">
                <h1 className="text-4xl md:text-5xl font-heading font-bold tracking-tighter mb-4 text-obsidian">
                    Privacy Policy
                </h1>
                <p className="text-charcoal/50 text-sm font-bold uppercase tracking-widest">
                    Last updated: {UPDATED}
                </p>
            </div>

            <div className="space-y-12 text-charcoal/80 leading-relaxed">
                <p className="text-lg">
                    emode puts virtual try-on on clothing stores. This explains what we collect,
                    who else sees it, how long we keep it, and how to have it removed. It covers{' '}
                    {SITE_HOST}, the emode widget on merchant storefronts, the emode Shopify app,
                    and the emode browser extension.
                </p>

                <Section n={1} title="Who we are, and who you are to us">
                    <p>Two different people use emode, and the difference matters legally.</p>
                    <p>
                        <b>Merchants</b> are the businesses who install emode. For their own
                        account data, we are the controller.
                    </p>
                    <p>
                        <b>Shoppers</b> are the people who try clothes on. When a shopper uses
                        try-on on a merchant&apos;s store, that merchant is the controller and
                        emode is a processor acting on their instructions. When someone uses the
                        emode app, marketplace or extension directly, we are the controller.
                    </p>
                </Section>

                <Section n={2} title="Photographs">
                    <p>
                        The photograph a shopper uploads is the most sensitive thing we handle,
                        so it gets its own section.
                    </p>
                    <p>
                        It is used to generate the try-on that was asked for, and for nothing
                        else. We do not sell it. We do not share it with other merchants. We do
                        not use it to train models, ours or anyone else&apos;s. We do not run
                        face recognition on it, and we do not build a profile from it.
                    </p>
                    <p>
                        Before upload it is resized in the browser, so the original full-size
                        file usually never leaves the device.
                    </p>
                    <p>
                        <b>Generating the image requires a third party.</b> The photograph and
                        the product image are sent to Google&apos;s Gemini API, which returns the
                        result and processes them to serve that request under their API terms. A
                        shopper unwilling for their photograph to be processed by Google should
                        not use try-on.
                    </p>
                    <p>
                        <b>Retention.</b> We do not store the generated image, and we do not keep
                        the uploaded photograph after the request that used it. What is retained
                        is the record that a try-on happened — a timestamp, which merchant, which
                        product — not the pictures.
                    </p>
                    <p>
                        Depending on where you live, a photograph of your face may count as
                        biometric data. We do not use it biometrically — no identification, no
                        matching, no faceprint — but we treat it as sensitive regardless.
                    </p>
                </Section>

                <Section n={3} title="What else we collect">
                    <ul className="space-y-3 list-disc ml-5 marker:text-charcoal/30">
                        <li>
                            <b>Account details</b> — your email address, and a Google profile if
                            you sign in that way. Authentication is handled by Supabase.
                        </li>
                        <li>
                            <b>Merchant and store details</b> — brand name, store domain, plan,
                            and for Shopify installs the shop identifier and access token.
                        </li>
                        <li>
                            <b>Product information</b> — the title, image, price and URL of
                            products a shopper views or tries on, read from the merchant&apos;s
                            own public page.
                        </li>
                        <li>
                            <b>A visitor identifier</b> — a random value stored in the browser on
                            the merchant&apos;s own domain, used to connect a try-on to a later
                            purchase so a merchant can tell whether try-on sells anything. It is
                            opaque, contains no personal data, and is not shared between
                            merchants. Clearing site data removes it.
                        </li>
                        <li>
                            <b>Order data</b>, where a merchant has enabled it — order total,
                            currency, an order identifier and whether it was refunded. Not names,
                            not addresses, not payment details.
                        </li>
                        <li>
                            <b>Usage counts</b> — how many try-ons were generated, to enforce plan
                            limits and detect abuse. Rate limiting also processes IP addresses
                            transiently.
                        </li>
                    </ul>
                    <p>We do not run third-party advertising or tracking pixels on {SITE_HOST}.</p>
                </Section>

                <Section n={4} title="The browser extension">
                    <p>
                        The emode extension needs access to the pages you visit in order to
                        recognise a product page and place the try-on button. That access is broad
                        by necessity, so it is worth being specific about what happens with it.
                    </p>
                    <p>
                        Page content is read <b>in your browser</b> and is not transmitted to us.
                        Nothing leaves the device until you tap Try This On — at which point the
                        product title, image and price for that one item are sent, along with the
                        photograph you choose. We do not collect browsing history and we do not
                        record the pages you visit.
                    </p>
                </Section>

                <Section n={5} title="Who else processes your data">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[520px]">
                            <thead>
                                <tr className="text-left border-b border-black/10">
                                    <th className="pb-2 pr-4 font-bold">Processor</th>
                                    <th className="pb-2 pr-4 font-bold">What they receive</th>
                                </tr>
                            </thead>
                            <tbody className="align-top">
                                {[
                                    ['Google (Gemini API)', 'Uploaded photographs and product images, to generate a try-on'],
                                    ['Supabase', 'Accounts, merchant records, try-on records; database and authentication'],
                                    ['Vercel', 'Hosting and request logs for the website and API'],
                                    ['Fly.io', 'Hosting for the Shopify app'],
                                    ['Stripe', 'Payment details for merchant subscriptions. Card numbers go to Stripe, never to us'],
                                    ['Shopify', 'Store and product data, for merchants who install the Shopify app'],
                                ].map(([who, what]) => (
                                    <tr key={who} className="border-b border-black/5">
                                        <td className="py-3 pr-4 font-medium whitespace-nowrap">{who}</td>
                                        <td className="py-3 pr-4 text-charcoal/60">{what}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p>
                        These providers operate in the United States and elsewhere, so data may be
                        transferred internationally.
                    </p>
                </Section>

                <Section n={6} title="How long we keep things">
                    <ul className="space-y-2 list-disc ml-5 marker:text-charcoal/30">
                        <li><b>Uploaded photographs</b> — not retained after the request.</li>
                        <li><b>Generated images</b> — not stored.</li>
                        <li><b>Try-on records</b> — kept while the merchant&apos;s account is active, for their analytics.</li>
                        <li><b>Account and merchant records</b> — kept until deletion is requested.</li>
                        <li><b>Billing records</b> — kept as long as tax and accounting law requires.</li>
                    </ul>
                </Section>

                <Section n={7} title="Your rights">
                    <p>
                        Depending on where you live you may have the right to access, correct,
                        export or delete your data, to object to processing, and to withdraw
                        consent. To exercise any of them, email{' '}
                        <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">{SUPPORT_EMAIL}</a>.
                        We aim to respond within 30 days.
                    </p>
                    <p>
                        We do not sell personal information, and we do not share it for
                        cross-context behavioural advertising.
                    </p>
                    <p>
                        If a shopper used try-on on a merchant&apos;s store, that merchant is the
                        controller — we will help them respond, or pass the request on. Shopify
                        merchants are covered by Shopify&apos;s own data request and redaction
                        webhooks, which we implement.
                    </p>
                </Section>

                <Section n={8} title="Children">
                    <p>
                        emode is not intended for children under 13 and we do not knowingly
                        collect their data. If you believe a child has uploaded a photograph,
                        email us and we will delete it.
                    </p>
                </Section>

                <Section n={9} title="Security">
                    <p>
                        Data is encrypted in transit. Database access is restricted by row-level
                        security so one merchant cannot read another&apos;s data. Payment details
                        never touch our servers.
                    </p>
                    <p>
                        No system is perfectly secure. If we discover a breach affecting personal
                        data we will notify those affected and the relevant authority as required
                        by law.
                    </p>
                </Section>

                <Section n={10} title="Changes, and how to reach us">
                    <p>
                        If this policy changes materially we will update the date above and, for
                        significant changes, notify merchants by email.
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
