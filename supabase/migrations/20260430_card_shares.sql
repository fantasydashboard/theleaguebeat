-- card_shares: every time a user clicks Share/Download on a UFD dashboard
-- card, one row lands here. Powers downstream analytics in CommandSite
-- (top-shared cards, conversion correlation) and viral-trigger emails
-- ("you shared 3 cards in trial — show your commish League Pass").
--
-- Fire-and-forget from the frontend: tracking failures must not block the
-- actual download. RLS lets each authenticated user insert their own rows;
-- service-role (CommandSite) reads everything.

create table if not exists public.card_shares (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  dashboard_type  text not null,                  -- e.g. 'power_rankings_points'
  league_id       text,                            -- platform_league_id from leagueStore
  sport           text,                            -- football | baseball | basketball | hockey
  platform        text,                            -- sleeper | yahoo | espn
  created_at      timestamptz not null default now()
);

create index if not exists card_shares_user_created_idx
  on public.card_shares (user_id, created_at desc);
create index if not exists card_shares_dashboard_idx
  on public.card_shares (dashboard_type, created_at desc);
create index if not exists card_shares_created_idx
  on public.card_shares (created_at desc);

alter table public.card_shares enable row level security;

create policy "users insert their own card_shares"
  on public.card_shares
  for insert
  with check (auth.uid() = user_id);

create policy "users read their own card_shares"
  on public.card_shares
  for select
  using (auth.uid() = user_id);
