-- Format-interest capture: when a user hits the "not yet supported"
-- notice for a particular league type and clicks "email me when this
-- lands", we record WHICH format they were trying to use so we have
-- real demand data to prioritize the roadmap.
--
-- The capture is async — the notice writes the requested format to
-- localStorage before opening the signup modal; after sign-in
-- succeeds, App.vue's onSignedIn hook reads localStorage and inserts
-- a row here. Failures are non-fatal (table missing in dev, RLS
-- mismatch, etc.) so they never block sign-in.

CREATE TABLE IF NOT EXISTS format_interest (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- Discriminator from src/utils/leagueSupport.ts UnsupportedKind:
  -- 'roto' | 'points' | 'football' | 'other-sport' | 'unknown'
  requested_kind TEXT NOT NULL,
  -- Raw sport + scoring_type strings as detected at the time. Helps
  -- us spot unusual values (e.g. ESPN exposing a new format) without
  -- having to walk every league row to reproduce.
  sport TEXT,
  scoring_type TEXT,
  -- Where the interest signal came from. For now only the unsupported
  -- league notice surfaces this; future entry points (e.g. a "request
  -- a sport" page) can use different source tags.
  source TEXT NOT NULL DEFAULT 'unsupported-league-notice',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, requested_kind)
);

CREATE INDEX IF NOT EXISTS idx_format_interest_kind
  ON format_interest(requested_kind);
CREATE INDEX IF NOT EXISTS idx_format_interest_user
  ON format_interest(user_id);

ALTER TABLE format_interest ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can record their own format interest"
  ON format_interest FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can see their own format interest"
  ON format_interest FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
