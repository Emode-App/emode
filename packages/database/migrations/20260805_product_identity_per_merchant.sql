-- Product identity is per merchant, not global.
--
-- products.platform_product_id carried a UNIQUE constraint across the whole
-- table, and /api/dressing-room/add derives that value from the product title:
--
--   const productId = title.toLowerCase().replace(/\s+/g, '-').substring(0, 50);
--
-- so every store selling a "Black Hoodie" was competing for one row. The lookup
-- beside it was not scoped by merchant either, which turned a collision into
-- something worse than a failed insert: the second merchant's shopper would be
-- handed the FIRST merchant's product row, and their try-on would be recorded
-- against a store they have never heard of. Where the existing row had no owner,
-- the next merchant to touch it claimed it outright.
--
-- Invisible so far only because there has been one real merchant. At AppSumo
-- scale "Black Hoodie" collides on day one.
--
-- Shopify is unaffected either way: its ids are gid://shopify/Product/N, already
-- globally unique. The constraint only ever bound widget merchants, which is
-- exactly where titles are the identity.
alter table public.products drop constraint if exists unique_platform_product_id;

create unique index if not exists products_merchant_platform_uniq
  on public.products (merchant_id, platform_product_id)
  where merchant_id is not null and platform_product_id is not null;
