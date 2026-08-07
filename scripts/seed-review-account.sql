-- Make the Shopify App Store reviewer's test account actually testable.
--
-- The submission form takes one set of credentials (shopify-review@emode.style)
-- and Shopify's reviewer signs in with them expecting to reach the app. Until
-- this runs, that account has no row in `merchants`, so getMerchantForUser()
-- resolves nothing and emode.style/admin opens on the empty "connect your
-- store" screen. Signing in works; there is simply nothing behind it. A
-- reviewer has no way to tell those two situations apart, and "I signed in and
-- the app was empty" is a rejection.
--
-- This attaches a demo store to that account: Growth plan, so Studio and scene
-- control are switched on, with a catalogue copied from the existing
-- development store (those images sit on a public Shopify CDN, so they render
-- for someone signing in cold with no other setup).
--
-- Deliberately NOT seeded: try-ons, orders, revenue. Fabricated performance
-- figures on a review account are a bad idea on their own merits, and the
-- dashboard already has a "Gathering data" state for a store with no history.
-- The reviewer generates real try-ons themselves by following the testing
-- instructions, and the numbers fill in from those.
--
-- Safe to re-run: every insert is guarded, so a second run changes nothing.
--
-- Run in the Supabase SQL editor (project: Emode / nmqsjfghiunjghaoranw).
-- Undo is at the bottom of this file.

begin;

-- 1. The demo store, owned by the reviewer's account.
--    comped = true so no billing sync ever resets the plan out from under it.
insert into merchants (shop_domain, platform, plan, brand_name, brand_slug, owner_user_id, comped)
select 'emodeai-review-demo.myshopify.com', 'shopify', 'growth',
       'emodeAI Review Demo', 'emodeai-review-demo', u.id, true
from auth.users u
where u.email = 'shopify-review@emode.style'
  and not exists (
    select 1 from merchants where shop_domain = 'emodeai-review-demo.myshopify.com'
  );

-- 2. A catalogue to look at, and for Studio to work against.
--    Copied from the development store rather than invented, so the image URLs
--    are real and publicly reachable.
insert into products (merchant_id, platform_product_id, title, handle,
                      primary_image_url, category, buy_url, marketplace_visible)
select demo.id,
       'demo-' || src.handle,
       src.title, src.handle, src.primary_image_url, src.category, src.buy_url,
       false  -- the demo catalogue stays out of the public marketplace
from merchants demo
join merchants seed
  on seed.platform = 'shopify'
 and seed.shop_domain like 'test-%myshopify.com'
join products src
  on src.merchant_id = seed.id
 and src.handle is not null
where demo.shop_domain = 'emodeai-review-demo.myshopify.com'
  and not exists (
    select 1 from products p
    where p.merchant_id = demo.id and p.platform_product_id = 'demo-' || src.handle
  );

-- 3. The entitlement is what /api/generate actually enforces. Without it the
--    account falls back to the 5-a-day default and a reviewer hits a wall
--    mid-test. Mirrors PLAN_LIMITS.growth.
insert into entitlements (subject_type, subject_id, plan, daily_generation_limit, overage_daily, unlimited)
select 'merchant', demo.id, 'growth', 5000, 5000, false
from merchants demo
where demo.shop_domain = 'emodeai-review-demo.myshopify.com'
  and not exists (
    select 1 from entitlements e
    where e.subject_type = 'merchant' and e.subject_id = demo.id
  );

commit;

-- Verify: expect one row, growth, products > 0.
select m.brand_name, m.plan, m.comped, u.email as owner,
       (select count(*) from products p where p.merchant_id = m.id) as products,
       (select count(*) from entitlements e
         where e.subject_type = 'merchant' and e.subject_id = m.id) as entitlements
from merchants m
join auth.users u on u.id = m.owner_user_id
where m.shop_domain = 'emodeai-review-demo.myshopify.com';


-- ---------------------------------------------------------------------------
-- Undo, once review is over. Order matters: children before the merchant.
-- ---------------------------------------------------------------------------
-- begin;
-- delete from entitlements where subject_type = 'merchant' and subject_id in (
--   select id from merchants where shop_domain = 'emodeai-review-demo.myshopify.com');
-- delete from generations where merchant_id in (
--   select id from merchants where shop_domain = 'emodeai-review-demo.myshopify.com');
-- delete from products where merchant_id in (
--   select id from merchants where shop_domain = 'emodeai-review-demo.myshopify.com');
-- delete from merchants where shop_domain = 'emodeai-review-demo.myshopify.com';
-- commit;
