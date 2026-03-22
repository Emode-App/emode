-- Initial Schema for emodeAI

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Merchants
CREATE TABLE merchants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_domain TEXT UNIQUE NOT NULL,
    platform TEXT CHECK (platform IN ('shopify', 'widget')) NOT NULL,
    plan TEXT NOT NULL DEFAULT 'starter',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Merchant Installations
CREATE TABLE merchant_installations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
    platform_access_token_encrypted TEXT,
    scopes TEXT[],
    installed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    uninstalled_at TIMESTAMP WITH TIME ZONE
);

-- Products
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
    platform_product_id TEXT NOT NULL,
    title TEXT NOT NULL,
    handle TEXT,
    primary_image_url TEXT,
    image_quality_status TEXT CHECK (image_quality_status IN ('ok', 'warning', 'blocked')) DEFAULT 'ok',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Variants
CREATE TABLE variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    platform_variant_id TEXT NOT NULL,
    price DECIMAL(12,2),
    currency TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Profiles (extends Supabase Auth users)
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    face_image_path TEXT,
    body_params JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Dressing Rooms
CREATE TABLE dressing_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL,
    status TEXT CHECK (status IN ('active', 'archived')) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Dressing Room Items
CREATE TABLE dressing_room_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dressing_room_id UUID REFERENCES dressing_rooms(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES variants(id) ON DELETE CASCADE,
    selected BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Generations
CREATE TABLE generations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES variants(id) ON DELETE CASCADE,
    mode TEXT CHECK (mode IN ('single', 'outfit')) NOT NULL,
    input_user_image_path TEXT,
    input_product_image_url TEXT,
    result_image_path TEXT,
    status TEXT CHECK (status IN ('queued', 'processing', 'succeeded', 'failed')) DEFAULT 'queued',
    error_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Saved Items
CREATE TABLE saved_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES variants(id) ON DELETE CASCADE,
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Saved Outfits
CREATE TABLE saved_outfits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    generation_id UUID REFERENCES generations(id) ON DELETE CASCADE,
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Entitlements
CREATE TABLE entitlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_type TEXT CHECK (subject_type IN ('user', 'merchant')) NOT NULL,
    subject_id UUID NOT NULL,
    plan TEXT NOT NULL,
    daily_generation_limit INTEGER DEFAULT 5,
    unlimited BOOLEAN DEFAULT FALSE,
    renews_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Usage Counters
CREATE TABLE usage_counters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_type TEXT CHECK (subject_type IN ('user')) NOT NULL,
    subject_id UUID NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    generations_used INTEGER DEFAULT 0,
    UNIQUE(subject_id, date)
);
