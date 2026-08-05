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
  submitted. Icons and manifest are ready; the listing, screenshots, privacy
  disclosures and review are not.
- **AppSumo partner approval** — applying and being accepted, ahead of any listing
  assets. The redemption flow itself is built and tested end to end.

## Worth a decision before a thousand strangers arrive

- **Legal review.** The privacy policy and terms are accurate about the code, and
  were written by someone who is not a lawyer. The biometric question varies
  sharply by state — Illinois has BIPA, and it carries a private right of action.
  Get both read before AppSumo.

- **Almost no automated tests.** The Chrome extension lints (`npm run lint` in
  `apps/chrome`) and that is the whole of it. Every regression found in the last
  session was found by a person looking at a screen.

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
