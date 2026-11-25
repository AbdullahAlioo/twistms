-- ==============================================================================
-- AUTOMATIC 90-DAY EXPIRATION SCHEDULER (PG_CRON)
-- ==============================================================================
-- Supabase includes pg_cron extension by default.
-- Run this in the Supabase SQL Editor to schedule automatic erasure
-- of Free plan listings older than 90 days every night at midnight.
-- ==============================================================================

-- 1. Enable pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Schedule nightly purge at 00:00 UTC
-- This executes erase_expired_free_listings() to delete 90-day-old Free listings
SELECT cron.schedule(
    'purge-expired-free-listings-nightly',
    '0 0 * * *',
    $$ SELECT public.erase_expired_free_listings(); $$
);

-- To check scheduled cron jobs:
-- SELECT * FROM cron.job;

-- To test immediate execution manually:
-- SELECT public.erase_expired_free_listings();
