-- league_issues: per-week frozen snapshot of an Issue's data, keyed
-- on (league_id, year, week_number). Powers The Issue's archive —
-- prev/next nav loads the snapshot instead of relabeling live data
-- (the V0 theater).
--
-- Snapshot strategy: lazy. IssueView writes on first read for any
-- concluded week with no existing snapshot. The first reader on or
-- after Monday morning becomes the canonical snapshotter. Subsequent
-- reads hit the snapshot (idempotent via the unique constraint).
--
-- Past weeks that nobody visits yet remain unarchived until first
-- read after publish day — that's acceptable; we don't backfill.
--
-- RLS: users can read/write snapshots only for leagues they own,
-- linked through the leagues table's user_id.

create table if not exists public.league_issues (
  id              uuid primary key default gen_random_uuid(),
  league_id       uuid not null references public.leagues(id) on delete cascade,
  year            integer not null,
  week_number     integer not null,
  -- Full CategoryLeagueData JSON for the week. Snapshotting the
  -- data (not the rendered output) keeps the file small and lets
  -- editorial pipeline improvements apply to past issues. The
  -- trade-off: a copy fix later WILL change what a past issue
  -- reads — that's a known and accepted compromise for V1.
  data            jsonb not null,
  published_at    timestamptz not null default now(),
  unique (league_id, year, week_number)
);

create index if not exists league_issues_league_year_week_idx
  on public.league_issues (league_id, year, week_number desc);

alter table public.league_issues enable row level security;

-- Users can read snapshots for leagues they own.
create policy "users read their own league_issues"
  on public.league_issues
  for select
  using (
    exists (
      select 1
      from public.leagues l
      where l.id = league_issues.league_id
      and l.user_id = auth.uid()
    )
  );

-- Users can insert snapshots for leagues they own (lazy save path).
create policy "users insert their own league_issues"
  on public.league_issues
  for insert
  with check (
    exists (
      select 1
      from public.leagues l
      where l.id = league_issues.league_id
      and l.user_id = auth.uid()
    )
  );
