-- AppSumo redemption codes.
--
-- AppSumo sells lifetime deals as codes rather than subscriptions, and buyers
-- STACK them: one code buys the entry tier, a second upgrades, a third upgrades
-- again. So a code is not a plan — it is one unit of entitlement, and the plan
-- is a function of how many a person has redeemed.
--
-- That is why redeemed_by matters more than the code itself: the tier is
-- recomputed from the count of a user's redeemed codes every time, which means
-- a revoked code (AppSumo allows refunds for 60 days) downgrades them correctly
-- without any separate bookkeeping.
create table if not exists public.appsumo_codes (
    code         text primary key,
    batch        text not null,
    status       text not null default 'unredeemed',
    redeemed_by  uuid references auth.users(id) on delete set null,
    merchant_id  uuid references public.merchants(id) on delete set null,
    redeemed_at  timestamptz,
    revoked_at   timestamptz,
    note         text,
    created_at   timestamptz not null default now(),
    constraint appsumo_codes_status_check check (status in ('unredeemed','redeemed','revoked'))
);

-- Tier is counted per user on every redemption, so this index is on the hot path.
create index if not exists appsumo_codes_redeemed_by_idx
  on public.appsumo_codes (redeemed_by) where status = 'redeemed';

create index if not exists appsumo_codes_batch_idx on public.appsumo_codes (batch);

-- No policies. Codes are bearer tokens: a client able to SELECT this table could
-- read every unredeemed code in the batch. All access goes through the service
-- role in /api/redeem.
alter table public.appsumo_codes enable row level security;
