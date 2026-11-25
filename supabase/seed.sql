-- ==============================================================================
-- TWISTMS LUXURY REAL ESTATE DEMO SEED DATA
-- Insert test seller profile, active sample properties, views & sample inquiry
-- ==============================================================================

-- 1. Insert Demo Seller Profile (using fixed UUID for easy local/staging testing)
-- Note: In production Supabase, users are created via Supabase Auth (Sign Up).
-- This script provides demo rows directly for manual SQL seeding.

DO $$
DECLARE
    demo_user_id UUID := 'd0000000-0000-0000-0000-000000000001';
    prop_1_id UUID := gen_random_uuid();
    prop_2_id UUID := gen_random_uuid();
    prop_3_id UUID := gen_random_uuid();
BEGIN

    -- Create seller profile
    INSERT INTO public.profiles (
        id, email, full_name, phone, role, agency_name, current_plan
    )
    VALUES (
        demo_user_id,
        'seller@twistms.com',
        'Marcus Vance',
        '+1 (512) 555-0199',
        'seller',
        'TwistMS Elite Advisory',
        'Free'
    )
    ON CONFLICT (id) DO NOTHING;

    -- Property 1: Free Plan (Created today, expires in 90 days)
    INSERT INTO public.properties (
        id, user_id, title, category, type, price, address, city, state, state_code, zip,
        bedrooms, bathrooms, sqft, acreage, description, plan, status, expires_at, views_count,
        images
    )
    VALUES (
        prop_1_id,
        demo_user_id,
        'The Glass Haven Sanctuary & Ranch',
        'Residential',
        'Sale',
        1850000,
        '742 Evergreen Terrace',
        'Austin',
        'Texas',
        'TX',
        '78701',
        5, 4.5, 4850, 12.5,
        'Architectural masterpiece featuring panoramic floor-to-ceiling glass walls, solar-assisted energy grid, smart home automation, and private equine facilities.',
        'Free',
        'active',
        NOW() + INTERVAL '90 days',
        342,
        ARRAY['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80']
    )
    ON CONFLICT DO NOTHING;

    -- Property 2: Paid Verified Plan (Expires in 180 days)
    INSERT INTO public.properties (
        id, user_id, title, category, type, price, address, city, state, state_code, zip,
        bedrooms, bathrooms, sqft, acreage, description, plan, status, expires_at, views_count,
        images
    )
    VALUES (
        prop_2_id,
        demo_user_id,
        'Aspen High-Country Evergreen Timber Land',
        'Land',
        'Sale',
        890000,
        'Mile Marker 14, Silver Creek Pass',
        'Aspen',
        'Colorado',
        'CO',
        '81611',
        0, 0, 0, 84.0,
        'Premier recreational & timber investment parcel featuring year-round spring creek, majestic mountain vistas, and cleared building envelope with full road frontage.',
        'Paid',
        'active',
        NOW() + INTERVAL '180 days',
        588,
        ARRAY['https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80']
    )
    ON CONFLICT DO NOTHING;

    -- Sample Inquiry for Property 1
    INSERT INTO public.inquiries (
        property_id, seller_id, name, email, phone, message, status
    )
    VALUES (
        prop_1_id,
        demo_user_id,
        'Harrison Sterling',
        'harrison@sterlingcap.com',
        '+1 (512) 890-4411',
        'Hello, is this property available for a private viewing this Saturday afternoon? We are pre-approved cash buyers.',
        'unread'
    )
    ON CONFLICT DO NOTHING;

END $$;
