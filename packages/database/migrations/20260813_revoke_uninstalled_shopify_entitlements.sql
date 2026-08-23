-- Shopify uninstall used to delete only the Prisma session. /api/generate
-- reads entitlements, so an uninstalled store kept generating on its last
-- paid plan. The webhook now revokes like Stripe cancellation; this catches
-- stores that already uninstalled before that shipped.
--
-- Comped merchants are left alone: their plan is a grant, not a charge.

update merchants m
set plan = 'cancelled'
where m.platform = 'shopify'
  and coalesce(m.comped, false) = false
  and m.plan is distinct from 'cancelled'
  and not exists (
    select 1 from shopify."Session" s where s.shop = m.shop_domain
  );

delete from entitlements e
using merchants m
where e.subject_type = 'merchant'
  and e.subject_id = m.id
  and m.platform = 'shopify'
  and coalesce(m.comped, false) = false
  and not exists (
    select 1 from shopify."Session" s where s.shop = m.shop_domain
  );

update products p
set marketplace_visible = false
from merchants m
where p.merchant_id = m.id
  and m.platform = 'shopify'
  and coalesce(m.comped, false) = false
  and not exists (
    select 1 from shopify."Session" s where s.shop = m.shop_domain
  );
