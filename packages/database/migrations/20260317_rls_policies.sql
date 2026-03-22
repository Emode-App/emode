-- Row Level Security Policies for emodeAI
-- Apply after initial schema is in place

-- Enable RLS on all tables
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dressing_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE dressing_room_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PRODUCTS: Public read (needed for widget/extension), 
-- merchant-only write
-- ============================================================
CREATE POLICY "Products are publicly readable"
    ON products FOR SELECT
    USING (true);

CREATE POLICY "Merchants can manage their own products"
    ON products FOR ALL
    USING (
        merchant_id IN (
            SELECT id FROM merchants WHERE shop_domain = current_setting('request.jwt.claims', true)::json->>'email'
        )
    );

-- ============================================================
-- VARIANTS: Public read (needed for product display),
-- merchant-only write via product ownership
-- ============================================================
CREATE POLICY "Variants are publicly readable"
    ON variants FOR SELECT
    USING (true);

-- ============================================================
-- USER PROFILES: Users can only access their own profile
-- ============================================================
CREATE POLICY "Users can view own profile"
    ON user_profiles FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
    ON user_profiles FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile"
    ON user_profiles FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- ============================================================
-- DRESSING ROOMS: Users can only access their own
-- ============================================================
CREATE POLICY "Users can view own dressing rooms"
    ON dressing_rooms FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can create own dressing rooms"
    ON dressing_rooms FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own dressing rooms"
    ON dressing_rooms FOR UPDATE
    USING (user_id = auth.uid());

-- ============================================================
-- DRESSING ROOM ITEMS: Access through dressing room ownership
-- ============================================================
CREATE POLICY "Users can view own dressing room items"
    ON dressing_room_items FOR SELECT
    USING (
        dressing_room_id IN (
            SELECT id FROM dressing_rooms WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage own dressing room items"
    ON dressing_room_items FOR ALL
    USING (
        dressing_room_id IN (
            SELECT id FROM dressing_rooms WHERE user_id = auth.uid()
        )
    );

-- ============================================================
-- GENERATIONS: Users can only see their own generations
-- ============================================================
CREATE POLICY "Users can view own generations"
    ON generations FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can create own generations"
    ON generations FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- ============================================================
-- SAVED ITEMS: Users can only access their own
-- ============================================================
CREATE POLICY "Users can view own saved items"
    ON saved_items FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can manage own saved items"
    ON saved_items FOR ALL
    USING (user_id = auth.uid());

-- ============================================================
-- SAVED OUTFITS: Users can only access their own
-- ============================================================
CREATE POLICY "Users can view own saved outfits"
    ON saved_outfits FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can manage own saved outfits"
    ON saved_outfits FOR ALL
    USING (user_id = auth.uid());

-- ============================================================
-- MERCHANTS: Read-only for public (for marketplace),
-- full access restricted to service role
-- ============================================================
CREATE POLICY "Merchants are publicly readable"
    ON merchants FOR SELECT
    USING (true);

-- ============================================================
-- ENTITLEMENTS: Only service role can manage,
-- subject can read their own
-- ============================================================
CREATE POLICY "Subjects can view own entitlements"
    ON entitlements FOR SELECT
    USING (subject_id = auth.uid());

-- ============================================================
-- USAGE COUNTERS: Users can see their own usage
-- ============================================================
CREATE POLICY "Users can view own usage"
    ON usage_counters FOR SELECT
    USING (subject_id = auth.uid());

CREATE POLICY "Users can update own usage"
    ON usage_counters FOR UPDATE
    USING (subject_id = auth.uid());

CREATE POLICY "Users can insert own usage"
    ON usage_counters FOR INSERT
    WITH CHECK (subject_id = auth.uid());
