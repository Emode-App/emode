-- A failed payment is not a cancellation.
--
-- invoice.payment_failed previously only wrote a console line, so a merchant
-- whose card expired kept full service forever and nobody found out until
-- someone read the Stripe dashboard. The opposite reflex — cut them off on the
-- first failure — is worse: cards fail for bank hiccups and expiries constantly,
-- and switching off a paying merchant's storefront widget over one declined
-- charge takes down THEIR customers' experience, not ours.
--
-- Stripe already models the middle: it retries over a dunning window and only
-- gives up at the end of it. So this records the state and lets Stripe decide
-- when it is final.
--
-- Deliberately NOT stored by overwriting merchants.plan. Plan gates real
-- features (Studio access reads ASSET_PLANS.has(merchant.plan)), so writing
-- 'past_due' there would strip capabilities during a temporary failure and,
-- worse, destroy the record of which plan to restore on recovery.
alter table public.merchants
    add column if not exists payment_state text,
    add column if not exists dunning_since timestamptz,
    add column if not exists last_payment_failure text;

comment on column public.merchants.payment_state is
    'null when in good standing, ''past_due'' while Stripe is retrying a failed payment.';
comment on column public.merchants.dunning_since is
    'When the first failure in the current run occurred. Cleared on recovery.';

-- The dashboard query: who is failing, oldest first.
create index if not exists merchants_payment_state_idx
    on public.merchants (payment_state, dunning_since)
    where payment_state is not null;
