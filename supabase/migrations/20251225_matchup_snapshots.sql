-- Matchup Win Probability Snapshots
-- Stores daily snapshots of matchup data for historical accuracy
-- This ensures we have real data (not simulations) for past weeks/seasons

CREATE TABLE IF NOT EXISTS matchup_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- League identification
  league_key TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'yahoo', -- 'yahoo' or 'sleeper'
  sport TEXT NOT NULL DEFAULT 'baseball', -- 'baseball', 'football', etc.
  season TEXT NOT NULL, -- '2025', '2026', etc.
  
  -- Matchup identification
  week INTEGER NOT NULL,
  matchup_id INTEGER NOT NULL,
  
  -- Snapshot timing
  snapshot_date DATE NOT NULL,
  day_of_week INTEGER NOT NULL, -- 0=Monday, 1=Tuesday, ..., 6=Sunday
  
  -- Team 1 data
  team1_key TEXT NOT NULL,
  team1_name TEXT,
  team1_points DECIMAL(10,2) DEFAULT 0,
  team1_projected DECIMAL(10,2) DEFAULT 0,
  
  -- Team 2 data
  team2_key TEXT NOT NULL,
  team2_name TEXT,
  team2_points DECIMAL(10,2) DEFAULT 0,
  team2_projected DECIMAL(10,2) DEFAULT 0,
  
  -- Calculated probabilities at time of snapshot
  team1_win_prob DECIMAL(5,2) DEFAULT 50,
  team2_win_prob DECIMAL(5,2) DEFAULT 50,
  
  -- Metadata
  is_final BOOLEAN DEFAULT FALSE, -- True if this is the final result (Sunday or week complete)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one snapshot per league/matchup/week/day
  UNIQUE(league_key, week, matchup_id, snapshot_date)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_snapshots_league_week 
  ON matchup_snapshots(league_key, week, season);

CREATE INDEX IF NOT EXISTS idx_snapshots_league_season 
  ON matchup_snapshots(league_key, season);

CREATE INDEX IF NOT EXISTS idx_snapshots_date 
  ON matchup_snapshots(snapshot_date);

-- Row Level Security
ALTER TABLE matchup_snapshots ENABLE ROW LEVEL SECURITY;

-- Everyone can read snapshots (they're not user-specific, they're league data)
CREATE POLICY "Snapshots are readable by all authenticated users"
  ON matchup_snapshots FOR SELECT
  TO authenticated
  USING (true);

-- Any authenticated user can insert snapshots (first one to snapshot wins due to UNIQUE constraint)
CREATE POLICY "Authenticated users can insert snapshots"
  ON matchup_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow updates only if not final (to update projected points during the day)
CREATE POLICY "Can update non-final snapshots"
  ON matchup_snapshots FOR UPDATE
  TO authenticated
  USING (is_final = false);

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_matchup_snapshot_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_matchup_snapshots_updated_at
  BEFORE UPDATE ON matchup_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION update_matchup_snapshot_timestamp();

-- Comments for documentation
COMMENT ON TABLE matchup_snapshots IS 'Daily snapshots of fantasy matchup scores and win probabilities for historical accuracy';
COMMENT ON COLUMN matchup_snapshots.day_of_week IS '0=Monday, 1=Tuesday, 2=Wednesday, 3=Thursday, 4=Friday, 5=Saturday, 6=Sunday';
COMMENT ON COLUMN matchup_snapshots.is_final IS 'True when this is the final result for the week (Sunday snapshot or week completed)';
