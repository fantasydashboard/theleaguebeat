-- Fantasy Football Dashboard - Initial Schema
-- Run this in your Supabase SQL editor

-- =============================================================================
-- PROFILES TABLE
-- Stores user profile information linked to Supabase Auth
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  sleeper_user_id TEXT,
  sleeper_username TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'premium')),
  subscription_status TEXT CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing')),
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- =============================================================================
-- USER LEAGUES TABLE
-- Stores which leagues a user has connected
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_leagues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  league_id TEXT NOT NULL,
  league_name TEXT NOT NULL,
  platform TEXT DEFAULT 'sleeper' CHECK (platform IN ('sleeper', 'espn', 'yahoo')),
  season INTEGER NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  roster_id INTEGER,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, league_id, season)
);

-- Enable RLS
ALTER TABLE public.user_leagues ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own leagues" ON public.user_leagues
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own leagues" ON public.user_leagues
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own leagues" ON public.user_leagues
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own leagues" ON public.user_leagues
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- USER PREFERENCES TABLE
-- Stores user preferences and settings
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  ranking_factors JSONB DEFAULT '{}',
  weekly_factors JSONB DEFAULT '{}',
  theme TEXT DEFAULT 'dark' CHECK (theme IN ('dark', 'light')),
  default_view TEXT DEFAULT 'projections',
  notifications_enabled BOOLEAN DEFAULT TRUE,
  email_digest TEXT DEFAULT 'weekly' CHECK (email_digest IN ('never', 'daily', 'weekly')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own preferences" ON public.user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own preferences" ON public.user_preferences
  FOR ALL USING (auth.uid() = user_id);

-- =============================================================================
-- SAVED RANKINGS TABLE
-- Allows users to save custom rankings
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.saved_rankings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  ranking_type TEXT NOT NULL CHECK (ranking_type IN ('ros', 'weekly', 'dynasty')),
  week INTEGER,
  season INTEGER NOT NULL,
  factors JSONB NOT NULL,
  player_rankings JSONB NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.saved_rankings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own rankings" ON public.saved_rankings
  FOR SELECT USING (auth.uid() = user_id OR is_public = TRUE);

CREATE POLICY "Users can insert own rankings" ON public.saved_rankings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rankings" ON public.saved_rankings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own rankings" ON public.saved_rankings
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- FUNCTIONS & TRIGGERS
-- =============================================================================

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_saved_rankings_updated_at
  BEFORE UPDATE ON public.saved_rankings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_sleeper_user_id ON public.profiles(sleeper_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON public.profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_leagues_user_id ON public.user_leagues(user_id);
CREATE INDEX IF NOT EXISTS idx_user_leagues_league_id ON public.user_leagues(league_id);
CREATE INDEX IF NOT EXISTS idx_saved_rankings_user_id ON public.saved_rankings(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_rankings_is_public ON public.saved_rankings(is_public) WHERE is_public = TRUE;

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
