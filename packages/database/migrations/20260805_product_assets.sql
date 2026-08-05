-- Model shots generated from a merchant's own product images.
--
-- The Pro and Lifetime Pro plans have been sold with "AI-generated model
-- images", "Asset library & management" and "Unlimited asset creation" since
-- launch, and none of it existed — there was not even a storage bucket. This is
-- the storage half of making that claim true.
--
-- Unlike try-on results, these MUST be retained. A try-on is momentary and
-- belongs to the shopper; a model shot is a marketing asset the merchant will
-- put on their own product page, so a URL that stops working is worse than
-- never generating it.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('assets', 'assets', true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create table if not exists public.product_assets (
    id            uuid primary key default gen_random_uuid(),
    merchant_id   uuid not null references public.merchants(id) on delete cascade,
    product_id    uuid references public.products(id) on delete cascade,
    kind          text not null default 'model_shot',
    storage_path  text not null,
    public_url    text not null,
    -- What was asked for, kept so a merchant can regenerate a variation rather
    -- than reconstruct the settings from the picture.
    options       jsonb,
    created_at    timestamptz not null default now()
);

create index if not exists product_assets_merchant_idx on public.product_assets (merchant_id, created_at desc);
create index if not exists product_assets_product_idx on public.product_assets (product_id);

-- Rows are written by the service role from /api/assets/model-shot and read
-- through the dashboard's service-role queries. The bucket is public because
-- these are destined for public product pages; the paths are namespaced by
-- merchant id and unguessable.
alter table public.product_assets enable row level security;
