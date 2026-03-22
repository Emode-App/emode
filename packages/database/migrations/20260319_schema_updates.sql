-- emodeAI Schema Updates: Merchant Identity, Marketplace Fields, Buy URLs
-- Apply after 20260317_rls_policies.sql

-- ============================================================
-- MERCHANTS: Add brand identity + Stripe/auth linking
-- ============================================================
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS brand_name TEXT;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS brand_slug TEXT UNIQUE;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id);

-- ============================================================
-- PRODUCTS: Add marketplace + category fields
-- ============================================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'uncategorized';
ALTER TABLE products ADD COLUMN IF NOT EXISTS buy_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS marketplace_visible BOOLEAN DEFAULT false;

-- ============================================================
-- VARIANTS: Add buy URL for direct purchase links
-- ============================================================
ALTER TABLE variants ADD COLUMN IF NOT EXISTS buy_url TEXT;

-- ============================================================
-- RLS: Merchants can update their own record via owner_user_id
-- ============================================================
CREATE POLICY "Merchants can update own record"
    ON merchants FOR UPDATE
    USING (owner_user_id = auth.uid());

-- Allow authenticated users to read entitlements for their merchant
CREATE POLICY "Merchant owners can view merchant entitlements"
    ON entitlements FOR SELECT
    USING (
        subject_id IN (
            SELECT id FROM merchants WHERE owner_user_id = auth.uid()
        )
    );
