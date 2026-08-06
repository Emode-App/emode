import { Metadata } from 'next';
import Link from 'next/link';
import { SUPPORT_EMAIL, SITE_HOST } from '../../../lib/site';

export const metadata: Metadata = {
    title: 'Terms of Service | emode',
    description: 'The terms governing use of emode by merchants and shoppers.',
};

/**
 * Terms of service.
 *
 * Specific to what emode actually is: a generative tool whose output is an
 * approximation, sold on both subscription and lifetime terms, installed on
 * third-party storefronts, and distributed through AppSumo. The clauses that
 * matter are the ones about output accuracy, what "lifetime" means, and who owns
 * a photograph — a generic template covers none of them.
 *
 * Not legal advice and not reviewed by a lawyer.
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

export default function TermsPage() {
    return (
        <article className="max-w-3xl mx-auto py-8">
            <div className="mb-12">
                <h1 className="text-4xl md:text-5xl font-heading font-bold tracking-tighter mb-4 text-obsidian">
                    Terms of Service
                </h1>
                <p className="text-charcoal/50 text-sm font-bold uppercase tracking-widest">
                    Last updated: {UPDATED}
                </p>
            </div>

            <div className="space-y-12 text-charcoal/80 leading-relaxed">
                <p className="text-lg">
                    These terms govern use of {SITE_HOST}, the emode widget, the emode Shopify
                    app, the emode browser extension and the emode marketplace. Using any of
                    them means agreeing to them.
                </p>

                <Section n={1} title="What emode does">
                    <p>
                        emode generates an image showing how a garment might look on a person,
                        from a photograph they provide and a product image. It is a visualisation
                        tool.
                    </p>
                    <p>
                        <b>It is not a sizing or fit service.</b> The output is a generated
                        approximation, not a measurement, a prediction of fit, or a guarantee
                        that a garment will suit or fit anybody. Colour, drape, texture and
                        proportion may all differ from the real item. Neither merchants nor
                        shoppers should treat a try-on as authoritative about fit, and merchants
                        should not present it as one.
                    </p>
                </Section>

                <Section n={2} title="Accounts">
                    <p>
                        You are responsible for what happens under your account and for keeping
                        your sign-in secure. You must be old enough to enter a contract where you
                        live, and at least 13.
                    </p>
                    <p>
                        We may suspend an account for non-payment, for abuse of the service, or
                        where required by law. Where we can give notice first, we will.
                    </p>
                </Section>

                <Section n={3} title="Plans, billing and cancellation">
                    <ul className="space-y-3 list-disc ml-5 marker:text-charcoal/30">
                        <li>
                            <b>Monthly plans</b> renew automatically until cancelled. Cancelling
                            stops the next renewal and access continues to the end of the period
                            already paid for. We do not pro-rate part-months.
                        </li>
                        <li>
                            <b>Lifetime plans</b> are a single payment with no renewal. &ldquo;Lifetime&rdquo;
                            means the lifetime of the emode service, not a guarantee of perpetual
                            operation — if emode ceases to operate, so does the plan. We think
                            that is obvious, but it is the sort of thing worth writing down.
                        </li>
                        <li>
                            <b>Plan limits</b> are daily generation allowances. Exceeding one
                            stops further generations that day rather than incurring a charge.
                        </li>
                        <li>
                            <b>Prices may change.</b> Existing monthly subscribers get at least 30
                            days&apos; notice before a change affects them. Lifetime purchases are
                            unaffected.
                        </li>
                        <li>
                            <b>Codes bought through AppSumo</b> are governed by AppSumo&apos;s
                            refund policy for the refund window they specify. Redeem them at{' '}
                            <Link href="/redeem" className="underline">/redeem</Link>. Codes stack
                            to raise your tier; a refunded code is revoked and the tier is
                            recalculated.
                        </li>
                    </ul>
                    <p>
                        Payments are processed by Stripe. Shopify merchants may be billed through
                        Shopify instead, under Shopify&apos;s terms.
                    </p>
                </Section>

                <Section n={4} title="Who owns what">
                    <p>
                        <b>Your content stays yours.</b> A shopper owns their photograph. A
                        merchant owns their product images and catalogue. Uploading them grants
                        emode only the licence needed to run the service — to process the images
                        and produce the try-on that was asked for, including sending them to the
                        model provider named in our{' '}
                        <Link href="/privacy" className="underline">privacy policy</Link>. Nothing
                        more. We do not use your content to train models.
                    </p>
                    <p>
                        <b>Generated images.</b> As between you and us, the try-on image belongs
                        to the person who requested it. Note that images produced by generative
                        models may not be copyrightable in some jurisdictions, which is a
                        question of law rather than something we can grant.
                    </p>
                    <p>
                        <b>Our software stays ours.</b> emode, the widget, the app, the extension
                        and the marketplace remain our property. Nothing here transfers ownership
                        of them.
                    </p>
                    <p>
                        <b>Merchants must have the rights</b> to the product images they put
                        through emode, and are responsible for their catalogue being lawful to
                        sell and display.
                    </p>
                </Section>

                <Section n={5} title="Acceptable use">
                    <p>You may not use emode to:</p>
                    <ul className="space-y-2 list-disc ml-5 marker:text-charcoal/30">
                        <li>
                            upload a photograph of someone else without their permission, or of
                            anyone under 13;
                        </li>
                        <li>
                            generate sexual, degrading or harassing imagery of any person, or
                            anything designed to deceive about what a real person did or wore;
                        </li>
                        <li>upload content that is illegal, infringing, or that you have no right to use;</li>
                        <li>
                            circumvent plan limits, probe or attack the service, or scrape it at
                            scale;
                        </li>
                        <li>resell or redistribute emode as your own product without a written agreement.</li>
                    </ul>
                    <p>
                        We may remove content and terminate accounts for violations, and will
                        report unlawful material where required.
                    </p>
                </Section>

                <Section n={6} title="The marketplace">
                    <p>
                        Merchants on eligible plans may list products in the emode marketplace.
                        Listing is opt-in per product and can be withdrawn at any time. Losing the
                        plan that includes marketplace access removes the listings.
                    </p>
                    <p>
                        A marketplace listing links to the merchant&apos;s own store. emode is not
                        a party to the sale, does not take payment for it, and is not responsible
                        for fulfilment, returns or the accuracy of a merchant&apos;s listing.
                    </p>
                </Section>

                <Section n={7} title="Availability">
                    <p>
                        We aim to keep emode running but do not promise uninterrupted service.
                        Generation depends on a third-party model provider; if they are
                        unavailable or change their terms, try-on may be degraded or interrupted.
                    </p>
                    <p>
                        We may change or discontinue features. For changes that materially reduce
                        what a paid plan provides, we will give notice and, where a plan can no
                        longer deliver what was paid for, a fair refund.
                    </p>
                </Section>

                <Section n={8} title="Disclaimers and liability">
                    <p>
                        The service is provided &ldquo;as is&rdquo;. To the extent the law allows,
                        we disclaim implied warranties of merchantability, fitness for a
                        particular purpose and non-infringement. We do not warrant that generated
                        images will be accurate, flattering, or fit for any purpose.
                    </p>
                    <p>
                        To the extent the law allows, our total liability arising out of these
                        terms is limited to the amount you paid us in the twelve months before the
                        claim. We are not liable for lost profits, lost sales or indirect damages.
                    </p>
                    <p>
                        Some jurisdictions do not allow these exclusions, in which case they apply
                        only as far as permitted, and nothing here limits liability that cannot
                        lawfully be limited.
                    </p>
                </Section>

                <Section n={9} title="Data processing">
                    <p>
                        This section is the data processing agreement between us. It applies
                        whenever emode handles personal data belonging to <b>your</b> customers
                        &mdash; shoppers on your storefront &mdash; rather than to you.
                    </p>
                    <p>
                        For that data you are the <b>controller</b> and we are the{' '}
                        <b>processor</b>. You decide what is collected and why; we act on your
                        instructions, which are these terms plus whatever you configure in the
                        dashboard. We do not use your customers&apos; data for our own purposes,
                        and we never sell it.
                    </p>

                    <h3 className="font-bold mt-6 mb-2">What we process on your behalf</h3>
                    <ul className="space-y-2 list-disc ml-5 marker:text-charcoal/30">
                        <li>
                            <b>A visitor identifier</b> &mdash; an opaque random value stored in the
                            shopper&apos;s browser on your domain, so a try-on can be matched to an
                            order. It is not derived from anything about the person.
                        </li>
                        <li>
                            <b>Try-on records</b> &mdash; which product, when, and that visitor
                            identifier. Photographs are not retained after generation and generated
                            images are not stored.
                        </li>
                        <li>
                            <b>Order records</b> &mdash; order id, total, currency and the product
                            ids in the order, for merchants using order attribution.{' '}
                            <b>No customer names, email addresses, phone numbers or postal
                            addresses are received or stored</b>, on any plan.
                        </li>
                    </ul>

                    <h3 className="font-bold mt-6 mb-2">Consent</h3>
                    <p>
                        On Shopify we check Shopify&apos;s Customer Privacy API before storing the
                        visitor identifier, and remove it if consent is later withdrawn. On other
                        platforms the widget honours a browser&apos;s Global Privacy Control
                        signal, and can be held behind your own consent banner with{' '}
                        <code className="text-xs bg-black/5 px-1 py-0.5 rounded">
                            data-emode-consent=&quot;deferred&quot;
                        </code>{' '}
                        and{' '}
                        <code className="text-xs bg-black/5 px-1 py-0.5 rounded">
                            window.emode.grantConsent()
                        </code>.
                        Where consent is refused, try-on still works &mdash; it is simply not
                        attributed.
                    </p>

                    <h3 className="font-bold mt-6 mb-2">Our obligations</h3>
                    <ul className="space-y-2 list-disc ml-5 marker:text-charcoal/30">
                        <li>Process customer data only on your instructions, and only to provide emode.</li>
                        <li>Keep it confidential, and require the same of anyone with access.</li>
                        <li>Encrypt it in transit and at rest.</li>
                        <li>
                            Help you respond to a customer exercising their rights &mdash; access,
                            correction, deletion, objection &mdash; within the time the law gives you.
                        </li>
                        <li>Tell you without undue delay if customer data is breached.</li>
                        <li>
                            Delete or return customer data when you close your account, subject to
                            the retention periods in the{' '}
                            <a href="/privacy" className="underline">privacy policy</a>.
                        </li>
                        <li>Give you the information you reasonably need to demonstrate compliance.</li>
                    </ul>

                    <h3 className="font-bold mt-6 mb-2">Sub-processors</h3>
                    <p>
                        We use the providers listed in the{' '}
                        <a href="/privacy" className="underline">privacy policy</a>, which names
                        each one and what it receives. That list is the authoritative one, and it
                        changes when the code does. We will tell merchants by email before adding a
                        sub-processor that handles customer data, and you may object.
                    </p>
                    <p>
                        Where data leaves the region it was collected in, we rely on the standard
                        contractual clauses our providers offer.
                    </p>
                </Section>

                <Section n={10} title="Changes to these terms">
                    <p>
                        We may update these terms. The date above changes when we do, and for
                        material changes we will notify merchants by email. Continuing to use
                        emode after a change means accepting it.
                    </p>
                </Section>

                <Section n={11} title="Contact">
                    <p>
                        <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">{SUPPORT_EMAIL}</a>
                        {' '}— for questions about these terms, or anything else.
                    </p>
                </Section>
            </div>
        </article>
    );
}
