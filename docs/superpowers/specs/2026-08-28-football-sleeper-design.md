# Football on Sleeper (v1)

**Date:** 2026-08-28
**Status:** Approved design, pre-implementation
**Deadline context:** Sleeper reports `season_type: "pre"`, week 3, `season_start_date: 2026-08-06`. NFL regular season is ~2 weeks out. Drafts are happening now.
**Related:** `project_distribution_strategy` (football is ~10x baseball's market; Aug–Sep is the acquisition window), `project_points_leagues_phasing`

## Goal

Make The League Beat produce real editorial for **H2H points fantasy football leagues on Sleeper**, end to end: connect a league, detect stories, read them in the app, and render a Weekly Reel.

## Correcting the record

`CLAUDE.md` states football support is "structurally in place via the universal CategoryLeagueData contract — the editorial libraries just haven't been backfilled with sport-specific copy yet." Measured against the code, that is optimistic:

| Claim | Reality |
| --- | --- |
| Structurally in place | The **detection layer is category-only**. Zero of the story detectors handle `h2h-points`. Detection *is* the product. |
| Just needs copy | Points leagues hit `UnsupportedFormatPanel` on Beat, Issue, Matchups, Power Rankings, History and Draft. |
| Universal contract | There is **no `sport` field** on either format. Nothing can branch copy or season logic on sport. |
| Sleeper ready | `sleeperLeagueToCategoryData` emits **only** `h2h-category`. No points path exists. |

`CLAUDE.md` should be corrected as part of this work.

## What is genuinely already there

This is a smaller job than the tab-gating suggests, for three reasons.

**1. The points contract is already football-shaped.** `LeagueDataPointsMatchup` carries `homePoints` / `awayPoints`, `homeProjected` / `awayProjected`, and `homeWinProb` / `awayWinProb`. Nothing new is needed to describe a football matchup.

**2. The Sleeper service layer is already NFL-first.** `src/services/sleeper.ts` hardcodes `/players/nfl`, `/user/{id}/leagues/nfl/{season}`, and ships `getPlayerProjections`, `getWeekProjections`, `getMultiWeekProjections`, `calculateProjectedPoints` and `getNflSchedule`. This was built for the sister product. Phase 1 is assembly, not new plumbing.

**3. Most detectors are format-agnostic in substance.** `teams`, `standings`, `seasonRankHistory` and `divisions` are *the same types* on both formats. Measured by category-specific references:

| Detector file | Cat-specific refs | Work |
| --- | --- | --- |
| `streaks.ts`, `cadence.ts`, `players.ts`, `transactions.ts` | 0 | Type widening only |
| `divisions.ts`, `seasonStage.ts`, `overnight.ts` | 1–3 | Trivial |
| `standings.ts` | 23 | Left category-only; see below |
| `matchups.ts` | 27 | Left category-only; see below |

**Sleeper's API is public and unauthenticated.** Unlike ESPN (browser-cookie-bound) this means football can be rendered **server-side** — which is what makes the Monday cron and the Weekly Reel viable for football when they are not for ESPN.

## Locked decisions

1. **Widen, don't fork.** No parallel points pipeline. A second pipeline doubles the surface area and guarantees drift.
2. **The union enforces agnosticism.** Format-agnostic detectors are typed against the EXISTING `LeagueData` union (`types.ts:619`). Reading a category-only field then becomes a *compile error*, so agnosticism is checked by the compiler rather than by discipline.
3. **`standings.ts` and `matchups.ts` stay category-only.** They are not refactored. Football gets a new `detection/points.ts` instead. Splitting 50 category detectors is not affordable before kickoff and is not required for a good football product.
4. **`sport` is optional, never silently defaulted at the call site.** Stored `league_issues.data` snapshots predate the field, so it must be optional. A single `sportOf(data)` helper owns the fallback.
5. **Season length comes from the platform.** Sleeper supplies `settings.playoff_week_start`; `regularSeasonEndWeek = playoff_week_start - 1`. Sport-aware constants are the fallback only.
6. **v1 scope is H2H points, redraft or keeper.** Best-ball and dynasty-specific editorial are out.

## Architecture

```
Sleeper API (public, no auth)
  → src/services/sleeper.ts                    ← already NFL-first, unchanged
  → sleeperLeagueToLeagueData()                ← NEW points branch
      → LeagueDataH2HPoints { sport: 'nfl', … }

  detectAll(data, context)
    ├── agnostic detectors  (streaks, cadence, players, transactions)   ← widened to LeagueData
    ├── divisions / seasonStage / overnight                             ← trivial points handling
    ├── standings.ts + matchups.ts        → category leagues only
    └── points.ts                         → NEW, points leagues only
  → selection.ts → composition.ts        ← already format-agnostic
  → render (football variant libraries)   ← NEW copy
  → views (un-gated) + Weekly Reel
```

### Components

| Unit | Purpose | Depends on |
| --- | --- | --- |
| `sport` on both format interfaces + `sportOf(data)` | Lets copy and season logic branch | — |
| `src/editorial/adapters/sleeperAdapter.ts` (points branch) | Sleeper NFL league → `LeagueDataH2HPoints` | `services/sleeper.ts` |
| `LeagueData` union (already exists) + widened agnostic detectors | Reuse without forking | types |
| `src/editorial/detection/points.ts` | Points-native stories | points contract |
| `src/editorial/football/*.ts` | Football variant libraries | — |
| Sport-aware season staging | Correct stage for a 14-week regular season | `sportOf` |
| View format gates | Render points instead of `UnsupportedFormatPanel` | all of the above |

## Points-native stories (`detection/points.ts`)

The stories that only exist because scoring is points. Each is one detector, scored on the existing weight × freshness rubric:

Thresholds below are **relative to the league's own scoring**, not absolute.
Fantasy football scoring varies enormously (standard vs PPR vs superflex), so a
fixed "40 points" is a blowout in one league and a normal margin in another.
Each detector computes against `weeklyPointsAverage` (already on the points
contract) or the league's own week distribution, and the constants are expressed
as multiples. Absolute figures in brackets are the PPR-league illustration only.

- `points-blowout` — margin ≥ 0.40 × league weekly average [~45 pts]
- `points-photo-finish` — margin ≤ 0.03 × league weekly average [~3 pts]
- `points-high-score` — week's highest total, league-wide
- `points-low-score` — week's lowest total (the humiliation beat)
- `points-shootout` — both sides ≥ 1.25 × league weekly average
- `points-slugfest` — both sides ≤ 0.75 × league weekly average
- `points-bench-tragedy` — optimal lineup would have flipped the result
- `points-projection-buster` — exceeded platform projection by ≥ 25%
- `points-projection-collapse` — missed platform projection by ≥ 25%
- `points-season-high` / `points-season-low` — team's own best/worst week

Where `weeklyPointsAverage` is absent, the detector computes the mean from the
weeks it has and emits nothing if it has fewer than two — never a fabricated
baseline.

`points-bench-tragedy` depends on roster + projection data the Sleeper service already provides, and is the single most shareable football beat — it is the "you left 30 points on your bench" story.

## Data model

No migration. `sport` is an additive optional field on two existing interfaces:

```ts
export type LeagueSport = 'mlb' | 'nfl' | 'nba' | 'nhl'

// on both LeagueDataH2HCategory and LeagueDataH2HPoints
/** Optional: snapshots stored in league_issues predate this field.
 *  Read through sportOf(), never directly. */
sport?: LeagueSport
```

```ts
/** Resolves the sport for a league, defaulting to 'mlb' for pre-sport
 *  snapshots. The default lives here and nowhere else so it can be
 *  removed in one place once stored snapshots have aged out. */
export function sportOf(data: LeagueData): LeagueSport {
  return data.sport ?? 'mlb'
}
```

## Season shape

Football's calendar differs from baseball's in ways that change which stories are eligible:

| | Baseball (current) | Football |
| --- | --- | --- |
| Regular season | ~22 weeks | 14 weeks |
| Playoffs | weeks 23+ | weeks 15–17 |
| `DEFAULT_END_WEEK` | 12 (hardcoded) | 14 |
| Cadence | daily games | **one game per week** |

The last row matters most. `detection/cadence.ts` and `overnight.ts` assume daily play — "overnight" beats (`rank-shift-up`, `matchup-tipped`, `bench-bad-beat`) are meaningful in baseball and mostly meaningless in football, where nothing changes between Tuesday and Thursday. Football's rhythm is Sunday night → Monday night → Tuesday. **Overnight detectors are gated off for `nfl`** rather than firing noise.

## Football voice

New variant libraries under `src/editorial/football/`, not edits to the baseball ones. The existing libraries carry ~229 baseball-specific terms (`swings.ts` alone has 126); mutating them in place would break baseball.

Selection is by `sportOf(data)` at the render layer. Baseball keeps its current libraries untouched, which means **this work cannot regress the shipped baseball product** — a hard requirement given the season is live.

## Phases

Each phase leaves the product in a shippable state.

**Phase 1 — Foundation.** `sport` + `sportOf`, detectors widened to `LeagueData`, Sleeper points adapter, sport-aware season staging. Views stay gated. *Ships:* a real football league's data flows through the contract, verifiable against a live league.

**Phase 2 — Engine.** Widen the four agnostic detectors; trivial handling in the three small ones; build `detection/points.ts`. *Ships:* football leagues produce real detected stories.

**Phase 3 — Voice.** Football variant libraries + render wiring. *Ships:* the stories read like football.

**Phase 4 — Surfaces.** Un-gate the views; point the Weekly Reel at football. *Ships:* the full product.

## Testing

- Adapter: fixture-driven from a captured real Sleeper league response (public API, so capture is trivial — no auth dance).
- `sportOf`: explicit test that a snapshot with no `sport` resolves to `'mlb'`, guarding stored `league_issues` rows.
- Widened detectors: run each against **both** a category and a points fixture, asserting no crash and sane output.
- `points.ts`: unit tests per detector including the degenerate cases — a zero-score week, a tie, a missing projection.
- **Baseball regression is a release gate.** The full existing suite must stay green; the demo category league must produce a byte-identical reel. This work is additive by construction and must be proven so.

## Non-goals for v1

Best-ball; dynasty-specific editorial (rookie picks, taxi squads); basketball and hockey (the `sport` field admits them, nothing more); ESPN and Yahoo football (Sleeper first — public API, server-side renderable); refactoring `standings.ts` / `matchups.ts`; backfilling football copy for the Draft and History tabs beyond what un-gating needs.

## Risks

1. **Copy volume is the real cost.** Detection is tractable; writing football editorial that clears the `EDITORIAL.md` bar is the long pole. Phase 3 is where the deadline pressure lands, and where the temptation to ship generic copy will be strongest. Generic copy is the documented failure mode (Yahoo's backlash) and is worse than a narrower launch.
2. **No real league captured yet.** Phase 1 should validate against an actual Sleeper league early; a wrong assumption about the API shape is cheap to fix in Phase 1 and expensive in Phase 4.
3. **Preseason data is thin.** With `season_type: "pre"` there is no meaningful history until real games are played, so early testing will exercise mostly empty-state paths. That is useful — those paths must degrade well — but it is not a test of the loud-week experience.
