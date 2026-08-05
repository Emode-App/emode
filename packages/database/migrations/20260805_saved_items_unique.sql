-- One saved row per shopper per product.
--
-- saved_items had a primary key on id and nothing else, so hearting the same
-- piece twice — a double click, a second tab, a retried request — inserted a
-- second row and the closet listed the garment twice. The heart is a toggle, so
-- unsaving would then only remove one of them and the piece would appear to come
-- back.
--
-- Safe to apply as written: nothing had ever written to this table.
create unique index if not exists saved_items_user_product_uniq
  on public.saved_items (user_id, product_id);
