# Going live

What actually has a test mode, what does not, and the order to change things in.

Checked on 2026-08-07 by calling the production checkout endpoint: it returned a
session id beginning `cs_test_`. **Production is running Stripe in test mode
today.** A merchant clicking a plan on the live site reaches a checkout that
accepts only test cards and never charges anyone.

---

## Only Stripe has modes

Most of the stack has no test/live distinction, so there is less to change than
it first looks.

| Secret | Has modes | Action |
|---|---|---|
| `STRIPE_SECRET_KEY` | Yes | Replace with `sk_live_` |
| `STRIPE_WEBHOOK_SECRET` | Yes | Replace with the live endpoint's signing secret |
| `NEXT_PUBLIC_SUPABASE_URL` | No | Already production, one project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | Already production |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Already production |
| `GOOGLE_API_KEY` | No | Gemini has no test mode. See billing below |
| `EMODE_IP_HASH_SECRET` | No | Your own value, unrelated to any provider |
| `NEXT_PUBLIC_EMODE_URL` | No | Already `https://www.emode.style` |

**No Stripe Price IDs to recreate.** Checkout builds line items from inline
`price_data` using `priceInCents` from `lib/stripe-plan-config.ts`, so there is
no product catalogue in Stripe to rebuild in live mode. This is usually the
tedious half of a live switch and it does not apply here. An empty Product
catalog in the Stripe dashboard is the correct state, not a missing step —
anything created there by hand is inert, because nothing in the code looks it
up. Prices change in `stripe-plan-config.ts` and ship with a deploy.

**The publishable key is not used.** There is no client-side Stripe anywhere:
no `loadStripe`, no `@stripe/stripe-js`. `/api/stripe/checkout` creates the
session server-side and returns `session.url` for the browser to follow, so
`pk_live_` is irrelevant to this app. Only the two secrets below matter.

**Expect to issue a fresh secret key.** Stripe shows a secret key once and
never again. Since no live key has ever been deployed, rolling one breaks
nothing — there is nothing in production using it yet.

---

## Order of operations

The trap is doing half of it. If the secret key goes live while the webhook
secret is still the test one, checkout will charge real money and **every
webhook will fail signature verification**, so nothing activates: the payment
succeeds, the merchant is charged, and their plan never turns on. Change both in
the same sitting.

1. **Activate the Stripe account.** Business details and a bank account. Live
   keys do not exist until this is done, so it gates everything below.

2. **Create a live-mode webhook endpoint.** Stripe dashboard, live mode,
   Developers → Webhooks → `https://www.emode.style/api/stripe/webhook`.
   Subscribe to the events the handler actually implements:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.payment_succeeded`

3. **Configure the Customer Portal in live mode.** Portal settings are
   per-mode, so a portal configured in test does not exist in live. Without it
   `/api/stripe/portal` errors and the Manage billing button dead-ends, which is
   also the cancellation path.

4. **Set both secrets in Vercel** (production scope), then redeploy. Vercel does
   not apply new environment values to an existing deployment.

5. **Verify** with the same probe used to find this:

   ```bash
   curl -s -X POST https://www.emode.style/api/stripe/checkout \
     -H "Content-Type: application/json" \
     -d '{"planId":"starter","platform":"widget"}'
   ```

   A live deployment returns `cs_live_...`. If it still says `cs_test_`, the
   redeploy did not pick up the new value.

6. **Buy something.** One real card, cheapest plan, then refund it in the
   dashboard. That exercises checkout, the webhook signature, entitlement
   creation and the portal in one pass, and it is the only way to know.

---

## Test-mode leftovers

Test and live are separate universes in Stripe. Nothing crosses.

- The **Logical** merchant holds a `cus_...` created in test mode. In live mode
  that customer does not exist, so the billing portal and the dunning flow will
  both error for that record. It is your own account, so either clear the column
  or re-subscribe it once live.
- Any test subscriptions, invoices and events stay in test mode and will not
  appear in live reporting.

---

## Not Stripe, but also worth doing before a spike

- **Gemini billing.** `GOOGLE_API_KEY` has no test mode, but it does have a free
  tier, and free-tier quota is per-minute as well as per-day. An AppSumo launch
  is exactly the traffic shape that trips it. Confirm billing is enabled on the
  project rather than assuming the key is enough.
- **`EMODE_IP_DAILY_CEILING`** defaults to 40 generations per IP per day. That is
  the abuse backstop, not the product limit. An office or a school behind one NAT
  can plausibly reach it, so decide whether 40 is right before launch rather than
  after the first support ticket.
- **`SHOPIFY_API_KEY` and `SHOPIFY_APP_URL`** are read by the Shopify app but are
  not in `turbo.json`'s build env list. That app deploys to Fly rather than
  through turbo, so it is not currently broken, but anything that starts building
  it through turbo will get undefined values.

---

## AppSumo does not need any of this

Lifetime codes are redeemed directly against `appsumo_codes` and never touch
Stripe. An AppSumo launch can go ahead on test-mode Stripe keys without a single
buyer noticing.

Live keys gate **direct and widget sales** only. That is a separate revenue path
from the AppSumo one, so this does not block that launch.

## Neither does Shopify

Shopify merchants are charged through the Billing API, never Stripe, so no
Stripe key affects them. There is nothing to flip: `isDevelopmentStore()` in
`app/routes/app.subscribe.jsx` reads `shop.plan.partnerDevelopment` and passes
`isTest` accordingly, so a real store is charged for real the first time one
subscribes, with no configuration change.

One thing to know about that function rather than to change: if the shop-plan
query fails it returns `true`, meaning a transient Admin API error hands that
merchant a test subscription they are never billed for. That is deliberate —
failing toward a free month beats charging someone by accident — but it fails
silently, so a run of `Could not read shop plan` in the logs is revenue quietly
going missing, not noise.
