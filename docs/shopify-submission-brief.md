# Shopify App Store listing: filled-in brief

Written against the actual submission form, field by field, with every character
count checked. Form is down to **1 issue to fix**: the screencast URL, which
needs a recording nobody can generate for you. See `docs/screencast-script.md`.

The app itself is deployed and current: app version `emodeai-10` carries the
`read_themes` scope, and the Fly app is serving the dashboard code that uses
it.

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

**Web search content** — optional, and now filled and saved.

The requirements page defers to Google's own title-tag and meta-description
guidance rather than setting its own rules, so the binding constraints are the
form's limits plus the listing rules that apply everywhere: no statistics
(4.3.3), no superlatives, and no pricing outside Pricing details (4.2.3). None
of the copy below carries a number.

Shopify's marketing guide also says to cover multiple common spellings of a
term. "try on" and "try-on" are split across the two fields deliberately, so
both index without either field reading like keyword stuffing.

Title tag (60 max, 43 used). Keyword first, brand last: Google truncates the
tail, and the tail is the part a searcher least needs.
```
Virtual Try On for Fashion Stores | emodeAI
```

Meta description (160 max, 147 used). Under 160 so Google is unlikely to
truncate it, and it names both sides of the product — what the shopper gets and
what the merchant gets.
```
Add a virtual try-on button to your product pages. Shoppers see clothes on their own body before they buy, and you see which try-ons became orders.
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

Three public plans are now created and saved, under **Manual pricing**, matching
the `billing` config in `app/shopify.server.js`:

| Handle | Display name | Price | Top features |
|---|---|---|---|
| `starter` | Starter | $29/month | 500 try-ons a day included; try-on button on all product pages; dressing room for full outfits; try-on to purchase attribution |
| `pro` | Pro | $79/month | 2,000 try-ons a day included; everything in Starter; model shots from a product photo; advanced analytics |
| `growth` | Growth | $149/month | 5,000 try-ons a day included; everything in Pro; scene control on model shots; priority processing |

All three are **Monthly recurring**, no yearly price and no free trial, because
the Billing API config defines neither. Offering a yearly price on the listing
that the app cannot actually charge is a 4.2.1 mismatch.

**"This plan has additional charges" is deliberately left unticked on all
three.** Overage is counted and never billed: there is no usage line item in the
billing config and nothing calls `appUsageRecordCreate`. Ticking it would
declare a charge that does not exist.

Do not say overage is billed per generation, for the same reason. What is true:
try-ons keep working past the included allowance at no extra charge, up to
double it — Starter 1,000 a day, Pro 4,000, Growth 10,000.

**"I have approval to charge merchants outside of the Shopify Billing API" has
been unticked.** It was ticked, which was false — emodeAI bills through the
Billing API — and it was what made the form demand a billing-information URL.
Unticking removed the field and its error. There is no billing info page to
build. Do not re-tick it.

---|---|---|
| Starter | $29/month | 500 try-ons a day included |
| Pro | $79/month | 2,000 try-ons a day, model photography |
| Growth | $149/month | 5,000 try-ons a day, scene control, priority processing |

**Do not say overage is billed per generation.** It is not billed at all. The
Billing API config in `app/shopify.server.js` has no usage line item and nothing
in the app calls `appUsageRecordCreate`, so try-ons past the allowance are
counted and then forgiven. Describing a charge that never lands is the same
4.2.1 mismatch as hiding one.

What is true, and worth saying: try-ons keep working past the included
allowance at no extra charge, up to double it. Starter 500 included and 1,000 a
day hard ceiling, Pro 2,000 and 4,000, Growth 5,000 and 10,000.

**Untick "I have approval to charge merchants outside of the Shopify Billing
API."** It is currently ticked, which is both false and the reason the form
demands a billing-information URL. Unticking removes that field and its
validation error. There is no billing info page to build.

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

**`scripts/seed-review-account.sql` has been run**, so this account now resolves
to a real store rather than the connect-your-store screen. Verified in the
database: demo store `emodeai-review-demo.myshopify.com`, Growth plan, comped,
5 products all carrying public CDN image URLs, none of them exposed to the
marketplace, and a Growth entitlement of 5,000 a day so generation does not hit
the 5-a-day default mid-review.

That is the state the reviewer will land in. Sign in once yourself before
submitting anyway — the database being right is not the same as the page
rendering right.

Account description:

```
Merchant dashboard for emodeAI, at emode.style/login. Covers the parts of the app that live outside the Shopify admin: Studio for generating model photography, the product library, and full analytics. A demo store with a sample catalogue is already attached to this account. The Shopify-facing half of the app is tested by installing it on a development store, which does not need these credentials.
```

Rotate this password once review is done.

**Screencast URL** — required. Three to eight minutes, showing merchant flow
(install, theme block, dashboard) and buyer flow (try-on on a storefront).

**Testing instructions** (2800 max). Suggested:
```
Merchant flow
1. Install the app on a development store with at least one apparel product.
2. The app opens on the dashboard, which shows installation status, plan and daily usage.
3. Click "Add try-on buttons" on the dashboard. This deep links into the theme editor with the emodeAI Buttons block already placed in the product template. Click Save.
4. Open Plan in the app navigation to see all plans. Plans can be changed in either direction from here.

Buyer flow
5. Visit any product page on the storefront.
6. Tap Try This On. The modal opens over the product page.
7. Upload any full-length photo of a person. A generated try-on appears in a few seconds.
8. Tap Dressing Room, add a second garment, select both and choose Try Together.

The rest of the merchant dashboard
Not everything fits inside the Shopify admin. Studio, the product library and full analytics are at emode.style, and the test account above reaches them.
9. Go to emode.style/login and sign in with the test account credentials above.
10. Choose "For brands". A demo store is already attached, so the product library is populated.
11. Open Studio, pick a product and generate a model shot. This is the same generation engine as the try-on, run against a flat product image instead of a shopper photo.
12. Installing the app on your own development store also creates an emodeAI account for that store, keyed to its contact email. The dashboard in step 2 names the address. That is how a real merchant reaches their own data, and is separate from the test account above.

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
