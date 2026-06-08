-- daily_rosters: per-team per-day roster snapshots for Phase 2
-- cross-team bench-blunder detection. Phase 1 detector only had
-- viewer-side bench data (data.myBenchedPlayers from the league
-- adapter). Phase 2 needs every team's bench/start splits per game
-- day so the wire can fire "Goof Juice benched Bichette" — not just
-- "Your bench had Duran."
--
-- Cost model: 84 Yahoo API calls per league per week to populate
-- (12 teams × 7 days). The cache makes repeat reads free for 24h.
-- Schema is platform-agnostic (player_names are normalized lower-
-- case strings) so ESPN can write to the same table.

CREATE TABLE IF NOT EXISTS public.daily_rosters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  team_id TEXT NOT NULL,
  day DATE NOT NULL,
  started_player_names TEXT[] NOT NULL DEFAULT '{}',
  benched_player_names TEXT[] NOT NULL DEFAULT '{}',
  -- Per-position starter map so the detector can find the slot a
  -- benched player would have filled. Format: { "1B": "lower name",
  -- "OF": ["lower a", "lower b"], ... } — JSON because positions
  -- can have multiple starters and we don't want to model them
  -- columnar. Optional for backward compat.
  starters_by_position JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (league_id, team_id, day)
);

CREATE INDEX IF NOT EXISTS idx_daily_rosters_league_day
  ON public.daily_rosters (league_id, day);

ALTER TABLE public.daily_rosters ENABLE ROW LEVEL SECURITY;

-- RLS — users can only see/write rosters for their own leagues.
CREATE POLICY "daily_rosters select own"
  ON public.daily_rosters FOR SELECT
  USING (
    league_id IN (
      SELECT id FROM public.leagues WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "daily_rosters insert own"
  ON public.daily_rosters FOR INSERT
  WITH CHECK (
    league_id IN (
      SELECT id FROM public.leagues WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "daily_rosters update own"
  ON public.daily_rosters FOR UPDATE
  USING (
    league_id IN (
      SELECT id FROM public.leagues WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "daily_rosters delete own"
  ON public.daily_rosters FOR DELETE
  USING (
    league_id IN (
      SELECT id FROM public.leagues WHERE user_id = auth.uid()
    )
  );
