# Chrome Web Store submission

Everything the listing form asks for, written out. Copy the fields; do the two
things only you can do.

The extension requests `<all_urls>`, which routes it to **manual review**. Budget
**two to four weeks**, not days, and treat that as the long pole — a detection
bug found after submission cannot be fixed quickly, which is why the regression
suite (`npm test`) exists and should be green before every upload.

---

## Before you package

- [ ] `npm test` green, `npm run lint` clean in `apps/chrome`
- [ ] Load unpacked and walk one product page, one listing page, one Google
      results page, and one store that already has emode installed
- [ ] Bump `version` in `manifest.json` — the Web Store rejects a re-upload at
      the same version, and it is the single most common wasted round-trip
- [ ] Zip the contents of `apps/chrome/` **without** `node_modules/`, `test/`,
      `.turbo/`, `eslint.config.mjs`, or `package.json`

```bash
cd apps/chrome && zip -r ../../emode-extension.zip . -x "node_modules/*" "test/*" ".turbo/*" "eslint.config.mjs" "package.json" "package-lock.json"
```

---

## Listing fields

**Name** — emode: Virtual Try-On for Any Store

**Short description** (132 char max)

> See how clothes look on you before you buy — on any store, from a search
> result, in one click. No account needed to start.

**Category** — Shopping

**Language** — English (United States)

### Detailed description

> Every year shoppers return roughly a third of what they buy online, and almost
> always for the same reason: it did not look the way they pictured it.
>
> emode puts a try-on button on product pages across the web. Click it, use a
> photo of yourself, and see the garment on your own body before you spend
> anything.
>
> **How it works**
> - Browse any clothing store. A Try On button appears on product pages.
> - Hover a product in a listing grid to get the same button without opening it.
> - Works from Google results too — emode fetches the merchant's own full-size
>   photo so the try-on is not built from a search thumbnail.
> - Save pieces to your Dressing Room and try a whole outfit at once.
> - Saved items link straight back to the shop, and mark themselves purchased
>   once you have bought them.
>
> **What it does not do**
> - No account required to try your first pieces.
> - Your photo is used to generate your try-on and is not sold or shared.
> - We do not collect your browsing history or record the pages you visit.
>
> Free plan includes 5 try-ons per day.
>
> Privacy policy: https://www.emode.style/privacy

---

## Permission justifications

These are the fields that decide how long review takes. Each one has to say what
breaks without it — reviewers reject vague answers, and a rejection costs another
full review cycle.

**`host_permissions: <all_urls>`**

> emode's purpose is to work on any clothing retailer, which is not a list that
> can be enumerated in advance — there are hundreds of thousands of independent
> stores and new ones daily. The content script reads product markup
> (schema.org/Product JSON-LD, OpenGraph tags) on the page the user is viewing so
> it can place a try-on button and identify the garment. Reading happens locally
> in the browser; page content is not transmitted to our servers. Restricting to
> a fixed match list would mean the extension silently does nothing on most of
> the stores users actually shop at, which is the entire product.
>
> The same permission lets the service worker fetch a product page the user has
> clicked through to from a search result, in order to read that merchant's
> full-size product image. Search-result thumbnails are roughly 200px and produce
> a visibly worse try-on. That request is made without credentials, so it carries
> no cookies to the merchant.

**`storage`**

> Stores the user's saved items (their "Dressing Room") and their sign-in token
> when they choose to sign in. Saved items live in the browser, not on our
> servers.

**`sidePanel`**

> The extension's main interface is a side panel: it shows the detected product,
> the user's saved items, and their remaining daily try-ons.

**`activeTab`**

> The side panel asks the tab the user is currently looking at what product is on
> it, so that opening the panel on a page they are already viewing shows that
> page's product rather than nothing.

**Remote code** — No. All logic ships in the package. The extension opens
`https://www.emode.style/modal` in an iframe for the try-on interface; that is
a hosted web page the user interacts with, not code executed in the extension's
context.

---

## Privacy disclosures

Tick these on the Privacy tab. They must match
[the privacy policy](https://www.emode.style/privacy), section 4 — a mismatch
between the form and the policy is a rejection.

| Data type | Collected | Why |
|---|---|---|
| Personally identifiable information | Yes | Email address, only if the user chooses to sign in |
| Health information | No | |
| Financial and payment information | No | Card details go to Stripe and never reach the extension |
| Authentication information | Yes | A session token, stored locally, only after sign-in |
| Personal communications | No | |
| Location | No | |
| Web history | **No** | The extension reads the current page to find a product; it does not record or transmit pages visited |
| User activity | Yes | A try-on event is recorded when the user generates one |
| Website content | Yes | Product title, image and price for the item the user chooses to try on |

**Certifications** — all three must be ticked:
- Not selling or transferring user data to third parties outside approved use cases
- Not using or transferring user data for purposes unrelated to the item's single purpose
- Not using or transferring user data to determine creditworthiness or for lending

**Single purpose statement**

> emode lets a shopper see how a garment would look on them before buying it, on
> any clothing retailer's website.

---

## Assets you have to make

Only you can do these two.

**Screenshots** — 1280×800 or 640×400, at least one, up to five. Take them at
1280×800 so they fill the card.

1. A product page with the Try On button in place next to Add to Cart
2. The generated try-on result in the modal
3. A listing page with the hover pill on a card
4. The side panel showing the Dressing Room with a couple of saved items
5. A Google results page with a pill on a sponsored product

**Store icon** — 128×128 PNG. `apps/chrome/icons/icon128.png` is already the
right size; confirm it reads clearly at that scale against both light and dark.

**Promotional tile** (optional, 440×280) — skip for the first submission. It
affects placement in curated collections, not approval.

---

## After submission

- Rejections arrive by email with a policy code. The two that realistically apply
  here are **Blue Argon** (permission justification insufficient) and **Purple
  Potassium** (privacy disclosure mismatch). Both are answered by editing the
  text above, not the code.
- A resubmission restarts the review clock. Get the justifications right the
  first time; that is why they are written out here rather than improvised into
  the form.
