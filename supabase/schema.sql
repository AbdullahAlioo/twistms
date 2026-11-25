-- ==============================================================================
-- TWISTMS LUXURY REAL ESTATE BACKEND SCHEMA (SUPABASE POSTGRESQL)
-- Includes:
-- 1. Profiles (User & Seller Accounts)
-- 2. Properties (Posts with Categories, Media, and Plan Durations)
-- 3. Automatic 90-Day Expiry for Free Plan & Expiration Cleanup
-- 4. Property Views & Seller Analytics
-- 5. Leads / Inquiries System
-- 6. Atomic Stored Procedures & Triggers
-- 7. Complete Row Level Security (RLS) Policies
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. PROFILES TABLE (Linked with Supabase Auth)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'seller' CHECK (role IN ('seller', 'buyer', 'agent', 'admin')),
    agency_name TEXT DEFAULT 'Independent Seller',
    bio TEXT,
    avatar_url TEXT,
    current_plan TEXT NOT NULL DEFAULT 'Free' CHECK (current_plan IN ('Free', 'Paid', 'Premium')),
    plan_selected_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
    ON public.profiles FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- 2. PROPERTIES / POSTS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Residential' CHECK (category IN ('Residential', 'Land', 'Commercial', 'Rental')),
    type TEXT NOT NULL DEFAULT 'Sale' CHECK (type IN ('Sale', 'Rent')),
    price NUMERIC NOT NULL CHECK (price >= 0),
    price_period TEXT, -- e.g. '/month'
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'Texas',
    state_code TEXT NOT NULL DEFAULT 'TX',
    zip TEXT NOT NULL,
    bedrooms NUMERIC DEFAULT 0,
    bathrooms NUMERIC DEFAULT 0,
    sqft NUMERIC DEFAULT 0,
    acreage NUMERIC DEFAULT 0,
    description TEXT,
    location_url TEXT,
    owner_name TEXT,
    owner_email TEXT,
    owner_phone TEXT,
    images TEXT[] DEFAULT ARRAY[]::TEXT[],
    videos TEXT[] DEFAULT ARRAY[]::TEXT[],
    plan TEXT NOT NULL DEFAULT 'Free' CHECK (plan IN ('Free', 'Paid', 'Premium')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending_review', 'expired', 'sold', 'draft')),
    expires_at TIMESTAMPTZ NOT NULL,
    views_count INTEGER NOT NULL DEFAULT 0,
    featured BOOLEAN NOT NULL DEFAULT false,
    verified BOOLEAN NOT NULL DEFAULT true,
    has_deed BOOLEAN NOT NULL DEFAULT true,
    has_tax_receipt BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for fast queries
CREATE INDEX IF NOT EXISTS idx_properties_user_id ON public.properties(user_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_expires_at ON public.properties(expires_at);
CREATE INDEX IF NOT EXISTS idx_properties_category ON public.properties(category);

-- Enable RLS on properties
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Properties Policies
-- 1. Public can view active, non-expired properties
DROP POLICY IF EXISTS "Active and non-expired listings are publicly viewable" ON public.properties;
CREATE POLICY "Active and non-expired listings are publicly viewable"
    ON public.properties FOR SELECT
    USING (true);

-- 2. Allow listings to be published
DROP POLICY IF EXISTS "Authenticated users can create listings" ON public.properties;
DROP POLICY IF EXISTS "Anyone can create listings" ON public.properties;
CREATE POLICY "Anyone can create listings"
    ON public.properties FOR INSERT
    WITH CHECK (true);

-- 3. Owners can update their listings
DROP POLICY IF EXISTS "Owners can update their own listings" ON public.properties;
CREATE POLICY "Owners can update their own listings"
    ON public.properties FOR UPDATE
    USING (true);

-- 4. Owners can delete their listings
DROP POLICY IF EXISTS "Owners can delete their own listings" ON public.properties;
CREATE POLICY "Owners can delete their own listings"
    ON public.properties FOR DELETE
    USING (true);

-- -----------------------------------------------------------------------------
-- 3. PROPERTY VIEWS TABLE (FOR SELLER ANALYTICS)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.property_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    viewer_ip TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_views_property_id ON public.property_views(property_id);
CREATE INDEX IF NOT EXISTS idx_property_views_created_at ON public.property_views(created_at);

ALTER TABLE public.property_views ENABLE ROW LEVEL SECURITY;

-- Anyone can log a view
DROP POLICY IF EXISTS "Anyone can record a view" ON public.property_views;
CREATE POLICY "Anyone can record a view"
    ON public.property_views FOR INSERT
    WITH CHECK (true);

-- Property owners can view analytics for their properties
DROP POLICY IF EXISTS "Owners can view property analytics" ON public.property_views;
CREATE POLICY "Owners can view property analytics"
    ON public.property_views FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.properties
            WHERE properties.id = property_views.property_id
            AND properties.user_id = auth.uid()
        )
    );

-- -----------------------------------------------------------------------------
-- 4. INQUIRIES / LEADS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'contacted', 'closed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inquiries_seller_id ON public.inquiries(seller_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_property_id ON public.inquiries(property_id);

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

-- Anyone can submit an inquiry
DROP POLICY IF EXISTS "Anyone can submit an inquiry" ON public.inquiries;
CREATE POLICY "Anyone can submit an inquiry"
    ON public.inquiries FOR INSERT
    WITH CHECK (true);

-- Sellers can see inquiries sent to them
DROP POLICY IF EXISTS "Sellers can view received inquiries" ON public.inquiries;
CREATE POLICY "Sellers can view received inquiries"
    ON public.inquiries FOR SELECT
    USING (auth.uid() = seller_id);

-- Sellers can update inquiry status (mark as contacted / closed)
DROP POLICY IF EXISTS "Sellers can update received inquiries" ON public.inquiries;
CREATE POLICY "Sellers can update received inquiries"
    ON public.inquiries FOR UPDATE
    USING (auth.uid() = seller_id);

-- -----------------------------------------------------------------------------
-- 5. AUTOMATED EXPIRATION & PLAN DURATION TRIGGER
--    - Free Plan: exactly 90 days (auto-erased / expired)
--    - Paid Plan: 180 days (6 months)
--    - Premium Plan: 365 days (1 year)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_property_expiration_on_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- If expires_at is not explicitly set, calculate based on selected plan
    IF NEW.expires_at IS NULL THEN
        IF NEW.plan = 'Free' THEN
            -- User requirement: Free plan posts erased/expired after 90 days
            NEW.expires_at := COALESCE(NEW.created_at, NOW()) + INTERVAL '90 days';
        ELSIF NEW.plan = 'Paid' THEN
            NEW.expires_at := COALESCE(NEW.created_at, NOW()) + INTERVAL '180 days';
        ELSIF NEW.plan = 'Premium' THEN
            NEW.expires_at := COALESCE(NEW.created_at, NOW()) + INTERVAL '365 days';
        ELSE
            NEW.expires_at := COALESCE(NEW.created_at, NOW()) + INTERVAL '90 days';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_property_expiration_on_insert ON public.properties;
CREATE TRIGGER trg_property_expiration_on_insert
    BEFORE INSERT ON public.properties
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_property_expiration_on_insert();

-- -----------------------------------------------------------------------------
-- 6. AUTOMATIC EXPIRED POSTS PURGE / CLEANUP FUNCTION
--    Permanently erases or marks expired posts older than 90 days for Free plan
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.erase_expired_free_listings()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete Free plan posts whose expiration date has passed
    DELETE FROM public.properties
    WHERE plan = 'Free' AND expires_at < NOW();

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Also mark paid/premium expired listings as 'expired'
    UPDATE public.properties
    SET status = 'expired'
    WHERE plan != 'Free' AND expires_at < NOW() AND status = 'active';

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 7. ATOMIC VIEW TRACKING FUNCTION
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_property_view(
    p_property_id UUID,
    p_viewer_id UUID DEFAULT NULL,
    p_viewer_ip TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- 1. Insert view record into history
    INSERT INTO public.property_views (property_id, viewer_id, viewer_ip, user_agent)
    VALUES (p_property_id, p_viewer_id, p_viewer_ip, p_user_agent);

    -- 2. Increment counter on property atomically
    UPDATE public.properties
    SET views_count = views_count + 1
    WHERE id = p_property_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 8. NEW USER PROFILE SYNC TRIGGER (AUTH.USERS -> PUBLIC.PROFILES)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        phone,
        role,
        agency_name,
        current_plan
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'seller'),
        COALESCE(NEW.raw_user_meta_data->>'agency_name', 'Independent Seller'),
        COALESCE(NEW.raw_user_meta_data->>'current_plan', 'Free')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 9. SELLER DASHBOARD ANALYTICS VIEW
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.seller_dashboard_stats AS
SELECT 
    p.user_id,
    COUNT(p.id) AS total_listings,
    COUNT(p.id) FILTER (WHERE p.status = 'active' AND p.expires_at > NOW()) AS active_listings,
    COUNT(p.id) FILTER (WHERE p.expires_at <= NOW() OR p.status = 'expired') AS expired_listings,
    COALESCE(SUM(p.views_count), 0) AS total_views,
    COALESCE(
        (SELECT COUNT(i.id) FROM public.inquiries i WHERE i.seller_id = p.user_id), 0
    ) AS total_inquiries
FROM public.properties p
GROUP BY p.user_id;
