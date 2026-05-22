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
H2H category leagues across baseball today. Football / basketball /
hockey support is structurally in place via the universal
CategoryLeagueData contract — the editorial libraries just haven't
been backfilled with sport-specific copy yet. Add new sports by
populating the right variant libraries; the detect + render pipeline
stays unchanged.

## Known Quirks
- Safari ITP fix handled via Vercel serverless proxy
- ESPN category leagues use getCategoryStatsBreakdown() for per-stat wins
- Yahoo OAuth uses YahooCallbackView.vue (set `ufd_yahoo_oauth_origin` in localStorage to control post-callback redirect)
- Yahoo `stat_winners` reports mid-week leaders, not end-of-week winners — use `winner_team_key` for final-status detection
- ESPN `seasonRankHistory` only includes weeks where every matchup was decided; the detect layer falls back to `data.standings` for the current week
- zsh exclamation mark issues: write scripts to /tmp/fixN.py instead
