-- emodeAI: try-on → purchase attribution
--
-- The dashboard could previously only report how many try-ons happened, which
-- is a vanity metric. What justifies the subscription is proving that try-on
-- lifts conversion and cuts returns, and that needs order data joined to
-- try-on data by a shopper identity that survives from the product page to
-- checkout.
--
-- The identity is a `visitor_id` minted by the theme extension in localStorage
-- ON THE MERCHANT'S DOMAIN. It cannot live on emode's origin: the try-on modal
-- runs in a cross-origin iframe whose storage browsers partition, so anything
-- stored there is invisible at checkout. The extension echoes the id into a
-- Shopify cart attribute, which Shopify carries onto the order, and the
-- orders/create webhook reads it back.

-- ============================================================
-- GENERATIONS: which shopper produced this try-on
-- ============================================================
ALTER TABLE generations ADD COLUMN IF NOT EXISTS visitor_id TEXT;

CREATE INDEX IF NOT EXISTS generations_merchant_visitor_idx
    ON generations (merchant_id, visitor_id);

-- ============================================================
-- IMPRESSIONS: shoppers who SAW the try-on button
--
-- The control group. "42% of try-on users bought" means nothing without
-- "11% of shoppers who saw the button and didn't try it on" to compare against,
-- and that denominator cannot be reconstructed after the fact — hence logging
-- it from day one even though nothing reads it yet.
--
-- Deduplicated per (merchant, visitor, product) so a shopper refreshing a
-- product page twenty times does not distort the denominator or the row count.
-- ============================================================
CREATE TABLE IF NOT EXISTS tryon_impressions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
    visitor_id TEXT NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (merchant_id, visitor_id, product_id)
);

CREATE INDEX IF NOT EXISTS tryon_impressions_merchant_created_idx
    ON tryon_impressions (merchant_id, created_at);

-- ============================================================
-- ORDERS: mirrored from Shopify's orders/create webhook
--
-- Deliberately stores no customer PII — no email, name or address. Only what
-- the metrics need. That keeps the protected-customer-data surface as small as
-- possible when requesting read_orders approval from Shopify.
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
    platform_order_id TEXT NOT NULL,
    -- NULL when the shopper never interacted with emode; those rows are the
    -- store-wide baseline that try-on performance is measured against.
    visitor_id TEXT,
    total_price NUMERIC(12,2),
    currency TEXT,
    -- Shopify product GIDs on the order, for "did they buy the item they tried on".
    line_item_product_ids TEXT[] DEFAULT '{}',
    ordered_at TIMESTAMPTZ,
    refunded_total NUMERIC(12,2) DEFAULT 0,
    refunded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Shopify retries webhooks; without this a flaky delivery double-counts revenue.
    UNIQUE (merchant_id, platform_order_id)
);

CREATE INDEX IF NOT EXISTS orders_merchant_ordered_idx
    ON orders (merchant_id, ordered_at);
CREATE INDEX IF NOT EXISTS orders_merchant_visitor_idx
    ON orders (merchant_id, visitor_id);

-- ============================================================
-- RLS: service-role only, like the rest of the merchant-facing tables.
-- Enabled with no policies = deny by default for anon/authenticated.
-- ============================================================
ALTER TABLE tryon_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- merchant_tryon_stats: everything the analytics dashboard needs, in one call.
--
-- Attribution rule: an order counts as "try-on influenced" when its visitor_id
-- has at least one generation that happened BEFORE the order. Ordering matters —
-- without it, someone who buys and then plays with try-on afterwards would count
-- as converted, inflating the number that merchants are paying for.
-- ============================================================
CREATE OR REPLACE FUNCTION merchant_tryon_stats(
    p_merchant_id UUID,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    tryon_visitors            BIGINT,
    control_visitors          BIGINT,
    tryon_conversions         BIGINT,
    control_conversions       BIGINT,
    tryon_revenue             NUMERIC,
    tryon_avg_order_value     NUMERIC,
    baseline_avg_order_value  NUMERIC,
    median_hours_to_purchase  NUMERIC,
    tryon_orders_refunded     BIGINT,
    tryon_refund_amount       NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_since TIMESTAMPTZ := NOW() - (p_days || ' days')::INTERVAL;
BEGIN
    RETURN QUERY
    WITH tried AS (
        SELECT DISTINCT g.visitor_id
        FROM generations g
        WHERE g.merchant_id = p_merchant_id
          AND g.visitor_id IS NOT NULL
          AND g.created_at >= v_since
    ),
    saw AS (
        -- Control group: saw the button, never generated.
        SELECT DISTINCT i.visitor_id
        FROM tryon_impressions i
        WHERE i.merchant_id = p_merchant_id
          AND i.created_at >= v_since
          AND i.visitor_id NOT IN (SELECT t.visitor_id FROM tried t)
    ),
    -- An order is attributed only if a try-on preceded it.
    attributed AS (
        SELECT o.*
        FROM orders o
        WHERE o.merchant_id = p_merchant_id
          AND o.ordered_at >= v_since
          AND o.visitor_id IN (SELECT t.visitor_id FROM tried t)
          AND EXISTS (
              SELECT 1 FROM generations g
              WHERE g.merchant_id = o.merchant_id
                AND g.visitor_id = o.visitor_id
                AND g.created_at <= o.ordered_at
          )
    ),
    control_orders AS (
        SELECT o.*
        FROM orders o
        WHERE o.merchant_id = p_merchant_id
          AND o.ordered_at >= v_since
          AND o.visitor_id IN (SELECT s.visitor_id FROM saw s)
    ),
    all_orders AS (
        SELECT o.* FROM orders o
        WHERE o.merchant_id = p_merchant_id AND o.ordered_at >= v_since
    ),
    latencies AS (
        SELECT EXTRACT(EPOCH FROM (a.ordered_at - MIN(g.created_at))) / 3600.0 AS hours
        FROM attributed a
        JOIN generations g
          ON g.merchant_id = a.merchant_id
         AND g.visitor_id = a.visitor_id
         AND g.created_at <= a.ordered_at
        GROUP BY a.id, a.ordered_at
    )
    SELECT
        (SELECT count(*) FROM tried),
        (SELECT count(*) FROM saw),
        (SELECT count(DISTINCT a.visitor_id) FROM attributed a),
        (SELECT count(DISTINCT c.visitor_id) FROM control_orders c),
        COALESCE((SELECT sum(a.total_price) FROM attributed a), 0),
        COALESCE((SELECT avg(a.total_price) FROM attributed a), 0),
        COALESCE((SELECT avg(o.total_price) FROM all_orders o), 0),
        -- percentile_cont returns double precision even over numeric input,
        -- which does not match this function's NUMERIC return column.
        COALESCE((SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY l.hours) FROM latencies l), 0)::NUMERIC,
        (SELECT count(*) FROM attributed a WHERE a.refunded_total > 0),
        COALESCE((SELECT sum(a.refunded_total) FROM attributed a), 0);
END;
$$;

REVOKE ALL ON FUNCTION merchant_tryon_stats(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION merchant_tryon_stats(UUID, INTEGER) TO service_role;
