# The League Beat — Claude Code Context

## What this is
An editorial publication that auto-generates magazine-style coverage
of fantasy sports leagues. Reader-facing voice is third-person sports
magazine — closer to The Athletic / Bleacher Report than to a SaaS
dashboard. Tagline: "Your league story, chronicled."

See `EDITORIAL.md` for the brand voice manifesto. Every auto-generated
sentence has to clear those rules before it ships.

## Stack
Vue 3 + TypeScript + Pinia + Vite 5 + Tailwind 3
Backend: shared Supabase project with sister product Ultimate Fantasy
Dashboard (ref: `ergxtydfgffqgkddclvr`).
Hosting: Vercel.
Project path: ~/Projects/theleaguebeat

## Deploy Command
npm run build && git add -A && git commit -m "..." && git push && npx vercel --prod

## Key Details
- Supabase project ref: ergxtydfgffqgkddclvr (shared with UFD)
- Production domain: theleaguebeat.com
- Meta Pixel ID: 1263598218581460 (shared)
- ESPN Chrome Extension ID: dbjbbkdjodblojmhljgdbdlliogkhbjc (shared)
- Google OAuth uses implicit flow (flowType: 'implicit') — do not change to PKCE
- Edge functions deployed with --no-verify-jwt flag
- Vercel auto-deploy from GitHub is unreliable — always use npx vercel --prod explicitly

## Sister product
Ultimate Fantasy Dashboard (ultimatefantasydashboard.com) is the
dashboard/tooling product that shares the same Supabase backend. Code
is split into two repos but auth + leagues + connected platforms are
shared. A user signing in here can see their connected leagues whether
they originally connected them via UFD or TLB.

## Key File Locations
- Editorial pipeline:
  - Voice manifesto: EDITORIAL.md
  - Variant libraries: src/editorial/{home,pr,matchups,draft,history,swings}.ts
  - Detection: src/editorial/detect.ts, detect-pr.ts, etc.
  - Render: src/editorial/render.ts, render-pr.ts, etc.
  - Data contract: src/editorial/types.ts (CategoryLeagueData)
- Platform adapters: src/editorial/adapters/{sleeperAdapter,yahooAdapter,espnAdapter}.ts
- Platform services: src/services/{espn,yahoo,sleeper}.ts
- Live league shell: src/views/MyLeagueLayout.vue
- Live league views: src/views/CategoryDemo*View.vue (reused for both demo + live modes via route detection)
- Demo fixtures: src/fixtures/categoriesLeague.ts
- Router: src/router/index.ts
- Auth store: src/stores/auth.ts
- Leagues store: src/stores/leaguesNew.ts
- Platforms store: src/stores/platforms.ts

## URL Patterns
- `/` — redirects to /demo-categories/connect for now (proper landing TBD)
- `/demo-categories/*` — fixture-driven demo experience (no auth needed)
- `/leagues/:leagueId/*` — your real connected leagues (auth required, leagueId is Supabase leagues.id UUID)
- `/auth/callback`, `/auth/yahoo-callback` — OAuth return paths
- `/internal/logo-mockups` — brand exploration (hidden from production via hostname guard)

## League Types
Two formats, and the distinction matters more than "which sport":

- **H2H category** (`h2h-category`) — baseball. Fully shipped: ~100
  detectors, all three tabs.
- **H2H points** (`h2h-points`) — football. Foundation + detection
  engine shipped; copy and views are Phases 3-4.

`LeagueData` is the union. `sport?: LeagueSport` is on both, read only
through `sportOf()` (`src/editorial/leagueCore.ts`) — it is optional
because `league_issues` snapshots predate the field.

Detectors take the `LeagueData` union and narrow themselves:
- category-only (`standings`, `matchups`, `divisions`, `players`,
  `transactions`, `overnight`) guard with
  `if (data.format !== 'h2h-category') return []`
- format-agnostic (`streaks`) project through `asLeagueCore()`
- points-native stories live in `detection/points.ts`
- `cadence` and `seasonStage` take the union directly — they need only
  league meta, and routing them through `asLeagueCore()` would invent a
  standings precondition they never had

Adding a sport is NOT just "populate variant libraries". A new points
sport reuses the engine; a new category sport needs its own detectors.

### Sleeper football specifics
- Sleeper's API is public and unauthenticated, so football can render
  **server-side** — unlike ESPN, whose auth is browser-cookie-bound.
  This is what makes the cron and the Weekly Reel viable for football.
- `playoff_week_start: 0` means UNSET, not "no playoffs".
- `fpts` is split-integer: `{fpts: 1807, fpts_decimal: 6}` = 1807.06.
- `matchup_id` can be `null` (byes, non-bracket teams) — filter before
  grouping or you invent phantom matchups.
- Rosters can be orphaned (`owner_id: null`), so team naming needs a
  `Team <roster_id>` fallback.
- Standings derive from **completed regular-season weeks only**;
  `roster.settings.wins` excludes playoffs and is the correct oracle.
- Stories come from the most recent **closed** week. Never infer "week
  closed" from "everyone has scored" — Sleeper points accumulate live.

## Known Quirks
- Safari ITP fix handled via Vercel serverless proxy
- ESPN category leagues use getCategoryStatsBreakdown() for per-stat wins
- Yahoo OAuth uses YahooCallbackView.vue (set `ufd_yahoo_oauth_origin` in localStorage to control post-callback redirect)
- Yahoo `stat_winners` reports mid-week leaders, not end-of-week winners — use `winner_team_key` for final-status detection
- ESPN `seasonRankHistory` only includes weeks where every matchup was decided; the detect layer falls back to `data.standings` for the current week
- zsh exclamation mark issues: write scripts to /tmp/fixN.py instead
- `npm run type-check` was silently passing everything until 2026-08-28 (a
  malformed snippet file aborted tsc repo-wide). Fixed, but it now reports
  ~653 pre-existing errors. `npm run build` does NOT type-check at all —
  vite is esbuild-only. Use `npx vue-tsc --noEmit` scoped to your area.
