# The League Beat

> Your league story, chronicled.

The League Beat is an editorial publication that auto-generates
magazine-style coverage of fantasy sports leagues. Headlines, hero
stories, weekly recaps, and power-ranking columns — written in third
person, voiced like a sports magazine, scoped to your specific
league.

Built with Vue 3 + TypeScript + Pinia + Vite. Backend on Supabase.
Deployed on Vercel.

## Quick start

```bash
# Install
npm install

# Local dev (Vite on port 5173)
npm run dev

# Production build
npm run build

# Type-check
npm run type-check
```

Required environment variables (set in Vercel or `.env.local` for dev):

```
VITE_SUPABASE_URL=https://ergxtydfgffqgkddclvr.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

## Architecture at a glance

- `src/editorial/` — the magazine engine. Variant libraries
  (`home.ts`, `pr.ts`, `matchups.ts`, etc.) hold thousands of
  conditionally-rendered sentence templates; `detect.ts` and
  `render.ts` pick which ones fire for each league's data each week.
- `src/editorial/adapters/` — per-platform translators that turn raw
  Sleeper / Yahoo / ESPN league data into the universal
  `CategoryLeagueData` contract the editorial pipeline consumes.
- `src/views/CategoryDemo*View.vue` — the five publication pages
  (Home, Power Rankings, Matchups, Draft, History). Reused for both
  fixture-driven demo (`/demo-categories/*`) and live-league
  (`/leagues/:id/*`) modes.
- `src/views/MyLeagueLayout.vue` — chrome for the live-league
  experience including the league switcher.
- `src/stores/` — Pinia stores for auth, platforms, and leagues.

See `CLAUDE.md` for deeper architectural notes and operational
quirks. See `EDITORIAL.md` for the brand-voice manifesto every
auto-generated sentence has to clear.

## Sister product

[Ultimate Fantasy Dashboard](https://ultimatefantasydashboard.com)
shares the same Supabase backend. A user signed in on either product
sees their connected leagues on both. The two repos diverge at the
front-end — UFD is the dashboard/tooling angle, The League Beat is
the editorial publication angle.
