-- Outbound clicks from the marketplace to a merchant's store.
--
-- The marketplace links straight out and emode is not a party to the sale, so
-- there is no transaction to observe. What there is, is the click — and without
-- recording it there is no way to say the marketplace sent anybody anywhere.
--
-- That matters twice over. A merchant paying for a marketplace listing deserves
-- to see what it returned; and no future arrangement based on referred sales can
-- exist without attribution underneath it. Recording clicks now costs nothing
-- and commits to nothing, but not recording them forecloses the option
-- permanently — you cannot backfill a click that was never observed.
--
-- visitor_id is the same opaque value the widget mints on the merchant's own
-- domain, so a click here and an order there can be joined later without either
-- side carrying personal data.
create table if not exists public.marketplace_clicks (
    id          uuid primary key default gen_random_uuid(),
    merchant_id uuid not null references public.merchants(id) on delete cascade,
    product_id  uuid references public.products(id) on delete set null,
    visitor_id  text,
    referrer    text,
    created_at  timestamptz not null default now()
);

create index if not exists marketplace_clicks_merchant_idx
  on public.marketplace_clicks (merchant_id, created_at desc);

-- The join a commission model would need: click by visitor, order by visitor.
create index if not exists marketplace_clicks_visitor_idx
  on public.marketplace_clicks (visitor_id) where visitor_id is not null;

alter table public.marketplace_clicks enable row level security;
