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

## Resolved 19 Sept — Sleeper does hockey, and it is category-shaped

**Sleeper supports NHL leagues.** Both probes pass:

```
/v1/state/nhl                       200  week 1, pre, season_start 2026-09-19
/v1/user/{id}/leagues/nhl/2026      200  [] — a valid empty list, not an error
```

An empty array means the endpoint understands the sport and that user
has no hockey league — not that the sport is unsupported. **So hockey
renders server-side, the way football does, and the cron and the
Weekly Reel are available to it.** That was the single biggest fork and
it went the good way.

**But Sleeper computes NO fantasy points for hockey.** The stats feed
carries raw counting stats only:

```
skater  36 keys: goals, points, hits, blocked_shots, shots, plus_minus,
                 takeaways, giveaways, faceoffs_won, powerplay_*,
                 seconds_on_ice_*, shooting_pct, winning_goal …
goalie  15 keys: goalie_win, goalie_saves, goalie_saves_pct,
                 goalie_goals_against, goalie_shots_against …
pts_*            NONE
```

Football and baseball both expose `pts_half_ppr`. Hockey exposes
nothing of the kind. Three consequences, and they change the plan:

1. **Hockey is a category sport on this platform**, which is the good
   case — it is the engine that is already generic.
2. **Every card and helper that reads `pts_half_ppr` is football-only**
   and will silently return nothing for hockey: `x-top`, `x-duds`,
   `x-cover`, `x-headliners`, `weekHeadliners`, `expectedWeekly`. They
   need a per-sport stat accessor, not a copy.
3. **A points hockey league would need us to compute points ourselves**
   from the league's `scoring_settings` against raw stats. Doable, but
   it is work football never needed.

The raw stats map cleanly onto standard hockey categories — G, A
(points − goals), PTS, PPP, SOG, HIT, BLK on the skater side; W, SV,
SV%, GAA, SHO on the goalie side. `lowerIsBetter` already exists for
GAA. Nothing here needs inventing.

### Still unverified

- **A real Sleeper NHL league's `scoring_settings`.** Confirms category
  vs points and gives the exact category ids. Needs one league id.
- **Yahoo and ESPN hockey stat ids** — only if we support those
  platforms for hockey at launch. Sleeper alone is a defensible v1.
- **Whether `assists` is derivable everywhere.** The feed gives `goals`
  and `points` but no explicit assists key; A = PTS − G holds, but
  should be confirmed against a box score rather than assumed.

---

## Two-week plan

**Week 1 — make one real hockey league render.**
1. Generalise `CatSide` to a role union, with per-sport labels.
2. Hockey category dictionaries for whichever platform we can test
   against first.
3. Season shape: hockey stages, start date, week cadence.
4. Prove it: one real league through `buildIssue` end to end.

**Week 2 — make it sound like hockey.**
5. `buildHockeyNights` off `api-web.nhle.com`.
6. Generalise the 20 stat-keyed copy lines to read the league's own
   categories.
7. Hockey texture in the highest-traffic copy only — the cover, the
   board, matchups. Leave `draft` and `history` on neutral copy.
8. Correct `CLAUDE.md`.

**Explicitly out of scope for two weeks:** hockey-specific detectors
(not needed), the full variant rewrite, a hockey demo league, and
Yahoo/ESPN hockey. Sleeper-only is a defensible v1 and it is the
platform that renders server-side.

**Added by the 19 Sept findings:** a per-sport stat accessor, because
`pts_half_ppr` is hardcoded through the card layer and hockey has no
such field. That is now a week-1 item — it blocks every player card.

---

## The honest risk

The engine is ready. The unknowns are all **platform access** — which
sites host category hockey, what their stat ids are, and whether we can
read a real league before 2 Oct. That is the thing to resolve first,
because everything in week 1 depends on having one real league to test
against.

**Fastest way to de-risk: get one real hockey league id — any platform
— this week.**
