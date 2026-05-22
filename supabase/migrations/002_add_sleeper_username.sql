-- Run this SQL in Supabase SQL Editor to update the user_leagues table
-- Only run this if you already ran the initial migration

-- Add sleeper_username column if it doesn't exist
ALTER TABLE public.user_leagues 
ADD COLUMN IF NOT EXISTS sleeper_username TEXT;

-- Change season column from INTEGER to TEXT if needed (to support '2024' format)
-- Note: This may fail if data already exists, in which case you may need to recreate the table
-- ALTER TABLE public.user_leagues ALTER COLUMN season TYPE TEXT;
