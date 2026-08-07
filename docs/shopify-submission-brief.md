# Shopify Partner app submission brief

Everything an assistant needs to fill the submission form, and the things it
must not decide on its own.

Form: https://apps.shopify.com/services/partner-app-submissions/a8bdc109e414119e97ece1a0ab1b0df1/en

---

## Hard rules for whoever fills this in

**Do not press submit.** Fill every field, save the draft, and stop. Submitting
starts a review clock, and a resubmission after a rejection restarts it. A human
signs it off.

**Do not answer the protected customer data questionnaire.** Those are legal
attestations about how a company handles personal data. Draft answers are in
[chrome-web-store.md](chrome-web-store.md) and below, but the founder confirms
them.

**Do not invent anything.** If a field has no answer in this document, leave it
blank and list it at the end. A plausible guess in a compliance form is worse
than an empty field, because nobody comes back to check a filled one.

**Do not mention the marketplace or the Chrome extension.** Not in the
description, not in screenshots, not in feature lists. Reasons under
"Exclusions" below. This is the single easiest way to get rejected.

---

## App identity

| Field | Value |
|---|---|
| Client ID | `a8bdc109e414119e97ece1a0ab1b0df1` |
| App URL | `https://emode-tryon.fly.dev` |
| Access scopes | `write_products`, `read_products` |
| Distribution | Public (already enabled) |
| Embedded | Yes, App Bridge + session tokens |

**App name:** requirement 4.1.1 says the name in the Developer Dashboard must
match the submission form exactly. The config currently reads `emode-tryon`,
which is a development name. Decide the public name first, change it in both
places, and do not let them drift.

---

## What the app does

Virtual try-on for fashion merchants. A shopper on a product page taps a button,
supplies one photo, and sees the garment on their own body. It installs as a
theme app extension, so no theme code is edited.

It also reports whether try-ons turn into orders: every try-on carries an
anonymous identifier minted on the merchant's own domain, and the orders webhook
joins it to the purchase. The dashboard shows try-ons, conversion against a
control group of shoppers who saw the button and did not use it, attributed
revenue, and average order value against baseline.

Higher tiers generate product photography on a model from a flat product image.

---

## Pricing

Billed through the Shopify Billing API. Never mention off-platform billing.

| Plan | Price | Included per day |
|---|---|---|
| Starter | $29/month | 500 try-ons |
| Pro | $79/month | 2,000 try-ons |
| Growth | $149/month | 5,000 try-ons |

Busy days keep working past the included allowance and are billed per
generation. Merchants can move between plans in both directions from inside the
app, at **Plan** in the app navigation.

These figures must match `apps/emode-tryon/emode-tryon/app/shopify.server.js`
exactly. A listing that disagrees with the charge a merchant sees is a rejection
under 4.2.1 and a support problem afterwards.

---

## Support and legal

| Field | Value |
|---|---|
| Support email | `support@emode.style` |
| Privacy policy | `https://www.emode.style/privacy` |
| Terms of service | `https://www.emode.style/terms` |
| Contact page | `https://www.emode.style/contact` |

All three pages are live. The privacy policy has a data processing section and
names every sub-processor.

---

## Protected customer data

Request the **Orders** resource. Select **no protected customer fields** — not
name, not email, not address, not phone.

That is not a preference, it is what the code does: the orders webhook stores an
order id, total, currency and the product ids in the order, and nothing else. No
customer name, email, phone or address is ever received or stored, on any plan.

Reason for access: attributing try-ons to purchases so merchants can see whether
the feature pays for itself.

Requesting fields the app does not use is the most common cause of delay here.

---

## Exclusions, and why

**Do not mention the marketplace.** Requirement 1.1.6: apps that let merchants
turn their stores into classifieds-style marketplaces cannot be distributed on
the App Store. emode's cross-merchant marketplace is arguably exactly that. It
is currently empty and unlaunched, so leaving it out is both safe and true.

**Do not mention the Chrome extension.** Requirement 1.1.13 explicitly names
marketing claims about copying product information from any website, "whether
using your app or a Chrome extension". That describes the extension closely
enough that referencing it invites the question.

**No superlatives or statistics.** Requirement 4.3.3 and 4.3.4 forbid "the
first", "the best", "the only", and any statistic or claim in text or images.
Also no user reviews or testimonials anywhere in the listing.

---

## Only the founder can answer these

Leave blank and flag:

- Public app name, if different from `emode-tryon`
- App icon and listing screenshots
- Demo screencast showing install and core flow (4.5.3, mandatory)
- Test store credentials with full feature access (4.5.4, mandatory)
- Emergency developer contact (4.5.6, mandatory)
- Every field of the protected customer data questionnaire
- App category and search terms
