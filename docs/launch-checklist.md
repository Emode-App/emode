# Launch checklist

Split by who can actually do each item. Everything under "code" is done;
everything under "accounts" needs a login I do not have.

## Blocking, and only you can do them

### 1. Custom SMTP  ·  blocks any launch that sends email

Supabase's built-in sender is rate limited to a handful of messages an hour and
is explicitly not for production. An AppSumo launch sends hundreds of magic links
in the first hour; everyone past the cap is locked out on day one.

1. Create a sending account — Resend's free tier is 3,000/month.
2. Verify your domain there (SPF and DKIM records).
3. Supabase → Project Settings → Authentication → SMTP Settings.

There is no way around needing a provider account and DNS access.

### 2. Magic link email template  ·  blocks sign-in from a second device

Supabase → Authentication → Email Templates → **Magic Link**:

```html
<a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email">Sign in</a>
```

Server side is deployed. Until this changes, a link only works when it happens to
open in the same browser that requested it. See `docs/auth-email-template.md`.

### 3. Shopify: Public distribution  ·  blocks charging Shopify merchants

Partner dashboard → app → Distribution → **Public**. Until then the Billing API
returns "Apps without a public distribution cannot use the Billing API", so no
Shopify merchant can pay — which also makes plan tiering there theoretical.

### 4. Shopify: protected customer data  ·  blocks every revenue number

Partner dashboard → app → API access → Protected customer data access. Request
Level 1 plus the **Orders** data field. Use case: attributing try-ons to purchases
for merchant analytics.

Approval takes time and is not guaranteed, so start it before you need it. Until
then `orders/create` and `refunds/create` cannot even be declared — `shopify app
deploy` rejects the whole version — which is why they sit commented out in
`shopify.app.toml`. Everything downstream exists; switching it on is config-only.

## Required, and not started

Submission work, not bugs.

- **Shopify App Store listing** — icon, screenshots, description, pricing detail,
  support contact, privacy policy URL. Then Shopify installs the app on a test
  store and reviews it.
- **Chrome Web Store listing** — the extension has never been packaged or
  submitted. Every field the form asks for is now written out in
  [docs/chrome-web-store.md](chrome-web-store.md), including the permission
  justifications, which are what decides how long review takes. What is left is
  yours: five screenshots, and pressing submit. Budget two to four weeks for
  review — `<all_urls>` routes it to a human.
- **AppSumo partner approval** — applying and being accepted, ahead of any listing
  assets. The redemption flow itself is built and tested end to end.

## Worth a decision before a thousand strangers arrive

- **Legal review.** The privacy policy and terms are accurate about the code, and
  were written by someone who is not a lawyer. The biometric question varies
  sharply by state — Illinois has BIPA, and it carries a private right of action.
  Get both read before AppSumo.

- **Thin automated tests, but no longer none.** `npm test` runs 64 regression
  tests over the Chrome extension's detection: JSON-LD and OpenGraph reading,
  quick-view overlays, listing cards, site chrome, the Google results adapter,
  order-confirmation matching, and the merchant-conflict check. Writing them
  found four real bugs that hand-testing had not — including quick-view dialogs
  detecting nothing whenever their photo linked to the product page, which is
  the most ordinary quick-view markup there is.

  Nothing else in the monorepo has tests. The web app, the Shopify app and the
  widget are still verified by a person looking at a screen. The widget is the
  next one worth covering: it runs on merchants' own sites, where a regression is
  visible to their customers before it is visible to you.

- **The "second entity" pattern.** Nearly every bug found came out the moment
  there were two of something: a second merchant blanked the dashboard, a second
  garment lost its attribution, a second browser broke auth, a second product
  collided on a global unique constraint. That is what a codebase built and tested
  with one of everything looks like. AppSumo delivers a thousand of everything on
  day one, and more of these almost certainly exist.

- **Model shots are unverified against a real product.** The Studio pipeline is
  built and typechecks, but no shot has been generated from a live catalogue —
  the only captured products point at `localhost` images the server cannot fetch.
  Generate one from a Shopify product before selling it.

- **Print resolution is not built**, deliberately. Output size is whatever the
  model returns and it has not been measured. Do not put it in a pricing table
  until it has.

- **The marketplace is empty.** Zero products are `marketplace_visible`. Captured
  products are deliberately not auto-published — that is the merchant's decision —
  but nobody has published any.

- **No self-serve cancellation** for widget merchants. Stripe handles the
  subscription; the dashboard offers no way to manage it.

- **AppSumo refunds are a script**, not a webhook. Fine at low volume, manual
  labour at high volume. See `docs/appsumo.md`.
