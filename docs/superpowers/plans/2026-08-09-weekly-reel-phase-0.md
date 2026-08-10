# The Weekly Reel — Phase 0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a real, watchable MP4 of a league's week from fixture data on a laptop — with zero new accounts, API keys, or cloud infrastructure.

**Architecture:** A pure `buildReel(data, context) → Reel` in `src/editorial/video/` maps the existing `composeIssue()` output onto scene templates, and a separate Remotion package in `video/` renders a `Reel` to video. The `Reel` JSON is the only contract between them, so each half is testable alone.

**Tech Stack:** TypeScript, Vitest (node env, `@` alias), Remotion (React), the existing `src/editorial/` pipeline.

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-08-09-league-video-reel-design.md`. Read it before Task 1.
- **Phase 0 only.** No TTS, no Supabase, no cloud render, no cron, no UI. Those are a later plan.
- **v1 format is `LeagueDataH2HCategory` only** (aliased as `CategoryLeagueData`). The points format is a follow-on; do not add a format discriminator branch.
- **No LLM anywhere in the generation path.** All VO copy comes from deterministic variant libraries.
- **Video output:** 1080×1920, 30fps, portrait.
- **Timing constants:** `LEAD_IN_MS = 400`, `TAIL_MS = 700`.
- **Brand tokens (exact):** background `oklch(0.055 0.012 90)`, text `oklch(0.97 0.005 90)`, accent `#22c55e`, down-arrow `#f0663f`, muted `#7c8496`. Fonts `Barlow` and `Barlow Condensed`.
- **Tests** live in `src/editorial/video/__tests__/`, run with `npx vitest run`.
- **Commit style:** `feat(video): …` / `test(video): …`, matching recent history.
- **Never fabricate data.** If a field is absent, the scene builder returns `null` and the scene is skipped. A shorter honest reel beats a padded one.

---

## File Structure

**Create — editorial half (pure, no I/O):**

| File | Responsibility |
| --- | --- |
| `src/editorial/video/types.ts` | `Reel`, `ReelScene`, `SceneTemplate`, per-scene prop types. No logic. |
| `src/editorial/video/timing.ts` | `sceneDurationMs`, `msToFrames`, `reelDurationMs`. No data knowledge. |
| `src/editorial/video/sceneRouting.ts` | `SectionType → SceneTemplate` table + dedup-by-template. |
| `src/editorial/video/scenes/coldOpen.ts` | Cold Open props + VO. |
| `src/editorial/video/scenes/signOff.ts` | Sign-Off props + VO. |
| `src/editorial/video/scenes/theBoard.ts` | The Board props + VO. |
| `src/editorial/video/scenes/theThrone.ts` | The Throne props + VO. |
| `src/editorial/video/scenes/theClimb.ts` | The Climb props + VO. |
| `src/editorial/video/buildReel.ts` | Orchestrator. The only file with editorial judgment. |

**Create — renderer half (React/Remotion):**

| File | Responsibility |
| --- | --- |
| `video/package.json` | Isolated Remotion workspace. Keeps React out of the Vue app. |
| `video/remotion.config.ts` | Render config. |
| `video/tsconfig.json` | JSX config for the package. |
| `video/src/theme.ts` | Brand tokens, shared by every scene component. |
| `video/src/chrome.tsx` | `Bug`, `Wipe`, `Grain` — the shared broadcast chrome. |
| `video/src/Root.tsx` | `registerRoot`, composition registration, metadata from the Reel. |
| `video/src/ReelVideo.tsx` | Assembles scenes into a `<Series>`. |
| `video/src/scenes/*.tsx` | One component per template. |
| `video/fixtures/reel.json` | A committed sample Reel, produced by Task 7. |

**Modify:** none. Phase 0 touches no existing file.

---

### Task 1: Reel types and timing

**Files:**
- Create: `src/editorial/video/types.ts`
- Create: `src/editorial/video/timing.ts`
- Test: `src/editorial/video/__tests__/timing.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `SceneTemplate`, `ReelTeam`, `ColdOpenProps`, `ThroneProps`, `ThroneCatLine`, `ClimbProps`, `ClimbPoint`, `BoardProps`, `BoardRow`, `SignOffProps`, `ReelScene`, `Reel`; `LEAD_IN_MS`, `TAIL_MS`, `FPS`, `sceneDurationMs(scene)`, `msToFrames(ms, fps?)`, `reelDurationMs(scenes)`.

- [ ] **Step 1: Create the types file**

`src/editorial/video/types.ts`:

```ts
/**
 * The Reel contract — the only thing shared between the editorial
 * pipeline (which builds a Reel) and the Remotion renderer (which
 * turns one into an MP4). Keeping this a plain data type is what lets
 * either half be tested without the other.
 *
 * See docs/superpowers/specs/2026-08-09-league-video-reel-design.md
 */

export type SceneTemplate =
  | 'cold-open'
  | 'the-throne'
  | 'the-climb'
  | 'the-board'
  | 'sign-off'

/** The minimum a scene component needs to draw a team. */
export interface ReelTeam {
  id: string
  name: string
  /** OKLCH gradient stops, comma-separated. Straight from the adapter. */
  avatarColor: string
  ownerInitials: string
}

export interface ColdOpenProps {
  leagueName: string
  week: number
  subtitle: string
}

export interface ThroneCatLine {
  /** Short category label, e.g. "HR". */
  label: string
  winner: 'a' | 'b'
  /** 0–1 fraction of the bar width — how decisively the cat was won. */
  share: number
}

export interface ThroneProps {
  teamA: ReelTeam
  teamB: ReelTeam
  eyebrow: string
  headline: string
  catLines: ThroneCatLine[]
  kicker: string
}

export interface ClimbPoint {
  week: number
  rank: number
}

export interface ClimbProps {
  team: ReelTeam
  points: ClimbPoint[]
  fromRank: number
  toRank: number
  spanWeeks: number
  footnote: string
}

export interface BoardRow {
  rank: number
  teamName: string
  /** Pre-formatted category record, e.g. "62–38" or "62–38–2". */
  record: string
  /** Rank change vs the most recent history week. + climbed, - fell,
   *  0 flat, null when no history exists to compare against. */
  delta: number | null
  highlight: boolean
}

export interface BoardProps {
  rows: BoardRow[]
  note: string
}

export interface SignOffProps {
  teamA: ReelTeam
  teamB: ReelTeam
  line: string
  brandUrl: string
}

/** Discriminated on `template` so the renderer's switch is exhaustive. */
export type SceneBody =
  | { template: 'cold-open'; props: ColdOpenProps }
  | { template: 'the-throne'; props: ThroneProps }
  | { template: 'the-climb'; props: ClimbProps }
  | { template: 'the-board'; props: BoardProps }
  | { template: 'sign-off'; props: SignOffProps }

export type ReelScene = SceneBody & {
  /** Narration script. Deterministic output of the variant libraries. */
  vo: string
  /** Floor duration, independent of audio. */
  minDurationMs: number
  /** Filled in by the voice phase (not Phase 0). */
  voDurationMs?: number
  /** Storage path of the synthesized clip (not Phase 0). */
  voPath?: string
  /** Story that drove this scene. Absent for fixed scenes. */
  storySignature?: string
}

export interface Reel {
  leagueId: string
  leagueName: string
  year: number
  week: number
  width: 1080
  height: 1920
  fps: 30
  scenes: ReelScene[]
  /** Filled in by the voice phase (not Phase 0). */
  totalDurationMs?: number
}
```

- [ ] **Step 2: Write the failing timing test**

`src/editorial/video/__tests__/timing.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  LEAD_IN_MS,
  TAIL_MS,
  sceneDurationMs,
  msToFrames,
  reelDurationMs,
} from '@/editorial/video/timing'

describe('sceneDurationMs', () => {
  it('falls back to the floor when there is no voice yet', () => {
    expect(sceneDurationMs({ minDurationMs: 5000 })).toBe(5000)
  })

  it('uses lead-in + voice + tail when that exceeds the floor', () => {
    const vo = 9000
    expect(sceneDurationMs({ minDurationMs: 5000, voDurationMs: vo }))
      .toBe(LEAD_IN_MS + vo + TAIL_MS)
  })

  it('keeps the floor when the voice clip is very short', () => {
    expect(sceneDurationMs({ minDurationMs: 5000, voDurationMs: 500 }))
      .toBe(5000)
  })
})

describe('msToFrames', () => {
  it('converts milliseconds to whole frames at 30fps', () => {
    expect(msToFrames(1000)).toBe(30)
    expect(msToFrames(1500)).toBe(45)
  })

  it('rounds rather than truncating', () => {
    expect(msToFrames(1016)).toBe(30)  // 30.48 → 30
    expect(msToFrames(1050)).toBe(32)  // 31.5  → 32
  })

  it('never returns a zero-length scene for a non-zero duration', () => {
    expect(msToFrames(10)).toBeGreaterThanOrEqual(1)
  })
})

describe('reelDurationMs', () => {
  it('sums the resolved duration of every scene', () => {
    const scenes = [
      { minDurationMs: 4000 },
      { minDurationMs: 5000, voDurationMs: 9000 },
    ]
    expect(reelDurationMs(scenes)).toBe(4000 + LEAD_IN_MS + 9000 + TAIL_MS)
  })

  it('is zero for an empty reel', () => {
    expect(reelDurationMs([])).toBe(0)
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/editorial/video/__tests__/timing.test.ts`
Expected: FAIL — cannot resolve `@/editorial/video/timing`.

- [ ] **Step 4: Implement timing.ts**

`src/editorial/video/timing.ts`:

```ts
/**
 * Timing — resolves how long each scene runs.
 *
 * Audio drives timing, not the other way around. A scene is built with
 * VO *text*; the real clip duration is unknown until synthesis returns.
 * Once it does, durations are written back onto the scenes and these
 * helpers resolve the final lengths. Rendering before that loop closes
 * is what produces bars that finish filling after the narrator already
 * said the number.
 *
 * In Phase 0 no scene has a voDurationMs, so every scene runs at its
 * floor. That is intentional and correct.
 */

/** Motion starts before the voice does. */
export const LEAD_IN_MS = 400
/** A beat to let the last value land before the wipe. */
export const TAIL_MS = 700

export const FPS = 30

interface Timed {
  minDurationMs: number
  voDurationMs?: number
}

export function sceneDurationMs(scene: Timed): number {
  const voiced =
    scene.voDurationMs != null
      ? LEAD_IN_MS + scene.voDurationMs + TAIL_MS
      : 0
  return Math.max(scene.minDurationMs, voiced)
}

export function msToFrames(ms: number, fps: number = FPS): number {
  if (ms <= 0) return 0
  return Math.max(1, Math.round((ms / 1000) * fps))
}

export function reelDurationMs(scenes: Timed[]): number {
  return scenes.reduce((total, s) => total + sceneDurationMs(s), 0)
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/editorial/video/__tests__/timing.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 6: Type-check**

Run: `npm run type-check`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/editorial/video/types.ts src/editorial/video/timing.ts \
        src/editorial/video/__tests__/timing.test.ts
git commit -m "feat(video): Reel contract + timing model"
```

---

### Task 2: Scene routing and template dedup

**Files:**
- Create: `src/editorial/video/sceneRouting.ts`
- Test: `src/editorial/video/__tests__/sceneRouting.test.ts`

**Interfaces:**
- Consumes: `SceneTemplate` (Task 1); `SectionType`, `IssueSection` from `@/editorial/composition`.
- Produces: `templateForSection(type: SectionType): SceneTemplate | null`, `dedupeByTemplate(sections: IssueSection[]): IssueSection[]`.

**Why this task exists:** `composeIssue()` already dedupes by `SectionType`, but the routing table is many-to-one — `hero-faceoff` and `matchup-of-week` both become `the-throne`. Two sections that survive the existing dedup would render as two visually identical scenes back to back. This is the second dedup pass that prevents it.

- [ ] **Step 1: Write the failing test**

`src/editorial/video/__tests__/sceneRouting.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { templateForSection, dedupeByTemplate } from '@/editorial/video/sceneRouting'
import type { IssueSection } from '@/editorial/composition'

const section = (type: IssueSection['type'], priority: number): IssueSection =>
  ({ type, priority })

describe('templateForSection', () => {
  it('routes face-off style sections to the throne', () => {
    expect(templateForSection('hero-faceoff')).toBe('the-throne')
    expect(templateForSection('matchup-of-week')).toBe('the-throne')
  })

  it('routes single-team arc sections to the climb', () => {
    expect(templateForSection('hero-solo')).toBe('the-climb')
    expect(templateForSection('streak-watch')).toBe('the-climb')
  })

  it('returns null for sections with no scene — they are skipped, not faked', () => {
    expect(templateForSection('quick-reads-ticker')).toBeNull()
    expect(templateForSection('draft-autopsy')).toBeNull()
  })
})

describe('dedupeByTemplate', () => {
  it('keeps only the first section for each template', () => {
    const out = dedupeByTemplate([
      section('hero-faceoff', 100),
      section('matchup-of-week', 70),
    ])
    expect(out.map((s) => s.type)).toEqual(['hero-faceoff'])
  })

  it('keeps sections that map to different templates', () => {
    const out = dedupeByTemplate([
      section('hero-faceoff', 100),
      section('hero-solo', 70),
    ])
    expect(out.map((s) => s.type)).toEqual(['hero-faceoff', 'hero-solo'])
  })

  it('drops unmapped sections entirely', () => {
    const out = dedupeByTemplate([
      section('hero-faceoff', 100),
      section('quick-reads-ticker', 5),
    ])
    expect(out.map((s) => s.type)).toEqual(['hero-faceoff'])
  })

  it('preserves input order, which composeIssue already sorted by priority', () => {
    const out = dedupeByTemplate([
      section('hero-solo', 100),
      section('hero-faceoff', 90),
    ])
    expect(out.map((s) => s.type)).toEqual(['hero-solo', 'hero-faceoff'])
  })

  it('returns an empty array for an empty input', () => {
    expect(dedupeByTemplate([])).toEqual([])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/editorial/video/__tests__/sceneRouting.test.ts`
Expected: FAIL — cannot resolve `@/editorial/video/sceneRouting`.

- [ ] **Step 3: Implement sceneRouting.ts**

`src/editorial/video/sceneRouting.ts`:

```ts
/**
 * Scene routing — maps the issue's section types onto video scene
 * templates. Mirrors `sectionForStoryType` in composition.ts.
 *
 * Two rules matter here:
 *
 *   1. Unmapped sections are SKIPPED, never rendered generically. A
 *      shorter honest reel beats a padded one.
 *   2. Dedup runs on SceneTemplate, not SectionType. The mapping is
 *      many-to-one, so composeIssue's own dedup is not sufficient —
 *      without this pass, hero-faceoff + matchup-of-week would render
 *      as two identical scenes in a row.
 */

import type { IssueSection, SectionType } from '../composition'
import type { SceneTemplate } from './types'

const ROUTES: Partial<Record<SectionType, SceneTemplate>> = {
  'hero-faceoff': 'the-throne',
  'matchup-of-week': 'the-throne',
  'hero-solo': 'the-climb',
  'streak-watch': 'the-climb',
}

export function templateForSection(type: SectionType): SceneTemplate | null {
  return ROUTES[type] ?? null
}

/** Input is expected priority-sorted (composeIssue guarantees this), so
 *  first-wins is the same as highest-priority-wins. */
export function dedupeByTemplate(sections: IssueSection[]): IssueSection[] {
  const used = new Set<SceneTemplate>()
  const kept: IssueSection[] = []

  for (const section of sections) {
    const template = templateForSection(section.type)
    if (!template) continue
    if (used.has(template)) continue
    used.add(template)
    kept.push(section)
  }

  return kept
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/editorial/video/__tests__/sceneRouting.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/editorial/video/sceneRouting.ts \
        src/editorial/video/__tests__/sceneRouting.test.ts
git commit -m "feat(video): scene routing with dedup by template"
```

---

### Task 3: The fixed bookend scenes — Cold Open and Sign-Off

**Files:**
- Create: `src/editorial/video/scenes/coldOpen.ts`
- Create: `src/editorial/video/scenes/signOff.ts`
- Test: `src/editorial/video/__tests__/bookends.test.ts`

**Interfaces:**
- Consumes: `ReelScene`, `ReelTeam` (Task 1); `CategoryLeagueData` from `@/editorial/types`.
- Produces: `buildColdOpen(data: CategoryLeagueData): ReelScene`, `buildSignOff(data: CategoryLeagueData): ReelScene | null`, and a shared `toReelTeam(team: CategoryLeagueDataTeam): ReelTeam` exported from `coldOpen.ts`.

**Note on the matchup fields.** `CategoryLeagueData` carries *two*, and they are not interchangeable (`src/editorial/types.ts:375-376`):

- `matchupsCurrentWeek?: CategoryLeagueDataMatchup[]` — this week's matchups. Populated by the fixture adapter and by both platform adapters. **The Throne reads this.**
- `matchupsByWeek?: Record<string, CategoryLeagueDataMatchup[]>` — the full per-week map, keyed by stringified week. **Sign-Off reads this** for `week + 1`.

`currentWeekMatchups` (no `matchups` prefix) exists only on the **points** format — do not reach for it here.

Sign-Off previews next week's marquee matchup. Whether `matchupsByWeek` contains *future* weeks depends on the adapter, and the demo fixture does not populate it at all — so returning `null` and ending the reel on The Board is the expected path, not a defect.

- [ ] **Step 1: Write the failing test**

`src/editorial/video/__tests__/bookends.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildColdOpen, toReelTeam } from '@/editorial/video/scenes/coldOpen'
import { buildSignOff } from '@/editorial/video/scenes/signOff'
import type {
  CategoryLeagueData,
  CategoryLeagueDataTeam,
  CategoryLeagueDataMatchup,
} from '@/editorial/types'

const team = (id: string, name: string): CategoryLeagueDataTeam => ({
  id,
  name,
  ownerName: 'Owner ' + id,
  ownerInitials: id.slice(0, 2).toUpperCase(),
  avatarColor: '#22c55e, #0a5229',
  isMyTeam: false,
})

const base = (over: Partial<CategoryLeagueData> = {}): CategoryLeagueData =>
  ({
    format: 'h2h-category',
    leagueId: 'lg1',
    leagueName: 'Dead Ball Era',
    currentWeek: 12,
    currentSeason: 2026,
    playoffCutoff: 6,
    teams: [team('a', 'Thunder Cats'), team('b', 'Bench Mob')],
    categories: [],
    standings: [],
    categoryRanks: [],
    seasonRankHistory: [],
    ...over,
  }) as CategoryLeagueData

describe('buildColdOpen', () => {
  it('names the league and the week', () => {
    const scene = buildColdOpen(base())
    expect(scene.template).toBe('cold-open')
    expect(scene.props).toMatchObject({ leagueName: 'Dead Ball Era', week: 12 })
  })

  it('writes a VO line naming both', () => {
    expect(buildColdOpen(base()).vo).toBe('Week 12 in the Dead Ball Era.')
  })

  it('has no story signature — it is a fixed scene', () => {
    expect(buildColdOpen(base()).storySignature).toBeUndefined()
  })
})

describe('buildSignOff', () => {
  const nextWeek: CategoryLeagueDataMatchup[] = [
    {
      id: 'm1',
      homeTeamId: 'a',
      awayTeamId: 'b',
      status: 'upcoming',
      homeCatWins: 0,
      awayCatWins: 0,
      ties: 0,
      contestedCount: 10,
    },
  ]

  it('previews next week from matchupsByWeek', () => {
    const scene = buildSignOff(base({ matchupsByWeek: { '13': nextWeek } }))
    expect(scene).not.toBeNull()
    expect(scene!.template).toBe('sign-off')
    expect(scene!.props).toMatchObject({
      teamA: { name: 'Thunder Cats' },
      teamB: { name: 'Bench Mob' },
    })
  })

  it('returns null when next week has no schedule — never invent a matchup', () => {
    expect(buildSignOff(base({ matchupsByWeek: {} }))).toBeNull()
    expect(buildSignOff(base())).toBeNull()
  })

  it('returns null when a scheduled team is missing from teams[]', () => {
    const orphan: CategoryLeagueDataMatchup[] = [
      { ...nextWeek[0], awayTeamId: 'ghost' },
    ]
    expect(buildSignOff(base({ matchupsByWeek: { '13': orphan } }))).toBeNull()
  })
})

describe('toReelTeam', () => {
  it('carries only what a scene needs to draw', () => {
    expect(toReelTeam(team('a', 'Thunder Cats'))).toEqual({
      id: 'a',
      name: 'Thunder Cats',
      avatarColor: '#22c55e, #0a5229',
      ownerInitials: 'A',
    })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/editorial/video/__tests__/bookends.test.ts`
Expected: FAIL — cannot resolve the scene modules.

- [ ] **Step 3: Implement coldOpen.ts**

`src/editorial/video/scenes/coldOpen.ts`:

```ts
/**
 * Cold Open — the fixed first scene. Brand hit, league name, week.
 * Always renders: it depends on nothing but league metadata, which is
 * why it is one of the three scenes that guarantee a valid reel.
 */

import type { CategoryLeagueData, CategoryLeagueDataTeam } from '../../types'
import type { ReelScene, ReelTeam } from '../types'

/** Narrow a full adapter team down to what a scene draws. */
export function toReelTeam(team: CategoryLeagueDataTeam): ReelTeam {
  return {
    id: team.id,
    name: team.name,
    avatarColor: team.avatarColor,
    ownerInitials: team.ownerInitials,
  }
}

export function buildColdOpen(data: CategoryLeagueData): ReelScene {
  return {
    template: 'cold-open',
    props: {
      leagueName: data.leagueName,
      week: data.currentWeek,
      subtitle: 'THE WEEK IN REVIEW',
    },
    vo: `Week ${data.currentWeek} in the ${data.leagueName}.`,
    minDurationMs: 4000,
  }
}
```

- [ ] **Step 4: Implement signOff.ts**

`src/editorial/video/scenes/signOff.ts`:

```ts
/**
 * Sign-Off — the fixed last scene. Previews next week's marquee
 * matchup, then the brand outro.
 *
 * "Marquee" is defined as the scheduled matchup whose two teams have
 * the best combined current rank. When next week's schedule is absent
 * — or names a team we don't have — this returns null and the reel
 * ends on The Board. We never invent a fixture.
 */

import type { CategoryLeagueData, CategoryLeagueDataMatchup } from '../../types'
import type { ReelScene } from '../types'
import { toReelTeam } from './coldOpen'

export function buildSignOff(data: CategoryLeagueData): ReelScene | null {
  const nextWeek = data.currentWeek + 1
  const scheduled = data.matchupsByWeek?.[String(nextWeek)]
  if (!scheduled || scheduled.length === 0) return null

  const rankOf = (teamId: string): number =>
    data.standings.find((s) => s.teamId === teamId)?.rank ?? Number.MAX_SAFE_INTEGER

  const marquee = [...scheduled].sort(
    (m1, m2) =>
      rankOf(m1.homeTeamId) + rankOf(m1.awayTeamId) -
      (rankOf(m2.homeTeamId) + rankOf(m2.awayTeamId)),
  )[0] as CategoryLeagueDataMatchup

  const home = data.teams.find((t) => t.id === marquee.homeTeamId)
  const away = data.teams.find((t) => t.id === marquee.awayTeamId)
  if (!home || !away) return null

  const homeRank = rankOf(home.id)
  const awayRank = rankOf(away.id)
  const ranked = homeRank !== Number.MAX_SAFE_INTEGER && awayRank !== Number.MAX_SAFE_INTEGER

  const line = ranked
    ? `#${homeRank} vs #${awayRank}`
    : `Week ${nextWeek}`

  return {
    template: 'sign-off',
    props: {
      teamA: toReelTeam(home),
      teamB: toReelTeam(away),
      line,
      brandUrl: 'theleaguebeat.com',
    },
    vo: `Next week: ${home.name} and ${away.name}. That's the beat.`,
    minDurationMs: 6000,
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/editorial/video/__tests__/bookends.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 6: Commit**

```bash
git add src/editorial/video/scenes/coldOpen.ts \
        src/editorial/video/scenes/signOff.ts \
        src/editorial/video/__tests__/bookends.test.ts
git commit -m "feat(video): cold-open + sign-off scene builders"
```

---

### Task 4: The Board scene

**Files:**
- Create: `src/editorial/video/scenes/theBoard.ts`
- Test: `src/editorial/video/__tests__/theBoard.test.ts`

**Interfaces:**
- Consumes: `ReelScene`, `BoardRow` (Task 1); `toReelTeam` (Task 3).
- Produces: `buildBoard(data: CategoryLeagueData, highlightTeamIds?: string[]): ReelScene | null`.

**Two data notes that matter:**
1. `CategoryLeagueDataStanding` has no matchup W–L. It carries `catWins` / `catLosses` / `catTies`. The `record` string is therefore the **category** record — `"62–38"`, or `"62–38–2"` when ties are non-zero. Do not label it as a matchup record anywhere.
2. Rank delta compares against the **most recent entry in `seasonRankHistory`**, not `currentWeek - 1`. Per `CLAUDE.md`, ESPN's `seasonRankHistory` only includes weeks where every matchup was decided, so week numbers can skip.

- [ ] **Step 1: Write the failing test**

`src/editorial/video/__tests__/theBoard.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildBoard } from '@/editorial/video/scenes/theBoard'
import type {
  CategoryLeagueData,
  CategoryLeagueDataStanding,
  CategoryLeagueDataTeam,
} from '@/editorial/types'

const team = (id: string, name: string): CategoryLeagueDataTeam => ({
  id, name, ownerName: 'O', ownerInitials: 'O',
  avatarColor: '#22c55e, #0a5229', isMyTeam: false,
})

const standing = (
  teamId: string, rank: number, over: Partial<CategoryLeagueDataStanding> = {},
): CategoryLeagueDataStanding => ({
  rank, teamId,
  catWins: 62, catLosses: 38, catTies: 0,
  winPct: 0.62,
  streak: { type: 'W', length: 3 },
  lastSix: ['W', 'W', 'L', 'W', 'W', 'W'],
  ownsCount: 4, bleedingCount: 1,
  ...over,
})

const base = (over: Partial<CategoryLeagueData> = {}): CategoryLeagueData =>
  ({
    format: 'h2h-category',
    leagueId: 'lg1', leagueName: 'Dead Ball Era',
    currentWeek: 12, currentSeason: 2026, playoffCutoff: 6,
    teams: [team('a', 'Thunder Cats'), team('b', 'Bench Mob')],
    categories: [], categoryRanks: [],
    standings: [standing('a', 1), standing('b', 2)],
    seasonRankHistory: [],
    ...over,
  }) as CategoryLeagueData

describe('buildBoard', () => {
  it('returns null with no standings — nothing honest to show', () => {
    expect(buildBoard(base({ standings: [] }))).toBeNull()
  })

  it('emits one row per team, in rank order', () => {
    const scene = buildBoard(base())!
    expect(scene.template).toBe('the-board')
    const { rows } = scene.props as { rows: unknown[] }
    expect(rows).toHaveLength(2)
    expect((rows as { rank: number }[]).map((r) => r.rank)).toEqual([1, 2])
  })

  it('formats the category record without ties when there are none', () => {
    const rows = (buildBoard(base())!.props as { rows: { record: string }[] }).rows
    expect(rows[0].record).toBe('62–38')
  })

  it('includes ties in the record when non-zero', () => {
    const data = base({ standings: [standing('a', 1, { catTies: 2 })] })
    const rows = (buildBoard(data)!.props as { rows: { record: string }[] }).rows
    expect(rows[0].record).toBe('62–38–2')
  })

  it('computes delta against the most recent history week, not currentWeek - 1', () => {
    // History skips week 11 entirely — ESPN does this.
    const data = base({
      seasonRankHistory: [
        { week: 9, ranks: { a: 8, b: 1 } },
        { week: 10, ranks: { a: 4, b: 1 } },
      ],
    })
    const rows = (buildBoard(data)!.props as { rows: { delta: number | null }[] }).rows
    expect(rows[0].delta).toBe(3)   // was 4, now 1 → climbed 3
    expect(rows[1].delta).toBe(-1)  // was 1, now 2 → fell 1
  })

  it('reports a null delta when there is no history to compare against', () => {
    const rows = (buildBoard(base())!.props as { rows: { delta: number | null }[] }).rows
    expect(rows[0].delta).toBeNull()
  })

  it('reports a null delta for a team absent from the history entry', () => {
    const data = base({ seasonRankHistory: [{ week: 11, ranks: { b: 1 } }] })
    const rows = (buildBoard(data)!.props as { rows: { delta: number | null }[] }).rows
    expect(rows[0].delta).toBeNull()
  })

  it('highlights only the requested teams', () => {
    const rows = (buildBoard(base(), ['b'])!.props as { rows: { highlight: boolean }[] }).rows
    expect(rows.map((r) => r.highlight)).toEqual([false, true])
  })

  it('names the leader in the VO', () => {
    expect(buildBoard(base())!.vo).toContain('Thunder Cats')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/editorial/video/__tests__/theBoard.test.ts`
Expected: FAIL — cannot resolve `@/editorial/video/scenes/theBoard`.

- [ ] **Step 3: Implement theBoard.ts**

`src/editorial/video/scenes/theBoard.ts`:

```ts
/**
 * The Board — the fixed payoff scene. Full standings with movement.
 *
 * Two data honesties are enforced here:
 *
 *   1. `record` is the CATEGORY record (catWins–catLosses[–catTies]).
 *      CategoryLeagueDataStanding carries no matchup W–L, so we never
 *      present one.
 *   2. `delta` compares against the most recent seasonRankHistory
 *      entry, NOT currentWeek - 1. ESPN only records weeks where every
 *      matchup was decided, so week numbers skip. Missing history means
 *      a null delta, rendered as a dash — never a fabricated zero.
 */

import type { CategoryLeagueData } from '../../types'
import type { BoardRow, ReelScene } from '../types'

const EN_DASH = '–'

function formatRecord(w: number, l: number, t: number): string {
  return t > 0 ? `${w}${EN_DASH}${l}${EN_DASH}${t}` : `${w}${EN_DASH}${l}`
}

/** Most recent history entry strictly before the current week. */
function previousRanks(data: CategoryLeagueData): Record<string, number> | null {
  const past = data.seasonRankHistory
    .filter((h) => h.week < data.currentWeek)
    .sort((h1, h2) => h2.week - h1.week)
  return past[0]?.ranks ?? null
}

export function buildBoard(
  data: CategoryLeagueData,
  highlightTeamIds: string[] = [],
): ReelScene | null {
  if (data.standings.length === 0) return null

  const prev = previousRanks(data)
  const highlight = new Set(highlightTeamIds)

  const rows: BoardRow[] = [...data.standings]
    .sort((s1, s2) => s1.rank - s2.rank)
    .map((s) => {
      const team = data.teams.find((t) => t.id === s.teamId)
      const was = prev?.[s.teamId]
      return {
        rank: s.rank,
        teamName: team?.name ?? 'Unknown',
        record: formatRecord(s.catWins, s.catLosses, s.catTies),
        delta: was == null ? null : was - s.rank,
        highlight: highlight.has(s.teamId),
      }
    })

  const leader = rows[0]
  const cutoff = data.playoffCutoff

  return {
    template: 'the-board',
    props: {
      rows,
      note: cutoff > 0 && rows.length > cutoff
        ? `TOP ${cutoff} MAKE THE PLAYOFFS`
        : '',
    },
    vo: `Here's the board after ${data.currentWeek}. ${leader.teamName} on top at ${leader.record.replace(EN_DASH, ' and ')}.`,
    minDurationMs: 9000,
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/editorial/video/__tests__/theBoard.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/editorial/video/scenes/theBoard.ts \
        src/editorial/video/__tests__/theBoard.test.ts
git commit -m "feat(video): the-board scene builder"
```

---

### Task 5: The Throne scene

**Files:**
- Create: `src/editorial/video/scenes/theThrone.ts`
- Test: `src/editorial/video/__tests__/theThrone.test.ts`

**Interfaces:**
- Consumes: `ReelScene`, `ThroneCatLine` (Task 1); `toReelTeam` (Task 3); `SelectedStory` from `@/editorial/detection/types`.
- Produces: `buildThrone(data: CategoryLeagueData, story: SelectedStory): ReelScene | null`.

**How the matchup is found:** `story.teamIds` names the two teams. Search `data.matchupsCurrentWeek` (**not** `matchupsByWeek` — see the field note in Task 3) for a matchup containing both. `share` for each cat line comes from the two current values: `max / (home + away)`, clamped to `0.5–0.95` so a bar is always visibly asymmetric but never full-width. Categories where both sides are zero, or still `contested`, are dropped — an undecided cat is not a won cat.

- [ ] **Step 1: Write the failing test**

`src/editorial/video/__tests__/theThrone.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildThrone } from '@/editorial/video/scenes/theThrone'
import type {
  CategoryLeagueData,
  CategoryLeagueDataMatchup,
  CategoryLeagueDataTeam,
} from '@/editorial/types'
import type { SelectedStory } from '@/editorial/detection/types'

const team = (id: string, name: string): CategoryLeagueDataTeam => ({
  id, name, ownerName: 'O', ownerInitials: 'O',
  avatarColor: '#22c55e, #0a5229', isMyTeam: false,
})

const story = (teamIds: string[]): SelectedStory =>
  ({
    type: 'new-throne', category: 'standings', weight: 90, freshness: 1,
    scope: 'league', teamIds, seasonStages: ['midseason'],
    context: {}, signature: 'new-throne:a:b:12', score: 90,
  }) as unknown as SelectedStory

const matchup = (over: Partial<CategoryLeagueDataMatchup> = {}): CategoryLeagueDataMatchup => ({
  id: 'm1', homeTeamId: 'a', awayTeamId: 'b', status: 'final',
  homeCatWins: 7, awayCatWins: 3, ties: 0, contestedCount: 0,
  catLines: [
    { catId: 'hr', homeCurrent: 18, awayCurrent: 6, status: 'decided-home' },
    { catId: 'sb', homeCurrent: 4, awayCurrent: 11, status: 'decided-away' },
    { catId: 'era', homeCurrent: 0, awayCurrent: 0, status: 'contested' },
  ],
  ...over,
})

const base = (over: Partial<CategoryLeagueData> = {}): CategoryLeagueData =>
  ({
    format: 'h2h-category',
    leagueId: 'lg1', leagueName: 'Dead Ball Era',
    currentWeek: 12, currentSeason: 2026, playoffCutoff: 6,
    teams: [team('a', 'Thunder Cats'), team('b', 'Bench Mob')],
    categories: [
      { id: 'hr', label: 'HR', name: 'Home Runs', side: 'hit' },
      { id: 'sb', label: 'SB', name: 'Stolen Bases', side: 'hit' },
      { id: 'era', label: 'ERA', name: 'Earned Run Avg', side: 'pit' },
    ],
    standings: [], categoryRanks: [], seasonRankHistory: [],
    matchupsCurrentWeek: [matchup()],
    ...over,
  }) as CategoryLeagueData

describe('buildThrone', () => {
  it('returns null when the story names fewer than two teams', () => {
    expect(buildThrone(base(), story(['a']))).toBeNull()
  })

  it('returns null when no matchup contains both teams', () => {
    expect(buildThrone(base({ matchupsCurrentWeek: [] }), story(['a', 'b']))).toBeNull()
  })

  it('returns null when matchupsCurrentWeek is absent entirely', () => {
    expect(buildThrone(base({ matchupsCurrentWeek: undefined }), story(['a', 'b']))).toBeNull()
  })

  it('returns null when the matchup has no cat lines', () => {
    const data = base({ matchupsCurrentWeek: [matchup({ catLines: undefined })] })
    expect(buildThrone(data, story(['a', 'b']))).toBeNull()
  })

  it('builds one cat line per decided category, dropping undecided ones', () => {
    const scene = buildThrone(base(), story(['a', 'b']))!
    const { catLines } = scene.props as { catLines: { label: string }[] }
    expect(catLines.map((c) => c.label)).toEqual(['HR', 'SB'])
  })

  it('assigns the winner side per category', () => {
    const scene = buildThrone(base(), story(['a', 'b']))!
    const { catLines } = scene.props as { catLines: { label: string; winner: string }[] }
    expect(catLines.find((c) => c.label === 'HR')!.winner).toBe('a')
    expect(catLines.find((c) => c.label === 'SB')!.winner).toBe('b')
  })

  it('clamps share into a visible band', () => {
    const scene = buildThrone(base(), story(['a', 'b']))!
    const { catLines } = scene.props as { catLines: { share: number }[] }
    for (const line of catLines) {
      expect(line.share).toBeGreaterThanOrEqual(0.5)
      expect(line.share).toBeLessThanOrEqual(0.95)
    }
  })

  it('carries the headline score and the story signature', () => {
    const scene = buildThrone(base(), story(['a', 'b']))!
    expect(scene.props).toMatchObject({ headline: '7–3' })
    expect(scene.storySignature).toBe('new-throne:a:b:12')
  })

  it('orients the score from the perspective of the winner', () => {
    const flipped = matchup({ homeCatWins: 3, awayCatWins: 7 })
    const data = base({ matchupsCurrentWeek: [flipped] })
    const scene = buildThrone(data, story(['a', 'b']))!
    expect(scene.props).toMatchObject({
      headline: '7–3',
      teamA: { name: 'Bench Mob' },
      teamB: { name: 'Thunder Cats' },
    })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/editorial/video/__tests__/theThrone.test.ts`
Expected: FAIL — cannot resolve `@/editorial/video/scenes/theThrone`.

- [ ] **Step 3: Implement theThrone.ts**

`src/editorial/video/scenes/theThrone.ts`:

```ts
/**
 * The Throne — a two-team faceoff told as a category tug-of-war.
 *
 * teamA is always the WINNER, so the scene reads left-to-right as the
 * story does. Undecided categories are dropped: a contested cat is not
 * a won cat, and drawing it as one would be a lie in motion.
 */

import type { CategoryLeagueData, CategoryLeagueDataMatchup } from '../../types'
import type { SelectedStory } from '../../detection/types'
import type { ReelScene, ThroneCatLine } from '../types'
import { toReelTeam } from './coldOpen'

const EN_DASH = '–'
const SHARE_MIN = 0.5
const SHARE_MAX = 0.95

function findMatchup(
  data: CategoryLeagueData,
  idA: string,
  idB: string,
): CategoryLeagueDataMatchup | null {
  // matchupsCurrentWeek, NOT matchupsByWeek — see the field note in the
  // sign-off builder. Both exist on the contract and mean different things.
  const week = data.matchupsCurrentWeek ?? []
  return (
    week.find(
      (m) =>
        (m.homeTeamId === idA && m.awayTeamId === idB) ||
        (m.homeTeamId === idB && m.awayTeamId === idA),
    ) ?? null
  )
}

export function buildThrone(
  data: CategoryLeagueData,
  story: SelectedStory,
): ReelScene | null {
  const ids = story.teamIds ?? []
  if (ids.length < 2) return null

  const matchup = findMatchup(data, ids[0], ids[1])
  if (!matchup || !matchup.catLines || matchup.catLines.length === 0) return null

  const homeWon = matchup.homeCatWins >= matchup.awayCatWins
  const winnerId = homeWon ? matchup.homeTeamId : matchup.awayTeamId
  const loserId = homeWon ? matchup.awayTeamId : matchup.homeTeamId

  const winner = data.teams.find((t) => t.id === winnerId)
  const loser = data.teams.find((t) => t.id === loserId)
  if (!winner || !loser) return null

  const catLines: ThroneCatLine[] = []
  for (const line of matchup.catLines) {
    if (line.status === 'contested') continue
    const total = line.homeCurrent + line.awayCurrent
    if (total <= 0) continue

    const category = data.categories.find((c) => c.id === line.catId)
    if (!category) continue

    const homeTookIt = line.status === 'decided-home' || line.status === 'punted-away'
    const raw = Math.max(line.homeCurrent, line.awayCurrent) / total

    catLines.push({
      label: category.label,
      winner: homeTookIt === homeWon ? 'a' : 'b',
      share: Math.min(SHARE_MAX, Math.max(SHARE_MIN, raw)),
    })
  }

  if (catLines.length === 0) return null

  const winnerCats = homeWon ? matchup.homeCatWins : matchup.awayCatWins
  const loserCats = homeWon ? matchup.awayCatWins : matchup.homeCatWins
  const headline = `${winnerCats}${EN_DASH}${loserCats}`

  return {
    template: 'the-throne',
    props: {
      teamA: toReelTeam(winner),
      teamB: toReelTeam(loser),
      eyebrow: 'MATCHUP OF THE WEEK',
      headline,
      catLines,
      kicker: `${winnerCats} CATEGORIES TO ${loserCats}`,
    },
    vo: `${winner.name} and ${loser.name} met with the week on the line, and ${winner.name} took it ${winnerCats} categories to ${loserCats}.`,
    minDurationMs: 11000,
    storySignature: story.signature,
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/editorial/video/__tests__/theThrone.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/editorial/video/scenes/theThrone.ts \
        src/editorial/video/__tests__/theThrone.test.ts
git commit -m "feat(video): the-throne scene builder"
```

---

### Task 6: The Climb scene

**Files:**
- Create: `src/editorial/video/scenes/theClimb.ts`
- Test: `src/editorial/video/__tests__/theClimb.test.ts`

**Interfaces:**
- Consumes: `ReelScene`, `ClimbPoint` (Task 1); `toReelTeam` (Task 3); `SelectedStory`.
- Produces: `buildClimb(data: CategoryLeagueData, story: SelectedStory): ReelScene | null`.

**Requires at least 3 history points** to draw a line worth drawing. Fewer, and it returns `null`.

- [ ] **Step 1: Write the failing test**

`src/editorial/video/__tests__/theClimb.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildClimb } from '@/editorial/video/scenes/theClimb'
import type { CategoryLeagueData, CategoryLeagueDataTeam } from '@/editorial/types'
import type { SelectedStory } from '@/editorial/detection/types'

const team = (id: string, name: string): CategoryLeagueDataTeam => ({
  id, name, ownerName: 'O', ownerInitials: 'O',
  avatarColor: '#22c55e, #0a5229', isMyTeam: false,
})

const story = (teamIds: string[]): SelectedStory =>
  ({
    type: 'hot-climber', category: 'standings', weight: 70, freshness: 1,
    scope: 'team', teamIds, seasonStages: ['midseason'],
    context: {}, signature: 'hot-climber:a:12', score: 70,
  }) as unknown as SelectedStory

const base = (over: Partial<CategoryLeagueData> = {}): CategoryLeagueData =>
  ({
    format: 'h2h-category',
    leagueId: 'lg1', leagueName: 'Dead Ball Era',
    currentWeek: 12, currentSeason: 2026, playoffCutoff: 6,
    teams: [team('a', 'Rally Caps')],
    categories: [], standings: [], categoryRanks: [],
    seasonRankHistory: [
      { week: 9, ranks: { a: 11 } },
      { week: 10, ranks: { a: 9 } },
      { week: 11, ranks: { a: 6 } },
    ],
    ...over,
  }) as CategoryLeagueData

describe('buildClimb', () => {
  it('returns null when the story names no team', () => {
    expect(buildClimb(base(), story([]))).toBeNull()
  })

  it('returns null when the team is unknown', () => {
    expect(buildClimb(base(), story(['ghost']))).toBeNull()
  })

  it('returns null with fewer than three history points', () => {
    const data = base({ seasonRankHistory: [{ week: 11, ranks: { a: 6 } }] })
    expect(buildClimb(data, story(['a']))).toBeNull()
  })

  it('returns null when history exists but never names this team', () => {
    const data = base({
      seasonRankHistory: [
        { week: 9, ranks: { b: 1 } },
        { week: 10, ranks: { b: 1 } },
        { week: 11, ranks: { b: 1 } },
      ],
    })
    expect(buildClimb(data, story(['a']))).toBeNull()
  })

  it('emits ordered points and the from/to ranks', () => {
    const scene = buildClimb(base(), story(['a']))!
    expect(scene.template).toBe('the-climb')
    expect(scene.props).toMatchObject({ fromRank: 11, toRank: 6, spanWeeks: 3 })
    const { points } = scene.props as { points: { week: number }[] }
    expect(points.map((p) => p.week)).toEqual([9, 10, 11])
  })

  it('sorts unordered history before use', () => {
    const data = base({
      seasonRankHistory: [
        { week: 11, ranks: { a: 6 } },
        { week: 9, ranks: { a: 11 } },
        { week: 10, ranks: { a: 9 } },
      ],
    })
    const { points } = buildClimb(data, story(['a']))!.props as { points: { week: number }[] }
    expect(points.map((p) => p.week)).toEqual([9, 10, 11])
  })

  it('describes a climb in the VO', () => {
    expect(buildClimb(base(), story(['a']))!.vo).toContain('Rally Caps')
  })

  it('handles a fall without claiming it is a climb', () => {
    const data = base({
      seasonRankHistory: [
        { week: 9, ranks: { a: 2 } },
        { week: 10, ranks: { a: 5 } },
        { week: 11, ranks: { a: 9 } },
      ],
    })
    const scene = buildClimb(data, story(['a']))!
    expect(scene.props).toMatchObject({ fromRank: 2, toRank: 9 })
    expect(scene.vo).not.toContain('climbed')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/editorial/video/__tests__/theClimb.test.ts`
Expected: FAIL — cannot resolve `@/editorial/video/scenes/theClimb`.

- [ ] **Step 3: Implement theClimb.ts**

`src/editorial/video/scenes/theClimb.ts`:

```ts
/**
 * The Climb — one team's season arc drawn across the weeks we have.
 *
 * Works in both directions. A team that fell gets the same treatment
 * with honest copy; we do not describe a collapse as a climb.
 */

import type { CategoryLeagueData } from '../../types'
import type { SelectedStory } from '../../detection/types'
import type { ClimbPoint, ReelScene } from '../types'
import { toReelTeam } from './coldOpen'

const MIN_POINTS = 3

export function buildClimb(
  data: CategoryLeagueData,
  story: SelectedStory,
): ReelScene | null {
  const teamId = story.teamIds?.[0]
  if (!teamId) return null

  const team = data.teams.find((t) => t.id === teamId)
  if (!team) return null

  const points: ClimbPoint[] = [...data.seasonRankHistory]
    .sort((h1, h2) => h1.week - h2.week)
    .filter((h) => h.ranks[teamId] != null)
    .map((h) => ({ week: h.week, rank: h.ranks[teamId] }))

  if (points.length < MIN_POINTS) return null

  const fromRank = points[0].rank
  const toRank = points[points.length - 1].rank
  const moved = fromRank - toRank          // positive = climbed
  const spanWeeks = points.length

  const direction = moved > 0 ? 'climbed' : moved < 0 ? 'slid' : 'held'
  const spots = Math.abs(moved)

  const vo =
    moved === 0
      ? `${team.name} have not moved in ${spanWeeks} weeks, still sitting ${toRank}th.`
      : `${team.name} have gone from ${fromRank}th to ${toRank}th across ${spanWeeks} weeks.`

  return {
    template: 'the-climb',
    props: {
      team: toReelTeam(team),
      points,
      fromRank,
      toRank,
      spanWeeks,
      footnote:
        moved === 0
          ? `HELD AT ${toRank} FOR ${spanWeeks} WEEKS`
          : `${direction.toUpperCase()} ${spots} ${spots === 1 ? 'SPOT' : 'SPOTS'}`,
    },
    vo,
    minDurationMs: 10000,
    storySignature: story.signature,
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/editorial/video/__tests__/theClimb.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/editorial/video/scenes/theClimb.ts \
        src/editorial/video/__tests__/theClimb.test.ts
git commit -m "feat(video): the-climb scene builder"
```

---

### Task 7: buildReel orchestrator and the fixture export

**Files:**
- Create: `src/editorial/video/buildReel.ts`
- Create: `scripts/export-reel-fixture.ts`
- Create: `video/fixtures/reel.json` (generated, then committed)
- Test: `src/editorial/video/__tests__/buildReel.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 1–6; `composeIssue` and `IssueSection` from `@/editorial/composition`; `selectStoriesForIssue` is NOT called here — the caller passes already-selected stories.
- Produces: `buildReel(data: CategoryLeagueData, context: IssueContext, stories: SelectedStory[]): Reel`.

- [ ] **Step 1: Write the failing test**

`src/editorial/video/__tests__/buildReel.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildReel } from '@/editorial/video/buildReel'
import type { CategoryLeagueData, CategoryLeagueDataTeam } from '@/editorial/types'
import type { IssueContext, SelectedStory } from '@/editorial/detection/types'

const team = (id: string, name: string): CategoryLeagueDataTeam => ({
  id, name, ownerName: 'O', ownerInitials: 'O',
  avatarColor: '#22c55e, #0a5229', isMyTeam: false,
})

const context: IssueContext = {
  currentWeek: 12,
  seasonStage: 'midseason',
  issueDate: new Date('2026-08-09T12:00:00Z'),
}

const base = (over: Partial<CategoryLeagueData> = {}): CategoryLeagueData =>
  ({
    format: 'h2h-category',
    leagueId: 'lg1', leagueName: 'Dead Ball Era',
    currentWeek: 12, currentSeason: 2026, playoffCutoff: 6,
    teams: [team('a', 'Thunder Cats'), team('b', 'Bench Mob')],
    categories: [],
    standings: [
      { rank: 1, teamId: 'a', catWins: 62, catLosses: 38, catTies: 0, winPct: 0.62,
        streak: { type: 'W', length: 3 }, lastSix: [], ownsCount: 4, bleedingCount: 1 },
      { rank: 2, teamId: 'b', catWins: 58, catLosses: 42, catTies: 0, winPct: 0.58,
        streak: { type: 'L', length: 1 }, lastSix: [], ownsCount: 3, bleedingCount: 2 },
    ],
    categoryRanks: [], seasonRankHistory: [],
    ...over,
  }) as CategoryLeagueData

describe('buildReel', () => {
  it('always produces the fixed spine, even with no stories', () => {
    const reel = buildReel(base(), context, [])
    expect(reel.scenes.map((s) => s.template)).toEqual(['cold-open', 'the-board'])
  })

  it('never produces an empty reel for a league with standings', () => {
    expect(buildReel(base(), context, []).scenes.length).toBeGreaterThan(0)
  })

  it('opens on cold-open and closes on the last fixed scene', () => {
    const reel = buildReel(base(), context, [])
    expect(reel.scenes[0].template).toBe('cold-open')
    expect(reel.scenes[reel.scenes.length - 1].template).toBe('the-board')
  })

  it('carries league identity and video geometry', () => {
    const reel = buildReel(base(), context, [])
    expect(reel).toMatchObject({
      leagueId: 'lg1', leagueName: 'Dead Ball Era',
      year: 2026, week: 12,
      width: 1080, height: 1920, fps: 30,
    })
  })

  it('leaves voDurationMs unset — Phase 0 has no audio', () => {
    for (const scene of buildReel(base(), context, []).scenes) {
      expect(scene.voDurationMs).toBeUndefined()
    }
  })

  it('gives every scene a non-empty VO script', () => {
    for (const scene of buildReel(base(), context, []).scenes) {
      expect(scene.vo.length).toBeGreaterThan(0)
    }
  })

  it('places the board after the story scenes', () => {
    const climb: SelectedStory = {
      type: 'hot-climber', category: 'standings', weight: 70, freshness: 1,
      scope: 'team', teamIds: ['a'], seasonStages: ['midseason'],
      context: {}, signature: 'hot-climber:a:12', score: 70,
    } as unknown as SelectedStory

    const data = base({
      seasonRankHistory: [
        { week: 9, ranks: { a: 11, b: 1 } },
        { week: 10, ranks: { a: 9, b: 1 } },
        { week: 11, ranks: { a: 6, b: 2 } },
      ],
    })

    const templates = buildReel(data, context, [climb]).scenes.map((s) => s.template)
    expect(templates.indexOf('the-climb')).toBeLessThan(templates.indexOf('the-board'))
  })

  it('renders one scene, not two, when sections share a template', () => {
    const mk = (type: string, teamIds: string[], sig: string): SelectedStory =>
      ({
        type, category: 'standings', weight: 70, freshness: 1, scope: 'team',
        teamIds, seasonStages: ['midseason'], context: {}, signature: sig, score: 70,
      }) as unknown as SelectedStory

    const data = base({
      seasonRankHistory: [
        { week: 9, ranks: { a: 11, b: 3 } },
        { week: 10, ranks: { a: 9, b: 2 } },
        { week: 11, ranks: { a: 6, b: 2 } },
      ],
    })

    // hot-climber → hero-solo → the-climb; streak-built → streak-watch → the-climb
    const stories = [mk('hot-climber', ['a'], 's1'), mk('streak-built', ['b'], 's2')]
    const climbs = buildReel(data, context, stories)
      .scenes.filter((s) => s.template === 'the-climb')
    expect(climbs).toHaveLength(1)
  })

  it('skips a story scene whose builder returns null rather than faking it', () => {
    // hot-climber with no usable rank history → buildClimb returns null.
    const climb = {
      type: 'hot-climber', category: 'standings', weight: 70, freshness: 1,
      scope: 'team', teamIds: ['a'], seasonStages: ['midseason'],
      context: {}, signature: 'hot-climber:a:12', score: 70,
    } as unknown as SelectedStory

    const templates = buildReel(base(), context, [climb]).scenes.map((s) => s.template)
    expect(templates).not.toContain('the-climb')
  })

  it('omits the board for a league with no standings at all', () => {
    const reel = buildReel(base({ standings: [] }), context, [])
    expect(reel.scenes.map((s) => s.template)).toEqual(['cold-open'])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/editorial/video/__tests__/buildReel.test.ts`
Expected: FAIL — cannot resolve `@/editorial/video/buildReel`.

- [ ] **Step 3: Implement buildReel.ts**

`src/editorial/video/buildReel.ts`:

```ts
/**
 * buildReel — the only place editorial judgment lives on the video
 * side. Pure: no I/O, no clock, no randomness. Same inputs always
 * produce the same Reel, which is what makes the snapshot tests
 * meaningful and the renders reproducible.
 *
 * Structure is a fixed spine with a dynamic middle:
 *
 *   cold-open  →  [story scenes]  →  the-board  →  sign-off
 *
 * The fixed scenes are what guarantee a valid reel in a quiet week.
 * Story scenes come from composeIssue(), routed and deduped by scene
 * template. Any builder returning null drops its scene silently — a
 * shorter honest reel beats a padded one.
 */

import type { CategoryLeagueData } from '../types'
import type { IssueContext, SelectedStory } from '../detection/types'
import { composeIssue } from '../composition'
import type { Reel, ReelScene } from './types'
import { dedupeByTemplate, templateForSection } from './sceneRouting'
import { buildColdOpen } from './scenes/coldOpen'
import { buildSignOff } from './scenes/signOff'
import { buildBoard } from './scenes/theBoard'
import { buildThrone } from './scenes/theThrone'
import { buildClimb } from './scenes/theClimb'

/** How many story scenes sit between the cold open and the board. */
const MAX_STORY_SCENES = 3

export function buildReel(
  data: CategoryLeagueData,
  context: IssueContext,
  stories: SelectedStory[],
): Reel {
  const scenes: ReelScene[] = [buildColdOpen(data)]

  /* Story scenes — routed from the existing composition layer. */
  const sections = dedupeByTemplate(composeIssue(stories, context))
  const featuredTeamIds: string[] = []

  for (const section of sections) {
    if (scenes.length - 1 >= MAX_STORY_SCENES) break
    if (!section.story) continue

    const template = templateForSection(section.type)
    const scene =
      template === 'the-throne' ? buildThrone(data, section.story)
      : template === 'the-climb' ? buildClimb(data, section.story)
      : null

    if (!scene) continue
    scenes.push(scene)
    featuredTeamIds.push(...(section.story.teamIds ?? []))
  }

  /* The board — highlights whoever the story scenes were about. */
  const board = buildBoard(data, featuredTeamIds)
  if (board) scenes.push(board)

  /* Sign-off — only when next week's schedule actually exists. */
  const signOff = buildSignOff(data)
  if (signOff) scenes.push(signOff)

  return {
    leagueId: data.leagueId,
    leagueName: data.leagueName,
    year: data.currentSeason,
    week: data.currentWeek,
    width: 1080,
    height: 1920,
    fps: 30,
    scenes,
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/editorial/video/__tests__/buildReel.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Run the whole suite and type-check for regressions**

Run: `npx vitest run && npm run type-check`
Expected: all tests pass, no type errors.

- [ ] **Step 6: Write the fixture export script**

`scripts/export-reel-fixture.ts`:

```ts
/**
 * Exports a Reel built from the demo fixture league to
 * video/fixtures/reel.json, so the Remotion package has real input
 * without importing the app.
 *
 * Run: npx vite-node scripts/export-reel-fixture.ts
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { categoriesFixtureToLeagueData } from '../src/editorial/fixtureAdapter'
import { buildReel } from '../src/editorial/video/buildReel'
import { detectAll } from '../src/editorial/detection'
import { selectStoriesForIssue } from '../src/editorial/selection'
import type { IssueContext } from '../src/editorial/detection/types'

// The fixture module exports its pieces individually (teams, standings,
// seasonRankHistory, …). fixtureAdapter assembles them into the real
// CategoryLeagueData contract — use it rather than hand-building one.
const data = categoriesFixtureToLeagueData()

const context: IssueContext = {
  currentWeek: data.currentWeek,
  seasonStage: 'midseason',
  issueDate: new Date('2026-08-09T12:00:00Z'),
}

// detectAll is the detection orchestrator; it returns raw candidates,
// which selectStoriesForIssue scores and trims.
const stories = selectStoriesForIssue(detectAll(data, context), context)
const reel = buildReel(data, context, stories)

const out = resolve(process.cwd(), 'video/fixtures/reel.json')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, JSON.stringify(reel, null, 2) + '\n')

console.log(`Wrote ${out}`)
console.log(`${reel.scenes.length} scenes:`, reel.scenes.map((s) => s.template).join(' → '))
```

- [ ] **Step 7: Run the export and confirm the output**

Run: `npx vite-node scripts/export-reel-fixture.ts`
Expected: prints the output path and a scene list beginning with `cold-open`.

`vite-node` is already in `node_modules/.bin` — no install needed. The fixture
league is "Diamond Cuts" at **week 8** (not the week 12 used in the unit tests),
so the exported reel reflects that.

The fixture adapter populates `matchupsCurrentWeek` but **not** `matchupsByWeek`,
so `buildSignOff` returns null and the reel ends on `the-board`. That is the
designed behaviour, not a bug — do not add a fake schedule to force a sign-off.
`the-throne` is unaffected: it reads `matchupsCurrentWeek`, which the fixture
does populate.

- [ ] **Step 8: Commit**

```bash
git add src/editorial/video/buildReel.ts scripts/export-reel-fixture.ts \
        video/fixtures/reel.json \
        src/editorial/video/__tests__/buildReel.test.ts
git commit -m "feat(video): buildReel orchestrator + fixture export"
```

---

### Task 8: Remotion package scaffold and theme

**Files:**
- Create: `video/package.json`, `video/tsconfig.json`, `video/remotion.config.ts`
- Create: `video/src/theme.ts`, `video/src/chrome.tsx`
- Create: `video/src/Root.tsx`, `video/src/ReelVideo.tsx`
- Modify: `.gitignore` (add `video/node_modules`, `video/out`)

**Interfaces:**
- Consumes: `Reel`, `ReelScene` types — imported across the package boundary via a relative path (`../../src/editorial/video/types`). Types only; no runtime import from the app.
- Produces: `theme` (colors, fonts), `<Bug />`, `<Wipe />`, `<Grain />`, `<ReelVideo reel={...} />`, a registered composition named `Reel`.

**Before starting:** confirm Remotion's licence terms apply to this project. It is free for individuals and small companies and requires a paid company licence above a headcount threshold. This is the last cheap moment to check.

- [ ] **Step 1: Scaffold the package**

Run:

```bash
mkdir -p video/src/scenes video/fixtures
cd video && npm init -y && npm install remotion @remotion/cli react react-dom \
  && npm install -D @types/react @types/react-dom typescript && cd ..
```

- [ ] **Step 2: Configure the package**

`video/package.json` — set `"name": "theleaguebeat-video"`, `"private": true`, `"type": "module"`, and scripts:

```json
{
  "scripts": {
    "studio": "remotion studio src/Root.tsx",
    "render": "remotion render src/Root.tsx Reel out/reel.mp4"
  }
}
```

`video/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src", "../src/editorial/video/types.ts"]
}
```

`video/remotion.config.ts`:

```ts
import { Config } from '@remotion/cli/config'

Config.setVideoImageFormat('jpeg')
Config.setOverwriteOutput(true)
```

Append to the root `.gitignore`:

```
video/node_modules
video/out
```

- [ ] **Step 3: Write the theme**

`video/src/theme.ts`:

```ts
/** Brand tokens, copied verbatim from CoverCard.vue so the video and
 *  the share card are unmistakably the same publication. */
export const theme = {
  bg: 'oklch(0.055 0.012 90)',
  text: 'oklch(0.97 0.005 90)',
  textMuted: 'oklch(0.62 0.010 90)',
  accent: '#22c55e',
  down: '#f0663f',
  neutral: '#7c8496',
  display: "'Barlow Condensed', sans-serif",
  body: "'Barlow', system-ui, sans-serif",
} as const

/** Design canvas. Scene components lay out against these numbers so a
 *  change of output resolution never means re-tuning every scene. */
export const CANVAS = { width: 1080, height: 1920 } as const
```

- [ ] **Step 4: Write the shared chrome**

`video/src/chrome.tsx`:

```tsx
import React from 'react'
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import { theme } from './theme'

/** Persistent corner bug. Present on every scene but the bookends. */
export const Bug: React.FC<{ week: number }> = ({ week }) => {
  const frame = useCurrentFrame()
  const opacity = interpolate(frame, [8, 20], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })
  return (
    <div style={{
      position: 'absolute', top: 72, left: 64, display: 'flex',
      alignItems: 'center', gap: 12, opacity,
      fontFamily: theme.body, fontSize: 26, fontWeight: 600,
      letterSpacing: '0.15em', color: theme.text,
    }}>
      <span style={{ width: 22, height: 22, borderRadius: 4, background: theme.accent }} />
      THE LEAGUE BEAT
      <span style={{ fontFamily: theme.display, opacity: 0.5, letterSpacing: '0.12em' }}>
        WK {week}
      </span>
    </div>
  )
}

/** Green wipe that opens every scene. Runs over the first 26 frames. */
export const Wipe: React.FC = () => {
  const frame = useCurrentFrame()
  const x = interpolate(frame, [0, 11, 26], [-101, 0, 101], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })
  if (frame > 26) return null
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 20,
      transform: `translateX(${x}%)`,
      background: `linear-gradient(115deg, ${theme.accent} 0%, #0c6634 100%)`,
    }} />
  )
}

/** Paper grain, matching the share card's texture. */
export const Grain: React.FC = () => {
  const { width, height } = useVideoConfig()
  return (
    <svg width={width} height={height}
      style={{ position: 'absolute', inset: 0, opacity: 0.15, mixBlendMode: 'overlay', pointerEvents: 'none' }}>
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={3} />
      </filter>
      <rect width={width} height={height} filter="url(#grain)" opacity={0.5} />
    </svg>
  )
}

/** Full-bleed scene background. */
export const Backdrop: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    position: 'absolute', inset: 0, background: theme.bg, color: theme.text,
    fontFamily: theme.body, overflow: 'hidden',
  }}>
    {children}
    <Grain />
    <Wipe />
  </div>
)
```

- [ ] **Step 5: Write ReelVideo and Root with a placeholder scene switch**

`video/src/ReelVideo.tsx`:

```tsx
import React from 'react'
import { Series } from 'remotion'
import type { Reel, ReelScene } from '../../src/editorial/video/types'
import { Backdrop } from './chrome'
import { theme } from './theme'

const LEAD_IN_MS = 400
const TAIL_MS = 700

export function sceneDurationMs(scene: ReelScene): number {
  const voiced = scene.voDurationMs != null
    ? LEAD_IN_MS + scene.voDurationMs + TAIL_MS
    : 0
  return Math.max(scene.minDurationMs, voiced)
}

export function reelFrames(reel: Reel): number {
  const ms = reel.scenes.reduce((t, s) => t + sceneDurationMs(s), 0)
  return Math.max(1, Math.round((ms / 1000) * reel.fps))
}

/** Placeholder until the scene components land in Tasks 9–12. */
const Placeholder: React.FC<{ scene: ReelScene }> = ({ scene }) => (
  <Backdrop>
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontFamily: theme.display, fontSize: 90,
      fontWeight: 900, color: theme.accent,
    }}>
      {scene.template}
    </div>
  </Backdrop>
)

export const ReelVideo: React.FC<{ reel: Reel }> = ({ reel }) => (
  <Series>
    {reel.scenes.map((scene, i) => (
      <Series.Sequence
        key={i}
        durationInFrames={Math.max(1, Math.round((sceneDurationMs(scene) / 1000) * reel.fps))}
      >
        <Placeholder scene={scene} />
      </Series.Sequence>
    ))}
  </Series>
)
```

`video/src/Root.tsx`:

```tsx
import React from 'react'
import { Composition, registerRoot } from 'remotion'
import { ReelVideo, reelFrames } from './ReelVideo'
import type { Reel } from '../../src/editorial/video/types'
import fixture from '../fixtures/reel.json'

const reel = fixture as unknown as Reel

const RemotionRoot: React.FC = () => (
  <Composition
    id="Reel"
    component={ReelVideo}
    defaultProps={{ reel }}
    durationInFrames={reelFrames(reel)}
    fps={reel.fps}
    width={reel.width}
    height={reel.height}
  />
)

registerRoot(RemotionRoot)
```

Add `"resolveJsonModule": true` to `video/tsconfig.json` compilerOptions so the fixture import type-checks.

- [ ] **Step 6: Verify the studio opens and shows the scene sequence**

Run: `cd video && npm run studio`
Expected: Remotion Studio opens on the `Reel` composition; scrubbing shows each scene's template name in green, one per scene from `reel.json`, with a wipe at each boundary.

- [ ] **Step 7: Render a first MP4**

Run: `cd video && npm run render`
Expected: `video/out/reel.mp4` exists and plays end to end at 1080×1920.

- [ ] **Step 8: Commit**

```bash
git add video/package.json video/package-lock.json video/tsconfig.json \
        video/remotion.config.ts video/src .gitignore
git commit -m "feat(video): Remotion package scaffold, theme, chrome"
```

---

### Task 9: Cold Open and Sign-Off components

**Files:**
- Create: `video/src/scenes/ColdOpen.tsx`, `video/src/scenes/SignOff.tsx`
- Modify: `video/src/ReelVideo.tsx` (replace `Placeholder` with a real switch)

**Interfaces:**
- Consumes: `ColdOpenProps`, `SignOffProps` (Task 1); `Backdrop`, `theme`.
- Produces: `<ColdOpen {...props} />`, `<SignOff {...props} />`, and a `SceneSwitch` in `ReelVideo.tsx` that falls back to `Placeholder` for templates not yet built.

- [ ] **Step 1: Write ColdOpen**

`video/src/scenes/ColdOpen.tsx`:

```tsx
import React from 'react'
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import type { ColdOpenProps } from '../../../src/editorial/video/types'
import { Backdrop } from '../chrome'
import { theme } from '../theme'

const fade = (frame: number, start: number, len = 14) =>
  interpolate(frame, [start, start + len], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })

export const ColdOpen: React.FC<ColdOpenProps> = ({ leagueName, week, subtitle }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const markScale = spring({ frame: frame - 16, fps, config: { damping: 12 } })

  return (
    <Backdrop>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 80px',
      }}>
        <div style={{
          width: 120, height: 120, borderRadius: 12, background: theme.accent,
          transform: `scale(${markScale})`, marginBottom: 56,
        }} />

        <div style={{
          fontSize: 34, fontWeight: 600, letterSpacing: '0.34em', opacity: fade(frame, 30),
        }}>
          THE LEAGUE BEAT
        </div>

        <div style={{
          width: '46%', height: 2, background: 'rgba(255,255,255,0.3)', margin: '34px 0',
          transform: `scaleX(${fade(frame, 40, 22)})`, transformOrigin: 'center',
        }} />

        <div style={{
          fontFamily: theme.display, fontWeight: 900, fontSize: 116, lineHeight: 1,
          opacity: fade(frame, 52),
          transform: `translateY(${interpolate(fade(frame, 52), [0, 1], [18, 0])}px)`,
        }}>
          {leagueName.toUpperCase()}
        </div>

        <div style={{ marginTop: 48, opacity: fade(frame, 68) }}>
          <div style={{
            fontFamily: theme.display, fontWeight: 700, fontSize: 32,
            letterSpacing: '0.3em', color: theme.textMuted,
          }}>
            WEEK
          </div>
          <div style={{
            fontFamily: theme.display, fontWeight: 900, fontSize: 190,
            lineHeight: 0.95, color: theme.accent,
          }}>
            {week}
          </div>
        </div>

        <div style={{
          position: 'absolute', bottom: 150, fontFamily: theme.display, fontWeight: 700,
          fontSize: 32, letterSpacing: '0.28em', opacity: fade(frame, 84),
        }}>
          {subtitle}
        </div>
      </div>
    </Backdrop>
  )
}
```

- [ ] **Step 2: Write SignOff**

`video/src/scenes/SignOff.tsx`:

```tsx
import React from 'react'
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import type { SignOffProps } from '../../../src/editorial/video/types'
import { Backdrop } from '../chrome'
import { theme } from '../theme'

const fade = (frame: number, start: number, len = 14) =>
  interpolate(frame, [start, start + len], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })

const Crest: React.FC<{ colors: string; scale: number }> = ({ colors, scale }) => (
  <div style={{
    width: 190, height: 190, borderRadius: '50%',
    background: `linear-gradient(150deg, ${colors})`,
    transform: `scale(${scale})`,
  }} />
)

export const SignOff: React.FC<SignOffProps> = ({ teamA, teamB, line, brandUrl }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  return (
    <Backdrop>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 80px',
      }}>
        <div style={{
          fontFamily: theme.display, fontWeight: 700, fontSize: 34,
          letterSpacing: '0.32em', opacity: fade(frame, 16), marginBottom: 56,
        }}>
          NEXT WEEK
        </div>

        <div style={{ display: 'flex', gap: 72, marginBottom: 64 }}>
          <Crest colors={teamA.avatarColor} scale={spring({ frame: frame - 26, fps, config: { damping: 12 } })} />
          <Crest colors={teamB.avatarColor} scale={spring({ frame: frame - 32, fps, config: { damping: 12 } })} />
        </div>

        <div style={{ opacity: fade(frame, 42) }}>
          <div style={{ fontFamily: theme.display, fontWeight: 900, fontSize: 86, lineHeight: 1.06 }}>
            {teamA.name.toUpperCase()}
          </div>
          <div style={{
            fontFamily: theme.display, fontWeight: 700, fontSize: 38,
            color: theme.accent, margin: '14px 0',
          }}>
            vs
          </div>
          <div style={{ fontFamily: theme.display, fontWeight: 900, fontSize: 86, lineHeight: 1.06 }}>
            {teamB.name.toUpperCase()}
          </div>
        </div>

        <div style={{ marginTop: 44, fontSize: 36, opacity: fade(frame, 58) }}>{line}</div>

        <div style={{
          width: '40%', height: 2, background: 'rgba(255,255,255,0.25)', margin: '58px 0 34px',
          transform: `scaleX(${fade(frame, 70, 22)})`,
        }} />

        <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: '0.3em', opacity: fade(frame, 82) }}>
          <span style={{
            display: 'inline-block', width: 26, height: 26, borderRadius: 5,
            background: theme.accent, marginRight: 18, verticalAlign: 'middle',
          }} />
          THE LEAGUE BEAT
        </div>

        <div style={{
          position: 'absolute', bottom: 150, fontFamily: theme.display, fontWeight: 700,
          fontSize: 32, letterSpacing: '0.2em', opacity: fade(frame, 94),
        }}>
          {brandUrl}
        </div>
      </div>
    </Backdrop>
  )
}
```

- [ ] **Step 3: Replace the placeholder with a real scene switch**

In `video/src/ReelVideo.tsx`, replace the `Placeholder` usage inside `<Series.Sequence>` with:

```tsx
const SceneSwitch: React.FC<{ scene: ReelScene; week: number }> = ({ scene, week }) => {
  switch (scene.template) {
    case 'cold-open':
      return <ColdOpen {...scene.props} />
    case 'sign-off':
      return <SignOff {...scene.props} />
    default:
      return <Placeholder scene={scene} />
  }
}
```

and render `<SceneSwitch scene={scene} week={reel.week} />`. Add the two imports at the top. Keep `Placeholder` — Tasks 10–12 remove its remaining cases.

- [ ] **Step 4: Verify in the studio**

Run: `cd video && npm run studio`
Expected: the first scene is the full Cold Open (mark springs in, rule draws, league name rises, week number lands). If `reel.json` contains a `sign-off` scene, the last scene is the full Sign-Off.

- [ ] **Step 5: Commit**

```bash
git add video/src/scenes/ColdOpen.tsx video/src/scenes/SignOff.tsx video/src/ReelVideo.tsx
git commit -m "feat(video): cold-open + sign-off components"
```

---

### Task 10: The Board component

**Files:**
- Create: `video/src/scenes/TheBoard.tsx`
- Modify: `video/src/ReelVideo.tsx` (add the case)

**Interfaces:**
- Consumes: `BoardProps`, `BoardRow` (Task 1); `Backdrop`, `Bug`, `theme`.
- Produces: `<TheBoard {...props} week={n} />`.

**Rendering rule:** a `null` delta renders as an em dash at 28% opacity. Never as `0` and never as an arrow.

- [ ] **Step 1: Write TheBoard**

`video/src/scenes/TheBoard.tsx`:

```tsx
import React from 'react'
import { interpolate, useCurrentFrame } from 'remotion'
import type { BoardProps, BoardRow } from '../../../src/editorial/video/types'
import { Backdrop, Bug } from '../chrome'
import { theme } from '../theme'

const fade = (frame: number, start: number, len = 13) =>
  interpolate(frame, [start, start + len], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })

/** A null delta means we have no history to compare against. Render a
 *  dash — never a zero, which would claim the team held its rank. */
const Delta: React.FC<{ delta: number | null }> = ({ delta }) => {
  if (delta == null) return <span style={{ opacity: 0.28 }}>—</span>
  if (delta === 0) return <span style={{ opacity: 0.28 }}>—</span>
  const up = delta > 0
  return (
    <span style={{ color: up ? theme.accent : theme.down }}>
      {up ? '▲' : '▼'}{Math.abs(delta)}
    </span>
  )
}

const Row: React.FC<{ row: BoardRow; index: number }> = ({ row, index }) => {
  const frame = useCurrentFrame()
  const start = 26 + index * 3
  const o = fade(frame, start)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 24,
      padding: '17px 0', borderBottom: '1px solid rgba(255,255,255,0.10)',
      opacity: o,
      transform: `translateY(${interpolate(o, [0, 1], [10, 0])}px)`,
      background: row.highlight
        ? 'linear-gradient(90deg, rgba(34,197,94,0.14), transparent)'
        : 'none',
      boxShadow: row.highlight ? `inset 3px 0 0 ${theme.accent}` : 'none',
      paddingLeft: row.highlight ? 18 : 0,
      marginLeft: row.highlight ? -18 : 0,
    }}>
      <span style={{
        fontFamily: theme.display, fontWeight: 900, fontSize: 40,
        opacity: 0.3, minWidth: 74,
      }}>
        {String(row.rank).padStart(2, '0')}
      </span>
      <span style={{ fontFamily: theme.display, fontWeight: 700, fontSize: 42, flex: 1 }}>
        {row.teamName}
      </span>
      <span style={{ fontFamily: theme.display, fontWeight: 700, fontSize: 34, opacity: 0.5 }}>
        {row.record}
      </span>
      <span style={{
        fontFamily: theme.display, fontWeight: 700, fontSize: 30,
        minWidth: 78, textAlign: 'right',
      }}>
        <Delta delta={row.delta} />
      </span>
    </div>
  )
}

export const TheBoard: React.FC<BoardProps & { week: number }> = ({ rows, note, week }) => {
  const frame = useCurrentFrame()
  const noteStart = 26 + rows.length * 3 + 20

  return (
    <Backdrop>
      <Bug week={week} />

      <div style={{
        position: 'absolute', top: 200, left: 64,
        fontFamily: theme.display, fontWeight: 900, fontSize: 100, lineHeight: 0.92,
        opacity: fade(frame, 14),
        transform: `translateY(${interpolate(fade(frame, 14), [0, 1], [12, 0])}px)`,
      }}>
        THE<br />BOARD
      </div>

      <div style={{ position: 'absolute', top: 470, left: 64, right: 64 }}>
        {rows.map((row, i) => <Row key={row.rank} row={row} index={i} />)}
      </div>

      {note ? (
        <div style={{
          position: 'absolute', bottom: 120, left: 64, right: 64,
          fontFamily: theme.display, fontWeight: 900, fontSize: 42,
          letterSpacing: '0.05em', color: theme.accent,
          opacity: fade(frame, noteStart),
        }}>
          {note}
        </div>
      ) : null}
    </Backdrop>
  )
}
```

- [ ] **Step 2: Wire the case**

In `video/src/ReelVideo.tsx`, import `TheBoard` and add to `SceneSwitch`:

```tsx
    case 'the-board':
      return <TheBoard {...scene.props} week={week} />
```

- [ ] **Step 3: Verify in the studio**

Run: `cd video && npm run studio`
Expected: rows stagger in top to bottom; any team featured in a story scene is highlighted with a green left edge; teams with no history show a dim dash rather than an arrow.

- [ ] **Step 4: Commit**

```bash
git add video/src/scenes/TheBoard.tsx video/src/ReelVideo.tsx
git commit -m "feat(video): the-board component"
```

---

### Task 11: The Throne component

**Files:**
- Create: `video/src/scenes/TheThrone.tsx`
- Modify: `video/src/ReelVideo.tsx` (add the case)

**Interfaces:**
- Consumes: `ThroneProps`, `ThroneCatLine` (Task 1); `Backdrop`, `Bug`, `theme`.
- Produces: `<TheThrone {...props} week={n} />`.

- [ ] **Step 1: Write TheThrone**

`video/src/scenes/TheThrone.tsx`:

```tsx
import React from 'react'
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import type { ThroneCatLine, ThroneProps } from '../../../src/editorial/video/types'
import { Backdrop, Bug } from '../chrome'
import { theme } from '../theme'

const fade = (frame: number, start: number, len = 13) =>
  interpolate(frame, [start, start + len], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })

const Crest: React.FC<{ colors: string; scale: number }> = ({ colors, scale }) => (
  <div style={{
    width: 180, height: 180, borderRadius: '50%',
    background: `linear-gradient(150deg, ${colors})`,
    transform: `scale(${scale})`,
  }} />
)

const CatBar: React.FC<{ line: ThroneCatLine; index: number }> = ({ line, index }) => {
  const frame = useCurrentFrame()
  const grow = fade(frame, 74 + index * 4, 11)
  const won = line.winner === 'a'

  return (
    <div style={{ position: 'relative', height: 30, marginBottom: 30 }}>
      <span style={{
        position: 'absolute', left: 0, top: -26,
        fontFamily: theme.display, fontWeight: 700, fontSize: 22,
        letterSpacing: '0.11em', opacity: 0.45,
      }}>
        {line.label}
      </span>
      <div style={{
        position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.07)', borderRadius: 4,
      }} />
      <div style={{
        position: 'absolute', top: 0, bottom: 0, borderRadius: 4,
        [won ? 'left' : 'right']: 0,
        width: `${line.share * 100 * grow}%`,
        background: won ? theme.accent : theme.neutral,
      }} />
    </div>
  )
}

export const TheThrone: React.FC<ThroneProps & { week: number }> = ({
  teamA, teamB, eyebrow, headline, catLines, kicker, week,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const l3 = interpolate(spring({ frame: frame - 40, fps, config: { damping: 14 } }), [0, 1], [-104, 0])
  const kickerStart = 74 + catLines.length * 4 + 16

  return (
    <Backdrop>
      <Bug week={week} />

      <div style={{
        position: 'absolute', top: 190, left: 0, right: 0,
        display: 'flex', justifyContent: 'center', gap: 96,
      }}>
        <Crest colors={teamA.avatarColor} scale={spring({ frame: frame - 20, fps, config: { damping: 12 } })} />
        <Crest colors={teamB.avatarColor} scale={spring({ frame: frame - 26, fps, config: { damping: 12 } })} />
      </div>

      <div style={{
        position: 'absolute', top: 620, left: 0, right: 150,
        padding: '24px 32px 26px 64px', borderLeft: `12px solid ${theme.accent}`,
        background: 'linear-gradient(90deg, rgba(8,10,16,0.97) 62%, rgba(8,10,16,0.75))',
        transform: `translateX(${l3}%)`,
      }}>
        <div style={{
          fontFamily: theme.display, fontWeight: 700, fontSize: 28,
          letterSpacing: '0.2em', color: theme.accent, marginBottom: 6,
        }}>
          {eyebrow}
        </div>
        <div style={{ fontFamily: theme.display, fontWeight: 900, fontSize: 78, lineHeight: 1 }}>
          {teamA.name.toUpperCase()}
        </div>
        <div style={{
          fontFamily: theme.display, fontWeight: 700, fontSize: 38, opacity: 0.55, marginTop: 6,
        }}>
          def. {teamB.name.toUpperCase()} &nbsp;{headline}
        </div>
      </div>

      <div style={{ position: 'absolute', top: 920, left: 64, right: 64 }}>
        {catLines.map((line, i) => <CatBar key={line.label} line={line} index={i} />)}
      </div>

      <div style={{
        position: 'absolute', bottom: 120, left: 64, right: 64,
        fontFamily: theme.display, fontWeight: 900, fontSize: 68, lineHeight: 1.05,
        opacity: fade(frame, kickerStart),
        transform: `scale(${interpolate(fade(frame, kickerStart), [0, 1], [1.07, 1])})`,
      }}>
        {kicker}
      </div>
    </Backdrop>
  )
}
```

- [ ] **Step 2: Wire the case**

In `video/src/ReelVideo.tsx`, import `TheThrone` and add:

```tsx
    case 'the-throne':
      return <TheThrone {...scene.props} week={week} />
```

- [ ] **Step 3: Verify in the studio**

Run: `cd video && npm run studio`
Expected: crests spring in, the lower-third slides from the left, category bars fill in sequence — green from the left for the winner's cats, grey from the right for the loser's — then the kicker slams in.

If `reel.json` has no `the-throne` scene, temporarily hand-add one to the fixture to check the visual, then revert the fixture before committing.

- [ ] **Step 4: Commit**

```bash
git add video/src/scenes/TheThrone.tsx video/src/ReelVideo.tsx
git commit -m "feat(video): the-throne component"
```

---

### Task 12: The Climb component

**Files:**
- Create: `video/src/scenes/TheClimb.tsx`
- Modify: `video/src/ReelVideo.tsx` (add the case, delete `Placeholder`)

**Interfaces:**
- Consumes: `ClimbProps`, `ClimbPoint` (Task 1); `Backdrop`, `Bug`, `theme`.
- Produces: `<TheClimb {...props} week={n} />`.

**Chart note:** rank 1 is the *top* of the chart, so the y axis is inverted. The line is drawn with a `stroke-dasharray` sweep so it races left to right.

- [ ] **Step 1: Write TheClimb**

`video/src/scenes/TheClimb.tsx`:

```tsx
import React from 'react'
import { interpolate, useCurrentFrame } from 'remotion'
import type { ClimbProps } from '../../../src/editorial/video/types'
import { Backdrop, Bug } from '../chrome'
import { theme } from '../theme'

const fade = (frame: number, start: number, len = 13) =>
  interpolate(frame, [start, start + len], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })

const VB = { w: 900, h: 560 }
const LINE_LENGTH = 3000  // safely longer than any path we draw

export const TheClimb: React.FC<ClimbProps & { week: number }> = ({
  team, points, fromRank, toRank, spanWeeks, footnote, week,
}) => {
  const frame = useCurrentFrame()

  const ranks = points.map((p) => p.rank)
  const best = Math.min(...ranks)
  const worst = Math.max(...ranks)
  const span = Math.max(1, worst - best)

  // Rank 1 sits at the top, so y is inverted.
  const xy = points.map((p, i) => ({
    x: (i / Math.max(1, points.length - 1)) * VB.w,
    y: ((p.rank - best) / span) * VB.h,
  }))
  const path = xy.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const last = xy[xy.length - 1]

  const draw = fade(frame, 34, 76)
  const statStart = 118

  return (
    <Backdrop>
      <Bug week={week} />

      <div style={{
        position: 'absolute', top: 200, left: 64,
        fontFamily: theme.display, fontWeight: 700, fontSize: 30,
        letterSpacing: '0.24em', color: theme.accent, opacity: fade(frame, 14),
      }}>
        SEASON ARC
      </div>

      <div style={{
        position: 'absolute', top: 244, left: 64, right: 64,
        fontFamily: theme.display, fontWeight: 900, fontSize: 100, lineHeight: 1,
        opacity: fade(frame, 20),
        transform: `translateY(${interpolate(fade(frame, 20), [0, 1], [12, 0])}px)`,
      }}>
        {team.name.toUpperCase()}
      </div>

      <svg
        viewBox={`-10 -10 ${VB.w + 20} ${VB.h + 20}`}
        style={{ position: 'absolute', top: 430, left: 64, width: 952, height: 600 }}
      >
        {[0, 0.33, 0.66, 1].map((f, i) => (
          <line
            key={i}
            x1={0} x2={VB.w} y1={f * VB.h} y2={f * VB.h}
            stroke="rgba(255,255,255,0.11)" strokeWidth={2}
            style={{ opacity: fade(frame, 26) }}
          />
        ))}
        <polyline
          points={path}
          fill="none" stroke={theme.accent} strokeWidth={9}
          strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray={LINE_LENGTH}
          strokeDashoffset={LINE_LENGTH * (1 - draw)}
        />
        <circle
          cx={last.x} cy={last.y} r={14} fill={theme.accent}
          style={{ opacity: fade(frame, 110) }}
        />
      </svg>

      <div style={{
        position: 'absolute', top: 1060, left: 64, right: 64,
        display: 'flex', justifyContent: 'space-between',
        fontFamily: theme.display, fontWeight: 700, fontSize: 26,
        letterSpacing: '0.14em', opacity: fade(frame, 30),
      }}>
        <span style={{ opacity: 0.4 }}>W{points[0].week}</span>
        <span style={{ opacity: 0.4 }}>W{points[points.length - 1].week}</span>
      </div>

      <div style={{
        position: 'absolute', bottom: 300, left: 64, right: 64,
        opacity: fade(frame, statStart),
        transform: `scale(${interpolate(fade(frame, statStart), [0, 1], [1.06, 1])})`,
      }}>
        <div style={{
          fontFamily: theme.display, fontWeight: 900, fontSize: 128,
          lineHeight: 0.95, color: theme.accent,
        }}>
          {fromRank} → {toRank}
        </div>
        <div style={{
          fontFamily: theme.display, fontWeight: 700, fontSize: 32,
          letterSpacing: '0.2em', opacity: 0.65, marginTop: 10,
        }}>
          {footnote}
        </div>
      </div>

      <div style={{
        position: 'absolute', bottom: 150, left: 64, right: 64,
        fontSize: 32, opacity: fade(frame, statStart + 24),
      }}>
        Across {spanWeeks} weeks
      </div>
    </Backdrop>
  )
}
```

- [ ] **Step 2: Wire the case and delete the placeholder**

In `video/src/ReelVideo.tsx`, import `TheClimb`, add:

```tsx
    case 'the-climb':
      return <TheClimb {...scene.props} week={week} />
```

Then delete the `Placeholder` component and the `default:` branch. With all five templates handled, TypeScript's exhaustiveness check on the discriminated union now guards the switch — a new template added to `SceneTemplate` without a component becomes a compile error rather than a silent blank scene.

- [ ] **Step 3: Type-check the video package**

Run: `cd video && npx tsc --noEmit`
Expected: no errors. If the switch reports a missing return, a template case is absent — add it rather than restoring `default`.

- [ ] **Step 4: Verify in the studio**

Run: `cd video && npm run studio`
Expected: the rank line races left to right with rank 1 at the top, the endpoint dot lands, then the from → to stat slams in.

- [ ] **Step 5: Commit**

```bash
git add video/src/scenes/TheClimb.tsx video/src/ReelVideo.tsx
git commit -m "feat(video): the-climb component + exhaustive scene switch"
```

---

### Task 13: Full render and the Phase 0 gate

**Files:**
- Create: `docs/superpowers/notes/2026-08-09-reel-phase-0-review.md`
- Modify: `video/package.json` (add a `render:quiet` script)

**Interfaces:**
- Consumes: everything above.
- Produces: `video/out/reel.mp4`, plus a written go/no-go judgement.

This task exists because Phase 0's deliverable is **a decision**, not code. Everything before this proves the machine runs; this proves the output is worth shipping.

- [ ] **Step 1: Add a quiet-week fixture export**

In `scripts/export-reel-fixture.ts`, accept an optional `--quiet` flag that passes an empty `stories` array to `buildReel` and writes to `video/fixtures/reel-quiet.json`:

```ts
const quiet = process.argv.includes('--quiet')
const stories = quiet
  ? []
  : selectStoriesForIssue(detectStories(data, context), context)

const outFile = quiet ? 'video/fixtures/reel-quiet.json' : 'video/fixtures/reel.json'
```

Use `outFile` in place of the hard-coded path.

- [ ] **Step 2: Generate both fixtures**

Run:

```bash
npx vite-node scripts/export-reel-fixture.ts
npx vite-node scripts/export-reel-fixture.ts --quiet
```

Expected: two JSON files. The quiet reel has only fixed scenes.

- [ ] **Step 3: Register a second composition for the quiet week**

In `video/src/Root.tsx`, import `reel-quiet.json` and register a second `<Composition id="ReelQuiet" …>` using the same `ReelVideo` component and `reelFrames()` for its duration.

- [ ] **Step 4: Add the render script**

In `video/package.json` scripts, add:

```json
"render:quiet": "remotion render src/Root.tsx ReelQuiet out/reel-quiet.mp4"
```

- [ ] **Step 5: Render both**

Run:

```bash
cd video && npm run render && npm run render:quiet
```

Expected: `video/out/reel.mp4` and `video/out/reel-quiet.mp4`, both 1080×1920, both playing end to end without a blank or frozen scene.

- [ ] **Step 6: Watch both and write the review note**

Create `docs/superpowers/notes/2026-08-09-reel-phase-0-review.md` answering, in prose:

1. Does the loud-week reel look like something a commissioner would post in a group chat unprompted?
2. **Does the quiet-week reel?** This is the real gate — any engine looks good on a dramatic week.
3. Does it read at phone size, muted, mid-scroll?
4. What is visibly missing that only audio will fix?
5. Go / no-go on provisioning ElevenLabs and a render host.

Be specific and be willing to say no. The point of Phase 0 is that saying no here costs an afternoon.

- [ ] **Step 7: Final verification**

Run: `npx vitest run && npm run type-check && cd video && npx tsc --noEmit`
Expected: all green.

- [ ] **Step 8: Commit**

```bash
git add scripts/export-reel-fixture.ts video/fixtures video/src/Root.tsx \
        video/package.json docs/superpowers/notes/2026-08-09-reel-phase-0-review.md
git commit -m "feat(video): quiet-week fixture + Phase 0 render gate"
```

---

## Out of scope for this plan

Deliberately deferred to the Phase 1 plan, per the spec:

- TTS adapter, `vo_cache`, and the duration feedback loop
- Supabase migration, storage buckets, `league_videos`
- Hosted rendering, the verification gate
- `ReelPlayer.vue`, download, public share page with OG video tags
- Cron automation and the digest backbone
- `the-night` (player beats) and points-format support

## Self-Review

**Spec coverage:** the Reel contract (Task 1), timing model (Task 1), scene routing with template dedup (Task 2), all five v1 scene builders (Tasks 3–6), the fixed-spine structure and null-skipping (Task 7), the Remotion package and all five components (Tasks 8–12), and the quiet-week test the spec names explicitly (Task 13). Spec sections on TTS, data model, failure handling, and delivery are Phase 1 and listed above as out of scope.

**Verified against the codebase (not assumed):** the detection orchestrator is `detectAll` (`src/editorial/detection/index.ts:47`), not `detectStories`. The demo fixture exports its pieces individually and is assembled by `categoriesFixtureToLeagueData()` (`src/editorial/fixtureAdapter.ts:52`) — there is no single `categoriesLeague` export. `vite-node` is already installed. `matchupsCurrentWeek` and `matchupsByWeek` both exist on `CategoryLeagueData` (`src/editorial/types.ts:375-376`) and mean different things; `currentWeekMatchups` belongs to the points format only.

**Type consistency:** `toReelTeam` is defined in Task 3 and imported by Tasks 3, 5, 6. `sceneDurationMs` is intentionally duplicated in `video/src/ReelVideo.tsx` rather than imported — the Remotion package must not take a runtime dependency on the app's module graph, and the constants are pinned identically in Global Constraints. `SceneBody`'s discriminated union drives the exhaustive switch completed in Task 12.
