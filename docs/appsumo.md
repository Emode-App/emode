# AppSumo redemption

## Running a launch

**1. Mint the codes.** From `apps/web` so `.env.local` is picked up:

```bash
node ../../scripts/generate-appsumo-codes.mjs --count 1000 --batch launch-2026-08
```

Writes `appsumo-launch-2026-08.csv`. That file is what AppSumo needs. It is
written only after every code is confirmed stored — handing over a code that
never made it into the database means a buyer who paid and cannot redeem.

**2. Give AppSumo the redemption URL:** `https://www.emode.style/redeem`

**3. Refunds.** AppSumo allows them for 60 days:

```bash
node ../../scripts/revoke-appsumo-code.mjs --code EMODE-XXXX-XXXX-XXXX --note "AppSumo refund #123"
```

## How stacking works

AppSumo buyers stack codes to upgrade, so a code is **not a plan** — it is one
unit of entitlement, and the plan is a function of how many a person holds.

| codes | plan | limit |
|---|---|---|
| 1 | Lifetime Starter | 50/day |
| 2 | Lifetime Pro | 200/day, marketplace |
| 3+ | Lifetime Founder | unlimited, marketplace |

Beyond three, extra codes buy nothing more but do not break: a buyer who somehow
redeems five lands on Founder rather than on `undefined`.

The tier is **recomputed from the count on every redemption**, never written onto
the code. That is the design decision everything else follows from, and it is
what makes refunds survivable: revoke a code, the count drops, the tier follows,
and there is no separate downgrade path to get wrong. Revocation and
recomputation are deliberately the same operation, because the tier is otherwise
only settled at redemption time — and someone who just refunded will never redeem
again to trigger it.

## Things that would be easy to get wrong

**Redemption claims the code in one conditional `UPDATE`**, not a read followed
by a write. Two requests racing the same code serialise, and the loser matches no
row. A read-then-write leaves a window where one code grants two entitlements,
which on a deal where codes *are* the product is the failure mode worth designing
against.

**Everything after the claim is recovery-safe.** The entitlement is rebuilt from
the count each time, so a half-finished redemption is repaired by redeeming the
next code rather than by support intervention.

**Entitlements are replaced, not added.** Stacking a second code must not leave
the first tier's row behind for `/api/generate` to find.

**Losing the marketplace tier unpublishes listings.** Visibility is a grant, not
a default; without that a refunded buyer keeps a paid placement indefinitely.

**Codes are Crockford base32** — no I, L, O or U — so a code misread off a screen
cannot become a *different valid code*. ~2^60 of keyspace, which is why
redemption needs no rate limiter beyond requiring a signed-in user.

The prefix `EMODE` contains an O, and the confusable-character mapping must
therefore run over the body only. Applied to the whole string it rewrote the
prefix to `EM0DE` and **every code failed to redeem** — caught by walking a real
redemption, not by reading the code.

## Not built

- **No AppSumo webhook integration.** Codes are handed over as a CSV. If AppSumo
  requires their API for this listing, redemption stays the same; only the minting
  and revoking steps change.
- **No self-serve refund.** Revocation is a script an operator runs.
