# Launch checklist

Split by who can actually do each item. Everything under "code" is done;
everything under "accounts" needs a login I do not have.

## Done

- **Stripe live keys** — production returns `cs_live_` sessions. Webhook is live
  mode with all four handled events. Customer portal configured, cancel at
  period end. **Proven by a real $29 purchase**, which created the merchant row
  and the entitlement — so the live webhook signing secret is correct, which was
  the one thing no amount of configuration checking could establish.
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

## Broken right now

### Custom SMTP  ·  blocks every email signup

Supabase auth logs show `454 "4.7.0 invalid credentials"` from
`smtp.gomailify.com` on `/signup`. Signup 500s, the account is rolled back, and
the UI has nothing to show. **Nobody can create an account by email**, and magic
links and password resets are down with it. Google sign-in still works, because
it never touches mail.

GoMailify issues a dedicated SMTP password by email — it is not the mailbox
password, and it only works while the domain is verified and the mailbox is
OAuth2-linked. Either re-enter that password, or move to a transactional
provider. Auth email is load-bearing enough for an AppSumo launch that a
provider with a regenerable API key is the safer dependency.

Turning custom SMTP **off** falls back to Supabase's own sender, which is
rate-limited to a few an hour — useless for launch, fine for finishing a test.

---

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

### 2. Shopify screencast  ·  the last item on the listing form

Three to eight minutes, merchant flow and buyer flow. Everything it depends on
is deployed. Shot list in `docs/screencast-script.md`.

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

## What still needs testing

Ordered by risk. Everything above the line is already proven and does not need
repeating.

**Proven, do not retest:** live checkout returns `cs_live_`; the webhook
signature verifies and provisions a merchant and entitlement (a real purchase
did this); the portal configuration exists; the Shopify app is deployed at
`emodeai-10` with `read_themes`; the Fly deploy pipeline runs green.

### 1. Shopify end to end  ·  do this first, it doubles as the screencast rehearsal

Install on a dev store with apparel products. The dashboard should open on
**"One step left"**. Press **Add try-on buttons** — the theme editor must open
on a *product* template with the block already placed, not the home page. Save,
then reopen the app: the banner must flip to **"Try-on buttons are live"**.

That flip is the only test of `read_themes`. If it still says "one step left"
after saving, the scope did not take and the reviewer will see the same thing.

Then a storefront try-on, a dressing room with two garments, and a checkout so
the dashboard has attributed revenue to show.

### 2. The widget merchant you already paid for

Set a brand name in Settings and confirm the dashboard header uses it. Copy the
snippet from Install Widget onto any page and confirm try-on buttons appear.
Run a try-on and confirm the count reaches the dashboard.

Open **Studio**: on Starter it must show the upgrade card, not the generator.
That is the plan gate, and it is the one place a wrong answer costs money.

Then **Manage Billing** → the portal must open, and cancelling must work. That
exercises the live portal configuration, and it is the path a real customer
uses to leave.

### 3. The post-payment flow, once SMTP is fixed

The stretch that produced four bugs in one purchase. Buy with a wallet email,
then sign up with a *different* address, and confirm the purchase attaches
itself — that is `/api/merchant/claim`, and it has never actually run. Use a
`+tag` address in Stripe's own email field via **Pay without Link** so the buyer
is genuinely cold.

Check the dashboard is not named after an email, the sidebar shows no locked
links while signed out, and the primary button says **Create your account**.

### 4. Auth, once SMTP is fixed

Sign up by email and confirm the message actually arrives. Then a password
reset, and a magic link opened in a *different browser* from the one that asked
for it. Confirm a breached password like `Password1` is rejected at signup.

---

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
