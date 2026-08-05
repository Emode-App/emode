-- Every garment in a look, not just the page the shopper happened to be on.
--
-- generations carries a single product_id, resolved from the product whose page
-- opened the modal. Trying a jacket and jeans on together is one generation, so
-- the jacket got the credit and the jeans recorded zero try-ons — on a merchant's
-- own dashboard, next to a picture of the jeans. The dressing room exists
-- specifically to combine pieces, so the feature that makes emode worth having
-- was the one the analytics could not see.
--
-- generations.product_id stays as the primary/originating product; this records
-- the full set. One generation still means one generation for billing.
create table if not exists public.generation_products (
    generation_id uuid not null references public.generations(id) on delete cascade,
    product_id    uuid not null references public.products(id)    on delete cascade,
    primary key (generation_id, product_id)
);

create index if not exists generation_products_product_idx
  on public.generation_products (product_id);

alter table public.generation_products enable row level security;

-- Written only by the service role from /api/generate; merchants read their own
-- counts through the dashboard's service-role queries. No client-side access.

-- Backfill from what exists, so counts do not drop to zero the moment the
-- dashboard switches to reading this table.
insert into public.generation_products (generation_id, product_id)
select g.id, g.product_id
from public.generations g
where g.product_id is not null
on conflict do nothing;
