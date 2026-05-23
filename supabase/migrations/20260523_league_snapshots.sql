-- league_snapshots: daily snapshot of a league's standings + matchup
-- state. Powers The Wire's "since your last visit" stories:
--   - cat-tipped (a cat in your matchup flipped overnight)
--   - matchup-pulse (your score shifted overnight)
--   - rank-shift-overnight (team climbed/fell ≥2 spots overnight)
--
-- Saved lazily on first adapter load each day (idempotent via the
-- unique (league_id, snapshot_date) constraint). When a cron is
-- added later, the same table works — cron just gets first dibs on
-- writing the snapshot at a stable hour.
--
-- RLS lets each user read/write snapshots for leagues they own.
-- The leagues table already has user_id; we link through it.

create table if not exists public.league_snapshots (
  id              uuid primary key default gen_random_uuid(),
  league_id       uuid not null references public.leagues(id) on delete cascade,
  snapshot_date   date not null,
  current_week    integer not null default 1,
  -- standings: array of { teamId, rank, wins, losses, ties } for this date.
  -- Keep the shape narrow — we only need rank-shift + W-L-T to detect
  -- the editorially relevant deltas.
  standings       jsonb not null,
  -- matchups: array of { matchupId, homeTeamId, awayTeamId, homeCatWins,
  -- awayCatWins, ties } for the current week as of this snapshot.
  matchups        jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now(),
  -- One snapshot per league per date. Subsequent visits same day
  -- skip the write — the first visit's state is the baseline.
  unique (league_id, snapshot_date)
);

create index if not exists league_snapshots_league_date_idx
  on public.league_snapshots (league_id, snapshot_date desc);

alter table public.league_snapshots enable row level security;

-- Users can read snapshots for leagues they own.
create policy "users read their own league_snapshots"
  on public.league_snapshots
  for select
  using (
    exists (
      select 1
      from public.leagues l
      where l.id = league_snapshots.league_id
      and l.user_id = auth.uid()
    )
  );

-- Users can insert snapshots for leagues they own (lazy save path).
create policy "users insert their own league_snapshots"
  on public.league_snapshots
  for insert
  with check (
    exists (
      select 1
      from public.leagues l
      where l.id = league_snapshots.league_id
      and l.user_id = auth.uid()
    )
  );

-- Auto-cleanup: keep 30 days of snapshots rolling. Older snapshots
-- aren't useful for "since last visit" detection and just bloat
-- storage. Function runs cheap; cron isn't necessary — we can
-- call it from the lazy save path occasionally.
create or replace function public.prune_old_league_snapshots()
returns void
language sql
security definer
as $$
  delete from public.league_snapshots
  where snapshot_date < current_date - interval '30 days';
$$;
