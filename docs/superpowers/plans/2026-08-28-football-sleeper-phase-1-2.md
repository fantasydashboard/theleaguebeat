# Football on Sleeper — Phases 1 & 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Sleeper H2H-points football league flows through the contract and produces real detected stories.

**Architecture:** Widen rather than fork. `DetectFn` takes the existing `LeagueData` union; category-only detectors narrow with a one-line format guard; format-agnostic detectors are projected onto a narrow `LeagueCore` view that both formats satisfy. Football-specific stories live in a new `detection/points.ts`.

**Tech Stack:** TypeScript, Vitest (node env, `@` alias → `src/`), the existing `src/editorial/` pipeline, Sleeper's public unauthenticated API.

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-08-28-football-sleeper-design.md`. Read it before Task 1.
- **Phases 1 & 2 only.** No football copy, no view un-gating, no Weekly Reel work — later plans.
- **BASEBALL MUST NOT REGRESS. This is the release gate.** The existing suite (146 tests at plan time) stays green after every task, and the demo category league must keep producing an identical reel. This work is additive by construction; prove it, don't assume it.
- **NEVER FABRICATE DATA.** Absent data means the detector emits nothing. No invented baselines, no default scores.
- Detectors are **pure** — no I/O, no clock, no randomness. The adapter does I/O; that is its job.
- **Thresholds are relative to the league's own scoring**, never absolute point values. Fantasy football scoring varies enormously between standard, PPR and superflex.
- `sport` is **optional** on the contract and read **only** through `sportOf()`. Stored `league_issues.data` snapshots predate the field.
- Tests: `npx vitest run` from the repo root. **`npm run type-check` is broken repo-wide** (a malformed snippet file, `src/services/yahoo-daily-stats-methods.ts`, aborts tsc) — do not trust or fix it. Use `npm run build` as the type gate; it fails on real type errors in the app graph.
- Commit style: `feat(football): …` / `refactor(detection): …`.

---

## File Structure

**Create:**

| File | Responsibility |
| --- | --- |
| `src/editorial/leagueCore.ts` | `LeagueSport`, `sportOf()`, `LeagueCore`, `asLeagueCore()`. The seam every format-agnostic consumer reads through. |
| `src/editorial/__tests__/leagueCore.test.ts` | Tests for the above, incl. the pre-`sport` snapshot default. |
| `src/editorial/detection/points.ts` | Points-native story detectors. |
| `src/editorial/detection/__tests__/points.test.ts` | Per-detector tests incl. degenerate cases. |
| `src/editorial/adapters/__tests__/sleeperPoints.test.ts` | Adapter tests from a captured Sleeper response. |
| `src/fixtures/sleeperFootball.ts` | Captured real Sleeper league response, trimmed. |

**Modify:**

| File | Change |
| --- | --- |
| `src/editorial/types.ts` | `sport?: LeagueSport` on both format interfaces. |
| `src/editorial/detection/types.ts` | `DetectFn` takes `LeagueData`. |
| `src/editorial/detection/standings.ts`, `matchups.ts`, `divisions.ts` | One-line format guard. |
| `src/editorial/detection/streaks.ts`, `cadence.ts`, `players.ts`, `transactions.ts` | Project onto `LeagueCore`. |
| `src/editorial/detection/overnight.ts` | Format guard + gate off for `nfl`. |
| `src/editorial/detection/helpers.ts` | Sport-aware `deriveSeasonStage` fallback. |
| `src/editorial/detection/index.ts` | Register the points detector. |
| `src/editorial/adapters/sleeperAdapter.ts` | Points branch for NFL leagues. |

---

### Task 1: `sport` on the contract, and the `LeagueCore` seam

**Files:**
- Create: `src/editorial/leagueCore.ts`
- Create: `src/editorial/__tests__/leagueCore.test.ts`
- Modify: `src/editorial/types.ts`

**Interfaces:**
- Consumes: `LeagueData`, `LeagueDataH2HCategory`, `LeagueDataH2HPoints`, `CategoryLeagueDataTeam`, `CategoryLeagueDataStanding`, `CategoryLeagueDataWeeklyRanks`, `CategoryLeagueDataDivision` from `@/editorial/types`.
- Produces: `LeagueSport`, `sportOf(data: LeagueData): LeagueSport`, `LeagueCore`, `asLeagueCore(data: LeagueData): LeagueCore | null`.

- [ ] **Step 1: Write the failing test**

`src/editorial/__tests__/leagueCore.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { sportOf, asLeagueCore } from '@/editorial/leagueCore'
import type { LeagueDataH2HCategory, LeagueDataH2HPoints } from '@/editorial/types'

const cats = (over: Partial<LeagueDataH2HCategory> = {}): LeagueDataH2HCategory =>
  ({
    format: 'h2h-category',
    leagueId: 'lg', leagueName: 'Diamond Cuts',
    currentWeek: 8, currentSeason: 2026, playoffCutoff: 6,
    teams: [], categories: [], standings: [], categoryRanks: [],
    seasonRankHistory: [],
    ...over,
  }) as LeagueDataH2HCategory

const points = (over: Partial<LeagueDataH2HPoints> = {}): LeagueDataH2HPoints =>
  ({
    format: 'h2h-points',
    leagueId: 'lg', leagueName: 'Gridiron',
    currentWeek: 3, currentSeason: 2026,
    teams: [],
    ...over,
  }) as LeagueDataH2HPoints

describe('sportOf', () => {
  it('returns the declared sport', () => {
    expect(sportOf(points({ sport: 'nfl' }))).toBe('nfl')
    expect(sportOf(cats({ sport: 'mlb' }))).toBe('mlb')
  })

  /* league_issues rows written before `sport` existed have no field.
   * They are all baseball, so mlb is the honest default — and it lives
   * in exactly one place so it can be deleted when those rows age out. */
  it('defaults to mlb for a snapshot with no sport', () => {
    expect(sportOf(cats())).toBe('mlb')
    expect(sportOf(points())).toBe('mlb')
  })
})

describe('asLeagueCore', () => {
  const standing = { rank: 1, teamId: 'a', catWins: 0, catLosses: 0, catTies: 0,
    winPct: 1, streak: { type: 'W' as const, length: 1 }, lastSix: [],
    ownsCount: 0, bleedingCount: 0 }

  it('projects a category league', () => {
    const core = asLeagueCore(cats({ standings: [standing], seasonRankHistory: [{ week: 1, ranks: { a: 1 } }] }))
    expect(core).not.toBeNull()
    expect(core!.standings).toHaveLength(1)
    expect(core!.sport).toBe('mlb')
  })

  it('projects a points league', () => {
    const core = asLeagueCore(points({
      sport: 'nfl',
      standings: [standing],
      seasonRankHistory: [{ week: 1, ranks: { a: 1 } }],
    }))
    expect(core).not.toBeNull()
    expect(core!.sport).toBe('nfl')
  })

  /* The whole point of the seam: a points league that has not yet built
   * standings must be rejected rather than crash a detector downstream. */
  it('returns null when standings are missing', () => {
    expect(asLeagueCore(points({ seasonRankHistory: [] }))).toBeNull()
  })

  it('returns null when standings are empty', () => {
    expect(asLeagueCore(points({ standings: [], seasonRankHistory: [] }))).toBeNull()
  })

  it('tolerates missing rank history by substituting an empty array', () => {
    const core = asLeagueCore(points({ standings: [standing] }))
    expect(core).not.toBeNull()
    expect(core!.seasonRankHistory).toEqual([])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/editorial/__tests__/leagueCore.test.ts`
Expected: FAIL — cannot resolve `@/editorial/leagueCore`.

- [ ] **Step 3: Add `sport` to both format interfaces**

In `src/editorial/types.ts`, add this type near the top (beside `WLT` / `CatSide`):

```ts
/** Which sport a league plays. Drives copy selection and season-shape
 *  defaults. Optional on the data contract — see LeagueSport usage in
 *  leagueCore.ts for why. */
export type LeagueSport = 'mlb' | 'nfl' | 'nba' | 'nhl'
```

Then add this field to **both** `LeagueDataH2HCategory` and `LeagueDataH2HPoints`, directly under their `format` discriminator:

```ts
  /** Optional: snapshots persisted in `league_issues` predate this
   *  field, so it can be absent on real stored data. Never read it
   *  directly — go through `sportOf()`, which owns the fallback. */
  sport?: LeagueSport
```

- [ ] **Step 4: Implement leagueCore.ts**

`src/editorial/leagueCore.ts`:

```ts
/**
 * leagueCore — the seam that lets one detector serve both league
 * formats.
 *
 * `LeagueDataH2HCategory` and `LeagueDataH2HPoints` already share the
 * types that most stories are actually about: teams, standings, rank
 * history, divisions. What differs is that the points variant declares
 * several of them optional, because a points adapter may not have built
 * standings yet.
 *
 * `LeagueCore` is the intersection, with those fields made REQUIRED, and
 * `asLeagueCore` is the single place that checks. A detector that takes
 * a `LeagueCore` cannot reach a category-only field — the compiler stops
 * it — so format-agnosticism is enforced rather than merely intended.
 */

import type {
  CategoryLeagueDataDivision,
  CategoryLeagueDataStanding,
  CategoryLeagueDataTeam,
  CategoryLeagueDataWeeklyRanks,
  LeagueData,
  LeagueSport,
} from './types'

export type { LeagueSport }

/** Resolves a league's sport.
 *
 *  Defaults to 'mlb' because every snapshot written before the field
 *  existed is a baseball league. The default lives here and nowhere
 *  else, so it can be removed in one edit once those rows have aged out.
 */
export function sportOf(data: LeagueData): LeagueSport {
  return data.sport ?? 'mlb'
}

/** The shape a format-agnostic detector needs. Deliberately narrow. */
export interface LeagueCore {
  leagueId: string
  leagueName: string
  currentWeek: number
  currentSeason: number
  regularSeasonEndWeek?: number
  sport: LeagueSport
  teams: CategoryLeagueDataTeam[]
  standings: CategoryLeagueDataStanding[]
  seasonRankHistory: CategoryLeagueDataWeeklyRanks[]
  divisions?: CategoryLeagueDataDivision[]
}

/**
 * Projects either format onto `LeagueCore`, or returns null when the
 * league lacks the standings every agnostic story depends on.
 *
 * Returning null rather than an empty-standings core is deliberate: a
 * detector handed a core can trust it, so the "do we have enough data"
 * question is answered exactly once, here.
 */
export function asLeagueCore(data: LeagueData): LeagueCore | null {
  const standings = data.standings
  if (!standings || standings.length === 0) return null

  return {
    leagueId: data.leagueId,
    leagueName: data.leagueName,
    currentWeek: data.currentWeek,
    currentSeason: data.currentSeason,
    regularSeasonEndWeek: data.regularSeasonEndWeek,
    sport: sportOf(data),
    teams: data.teams,
    standings,
    // Absent on a points league that has not accrued history yet. An
    // empty array is honest here — it means "no weeks recorded", which
    // is exactly what the detectors should see.
    seasonRankHistory: data.seasonRankHistory ?? [],
    divisions: data.divisions,
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/editorial/__tests__/leagueCore.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 6: Prove baseball did not regress**

Run: `npx vitest run && npm run build`
Expected: all pre-existing tests still pass; build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/editorial/leagueCore.ts src/editorial/__tests__/leagueCore.test.ts src/editorial/types.ts
git commit -m "feat(football): add sport to the contract and the LeagueCore seam"
```

---

### Task 2: Widen `DetectFn`; guard the category-only detectors

**Files:**
- Modify: `src/editorial/detection/types.ts` (`DetectFn`)
- Modify: `src/editorial/detection/standings.ts`, `matchups.ts`, `divisions.ts`
- Test: `src/editorial/detection/__tests__/formatGuards.test.ts` (create)

**Interfaces:**
- Consumes: `LeagueData` from `@/editorial/types`.
- Produces: `DetectFn` now typed `(data: LeagueData, context: IssueContext) => StoryCandidate[]`. Every detector accepts the union and narrows internally.

**Why this ordering:** widening the signature first means the category detectors must guard before any points data can reach them. Doing it the other way round would let a points league hit code that assumes `categoryRanks` exists.

- [ ] **Step 1: Write the failing test**

`src/editorial/detection/__tests__/formatGuards.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { detect as detectStandings } from '@/editorial/detection/standings'
import { detect as detectMatchups } from '@/editorial/detection/matchups'
import { detect as detectDivisions } from '@/editorial/detection/divisions'
import type { LeagueDataH2HPoints } from '@/editorial/types'
import type { IssueContext } from '@/editorial/detection/types'

const context: IssueContext = {
  currentWeek: 3,
  seasonStage: 'opening',
  issueDate: new Date('2026-09-20T12:00:00Z'),
}

/* A points league with enough shape to crash a category detector that
 * assumed catLines/categoryRanks. Each guarded detector must return []
 * rather than throw. */
const footballLeague = {
  format: 'h2h-points',
  sport: 'nfl',
  leagueId: 'lg', leagueName: 'Gridiron',
  currentWeek: 3, currentSeason: 2026,
  regularSeasonEndWeek: 14,
  teams: [
    { id: 'a', name: 'A', ownerName: 'x', ownerInitials: 'A', avatarColor: 'c', isMyTeam: false },
    { id: 'b', name: 'B', ownerName: 'y', ownerInitials: 'B', avatarColor: 'c', isMyTeam: false },
  ],
  standings: [
    { rank: 1, teamId: 'a', catWins: 2, catLosses: 1, catTies: 0, winPct: 0.667,
      streak: { type: 'W' as const, length: 2 }, lastSix: ['W', 'L', 'W'],
      ownsCount: 0, bleedingCount: 0 },
    { rank: 2, teamId: 'b', catWins: 1, catLosses: 2, catTies: 0, winPct: 0.333,
      streak: { type: 'L' as const, length: 1 }, lastSix: ['L', 'W', 'L'],
      ownsCount: 0, bleedingCount: 0 },
  ],
  seasonRankHistory: [
    { week: 1, ranks: { a: 2, b: 1 } },
    { week: 2, ranks: { a: 1, b: 2 } },
  ],
} as unknown as LeagueDataH2HPoints

describe('category-only detectors on a points league', () => {
  it('standings detector emits nothing', () => {
    expect(detectStandings(footballLeague, context)).toEqual([])
  })

  it('matchups detector emits nothing', () => {
    expect(detectMatchups(footballLeague, context)).toEqual([])
  })

  it('divisions detector emits nothing', () => {
    expect(detectDivisions(footballLeague, context)).toEqual([])
  })

  it('none of them throw', () => {
    expect(() => {
      detectStandings(footballLeague, context)
      detectMatchups(footballLeague, context)
      detectDivisions(footballLeague, context)
    }).not.toThrow()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/editorial/detection/__tests__/formatGuards.test.ts`
Expected: FAIL — either a type error at build time or a runtime throw, because these detectors currently assume category data.

- [ ] **Step 3: Widen `DetectFn`**

In `src/editorial/detection/types.ts`, replace the `DetectFn` definition:

```ts
/** Every detector module exports a single `detect()` with this shape.
 *
 *  It takes the FULL LeagueData union, not CategoryLeagueData. A
 *  detector that only makes sense for one format narrows on
 *  `data.format` as its first statement; a format-agnostic one projects
 *  through `asLeagueCore()`. This is what lets one detector list serve
 *  both baseball and football. */
export type DetectFn = (
  data: import('../types').LeagueData,
  context: IssueContext,
) => StoryCandidate[]
```

- [ ] **Step 4: Guard the three category-only detectors**

In each of `standings.ts`, `matchups.ts` and `divisions.ts`, change the exported `detect` signature to take `LeagueData` and add the guard as the first statement. For example, in `standings.ts`:

```ts
export function detect(
  data: LeagueData,
  context: IssueContext,
): StoryCandidate[] {
  // Category-only. These stories are built from per-category standings
  // (ownsCount, bleedingCount, categoryRanks), which a points league
  // has no equivalent of. Football's stories live in points.ts.
  if (data.format !== 'h2h-category') return []
  ...
}
```

Add the matching `import type { LeagueData } from '../types'` to each file. After the guard, TypeScript narrows `data` to `LeagueDataH2HCategory`, so **no other line in these files needs to change**.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/editorial/detection/__tests__/formatGuards.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 6: Prove baseball did not regress**

Run: `npx vitest run && npm run build`
Expected: all tests pass, build clean. If the build reports errors in `overnight.ts`, `streaks.ts`, `cadence.ts`, `players.ts` or `transactions.ts`, that is expected — they are widened in Tasks 3 and 4. Note which files error and proceed; do not patch them here.

- [ ] **Step 7: Commit**

```bash
git add src/editorial/detection/types.ts src/editorial/detection/standings.ts \
        src/editorial/detection/matchups.ts src/editorial/detection/divisions.ts \
        src/editorial/detection/__tests__/formatGuards.test.ts
git commit -m "refactor(detection): DetectFn takes LeagueData; guard category-only detectors"
```

---

### Task 3: Project the format-agnostic detectors onto `LeagueCore`

**Files:**
- Modify: `src/editorial/detection/streaks.ts`, `cadence.ts`, `players.ts`, `transactions.ts`
- Test: `src/editorial/detection/__tests__/agnosticDetectors.test.ts` (create)

**Interfaces:**
- Consumes: `asLeagueCore`, `LeagueCore` from `@/editorial/leagueCore` (Task 1); `DetectFn` taking `LeagueData` (Task 2).
- Produces: these four detectors now run for **both** formats.

**The mechanism:** each file's exported `detect()` calls `asLeagueCore(data)`, returns `[]` on null, and passes the resulting `LeagueCore` to its internal helpers. Internal helper signatures change from `CategoryLeagueData` to `LeagueCore` — a type annotation change only, because these files already read nothing outside the core fields (verified: zero category-specific references in all four).

- [ ] **Step 1: Write the failing test**

`src/editorial/detection/__tests__/agnosticDetectors.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { detect as detectStreaks } from '@/editorial/detection/streaks'
import { detect as detectCadence } from '@/editorial/detection/cadence'
import type { LeagueDataH2HPoints, LeagueDataH2HCategory } from '@/editorial/types'
import type { IssueContext } from '@/editorial/detection/types'

const context: IssueContext = {
  currentWeek: 5,
  seasonStage: 'settling',
  issueDate: new Date('2026-10-05T12:00:00Z'),
}

const teams = [
  { id: 'a', name: 'Gridiron A', ownerName: 'x', ownerInitials: 'A', avatarColor: 'c', isMyTeam: false },
  { id: 'b', name: 'Gridiron B', ownerName: 'y', ownerInitials: 'B', avatarColor: 'c', isMyTeam: false },
]

/* A four-game win streak — a streak story should fire regardless of
 * whether the wins came from categories or points. */
const standings = [
  { rank: 1, teamId: 'a', catWins: 4, catLosses: 0, catTies: 0, winPct: 1,
    streak: { type: 'W' as const, length: 4 }, lastSix: ['W', 'W', 'W', 'W'],
    ownsCount: 0, bleedingCount: 0 },
  { rank: 2, teamId: 'b', catWins: 0, catLosses: 4, catTies: 0, winPct: 0,
    streak: { type: 'L' as const, length: 4 }, lastSix: ['L', 'L', 'L', 'L'],
    ownsCount: 0, bleedingCount: 0 },
]

const seasonRankHistory = [
  { week: 1, ranks: { a: 2, b: 1 } },
  { week: 2, ranks: { a: 1, b: 2 } },
  { week: 3, ranks: { a: 1, b: 2 } },
  { week: 4, ranks: { a: 1, b: 2 } },
]

const football = {
  format: 'h2h-points', sport: 'nfl',
  leagueId: 'lg', leagueName: 'Gridiron', currentWeek: 5, currentSeason: 2026,
  regularSeasonEndWeek: 14, teams, standings, seasonRankHistory,
} as unknown as LeagueDataH2HPoints

const baseball = {
  format: 'h2h-category', sport: 'mlb',
  leagueId: 'lg', leagueName: 'Diamond Cuts', currentWeek: 5, currentSeason: 2026,
  teams, standings, seasonRankHistory, categories: [], categoryRanks: [],
} as unknown as LeagueDataH2HCategory

describe('format-agnostic detectors', () => {
  it('streaks fire for a points league', () => {
    const out = detectStreaks(football, context)
    expect(out.length).toBeGreaterThan(0)
  })

  it('streaks still fire for a category league', () => {
    const out = detectStreaks(baseball, context)
    expect(out.length).toBeGreaterThan(0)
  })

  it('streaks produce the same story types for both formats on identical standings', () => {
    const f = detectStreaks(football, context).map((s) => s.type).sort()
    const b = detectStreaks(baseball, context).map((s) => s.type).sort()
    expect(f).toEqual(b)
  })

  it('cadence does not throw on a points league', () => {
    expect(() => detectCadence(football, context)).not.toThrow()
  })

  it('a points league with no standings yields nothing rather than throwing', () => {
    const bare = { ...football, standings: undefined } as unknown as LeagueDataH2HPoints
    expect(detectStreaks(bare, context)).toEqual([])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/editorial/detection/__tests__/agnosticDetectors.test.ts`
Expected: FAIL — these detectors do not yet accept points data.

- [ ] **Step 3: Widen the four detectors**

For each of `streaks.ts`, `cadence.ts`, `players.ts` and `transactions.ts`:

1. Add imports:
   ```ts
   import type { LeagueData } from '../types'
   import { asLeagueCore, type LeagueCore } from '../leagueCore'
   ```
2. Change the exported entry point to take the union and project once. In `streaks.ts` the existing guard at the top of `detect()` is replaced by the projection:
   ```ts
   export function detect(
     data: LeagueData,
     context: IssueContext,
   ): StoryCandidate[] {
     // Works for both formats: every story below is about wins, losses
     // and rank movement, none of which care how a week was scored.
     const core = asLeagueCore(data)
     if (!core) return []
     ...
   }
   ```
   and every use of `data` inside `detect()` becomes `core`.
3. Change each internal helper's parameter type from `CategoryLeagueData` to `LeagueCore`. **Do not change any logic** — if a helper needs a field `LeagueCore` lacks, stop and report it rather than widening `LeagueCore` to make it compile.

Note `transactions.ts` and `players.ts` export differently-named entry points (`detectTransactionStories`, `detectPlayerStories`); widen those, not a function called `detect`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/editorial/detection/__tests__/agnosticDetectors.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Prove baseball did not regress**

Run: `npx vitest run && npm run build`
Expected: full suite green. `overnight.ts` may still error in the build — Task 4 handles it.

- [ ] **Step 6: Commit**

```bash
git add src/editorial/detection/streaks.ts src/editorial/detection/cadence.ts \
        src/editorial/detection/players.ts src/editorial/detection/transactions.ts \
        src/editorial/detection/__tests__/agnosticDetectors.test.ts
git commit -m "refactor(detection): run the agnostic detectors for both formats"
```

---

### Task 4: Sport-aware season shape; silence overnight beats for football

**Files:**
- Modify: `src/editorial/detection/helpers.ts` (`deriveSeasonStage`)
- Modify: `src/editorial/detection/overnight.ts`
- Modify: `src/editorial/detection/seasonStage.ts` (`DEFAULT_END_WEEK`)
- Test: `src/editorial/detection/__tests__/seasonShape.test.ts` (create)

**Interfaces:**
- Consumes: `LeagueSport`, `sportOf` (Task 1).
- Produces: `deriveSeasonStage(currentWeek: number, regularSeasonEndWeek: number | undefined, sport?: LeagueSport): SeasonStage` — the third parameter is **optional and defaults to `'mlb'`**, so all existing two-argument call sites keep working unchanged.

**Why overnight beats are gated off:** `overnight.ts` emits `rank-shift-up`, `matchup-tipped` and `bench-bad-beat` — stories about what changed since yesterday. Baseball plays daily, so they are real news. Football plays once a week; nothing changes between Tuesday and Saturday, so these would fire as noise or, worse, restate Sunday's result every day until Thursday.

- [ ] **Step 1: Write the failing test**

`src/editorial/detection/__tests__/seasonShape.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { deriveSeasonStage } from '@/editorial/detection/helpers'
import { detectOvernightStories } from '@/editorial/detection/overnight'
import type { LeagueDataH2HPoints } from '@/editorial/types'
import type { IssueContext } from '@/editorial/detection/types'

describe('deriveSeasonStage', () => {
  it('keeps the baseball fallback when no sport is given', () => {
    // endWeek falls back to 12; week 13 is past it → playoffs
    expect(deriveSeasonStage(13, undefined)).toBe('playoffs')
  })

  it('uses a 14-week regular season for football when end week is unknown', () => {
    // Football's regular season runs to 14, so week 13 is still in it.
    expect(deriveSeasonStage(13, undefined, 'nfl')).toBe('final')
    expect(deriveSeasonStage(15, undefined, 'nfl')).toBe('playoffs')
  })

  it('always prefers the platform-supplied end week over the sport default', () => {
    // A 17-week football league: week 15 is still regular season.
    expect(deriveSeasonStage(15, 17, 'nfl')).toBe('stretch')
  })

  it('stages a typical football season sensibly', () => {
    const stage = (w: number) => deriveSeasonStage(w, 14, 'nfl')
    expect(stage(1)).toBe('opening')
    expect(stage(5)).toBe('settling')
    expect(stage(8)).toBe('midseason')
    expect(stage(13)).toBe('final')
    expect(stage(16)).toBe('playoffs')
  })
})

describe('overnight stories', () => {
  const context: IssueContext = {
    currentWeek: 5, seasonStage: 'settling',
    issueDate: new Date('2026-10-07T12:00:00Z'),
  }

  const football = {
    format: 'h2h-points', sport: 'nfl',
    leagueId: 'lg', leagueName: 'Gridiron', currentWeek: 5, currentSeason: 2026,
    teams: [], standings: [], seasonRankHistory: [],
  } as unknown as LeagueDataH2HPoints

  /* Football plays once a week. "What changed overnight" is a baseball
   * question; firing it Tuesday through Saturday would restate Sunday. */
  it('emits nothing for a football league', () => {
    expect(detectOvernightStories(football, context)).toEqual([])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/editorial/detection/__tests__/seasonShape.test.ts`
Expected: FAIL — `deriveSeasonStage` takes two arguments and football beats are not gated.

- [ ] **Step 3: Make `deriveSeasonStage` sport-aware**

In `src/editorial/detection/helpers.ts`, replace the hardcoded fallback:

```ts
import type { LeagueSport } from '../leagueCore'

/** Regular-season length per sport, used ONLY when the adapter could
 *  not supply `regularSeasonEndWeek`. Platform data always wins — these
 *  are the last resort, not the primary source. */
const DEFAULT_END_WEEK_BY_SPORT: Record<LeagueSport, number> = {
  mlb: 12,   // unchanged: what the baseball pipeline has always used
  nfl: 14,   // 14-game regular season, playoffs weeks 15-17
  nba: 20,
  nhl: 20,
}

export function deriveSeasonStage(
  currentWeek: number,
  regularSeasonEndWeek: number | undefined,
  sport: LeagueSport = 'mlb',
): SeasonStage {
  if (currentWeek < 1) return 'preseason'

  const endWeek = regularSeasonEndWeek ?? DEFAULT_END_WEEK_BY_SPORT[sport]

  if (currentWeek > endWeek + 3) return 'offseason'
  if (currentWeek > endWeek) return 'playoffs'

  const remaining = endWeek - currentWeek
  if (currentWeek <= 3) return 'opening'
  if (currentWeek <= 7) return 'settling'
  if (remaining <= 2) return 'final'
  if (remaining <= 5) return 'stretch'
  return 'midseason'
}
```

The `sport` parameter defaults to `'mlb'`, so every existing two-argument call site keeps its current behaviour exactly.

In `src/editorial/detection/seasonStage.ts`, update `endWeekOf` to match:

```ts
function endWeekOf(data: LeagueCore): number {
  return data.regularSeasonEndWeek ?? DEFAULT_END_WEEK_BY_SPORT[data.sport]
}
```

importing `DEFAULT_END_WEEK_BY_SPORT` from `helpers.ts` (export it) and deleting the local `DEFAULT_END_WEEK` constant. Widen `seasonStage.ts` to `LeagueCore` the same way as Task 3.

- [ ] **Step 4: Gate overnight beats off for football**

At the top of `detectOvernightStories` in `src/editorial/detection/overnight.ts`:

```ts
export function detectOvernightStories(
  data: LeagueData,
  context: IssueContext,
): StoryCandidate[] {
  // Overnight beats answer "what changed since yesterday". That is a
  // daily-sport question. Football plays once a week, so these would
  // either fire as noise or restate Sunday's result every day until
  // Thursday. Sports that play daily get them; football does not.
  if (sportOf(data) === 'nfl') return []
  ...
}
```

Add `import { sportOf } from '../leagueCore'` and `import type { LeagueData } from '../types'`.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/editorial/detection/__tests__/seasonShape.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 6: Prove baseball did not regress**

Run: `npx vitest run && npm run build`
Expected: full suite green, build clean with no remaining type errors in `src/editorial/`.

- [ ] **Step 7: Commit**

```bash
git add src/editorial/detection/helpers.ts src/editorial/detection/overnight.ts \
        src/editorial/detection/seasonStage.ts \
        src/editorial/detection/__tests__/seasonShape.test.ts
git commit -m "feat(football): sport-aware season shape, no overnight beats for football"
```

---

### Task 5: Capture a real Sleeper football league as a fixture

**Files:**
- Create: `scripts/capture-sleeper-league.ts`
- Create: `src/fixtures/sleeperFootball.ts` (generated, then committed)

**Interfaces:**
- Consumes: nothing.
- Produces: `sleeperFootballFixture` — the raw Sleeper API responses for one league, as a typed object with keys `league`, `rosters`, `users`, `matchupsByWeek`.

**Why a real capture and not a hand-written fixture:** every previous adapter in this repo was built against real platform responses, and the failure mode of a hand-invented fixture is that it encodes what we *think* Sleeper returns. Sleeper's API is public and unauthenticated, so capturing costs one script run and removes that whole class of error.

- [ ] **Step 1: Write the capture script**

`scripts/capture-sleeper-league.ts`:

```ts
/**
 * Captures one Sleeper league's raw API responses into a committed
 * fixture, so the adapter can be built and tested against real data.
 *
 * Sleeper's API is public and unauthenticated — no tokens, no cookies.
 *
 *   npx vite-node scripts/capture-sleeper-league.ts <leagueId> [weeks]
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = 'https://api.sleeper.app/v1'

const leagueId = process.argv[2]
if (!leagueId) {
  console.error('usage: npx vite-node scripts/capture-sleeper-league.ts <leagueId> [weeks]')
  process.exit(1)
}
const weeks = Number(process.argv[3] ?? 4)

async function get(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`)
  return res.json()
}

const league = await get(`/league/${leagueId}`) as Record<string, unknown> | null
if (!league) {
  console.error(`No league ${leagueId}. Sleeper returns null for unknown ids.`)
  process.exit(1)
}

const rosters = await get(`/league/${leagueId}/rosters`)
const users = await get(`/league/${leagueId}/users`)

const matchupsByWeek: Record<string, unknown> = {}
for (let w = 1; w <= weeks; w++) {
  try {
    const m = await get(`/league/${leagueId}/matchups/${w}`)
    if (Array.isArray(m) && m.length > 0) matchupsByWeek[String(w)] = m
  } catch {
    // A week that has not happened yet 404s or returns empty — skip it
    // rather than inventing an entry.
  }
}

const fixture = { league, rosters, users, matchupsByWeek }

const scriptDir = dirname(fileURLToPath(import.meta.url))
const out = resolve(scriptDir, '..', 'src/fixtures/sleeperFootball.ts')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(
  out,
  `/* Captured from Sleeper's public API. Regenerate with:\n` +
  ` *   npx vite-node scripts/capture-sleeper-league.ts ${leagueId} ${weeks}\n` +
  ` */\n\n` +
  `export const sleeperFootballFixture = ${JSON.stringify(fixture, null, 2)} as const\n`,
)

console.log(`league:  ${(league as any).name} (${(league as any).season}, ${(league as any).status})`)
console.log(`rosters: ${(rosters as unknown[]).length}`)
console.log(`weeks:   ${Object.keys(matchupsByWeek).join(', ') || 'none'}`)
console.log(`scoring: ${Object.keys((league as any).scoring_settings ?? {}).length} settings`)
console.log(`playoff_week_start: ${(league as any).settings?.playoff_week_start}`)
console.log(`\nWrote ${out}`)
```

- [ ] **Step 2: Capture a real league**

Run with a real Sleeper league id — a **completed prior season** is strongly preferred, because it has full standings and matchup history where the current preseason has none:

```bash
npx vite-node scripts/capture-sleeper-league.ts 1186844188245356544 17
```

If no league id is available, **stop and ask** rather than inventing one. A fabricated fixture defeats the purpose of this task.

Record in your report: team count, `playoff_week_start`, how many weeks of matchups came back, and whether `scoring_settings` includes `rec` (indicating PPR).

- [ ] **Step 3: Commit**

```bash
git add scripts/capture-sleeper-league.ts src/fixtures/sleeperFootball.ts
git commit -m "feat(football): capture a real Sleeper league as a fixture"
```

---

### Task 6: Sleeper points adapter

**Files:**
- Modify: `src/editorial/adapters/sleeperAdapter.ts`
- Test: `src/editorial/adapters/__tests__/sleeperPoints.test.ts` (create)

**Interfaces:**
- Consumes: `sleeperFootballFixture` (Task 5); `LeagueSport` (Task 1); `sleeperService` from `@/services/sleeper`.
- Produces: `sleeperLeagueToPointsData(leagueId: string): Promise<LeagueDataH2HPoints>` exported from `sleeperAdapter.ts`, and a pure inner builder `buildSleeperPointsData(raw: SleeperPointsRaw): LeagueDataH2HPoints` where `SleeperPointsRaw = { league, rosters, users, matchupsByWeek }` — the same shape the fixture has, so the builder is testable with zero I/O.

**Design note:** split I/O from transformation. `sleeperLeagueToPointsData` fetches and delegates; `buildSleeperPointsData` is pure and is what the tests exercise. This mirrors how the reel work kept `buildReel` pure and testable.

Key mappings, from the real Sleeper shapes:

| Contract field | Sleeper source |
| --- | --- |
| `sport` | `'nfl'` |
| `format` | `'h2h-points'` |
| `leagueName` | `league.name` |
| `currentSeason` | `Number(league.season)` |
| `regularSeasonEndWeek` | `playoff_week_start - 1`, **but `playoff_week_start` of `0` means UNSET** — see below |
| `playoffCutoff` | `league.settings.playoff_teams` |
| `teams[]` | one per roster; name from `users[].metadata.team_name` falling back to `display_name`; avatar via `sleeperService.getAvatarUrl` |
| `standings[]` | derived from `rosters[].settings` `{ wins, losses, ties, fpts, fpts_decimal }` |
| `currentWeekMatchups` | `matchupsByWeek[currentWeek]`, paired on `matchup_id` |
| `weeklyPointsAverage` | mean of all team-week point totals |
| `seasonRankHistory` | rank per week, recomputed from cumulative record after each week |

**On `standings`:** `CategoryLeagueDataStanding` names its fields `catWins`/`catLosses`/`catTies`. For a points league these hold **matchup** wins/losses/ties. That is an existing naming wart shared with the Yahoo and ESPN points adapters — follow the established convention rather than introducing a divergent one, and comment it at the mapping site.

**On `playoff_week_start` — a real edge case, verified against live data.** Sleeper
returns `0` when the commissioner never configured a playoff start week. It does
**not** mean "no playoffs": the captured league *The Megalabowl*
(`1268981869060296704`) reports `playoff_week_start: 0` alongside
`playoff_teams: 6` and `last_scored_leg: 18`. A naive `playoff_week_start - 1`
yields `regularSeasonEndWeek: -1`, which would stage every week of that league as
`offseason`.

Treat any `playoff_week_start` **≤ 0 as absent**: leave `regularSeasonEndWeek`
`undefined` and let `deriveSeasonStage`'s sport-aware fallback (14 for NFL, Task 4)
supply it. Do not substitute a literal 14 at the adapter — the fallback belongs in
one place.

```ts
const pws = raw.league.settings?.playoff_week_start
// 0 means "not configured", not "no playoffs" — see above.
const regularSeasonEndWeek = typeof pws === 'number' && pws > 0 ? pws - 1 : undefined
```

Add a test pinning this: a league with `playoff_week_start: 0` must produce
`regularSeasonEndWeek === undefined`, never `-1`.

- [ ] **Step 1: Write the failing test**

`src/editorial/adapters/__tests__/sleeperPoints.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildSleeperPointsData } from '@/editorial/adapters/sleeperAdapter'
import { sleeperFootballFixture } from '@/fixtures/sleeperFootball'

const raw = sleeperFootballFixture as unknown as Parameters<typeof buildSleeperPointsData>[0]

describe('buildSleeperPointsData', () => {
  const data = buildSleeperPointsData(raw)

  it('declares itself a football points league', () => {
    expect(data.format).toBe('h2h-points')
    expect(data.sport).toBe('nfl')
  })

  it('carries league identity', () => {
    expect(data.leagueName).toBe(raw.league.name)
    expect(data.currentSeason).toBe(Number(raw.league.season))
  })

  it('derives the regular season end week from playoff_week_start', () => {
    expect(data.regularSeasonEndWeek).toBe(raw.league.settings.playoff_week_start - 1)
  })

  it('builds one team per roster', () => {
    expect(data.teams).toHaveLength(raw.rosters.length)
  })

  it('gives every team a non-empty name', () => {
    for (const t of data.teams) expect(t.name.trim().length).toBeGreaterThan(0)
  })

  it('builds standings ranked 1..N with no gaps or duplicates', () => {
    const ranks = (data.standings ?? []).map((s) => s.rank).sort((a, b) => a - b)
    expect(ranks).toEqual(Array.from({ length: data.teams.length }, (_, i) => i + 1))
  })

  it('every standing references a real team', () => {
    const ids = new Set(data.teams.map((t) => t.id))
    for (const s of data.standings ?? []) expect(ids.has(s.teamId)).toBe(true)
  })

  it('computes a positive weekly points average', () => {
    expect(data.weeklyPointsAverage).toBeGreaterThan(0)
  })

  it('never invents matchups for weeks Sleeper did not return', () => {
    const captured = Object.keys(raw.matchupsByWeek).length
    if (captured === 0) expect(data.currentWeekMatchups ?? []).toEqual([])
  })

  it('pairs matchups into two-sided games', () => {
    for (const m of data.currentWeekMatchups ?? []) {
      expect(m.homeTeamId).not.toBe(m.awayTeamId)
      expect(typeof m.homePoints).toBe('number')
      expect(typeof m.awayPoints).toBe('number')
    }
  })

  it('produces a LeagueCore-compatible league', async () => {
    const { asLeagueCore } = await import('@/editorial/leagueCore')
    expect(asLeagueCore(data)).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/editorial/adapters/__tests__/sleeperPoints.test.ts`
Expected: FAIL — `buildSleeperPointsData` is not exported.

- [ ] **Step 3: Implement the adapter**

Add to `src/editorial/adapters/sleeperAdapter.ts`. Build it in this order so each piece is verifiable: teams → standings → matchups → rank history → assembly.

Read the existing `sleeperLeagueToCategoryData` in the same file first and reuse its team-naming and avatar helpers rather than writing new ones.

Requirements the tests above encode:
- Ranks are dense and 1-based: sort by `wins` desc, then total points desc as the tiebreak (the standard Sleeper ordering), then assign 1..N.
- `weeklyPointsAverage` is the mean across all team-weeks present. With no weeks captured, leave it `undefined` rather than emitting `0`.

**Three corrections from the real captured data.** Each of these would have been a
silent defect had the adapter been written against the assumed shapes:

**(a) `fpts` is a split-integer encoding, not a float.** Sleeper stores points as
an integer part plus hundredths: `{ fpts: 1807, fpts_decimal: 6 }` means
**1807.06**, not 1813. Adding the two fields is wrong by up to 99 points a season.

```ts
/** Sleeper splits point totals into an integer part and hundredths.
 *  fpts: 1807 + fpts_decimal: 6 → 1807.06 (NOT 1813). */
function sleeperPoints(intPart?: number, hundredths?: number): number {
  return (intPart ?? 0) + (hundredths ?? 0) / 100
}
```

The same encoding applies to the `fpts_against` and `ppts` pairs, which this task
does not consume but a later one may. Add a test asserting `1807 + 6 → 1807.06`.

**(b) A `matchup_id` of `null` is not a game.** In week 17 of the captured league,
6 of 10 entries carry `matchup_id: null` — teams outside the playoff bracket that
week. Grouping naively by `matchup_id` collects all six into a single phantom
"game". **Skip entries whose `matchup_id` is null before grouping**, then skip any
resulting group that does not have exactly two entries. Add a test using the real
week-17 data asserting exactly **2** matchups are produced, not 3.

**(c) Rosters can be orphaned.** 2 of the 10 captured rosters have
`owner_id: null` with no user record and no `metadata` fallback anywhere — real,
active franchises with no linked account. Team naming therefore needs three tiers,
not two:

1. `users[].metadata.team_name` (8 of 10 in the capture)
2. `users[].display_name`
3. `Team <roster_id>` — for orphaned rosters, never an empty string

Add a test asserting the two orphaned rosters still produce non-empty, distinct
names.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/editorial/adapters/__tests__/sleeperPoints.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Prove baseball did not regress**

Run: `npx vitest run && npm run build`
Expected: full suite green, build clean.

- [ ] **Step 6: Commit**

```bash
git add src/editorial/adapters/sleeperAdapter.ts \
        src/editorial/adapters/__tests__/sleeperPoints.test.ts
git commit -m "feat(football): Sleeper H2H points adapter"
```

---

### Task 7: Points-native detectors — margin and scoring stories

**Files:**
- Create: `src/editorial/detection/points.ts`
- Create: `src/editorial/detection/__tests__/points.test.ts`

**Interfaces:**
- Consumes: `LeagueData`, `LeagueDataH2HPoints`, `LeagueDataPointsMatchup`; `StoryCandidate`, `IssueContext`, `DetectFn`; `signature` from `./helpers`.
- Produces: `detectPointsStories: DetectFn` exported from `points.ts`.

**Story types to add** to the `StoryType` union in `src/editorial/detection/types.ts`, under a new `/* I. Points (football) */` section:

```
'points-blowout' | 'points-photo-finish' | 'points-high-score'
| 'points-low-score' | 'points-shootout' | 'points-slugfest'
```

All six take `category: 'matchup'` and `scope: 'matchup'` (or `'league'` for high/low score), so `selection.ts` and `composition.ts` need no changes.

**Thresholds are relative, never absolute.** A 40-point margin is a rout in a standard league and unremarkable in a superflex PPR league. Every threshold is a multiple of the league's own weekly average:

| Story | Condition |
| --- | --- |
| `points-blowout` | margin ≥ 0.40 × avg |
| `points-photo-finish` | margin ≤ 0.03 × avg |
| `points-shootout` | both sides ≥ 1.25 × avg |
| `points-slugfest` | both sides ≤ 0.75 × avg |
| `points-high-score` | week's highest single-team total |
| `points-low-score` | week's lowest single-team total |

- [ ] **Step 1: Write the failing test**

`src/editorial/detection/__tests__/points.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { detectPointsStories } from '@/editorial/detection/points'
import type { LeagueDataH2HPoints, LeagueDataPointsMatchup } from '@/editorial/types'
import type { IssueContext } from '@/editorial/detection/types'

const context: IssueContext = {
  currentWeek: 5, seasonStage: 'settling',
  issueDate: new Date('2026-10-07T12:00:00Z'),
}

const team = (id: string, name: string) =>
  ({ id, name, ownerName: 'o', ownerInitials: id.toUpperCase(), avatarColor: 'c', isMyTeam: false })

const game = (
  id: string, home: string, away: string, hp: number, ap: number,
  status: LeagueDataPointsMatchup['status'] = 'final',
): LeagueDataPointsMatchup =>
  ({ id, homeTeamId: home, awayTeamId: away, status, homePoints: hp, awayPoints: ap })

/** avg 100 makes the multiples easy to read: blowout ≥40, photo ≤3,
 *  shootout ≥125 each, slugfest ≤75 each. */
const league = (games: LeagueDataPointsMatchup[], avg = 100): LeagueDataH2HPoints =>
  ({
    format: 'h2h-points', sport: 'nfl',
    leagueId: 'lg', leagueName: 'Gridiron',
    currentWeek: 5, currentSeason: 2026, regularSeasonEndWeek: 14,
    teams: [team('a', 'Alpha'), team('b', 'Bravo'), team('c', 'Charlie'), team('d', 'Delta')],
    standings: [], seasonRankHistory: [],
    weeklyPointsAverage: avg,
    currentWeekMatchups: games,
  }) as unknown as LeagueDataH2HPoints

const types = (d: LeagueDataH2HPoints) => detectPointsStories(d, context).map((s) => s.type)

describe('detectPointsStories', () => {
  it('emits nothing for a category league', () => {
    const cats = { format: 'h2h-category' } as never
    expect(detectPointsStories(cats, context)).toEqual([])
  })

  it('detects a blowout at 40% of the weekly average', () => {
    expect(types(league([game('m1', 'a', 'b', 145, 100)]))).toContain('points-blowout')
  })

  it('does not call a 30-point win a blowout when the average is 100', () => {
    expect(types(league([game('m1', 'a', 'b', 130, 100)]))).not.toContain('points-blowout')
  })

  /* The same 45-point margin in a high-scoring league is not a blowout —
   * this is the test that proves thresholds are relative, not absolute. */
  it('scales with the league: 45 points is not a blowout at a 200 average', () => {
    expect(types(league([game('m1', 'a', 'b', 245, 200)], 200))).not.toContain('points-blowout')
  })

  it('detects a photo finish inside 3% of the average', () => {
    expect(types(league([game('m1', 'a', 'b', 101, 99)]))).toContain('points-photo-finish')
  })

  it('detects a shootout when both sides clear 125% of the average', () => {
    expect(types(league([game('m1', 'a', 'b', 140, 132)]))).toContain('points-shootout')
  })

  it('detects a slugfest when both sides are under 75%', () => {
    expect(types(league([game('m1', 'a', 'b', 70, 66)]))).toContain('points-slugfest')
  })

  it('names the week high and low across all games', () => {
    const out = types(league([
      game('m1', 'a', 'b', 150, 90),
      game('m2', 'c', 'd', 88, 60),
    ]))
    expect(out).toContain('points-high-score')
    expect(out).toContain('points-low-score')
  })

  it('ignores matchups that are not final', () => {
    expect(types(league([game('m1', 'a', 'b', 145, 100, 'live')]))).toEqual([])
  })

  /* Never fabricate a baseline: with no average and only one game there
   * is nothing to compute a relative threshold against. */
  it('emits no margin stories when the weekly average is unknown and history is too thin', () => {
    const noAvg = { ...league([game('m1', 'a', 'b', 145, 100)]), weeklyPointsAverage: undefined }
    expect(types(noAvg as LeagueDataH2HPoints)).not.toContain('points-blowout')
  })

  it('handles a zero-zero week without dividing by zero', () => {
    const out = types(league([game('m1', 'a', 'b', 0, 0)], 0))
    expect(Array.isArray(out)).toBe(true)
    expect(out).not.toContain('points-blowout')
  })

  it('handles a tie without calling it a blowout', () => {
    const out = types(league([game('m1', 'a', 'b', 100, 100)]))
    expect(out).not.toContain('points-blowout')
    expect(out).toContain('points-photo-finish')
  })

  it('gives every story a stable signature', () => {
    const out = detectPointsStories(league([game('m1', 'a', 'b', 145, 100)]), context)
    for (const s of out) expect(s.signature.length).toBeGreaterThan(0)
    const again = detectPointsStories(league([game('m1', 'a', 'b', 145, 100)]), context)
    expect(out.map((s) => s.signature)).toEqual(again.map((s) => s.signature))
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/editorial/detection/__tests__/points.test.ts`
Expected: FAIL — cannot resolve `@/editorial/detection/points`.

- [ ] **Step 3: Add the six story types**

In `src/editorial/detection/types.ts`, add to the `StoryType` union:

```ts
  /* I. Points (football) */
  | 'points-blowout'
  | 'points-photo-finish'
  | 'points-high-score'
  | 'points-low-score'
  | 'points-shootout'
  | 'points-slugfest'
```

- [ ] **Step 4: Implement points.ts**

`src/editorial/detection/points.ts`. Structure it as one small function per story, called from a single exported `detectPointsStories`, mirroring how `streaks.ts` is organised.

Requirements the tests encode:
- Guard first: `if (data.format !== 'h2h-points') return []`.
- Only `status === 'final'` matchups are considered. A live game has not happened yet.
- Resolve the baseline as `data.weeklyPointsAverage`, else the mean of this week's team totals **when there are at least two games**, else return no margin-based stories. Never default to a constant.
- Guard `baseline <= 0` before dividing.
- A tie counts as a photo finish, never a blowout.
- Signatures are built with `signature([type, season, week, ...teamIds])` from `./helpers`, so the same event hashes identically across runs.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/editorial/detection/__tests__/points.test.ts`
Expected: PASS, 13 tests.

- [ ] **Step 6: Commit**

```bash
git add src/editorial/detection/points.ts src/editorial/detection/types.ts \
        src/editorial/detection/__tests__/points.test.ts
git commit -m "feat(football): points-native margin and scoring detectors"
```

---

### Task 8: Register the points detector and prove the pipeline end to end

**Files:**
- Modify: `src/editorial/detection/index.ts`
- Test: `src/editorial/detection/__tests__/footballPipeline.test.ts` (create)

**Interfaces:**
- Consumes: everything above.
- Produces: `detectAll(data, context)` returns football stories for a Sleeper points league.

- [ ] **Step 1: Write the failing test**

`src/editorial/detection/__tests__/footballPipeline.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { detectAll } from '@/editorial/detection'
import { selectStoriesForIssue } from '@/editorial/selection'
import { composeIssue } from '@/editorial/composition'
import { buildSleeperPointsData } from '@/editorial/adapters/sleeperAdapter'
import { sleeperFootballFixture } from '@/fixtures/sleeperFootball'
import { categoriesFixtureToLeagueData } from '@/editorial/fixtureAdapter'
import { deriveSeasonStage } from '@/editorial/detection/helpers'
import { sportOf } from '@/editorial/leagueCore'
import type { IssueContext } from '@/editorial/detection/types'

const raw = sleeperFootballFixture as unknown as Parameters<typeof buildSleeperPointsData>[0]
const football = buildSleeperPointsData(raw)

const context: IssueContext = {
  currentWeek: football.currentWeek,
  seasonStage: deriveSeasonStage(football.currentWeek, football.regularSeasonEndWeek, sportOf(football)),
  issueDate: new Date('2026-10-07T12:00:00Z'),
}

describe('the football pipeline', () => {
  it('detects stories for a real Sleeper league', () => {
    expect(detectAll(football, context).length).toBeGreaterThan(0)
  })

  it('survives selection and composition without throwing', () => {
    const stories = selectStoriesForIssue(detectAll(football, context), context)
    expect(() => composeIssue(stories, context)).not.toThrow()
  })

  it('produces a hero section', () => {
    const stories = selectStoriesForIssue(detectAll(football, context), context)
    const sections = composeIssue(stories, context)
    expect(sections.length).toBeGreaterThan(0)
    expect(sections[0].priority).toBeGreaterThan(0)
  })

  /* The release gate: this work is additive, and baseball must be able
   * to prove it rather than merely assert it. */
  it('does not change what the baseball fixture detects', () => {
    const baseball = categoriesFixtureToLeagueData()
    const ctx: IssueContext = {
      currentWeek: baseball.currentWeek,
      seasonStage: 'midseason',
      issueDate: new Date('2026-08-09T12:00:00Z'),
    }
    const stories = selectStoriesForIssue(detectAll(baseball, ctx), ctx)
    // Verified against the live fixture at plan time. Sliced to three
    // deliberately: the fourth story is a CADENCE story that depends on
    // the issueDate's weekday (2026-08-09 is a Sunday, so it is
    // 'sunday-final-push'). Asserting it would pin the test to a date
    // rather than to detection behaviour. Do not "improve" this by
    // asserting all four.
    expect(stories.map((s) => s.type).slice(0, 3))
      .toEqual(['dynasty-falling', 'matchup-of-week', 'trade-deadline-week'])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/editorial/detection/__tests__/footballPipeline.test.ts`
Expected: FAIL — no football stories, because the points detector is not registered.

- [ ] **Step 3: Register the detector**

In `src/editorial/detection/index.ts`:

```ts
import { detectPointsStories } from './points'
```

and add `detectPointsStories` to the `DETECTORS` array. Change `detectAll`'s parameter type from `CategoryLeagueData` to `LeagueData`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/editorial/detection/__tests__/footballPipeline.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Full verification**

Run: `npx vitest run && npm run build`
Expected: entire suite green, build clean.

Then confirm the baseball reel is unchanged:

```bash
npx vite-node scripts/export-reel-fixture.ts
git diff --stat video/fixtures/reel.json
```
Expected: **no diff.** If the reel changed, stop and report — this work must not alter baseball output.

- [ ] **Step 6: Commit**

```bash
git add src/editorial/detection/index.ts \
        src/editorial/detection/__tests__/footballPipeline.test.ts
git commit -m "feat(football): register points detectors, prove the pipeline end to end"
```

---

## Out of scope for this plan

Phase 3 (football variant libraries) and Phase 4 (un-gating views, Weekly Reel for football) get their own plans. Also excluded: `points-bench-tragedy`, `points-projection-buster`, `points-projection-collapse` and `points-season-high` / `points-season-low` — these need roster and projection joins that are a task apiece and are better planned once the margin detectors are proven against real data. `CLAUDE.md`'s football claim is corrected in Phase 4, when it becomes true.

## Self-Review

**Spec coverage:** `sport` + `sportOf` (Task 1) · `LeagueData` union widening (Tasks 2–3) · sport-aware season shape and the football cadence problem (Task 4) · Sleeper points adapter (Tasks 5–6) · `detection/points.ts` (Task 7) · registration and end-to-end proof (Task 8) · baseball-regression gate (every task, Step "Prove baseball did not regress"). Spec sections deferred by design: football variant libraries, view un-gating, the projection/bench detectors — all listed above as out of scope.

**Verified against the codebase, not assumed:** `LeagueData` already exists at `types.ts:619` — the plan uses it rather than inventing a synonym. `deriveSeasonStage` already takes `regularSeasonEndWeek` as a parameter, so only its fallback is baseball-shaped. The single "category reference" in `seasonStage.ts` is a comment, not code. `streaks.ts` already guards on missing standings at its entry point. `transactions.ts` and `players.ts` export `detectTransactionStories` / `detectPlayerStories`, not `detect`.

**Type consistency:** `LeagueCore` and `asLeagueCore` are defined in Task 1 and consumed in Tasks 3 and 4. `buildSleeperPointsData` is defined in Task 6 and consumed in Task 8. `detectPointsStories` is defined in Task 7 and registered in Task 8. `deriveSeasonStage`'s third parameter is optional throughout, so no existing call site changes.

**Known risk carried into execution:** Task 5 depends on a real Sleeper league id. If none is supplied, the honest move is to stop and ask rather than hand-write a fixture — a fabricated fixture would silently encode assumptions about Sleeper's response shape, which is the exact failure this plan is structured to avoid.
