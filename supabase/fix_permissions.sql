-- ==============================================================================
-- FIX ALL TABLE PERMISSIONS & RLS FOR SUPABASE (RUN ONCE IN SQL EDITOR)
-- This grants public/anon API access to all tables so all devices and phones can
-- read and write listings, views, and inquiries in real-time.
-- ==============================================================================

-- 1. Grant schema usage to anon and authenticated roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 2. Grant table permissions to anon and authenticated roles
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

-- 3. Set default privileges for any future tables created
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated;

-- 4. Allow user_id in properties and inquiries to be nullable (so guests/sellers can post without foreign key blocks)
ALTER TABLE public.properties ALTER COLUMN user_id DROP NOT NULL;

-- 5. Open Row Level Security (RLS) policies for properties
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active properties" ON public.properties;
DROP POLICY IF EXISTS "Active and non-expired listings are publicly viewable" ON public.properties;
CREATE POLICY "Anyone can read active properties"
    ON public.properties FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Anyone can insert properties" ON public.properties;
DROP POLICY IF EXISTS "Authenticated users can create listings" ON public.properties;
CREATE POLICY "Anyone can insert properties"
    ON public.properties FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update properties" ON public.properties;
DROP POLICY IF EXISTS "Owners can update their own listings" ON public.properties;
CREATE POLICY "Anyone can update properties"
    ON public.properties FOR UPDATE
    USING (true);

DROP POLICY IF EXISTS "Anyone can delete properties" ON public.properties;
DROP POLICY IF EXISTS "Owners can delete their own listings" ON public.properties;
CREATE POLICY "Anyone can delete properties"
    ON public.properties FOR DELETE
    USING (true);

-- 6. Open RLS policies for profiles, views, and inquiries
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select profiles" ON public.profiles;
CREATE POLICY "Allow select profiles" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert profiles" ON public.profiles;
CREATE POLICY "Allow insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update profiles" ON public.profiles;
CREATE POLICY "Allow update profiles" ON public.profiles FOR UPDATE USING (true);

ALTER TABLE public.property_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select views" ON public.property_views;
CREATE POLICY "Allow select views" ON public.property_views FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert views" ON public.property_views;
CREATE POLICY "Allow insert views" ON public.property_views FOR INSERT WITH CHECK (true);

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select inquiries" ON public.inquiries;
CREATE POLICY "Allow select inquiries" ON public.inquiries FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert inquiries" ON public.inquiries;
CREATE POLICY "Allow insert inquiries" ON public.inquiries FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update inquiries" ON public.inquiries;
CREATE POLICY "Allow update inquiries" ON public.inquiries FOR UPDATE USING (true);

-- 7. Add seller contact and Google Maps location columns to properties table
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS owner_email TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS owner_phone TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS location_url TEXT;

