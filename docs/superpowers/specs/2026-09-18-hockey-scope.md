# Hockey — scoping note

Written 18 Sept 2026. NHL opens ~2 Oct, so this is a two-week runway.

**Headline: hockey is much closer to shipping than the architecture
notes claim, and the reason is that the detection engine is already
sport-agnostic.**

---

## What CLAUDE.md says, and why it is now wrong

> "Adding a sport is NOT just 'populate variant libraries'. A new points
> sport reuses the engine; **a new category sport needs its own
> detectors**."

That was true when it was written. It is not true today. I checked
every file in `src/editorial/detection/`:

```
detector files hardcoding ERA / WHIP / HR / RBI / SB / AVG / QS / SV / K : 0
```

The detectors work off `data.categories` and its length, never off a
named stat. `detectCatSweep` reads `data.categories.length` and
compares it to `m.ties` — a ten-category hockey league runs through it
identically to a ten-category baseball league, with no branch.

**So hockey does not need its own detectors.** That single fact is the
difference between a two-month port and a two-week one, and this note
exists mainly to record it before someone re-reads the old line and
scopes off it.

`CLAUDE.md` should be corrected as part of this work.

---

## Why hockey is the easy second category sport

Structurally it is baseball, not football:

| | baseball | hockey | football |
|---|---|---|---|
| Format | H2H category | **H2H category** | H2H points |
| Accrual | daily | **daily** | weekly |
| Season | ~6 months | **~6 months** | 18 weeks |
| Two player classes | hitters / pitchers | **skaters / goalies** | one pool |
| Lower-is-better stats | ERA, WHIP | **GAA, GA** | none |

Every structural assumption the baseball engine makes holds for hockey.
Football was the awkward one; this is the aligned one.

---

## What actually has to change

### 1. `CatSide` is a baseball union — the only real type change
```ts
export type CatSide = 'hit' | 'pit'        // today
```
Hockey needs skater/goalie. Two options, and the second is better:

- add `'skate' | 'goal'` to the union — cheap, but every `side === 'pit'`
  comparison silently means "pitcher" and stops reading true
- rename to a role: `CatSide = 'off' | 'def'` (offence / keeper-side)
  with per-sport labels. One rename, and the concept survives a fourth
  sport.

Used in `CategoryLeagueDataCategory.side` and the adapter dictionaries.

### 2. Adapter category dictionaries — data, not logic
`espnAdapter.ts` holds a `CATEGORY` map of stat id → `{label, side,
lowerIsBetter}` plus a numeric-id lookup. Hockey needs its own for
ESPN and Yahoo. This is transcription against each platform's stat ids,
not design — and `lowerIsBetter` already exists, which is what GAA needs.

### 3. ~20 lines of baseball copy
```
editorial copy lines keyed to a named stat: 20
```
All in `pr.ts` and `history.ts`, shaped like
`ctx.dynasty?.cats?.includes('ERA')`. They need hockey siblings, or
better, a generic form driven by the league's own category list so a
fifth sport costs nothing.

### 4. Player nights — the one genuine build
`buildPlayerNights` reads `statsapi.mlb.com`. Hockey's equivalent is
`api-web.nhle.com`, **which this repo already calls** in
`supabase/functions/nhl-scraper/index.ts`. So the endpoint is known and
proven; the work is a `buildHockeyNights` that returns the same
`PlayerNight` shape with skater/goalie lines instead of hitter/pitcher.

Sleeper carries an NHL player database — **3,522 players**, verified —
so ownership matching has a source.

### 5. Variant libraries — the bulk of the hours
~10,000 lines of copy across `home`, `pr`, `matchups`, `draft`,
`history`, `swings`. Most is sport-neutral ("X swept Y"), but the
texture is baseball. This is where the time goes, and it is the part
that can ship incrementally: a hockey league renders on neutral copy
from day one and gets funnier every week.

---

## Corrected 19 Sept — hockey is ESPN and Yahoo. Not Sleeper.

**I got this wrong earlier today and the error is worth recording.** I
probed `/v1/user/{id}/leagues/nhl/2026`, got `200 []`, and read "the
endpoint parses the sport" as "Sleeper hosts hockey leagues." It does
not. An empty array for a user with no hockey league says nothing about
whether the platform runs the sport at all. Sleeper carries NHL player
and score data; it does not run fantasy hockey.

### The consequence that matters most

**Hockey cannot render server-side.** CLAUDE.md is explicit about why
football can:

> Sleeper's API is public and unauthenticated, so football can render
> **server-side** — unlike ESPN, whose auth is browser-cookie-bound.
> This is what makes the cron and the Weekly Reel viable for football.

Hockey has no Sleeper path, so it inherits ESPN's and Yahoo's
constraints instead:

| | football (Sleeper) | hockey (ESPN / Yahoo) |
|---|---|---|
| Auth | none — public API | cookie-bound / OAuth |
| Renders server-side | yes | **no** |
| Monday delivery cron | yes | **no** |
| Weekly Reel video | yes | **no** |
| Issue in the browser | yes | yes |

So hockey ships as a **read-in-the-browser product**, and the
distribution layer — the cron, the reel, anything that needs to run
without the user present — does not come with it. That is a product
decision to take deliberately, not a bug to fix later.

### What is already wired

More than expected. Both services know the sport:

```
espn.ts    SPORT_MAP            hockey: 'fhl'          ✓
espn.ts    league discovery     scans fhl              ✓
espn.ts    season start month   hockey: 9 (Sept)       ✓
espnAdapter                     takes sport, defaults
                                to 'baseball'          ✓ parameterised
yahoo.ts   SPORT_KEYS           hockey: 'nhl'          ✓
yahoo.ts   GAME_KEYS.hockey     2010–2024              ✓ partial
```

The ESPN editorial adapter is already sport-parameterised — it takes
`opts.sport` and only defaults to baseball — so it does not need
restructuring, it needs a hockey category dictionary.

### The concrete gaps

1. **Yahoo has no NHL game key past 2024.** The table stops at
   `2024: '427'` with a note that 2025 was never published. Without a
   2026 key, Yahoo hockey discovery cannot run. Keys are assigned by
   Yahoo and must be READ from `/games;game_codes=nhl` once
   authenticated — **do not extrapolate the sequence.** The gaps run
   8, 8, 8, 7, so a guess looks reasonable and would be wrong often
   enough to be dangerous.

2. **Hockey category dictionaries** for ESPN and Yahoo. ESPN's is a
   numeric stat-id map; hockey has its own ids. Transcription against a
   real league, not design.

3. **`CatSide = 'hit' | 'pit'`** still needs generalising to a role.

4. **A per-sport stat accessor.** Still true and still a week-1
   blocker: `x-top`, `x-duds`, `x-cover`, `x-headliners`,
   `weekHeadliners` and `expectedWeekly` all read `pts_half_ppr`, which
   is a Sleeper-football field. None of them work for hockey as written.

5. **Player nights** come from `api-web.nhle.com` directly — already
   called in `supabase/functions/nhl-scraper/`. Ownership matching now
   has to bridge ESPN/Yahoo player ids to NHL players by name, the way
   baseball already does for those two platforms.

### Still unverified

- **The Yahoo 2026 NHL game key.** Needs one authenticated call.
- **ESPN hockey stat ids.** Needs one real `fhl` league.
- **Category vs points split in real hockey leagues.** Both platforms
  support both. Category reuses the generic engine; points needs the
  football engine plus our own scoring computation.

---

## Two-week plan

**Week 1 — make one real hockey league render.**
1. Read the Yahoo 2026 NHL game key and add it. Blocks Yahoo entirely.
2. Per-sport stat accessor, so the card layer stops assuming
   `pts_half_ppr`.
3. Generalise `CatSide` to a role union, with per-sport labels.
4. Hockey category dictionary for whichever platform we can test
   against first — ESPN is the likelier one, since its discovery
   already scans `fhl`.
5. Season shape: hockey stages, start date, week cadence.
6. Prove it: one real league through `buildIssue` end to end.

**Week 2 — make it sound like hockey.**
5. `buildHockeyNights` off `api-web.nhle.com`.
6. Generalise the 20 stat-keyed copy lines to read the league's own
   categories.
7. Hockey texture in the highest-traffic copy only — the cover, the
   board, matchups. Leave `draft` and `history` on neutral copy.
8. Correct `CLAUDE.md`.

**Explicitly out of scope for two weeks:** hockey-specific detectors
(not needed), the full variant rewrite, a hockey demo league, the
Monday cron and the Weekly Reel — the last two are not deferred, they
are **unavailable** to hockey while it lives on ESPN and Yahoo.

---

## The honest risk

The engine is ready. The unknowns are all **platform access** — which
sites host category hockey, what their stat ids are, and whether we can
read a real league before 2 Oct. That is the thing to resolve first,
because everything in week 1 depends on having one real league to test
against.

**Fastest way to de-risk: one real ESPN `fhl` league and one real Yahoo
`nhl` league, connected, this week.** Between them they give the stat
ids, the 2026 game key, and the category-vs-points answer — which is
every remaining unknown in one go.
