# Shopify App Store listing: filled-in brief

Written against the actual submission form, field by field, with every character
count checked. Form reports **18 issues to fix**.

https://apps.shopify.com/services/partner-app-submissions/a8bdc109e414119e97ece1a0ab1b0df1/en

---

## Rules for whoever fills this in

**Do not press Submit.** Fill fields, click **Save**, stop. Submitting starts a
review clock and a resubmission after rejection restarts it.

**Never tick "I have approval to charge merchants outside of the Shopify Billing
API."** emodeAI bills through the Billing API. Ticking that is a false statement
and off-platform billing is banned outright.

**Do not invent anything.** If a field has no answer here, leave it blank and
report it. A plausible guess in a compliance form is worse than a gap, because
nobody rechecks a field that looks filled.

**Never mention the marketplace or the Chrome extension.** Reasons at the bottom.

---

## Basic app information

**App name** (30 max)
```
emodeAI
```

**App icon** — synced from the Partner Dashboard, cannot be set here.

**App category** — already correct: `Store design › Images and media › 3D/AR/VR`.
Do not change it. The form warns it cannot be edited after submission without an
appeal.

**App category details** — pick from the tag lists shown. Under **Visualization**
choose the tags matching try-on and product preview. Under **Customization**,
if nothing genuinely applies, tick *Not applicable for this app* rather than
padding it.

**Languages** — English only. The listing UI is English and nothing else is
translated, so listing more would breach requirement 4.3.2.

---

## App store listing content

**App introduction** (100 max, 97 used)
```
Let shoppers see clothes on their own body before they buy. Then see which try-ons became orders.
```

**App details** (500 max, 497 used). No links, no formatting, no statistics.
```
Shoppers return clothes because they cannot tell how something will look on them. emodeAI adds a try-on button to your product pages so they can find out first.

A shopper uploads one photo and sees the garment on their own body in seconds. They can stack several pieces and try a whole outfit at once.

Every try-on is matched to the order it produced, so you can see how many shoppers tried something on, whether they went on to buy more often than shoppers who did not, and what that was worth.
```

**Features** (3 to 5, each 80 max)
```
Try-on button on every product page, added as a theme app block
Shoppers stack several garments and try a whole outfit at once
Try-ons matched to orders, measured against a control group
Model photography generated from a flat product image
No theme code to edit and no product feed to build
```

**Demo store URL** — optional. Leave blank unless a real demo store exists. The
form forbids non-Shopify URLs and dev stores you do not own.

**Integrations** — leave blank. Shopify itself is not allowed, and the widget has
not been tested on other platforms, so there is nothing truthful to list.

---

## App discovery content

**App card subtitle** (62 max, 55 used)
```
Let shoppers try clothes on, and see which try-ons sold
```

**Search terms** (1 to 5, each 20 max). No "Shopify", no competitors, one idea
each.
```
virtual try on
try before you buy
fitting room
apparel visualizer
reduce returns
```

**Web search content** — optional, worth filling.

Title tag (60 max, 42 used)
```
emodeAI: virtual try-on for fashion stores
```

Meta description (160 max, 136 used)
```
Add a virtual try-on button to your product pages. Shoppers see clothes on their own body, and you see which try-ons turned into orders.
```

---

## Support and resources

| Field | Value |
|---|---|
| Preferred support channel | Support email address |
| Support email address | `support@emode.style` |
| Privacy policy URL | `https://www.emode.style/privacy` |
| Developer website (optional) | `https://www.emode.style` |
| FAQ (optional) | `https://www.emode.style/how-it-works` |

All of these are live and return 200.

---

## Install requirements

**Sales channel requirements: tick Shopify Online Store.**

Not optional. The form says to select it if the app includes theme app
extensions, and emodeAI installs as one. Leaving it unticked is one of the
18 flagged issues.

**Geographic requirements** — leave blank. Nothing is region-locked.

---

## Pricing details

The form shows **0 public plans**. Plans are configured behind the **Manage**
link, not typed here. They must match `app/shopify.server.js` exactly:

| Plan | Price | Include in the description |
|---|---|---|
| Starter | $29/month | 500 try-ons a day included |
| Pro | $79/month | 2,000 try-ons a day, model photography |
| Growth | $149/month | 5,000 try-ons a day, scene control, priority processing |

Say that busy days keep working past the included allowance and are billed per
generation. A listing that disagrees with the charge a merchant actually sees is
a rejection under 4.2.1 and a support problem afterwards.

---

## Contact information

Both required, both can be the same address:

- Merchant review email
- App submission email — add `noreply@shopify.com` and
  `app-submissions@shopify.com` to the allowlist for whatever inbox this is, or
  review mail lands in spam.

---

## App testing information

**Test account** — required, and already created and verified:

```
Username:  shopify-review@emode.style
Password:  Walnut-pivot-7198
```

Email is pre-confirmed and password sign-in is verified against the live auth
endpoint. No SSO, no 2FA, not a Shopify store credential, so it satisfies all
three of the form's prohibitions.

Account description:

```
Merchant dashboard for emodeAI. Sign in at emode.style/login. This account has no store connected yet, so it opens on the connect-your-store screen. Installing the app on a test store attaches that store automatically and the dashboard fills in.
```

Rotate this password once review is done.

**Screencast URL** — required. Three to eight minutes, showing merchant flow
(install, theme block, dashboard) and buyer flow (try-on on a storefront).

**Testing instructions** (2800 max). Suggested:
```
Merchant flow
1. Install the app on a development store with at least one apparel product.
2. The app opens on the dashboard, which shows installation status, plan and daily usage.
3. Open Theme Editor from the dashboard, and confirm the emodeAI Buttons app block appears on the product template.
4. Open Plan in the app navigation to see all plans. Plans can be changed in either direction from here.

Buyer flow
5. Visit any product page on the storefront.
6. Tap Try This On. The modal opens over the product page.
7. Upload any full-length photo of a person. A generated try-on appears in a few seconds.
8. Tap Dressing Room, add a second garment, select both and choose Try Together.

Signing in to the web dashboard
9. Go to emode.style/login and sign in with the test account above.
10. It opens on the closet. Choose "For brands" to reach the dashboard.
11. With no store connected the dashboard explains how to connect one. Shopify merchants install the app and nothing is purchased there, since billing runs through Shopify.

Notes
- Generation takes roughly five to fifteen seconds.
- Try-on works without a shopper account. Signing in only saves looks across devices.
- Analytics on the dashboard populate from real try-ons and orders, so a fresh store shows zeros until step 6 has run.
```

---

## Still blocked on assets

None of these can be produced by an assistant. They are why the listing cannot
be finished in one sitting.

- App icon, uploaded in the Partner Dashboard
- Feature media, 1600x900 image or a video with a 1600x900 thumbnail
- Three or more desktop screenshots. Alt text drafted below, 64 max each
- Screencast, 3 to 8 minutes
- Test account credentials

Screenshot alt text, in order:
```
Try-on button beside add to cart on a product page
A generated try-on showing a jacket on a shopper
Dashboard showing try-ons, conversion and attributed revenue
Dressing room with several garments selected
```

---

## Exclusions, and why

**No marketplace.** Requirement 1.1.6 bars apps that let merchants turn their
stores into classifieds-style marketplaces. emode's cross-merchant marketplace
is arguably exactly that. It is unlaunched and empty, so omitting it is both
safe and true.

**No Chrome extension.** Requirement 1.1.13 names marketing claims about copying
product information from any website, "whether using your app or a Chrome
extension". That is close enough to what the extension does that mentioning it
invites the question.

**No superlatives, statistics or testimonials.** Requirements 4.3.3, 4.3.4,
4.3.6. The form repeats this under App details: no statistics or unverifiable
claims. The copy above deliberately contains no numbers about performance.
