-- statcast_metrics: Baseball Savant expected-stats and batted-ball metrics.
-- Populated by supabase/functions/fetch-projections (delete-then-insert per
-- season on each run). Previously created ad-hoc in the Supabase dashboard,
-- but the table never existed in prod so every Savant insert silently failed
-- from launch through 2026-04-22. Captured here so the schema is
-- reproducible.

create table if not exists public.statcast_metrics (
  id                  bigserial primary key,
  mlbam_id            integer     not null,
  player_name         text        not null,
  player_type         text        not null check (player_type in ('batter', 'pitcher')),
  season              integer     not null,

  -- Plate-appearance volume
  pa                  integer,

  -- YTD actuals from the expected_statistics endpoint
  -- (for pitchers these are opponent-against)
  ba                  numeric,
  slg                 numeric,
  woba                numeric,

  -- Expected stats
  xba                 numeric,
  xslg                numeric,
  xwoba               numeric,
  xobp                numeric,      -- batters only
  xiso                numeric,      -- batters only
  xera                numeric,      -- pitchers only

  -- Statcast batted-ball metrics
  exit_velocity_avg   numeric,
  launch_angle_avg    numeric,
  barrel_rate         numeric,
  hard_hit_pct        numeric,
  sweet_spot_pct      numeric,      -- batters only
  k_pct               numeric,
  bb_pct              numeric,
  whiff_pct           numeric,      -- pitchers only
  sprint_speed        numeric,      -- batters only

  raw_data            jsonb,
  fetched_at          timestamptz default now()
);

create index if not exists statcast_metrics_season_type_idx
  on public.statcast_metrics (season, player_type);

create index if not exists statcast_metrics_mlbam_idx
  on public.statcast_metrics (mlbam_id);
