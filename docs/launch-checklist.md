# Launch checklist

Split by who can actually do each item. Everything under "code" is done;
everything under "accounts" needs a login I do not have.

## Done

- **Custom SMTP** — configured in Supabase, sending as `support@emode.style` via
  GoMailify. MX, SPF and DMARC are live on the domain, so that address receives
  as well as sends.
- **Supabase auth email rate limit** — raised above the 30/hour default that
  applies once custom SMTP is switched on. That default would have locked out
  everyone past the thirtieth signup in the first hour of an AppSumo launch.
- **Magic link email template** — points at
  `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email`, so a
  link works in a browser other than the one that asked for it.
- **Shopify public distribution** — enabled. The Billing API refuses to charge
  anyone until an app is publicly distributed, so this gated all Shopify revenue.
- **AppSumo codes** — batch `launch-2026-08`, 3000 minted and verified against
  the database. The CSV lives outside the repo; every line is a bearer token.
- **AppSumo redemption URL** — `https://www.emode.style/redeem`, live, and the
  signed-out path keeps a pasted code across sign-in.

## Blocking, and only you can do them

### 1. Shopify: protected customer data  ·  blocks every revenue number

Partner dashboard → app → API access → Protected customer data access. Request
Level 1 plus the **Orders** data field. Use case: attributing try-ons to
purchases for merchant analytics.

Approval takes time and is not guaranteed, so start it before you need it. Until
then `orders/create` and `refunds/create` cannot even be declared — `shopify app
deploy` rejects the whole version — which is why they sit commented out in
`shopify.app.toml`. Everything downstream exists; switching it on is config-only.

Answers to the access questionnaire are grounded in what the code does: no
customer names, emails, phone numbers or addresses are ever received or stored,
so request **no protected customer fields**, only the Orders resource.

### 2. Stripe live keys  ·  blocks all direct and Shopify revenue

Production is running Stripe in **test mode**, confirmed by calling the live
checkout endpoint and getting back a `cs_test_` session. A merchant who picks a
plan today reaches a checkout that cannot take their money.

Steps and the order they have to happen in are in
[docs/go-live.md](go-live.md). The trap is switching the secret key without the
webhook secret: payments then succeed while every webhook fails signature
verification, so merchants are charged and their plan never activates.

Does not block AppSumo. Lifetime codes never touch Stripe.

### 3. AppSumo: submit the listing

Copy is drafted. Still needs founding date, headquarters city, LinkedIn URL,
team size, stage and funding, plus the six screenshots.


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
- **AppSumo partner approval** — applying and being accepted. Codes, redemption
  URL and listing copy are all ready and waiting on it.

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

- **The signed-out redemption path has not been walked live.** Open /redeem in a
  private window, paste a code, sign in with an address that has no account, and
  confirm the link brings you back with the code still in the box. Everything in
  it is verified in code and none of it is verified through a real inbox.

- **Dunning is handled, but has never been exercised.** A failed payment now
  marks the merchant `past_due`, keeps their service running while Stripe
  retries, shows them a banner offering the billing portal, and revokes only on
  Stripe's final attempt. None of it has been triggered against a real card,
  because doing so requires a real failed charge. Stripe's test clocks can drive
  the whole sequence in the dashboard — worth doing once before AppSumo, since
  this path only runs when someone's money is already in question.

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
