# Launch checklist

Split by who can actually do it. Everything under "code" is done; everything
under "accounts" needs a login I do not have.

## Blocking — only you can do these

### 1. Custom SMTP  ·  blocks any launch that sends email

Supabase's built-in sender is rate limited to a handful of messages an hour and
is explicitly not for production. An AppSumo launch sends hundreds of magic links
in the first hour; everyone past the cap is locked out on day one.

1. Create a sending account — Resend's free tier is 3,000/month, which covers a
   launch comfortably.
2. Verify your domain there (DNS records: SPF, DKIM).
3. Supabase → Project Settings → Authentication → SMTP Settings: host, port, user,
   password, and a sender address on the verified domain.

Not code. There is no way around needing a provider account and DNS access.

### 2. Magic link email template  ·  blocks sign-in from a second device

Supabase → Authentication → Email Templates → **Magic Link**:

```html
<a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email">Sign in</a>
```

The server side is already deployed. Until the template changes, a magic link only
works when it happens to open in the same browser that requested it — see
`docs/auth-email-template.md` for why.

### 3. Shopify: Public distribution  ·  blocks charging Shopify merchants

Partner dashboard → app → Distribution → **Public**. Until then the Billing API
returns "Apps without a public distribution cannot use the Billing API", so no
Shopify merchant can pay.

### 4. Shopify: protected customer data  ·  blocks every revenue number

Partner dashboard → app → API access → Protected customer data access. Request
Level 1 plus the **Orders** data field. Use case: attributing try-ons to purchases
for merchant analytics.

Approval takes time and is not guaranteed, so start it before you need it. Until
then `orders/create` and `refunds/create` cannot even be *declared* — `shopify app
deploy` rejects the whole version — which is why they sit commented out in
`shopify.app.toml`. Everything downstream already exists; switching it on is
config-only.

## Also required, and not yet started

These are not bugs. They are submission work nobody has done.

- **Shopify App Store listing** — icon, screenshots, description, pricing details,
  support contact, privacy policy URL. Then Shopify installs the app on a test
  store and reviews it.
- **Chrome Web Store listing** — the extension has never been packaged or
  submitted. Icons and manifest are ready; the listing, screenshots, privacy
  disclosures and review are not.
- **AppSumo partner approval** — applying and being accepted is its own process,
  ahead of any listing assets.

## Known weaknesses worth deciding about

Not blockers. Say-so-out-loud items before a thousand strangers arrive.

- **Almost no automated tests.** The extension lints (`npm run lint` in
  `apps/chrome`) and that is the extent of it. Every regression tonight was found
  by a person looking at a screen.

- **The "second entity" pattern.** Nearly every bug found tonight appeared the
  moment there were two of something: a second merchant blanked the dashboard, a
  second garment lost its attribution, a second browser broke auth, a second
  product collided on a global unique constraint. That is what a codebase built
  and tested with one of everything looks like. AppSumo delivers a thousand of
  everything on day one, and it is reasonable to assume more of these exist.

- **Generated images are not stored.** A try-on result comes back as a multi-MB
  data URL and is deliberately not written to Postgres. Nothing keeps it, so
  shoppers cannot revisit a look and there is no record of what was generated.
  Wants Supabase Storage.

- **The marketplace is empty.** Zero products are `marketplace_visible`. Captured
  products are deliberately not published — that is the merchant's decision — but
  nobody has published any, so the marketplace has nothing in it.

- **No self-serve cancellation** for widget merchants. Stripe handles the
  subscription; the dashboard offers no way to manage it.

- **AppSumo refunds are a script**, not a webhook. Fine at low volume, manual
  labour at high volume. See `docs/appsumo.md`.
