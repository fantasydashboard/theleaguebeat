# Your Column Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the **read** experience of Your Column — a new first tab that selects the magazine's coverage down to one team (hero / matchup / rival / arc), reachable by any of the twelve members (logged-in auto, guests pick), in third-person voice with personal labels.

**Architecture:** A pure `buildYourColumn(data, teamId)` selection layer over the existing editorial detectors + a new shared `h2hRecords` data field (for the rival), surfaced by a thin `YourColumnView.vue` + `useViewerTeam` composable. No new editorial generation; it's selection + framing over machinery that already exists.

**Tech Stack:** Vue 3 + TS + Pinia, the existing editorial pipeline (cover-story / arc detectors), vitest for the pure modules.

**Spec:** `docs/superpowers/specs/2026-06-11-your-column-design.md`

**Out of this plan (follow-ups):** per-block share cards (needs a `SelectedStory` mapping pass — the share system is category-coupled); changing the default landing page; per-member invite links. The page is reachable/shareable via the existing league public link.

---

## File Structure

| File | Responsibility | New/Modified |
| --- | --- | --- |
| `src/editorial/types.ts` | Add `H2HRecord` + optional `h2hRecords` on both league formats | Modify |
| `src/editorial/h2h/buildH2H.ts` | Pure: `(games) → H2HRecord[]` (per ordered team pair) | Create |
| `src/editorial/h2h/__tests__/buildH2H.test.ts` | Tests | Create |
| `src/editorial/adapters/yahooAdapter.ts` | Attach `h2hRecords` (points branch + category path) | Modify |
| `src/editorial/adapters/espnAdapter.ts` | Attach `h2hRecords` (points branch + category path) | Modify |
| `src/editorial/yourColumn/buildYourColumn.ts` | Pure: `(LeagueData, teamId) → YourColumn` (hero/matchup/rival/arc) | Create |
| `src/editorial/yourColumn/__tests__/buildYourColumn.test.ts` | Tests | Create |
| `src/composables/useViewerTeam.ts` | Identity: logged-in team, else guest picker (URL+localStorage) | Create |
| `src/views/YourColumnView.vue` | The page: hydrate data, resolve team, render blocks | Create |
| `src/router/index.ts` | `your-column` route | Modify |
| `src/views/MyLeagueLayout.vue` | First nav tab + active-section wiring | Modify |

---

## Task 1: H2H types

**Files:**
- Modify: `src/editorial/types.ts`

- [ ] **Step 1: Add the record type and the optional field on both formats**

Add near the other shared editorial types in `src/editorial/types.ts`:

```typescript
/** All-time head-to-head record of one team vs one opponent. One row per
 *  ordered (teamId, opponentId) pair. Drives Your Column's "Your Rival". */
export interface H2HRecord {
  teamId: string
  opponentId: string
  wins: number
  losses: number
  ties: number
  meetings: number
}
```

Then add `h2hRecords?: H2HRecord[]` to **both** `LeagueDataH2HCategory` and `LeagueDataH2HPoints` interfaces (alongside their other optional fields, e.g. next to `seasonRankHistory`):

```typescript
  /** Per-opponent all-time head-to-head, built by the shared buildH2H.
   *  Optional: adapters that can't compute it degrade (rival falls back
   *  to this week's opponent). */
  h2hRecords?: H2HRecord[]
```

- [ ] **Step 2: Typecheck**

Run: `npx vue-tsc --noEmit -p tsconfig.json 2>&1 | grep -E "types.ts" || echo CLEAN`
Expected: `CLEAN`

- [ ] **Step 3: Commit**

```bash
git add src/editorial/types.ts
git commit -m "feat(your-column): H2HRecord type + h2hRecords on both formats"
```

---

## Task 2: `buildH2H` (pure builder + tests)

A format-agnostic builder: callers map their weekly finals to a normalized `{a, b, winner}` game list; this tallies per-ordered-pair records.

**Files:**
- Create: `src/editorial/h2h/buildH2H.ts`
- Test: `src/editorial/h2h/__tests__/buildH2H.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { buildH2H, type H2HGame } from '@/editorial/h2h/buildH2H'

describe('buildH2H', () => {
  it('tallies per-ordered-pair records across games', () => {
    const games: H2HGame[] = [
      { a: 't1', b: 't2', winner: 'a' },
      { a: 't2', b: 't1', winner: 'a' }, // t2 home, t2 wins
      { a: 't1', b: 't2', winner: 'tie' },
    ]
    const recs = buildH2H(games)
    const t1v2 = recs.find((r) => r.teamId === 't1' && r.opponentId === 't2')!
    expect(t1v2).toMatchObject({ wins: 1, losses: 1, ties: 1, meetings: 3 })
    const t2v1 = recs.find((r) => r.teamId === 't2' && r.opponentId === 't1')!
    expect(t2v1).toMatchObject({ wins: 1, losses: 1, ties: 1, meetings: 3 })
  })

  it('ignores games missing a side', () => {
    const recs = buildH2H([{ a: 't1', b: '', winner: 'a' }])
    expect(recs).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- buildH2H`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/editorial/h2h/buildH2H.ts`:

```typescript
import type { H2HRecord } from '@/editorial/types'

/** One decided game between two teams, already reduced to a winner. */
export interface H2HGame {
  a: string
  b: string
  winner: 'a' | 'b' | 'tie'
}

/** Per-ordered-pair all-time records. Each game updates BOTH directions
 *  (a-vs-b and b-vs-a) so a lookup by either team finds the row. */
export function buildH2H(games: H2HGame[]): H2HRecord[] {
  const map = new Map<string, H2HRecord>()
  const get = (teamId: string, opponentId: string): H2HRecord => {
    const key = `${teamId}|${opponentId}`
    let rec = map.get(key)
    if (!rec) {
      rec = { teamId, opponentId, wins: 0, losses: 0, ties: 0, meetings: 0 }
      map.set(key, rec)
    }
    return rec
  }
  for (const g of games) {
    if (!g.a || !g.b) continue
    const ab = get(g.a, g.b)
    const ba = get(g.b, g.a)
    ab.meetings++; ba.meetings++
    if (g.winner === 'tie') { ab.ties++; ba.ties++ }
    else if (g.winner === 'a') { ab.wins++; ba.losses++ }
    else { ab.losses++; ba.wins++ }
  }
  return [...map.values()]
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- buildH2H`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/editorial/h2h/buildH2H.ts src/editorial/h2h/__tests__/buildH2H.test.ts
git commit -m "feat(your-column): shared buildH2H records builder + tests"
```

---

## Task 3: Attach `h2hRecords` in the adapters

Feed each format's completed weeks into `buildH2H` and attach the result.

**Files:**
- Modify: `src/editorial/adapters/yahooAdapter.ts` (points branch ~line 277, category path ~line 522)
- Modify: `src/editorial/adapters/espnAdapter.ts` (points branch ~line 363, category path)

- [ ] **Step 1: Points branch (Yahoo) — derive games from the all-weeks map**

In `yahooAdapter.ts`, in the `if (isPoints)` branch, after `buildPointsStandings(...)` and before building `out`, add:

```typescript
    const pointsGames = []
    for (const weekMatchups of allPointsWeeks.values()) {
      for (const m of weekMatchups) {
        if (m.status !== 'final') continue
        if (m.homePoints === 0 && m.awayPoints === 0) continue
        pointsGames.push({
          a: m.homeTeamId,
          b: m.awayTeamId,
          winner: m.homePoints > m.awayPoints ? 'a' : m.awayPoints > m.homePoints ? 'b' : 'tie',
        })
      }
    }
    const h2hRecords = buildH2H(pointsGames)
```

Add `h2hRecords` to the `out` object. Add the import at the top: `import { buildH2H } from '../h2h/buildH2H'`.

- [ ] **Step 2: Category path (Yahoo) — derive games from matchupsByWeek**

In the category path (after `buildH2HMatrix` ~line 522 — leave that intact), add:

```typescript
    const catGames = []
    for (const weekMatchups of matchupsByWeek.values()) {
      for (const m of weekMatchups) {
        if (m.status !== 'final') continue
        catGames.push({
          a: m.homeTeamId,
          b: m.awayTeamId,
          winner: m.homeCatWins > m.awayCatWins ? 'a' : m.awayCatWins > m.homeCatWins ? 'b' : 'tie',
        })
      }
    }
    const h2hRecords = buildH2H(catGames)
```

Add `h2hRecords` to the category `out` object.

> NOTE: `matchupsByWeek` and the matchup field names (`homeCatWins`/`awayCatWins`, `status`) are what the category path already uses for standings — confirm the exact names in this adapter before writing the loop (they vary slightly by adapter). If a category matchup type field differs, adjust the winner expression to match.

- [ ] **Step 3: ESPN — same two insertions**

Mirror Steps 1–2 in `espnAdapter.ts`: points branch uses its `allPointsWeeks` map (same `LeagueDataPointsMatchup` shape, so the points loop is identical); category path uses ESPN's `matchupsByWeek` with its cat-win field names. Add `import { buildH2H } from '../h2h/buildH2H'` and attach `h2hRecords` to both `out` objects.

- [ ] **Step 4: Typecheck + build**

Run: `npx vue-tsc --noEmit -p tsconfig.json 2>&1 | grep -E "yahooAdapter|espnAdapter" || echo CLEAN` then `npm run build 2>&1 | tail -2`
Expected: `CLEAN` and `✓ built`.

- [ ] **Step 5: Commit**

```bash
git add src/editorial/adapters/yahooAdapter.ts src/editorial/adapters/espnAdapter.ts
git commit -m "feat(your-column): attach h2hRecords from completed weeks (both adapters, both formats)"
```

---

## Task 4: `buildYourColumn` (the keystone, pure + tests)

**Files:**
- Create: `src/editorial/yourColumn/buildYourColumn.ts`
- Test: `src/editorial/yourColumn/__tests__/buildYourColumn.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { buildYourColumn } from '@/editorial/yourColumn/buildYourColumn'
import type { LeagueDataH2HPoints, CategoryLeagueDataWeeklyRanks } from '@/editorial/types'

const team = (id: string) => ({ id, name: id, ownerName: '', ownerInitials: id.slice(0, 2), avatarUrl: undefined, avatarColor: 'x', isMyTeam: false })
function histFor(climber: string, ranks: number[], ids: string[]): CategoryLeagueDataWeeklyRanks[] {
  return ranks.map((cr, wi) => { const r: Record<string, number> = { [climber]: cr }; let n = 1; for (const id of ids) { if (id === climber) continue; while (n === cr) n++; r[id] = n; n++ } return { week: wi + 1, ranks: r } })
}
const T4 = ['t1', 't2', 't3', 't4']
const data = {
  format: 'h2h-points', leagueId: 'L', leagueName: 'BB', currentWeek: 12, currentSeason: 2026,
  teams: T4.map(team),
  standings: T4.map((id, i) => ({ rank: i + 1, teamId: id, catWins: 8 - i, catLosses: 3, catTies: 0, winPct: 0.7, streak: { type: 'W' as const, length: 2 }, lastSix: [], ownsCount: 0, bleedingCount: 0 })),
  seasonRankHistory: histFor('t1', [4, 3, 2, 1, 1, 1], T4),
  currentWeekMatchups: [{ id: 'm', homeTeamId: 't1', awayTeamId: 't2', status: 'live', homePoints: 96.7, awayPoints: 70.5 }],
  h2hRecords: [
    { teamId: 't1', opponentId: 't2', wins: 7, losses: 5, ties: 0, meetings: 12 },
    { teamId: 't1', opponentId: 't3', wins: 2, losses: 1, ties: 0, meetings: 3 },
  ],
} as unknown as LeagueDataH2HPoints

describe('buildYourColumn', () => {
  const col = buildYourColumn(data, 't1')

  it('builds a third-person hero (no "you")', () => {
    expect(col.hero.headline).toMatch(/t1/)
    expect(col.hero.headline.toLowerCase()).not.toMatch(/\byou\b/)
  })
  it('finds the team matchup', () => {
    expect(col.matchup?.headline).toMatch(/t1/)
    expect(col.matchup?.headline).toMatch(/96\.7/)
  })
  it('picks the most-played opponent as the rival', () => {
    expect(col.rival?.headline).toMatch(/t2/)        // 12 meetings beats t3's 3
    expect(col.rival?.headline).toMatch(/7-5/)
  })
  it('classifies the arc chronologically', () => {
    expect(col.arc?.headline).toMatch(/t1/)
    expect(JSON.stringify(col.arc)).toMatch(/#4 → #1/)
  })
  it('uses personal labels but no em dashes', () => {
    expect(col.rival?.label).toBe('Your Rival')
    expect(JSON.stringify(col)).not.toMatch(/—/)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- buildYourColumn`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/editorial/yourColumn/buildYourColumn.ts`:

```typescript
/**
 * buildYourColumn — selects the magazine's coverage down to one team.
 * Pure (no I/O). Voice: personal LABELS, third-person SENTENCES (the team
 * is named, never "you"), so blocks forward cleanly to the whole chat.
 */
import type { LeagueData, H2HRecord } from '@/editorial/types'
import { detectCoverStory, detectPointsCoverStory } from '@/editorial/cover-story'

export interface YourColumnBlock {
  label: string
  eyebrow?: string
  headline: string
  body?: string
  chips?: { value: string; label: string }[]
  teamIds: string[]
}
export interface YourColumn {
  hero: YourColumnBlock
  matchup?: YourColumnBlock
  rival?: YourColumnBlock
  arc?: YourColumnBlock
}

const nameOf = (data: LeagueData, id: string) => data.teams.find((t) => t.id === id)?.name ?? id
const ordinal = (n: number) => { const v = n % 100; if (v >= 11 && v <= 13) return `${n}th`; switch (n % 10) { case 1: return `${n}st`; case 2: return `${n}nd`; case 3: return `${n}rd`; default: return `${n}th` } }
const possessive = (s: string) => (/s$/i.test(s) ? `${s}'` : `${s}'s`)

export function buildYourColumn(data: LeagueData, teamId: string): YourColumn {
  return {
    hero: buildHero(data, teamId),
    matchup: buildMatchup(data, teamId),
    rival: buildRival(data, teamId),
    arc: buildArc(data, teamId),
  }
}

function buildHero(data: LeagueData, teamId: string): YourColumnBlock {
  const cover = data.format === 'h2h-points' ? detectPointsCoverStory(data) : detectCoverStory(data)
  const name = nameOf(data, teamId)
  if (cover && cover.teamId === teamId) {
    return { label: 'Your headline', eyebrow: cover.eyebrow, headline: cover.headline, body: cover.body, chips: cover.chips.map(([value, label]) => ({ value, label })), teamIds: [teamId] }
  }
  // Quiet-week fallback: your standing.
  const s = (data.standings ?? []).find((x) => x.teamId === teamId)
  const record = s ? (s.catTies > 0 ? `${s.catWins}-${s.catLosses}-${s.catTies}` : `${s.catWins}-${s.catLosses}`) : ''
  const streak = s && s.streak.type !== 'T' ? `${s.streak.type}${s.streak.length}` : ''
  const headline = s ? `${name} sits ${ordinal(s.rank)}, ${record}.` : `${name} this week.`
  const body = streak ? (s!.streak.type === 'W' ? `Riding a ${streak} run.` : `Stuck on a ${streak} slide.`) : undefined
  return { label: 'Your season', eyebrow: 'YOUR COLUMN', headline, body, chips: s ? [{ value: `#${s.rank}`, label: 'RANK' }, { value: record, label: 'RECORD' }] : [], teamIds: [teamId] }
}

function buildMatchup(data: LeagueData, teamId: string): YourColumnBlock | undefined {
  const name = nameOf(data, teamId)
  if (data.format === 'h2h-points') {
    const m = (data.currentWeekMatchups ?? []).find((x) => x.homeTeamId === teamId || x.awayTeamId === teamId)
    if (!m) return undefined
    const mine = m.homeTeamId === teamId ? m.homePoints : m.awayPoints
    const oppId = m.homeTeamId === teamId ? m.awayTeamId : m.homeTeamId
    const opp = m.homeTeamId === teamId ? m.awayPoints : m.homePoints
    const oppName = nameOf(data, oppId)
    const verb = mine > opp ? 'leads' : mine < opp ? 'trails' : 'is level with'
    return { label: 'Your matchup', eyebrow: 'LIVE', headline: `${name} ${verb} ${oppName}, ${mine.toFixed(1)}-${opp.toFixed(1)}.`, teamIds: [teamId, oppId] }
  }
  const m = (data.matchupsCurrentWeek ?? []).find((x) => x.homeTeamId === teamId || x.awayTeamId === teamId)
  if (!m) return undefined
  const mine = m.homeTeamId === teamId ? m.homeCatWins : m.awayCatWins
  const oppId = m.homeTeamId === teamId ? m.awayTeamId : m.homeTeamId
  const opp = m.homeTeamId === teamId ? m.awayCatWins : m.homeCatWins
  const oppName = nameOf(data, oppId)
  const verb = mine > opp ? 'leads' : mine < opp ? 'trails' : 'is tied with'
  return { label: 'Your matchup', eyebrow: 'LIVE', headline: `${name} ${verb} ${oppName}, ${mine}-${opp}.`, teamIds: [teamId, oppId] }
}

function buildRival(data: LeagueData, teamId: string): YourColumnBlock | undefined {
  const name = nameOf(data, teamId)
  const records = (data.h2hRecords ?? []).filter((r: H2HRecord) => r.teamId === teamId && r.meetings > 0)
  if (records.length > 0) {
    // Most-played, tie-broken by closest record (smallest |wins-losses|).
    records.sort((a, b) => b.meetings - a.meetings || Math.abs(a.wins - a.losses) - Math.abs(b.wins - b.losses))
    const r = records[0]
    const oppName = nameOf(data, r.opponentId)
    const verb = r.wins > r.losses ? `leads ${oppName}` : r.wins < r.losses ? `trails ${oppName}` : `is even with ${oppName}`
    return { label: 'Your Rival', eyebrow: 'THE GRUDGE', headline: `${name} ${verb} ${r.wins}-${r.losses} all-time.`, body: `${r.meetings} meetings and counting.`, teamIds: [teamId, r.opponentId] }
  }
  // Fallback: this week's opponent.
  const mu = buildMatchup(data, teamId)
  if (!mu) return undefined
  const oppId = mu.teamIds[1]
  return { label: 'Your Rival', eyebrow: 'THIS WEEK', headline: `${name} faces ${nameOf(data, oppId)} this week.`, body: `A rivalry starts somewhere.`, teamIds: [teamId, oppId] }
}

function buildArc(data: LeagueData, teamId: string): YourColumnBlock | undefined {
  const hist = data.seasonRankHistory ?? []
  const series: number[] = []
  for (const w of hist) { const rk = w.ranks[teamId]; if (rk != null) series.push(rk) }
  if (series.length < 2) return undefined
  const name = nameOf(data, teamId)
  const start = series[0]
  const end = series[series.length - 1]
  const min = Math.min(...series)
  const max = Math.max(...series)
  let eyebrow = 'YOUR ARC'
  let headline: string
  if (start - end > 0 && end <= min + 1) headline = end <= 1 ? `${name} climbed to the top.` : `${name} climbed the board, #${start} to #${end}.`
  else if (start - end < 0 && end >= max - 1) headline = `${name} slid from #${start} to #${end}.`
  else headline = `${possessive(name)} season ranged from #${min} to #${max}.`
  return { label: 'Your arc', eyebrow, headline, chips: [{ value: `#${start} → #${end}`, label: 'SEASON' }], teamIds: [teamId] }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- buildYourColumn`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/editorial/yourColumn/buildYourColumn.ts src/editorial/yourColumn/__tests__/buildYourColumn.test.ts
git commit -m "feat(your-column): buildYourColumn selection layer + tests"
```

---

## Task 5: `useViewerTeam` composable

**Files:**
- Create: `src/composables/useViewerTeam.ts`

- [ ] **Step 1: Implement**

Create `src/composables/useViewerTeam.ts`:

```typescript
/**
 * useViewerTeam — resolves whose team Your Column features.
 *   1. A team flagged isMyTeam (logged-in + identity-connected) wins.
 *   2. Else a previously-picked team (URL ?team= or localStorage per league).
 *   3. Else null → the view shows the team picker.
 * `pickTeam` persists the choice (URL + localStorage) so it sticks.
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { CategoryLeagueDataTeam } from '@/editorial/types'

export function useViewerTeam(teams: () => CategoryLeagueDataTeam[], leagueKey: () => string) {
  const route = useRoute()
  const router = useRouter()
  const storageKey = () => `tlb:viewerTeam:${leagueKey()}`
  const picked = ref<string | null>(null)

  // Seed from URL or localStorage once teams are known.
  watch([teams, leagueKey], () => {
    if (picked.value) return
    const fromUrl = typeof route.query.team === 'string' ? route.query.team : null
    const fromStore = (() => { try { return localStorage.getItem(storageKey()) } catch { return null } })()
    const candidate = fromUrl ?? fromStore
    if (candidate && teams().some((t) => t.id === candidate)) picked.value = candidate
  }, { immediate: true })

  const viewerTeamId = computed<string | null>(() => {
    const mine = teams().find((t) => t.isMyTeam)
    if (mine) return mine.id
    return picked.value && teams().some((t) => t.id === picked.value) ? picked.value : null
  })

  const isGuestPick = computed(() => !teams().some((t) => t.isMyTeam) && !!viewerTeamId.value)

  function pickTeam(teamId: string) {
    picked.value = teamId
    try { localStorage.setItem(storageKey(), teamId) } catch { /* ignore */ }
    void router.replace({ query: { ...route.query, team: teamId } })
  }

  return { viewerTeamId, isGuestPick, pickTeam }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx vue-tsc --noEmit -p tsconfig.json 2>&1 | grep -E "useViewerTeam" || echo CLEAN`
Expected: `CLEAN`

- [ ] **Step 3: Commit**

```bash
git add src/composables/useViewerTeam.ts
git commit -m "feat(your-column): useViewerTeam identity + guest picker"
```

---

## Task 6: `YourColumnView.vue`

Mirror the live-data hydration + loading pattern from `BeatFeedView.vue` (the simplest of the three views). The view: hydrate `LeagueData` (live adapter, both formats), resolve the viewer team, render the picker OR the column blocks.

**Files:**
- Create: `src/views/YourColumnView.vue`

- [ ] **Step 1: Implement the view**

Create `src/views/YourColumnView.vue`. Follow `BeatFeedView.vue`'s structure for: imports (`shallowRef`, route, the three adapters, `LiveLoadError`, the loading guard, `loadX()` + the `route.params.leagueId` watcher) and the masthead/loading markup. Replace its body with the Your Column body:

```vue
<template>
  <div class="your-column">
    <LiveLoadError v-if="liveError" :message="liveError" :platform-label="platformLabel" />
    <div v-else-if="isStrictLiveMode && !liveData && !liveError" class="yc-loading" role="status">
      <p>Pulling your column...</p>
    </div>
    <template v-else>
      <header class="yc-head">
        <p class="yc-eyebrow"><span class="yc-eyebrow-bar" aria-hidden="true"></span>Your Column</p>
        <h1 class="yc-headline">{{ viewerTeamName || leagueName }}</h1>
      </header>

      <!-- Guest team picker -->
      <section v-if="!viewerTeamId" class="yc-picker" aria-label="Pick your team">
        <p class="yc-picker-title">Which team is yours?</p>
        <div class="yc-picker-grid">
          <button v-for="t in teams" :key="t.id" type="button" class="yc-picker-team" @click="pickTeam(t.id)">
            <span class="yc-picker-avatar" :style="{ background: `linear-gradient(135deg, ${t.avatarColor})` }">
              <img v-if="t.avatarUrl" :src="t.avatarUrl" alt="" /><span v-else>{{ t.ownerInitials }}</span>
            </span>
            <span class="yc-picker-name">{{ t.name }}</span>
          </button>
        </div>
      </section>

      <!-- The column -->
      <template v-else-if="column">
        <p v-if="isGuestPick" class="yc-claim">Reading <strong>{{ viewerTeamName }}</strong>. <a href="#" @click.prevent="$emit('open-signup')">Make this yours →</a></p>
        <section v-for="block in renderedBlocks" :key="block.label" class="yc-block">
          <p class="yc-block-label">{{ block.label }}</p>
          <p v-if="block.eyebrow" class="yc-block-eyebrow">{{ block.eyebrow }}</p>
          <h2 class="yc-block-headline">{{ block.headline }}</h2>
          <p v-if="block.body" class="yc-block-body">{{ block.body }}</p>
          <ul v-if="block.chips && block.chips.length" class="yc-block-chips">
            <li v-for="(c, i) in block.chips" :key="i"><span class="yc-chip-num">{{ c.value }}</span><span class="yc-chip-label">{{ c.label }}</span></li>
          </ul>
        </section>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useViewerTeam } from '@/composables/useViewerTeam'
import { buildYourColumn } from '@/editorial/yourColumn/buildYourColumn'
import type { LeagueData } from '@/editorial/types'
// ... plus the SAME live-data hydration block copied from BeatFeedView.vue:
//   liveData (shallowRef<LeagueData|null>), liveError, isStrictLiveMode,
//   platformLabel, leagueName, loadColumn(), onMounted + route watcher,
//   calling espnLeagueToCategoryData / yahooLeagueToCategoryData /
//   sleeperLeagueToCategoryData and assigning the result to liveData
//   (NO format gate — both category and points data render here).

defineEmits<{ (e: 'open-signup'): void }>()

const teams = computed(() => liveData.value?.teams ?? [])
const leagueKey = computed(() => (typeof route.params.leagueId === 'string' ? route.params.leagueId : ''))
const { viewerTeamId, isGuestPick, pickTeam } = useViewerTeam(() => teams.value, () => leagueKey.value)
const viewerTeamName = computed(() => teams.value.find((t) => t.id === viewerTeamId.value)?.name ?? '')

const column = computed(() => {
  if (!liveData.value || !viewerTeamId.value) return null
  return buildYourColumn(liveData.value as LeagueData, viewerTeamId.value)
})
const renderedBlocks = computed(() => column.value ? [column.value.hero, column.value.matchup, column.value.rival, column.value.arc].filter(Boolean) : [])
</script>
```

> Styling: follow the existing view CSS conventions (OKLCH, Barlow Condensed headings, the `cover-*`/`section-*` class idioms). Reuse the eyebrow-bar + chip styles from `IssueView.vue` for visual parity. Keep it a scoped `<style>` block.

- [ ] **Step 2: Typecheck + build**

Run: `npx vue-tsc --noEmit -p tsconfig.json 2>&1 | grep -E "YourColumnView" || echo CLEAN` then `npm run build 2>&1 | tail -2`
Expected: `CLEAN` and `✓ built`.

- [ ] **Step 3: Commit**

```bash
git add src/views/YourColumnView.vue
git commit -m "feat(your-column): the page (picker + blocks)"
```

---

## Task 7: Route + nav tab

**Files:**
- Modify: `src/router/index.ts` (the `/leagues/:leagueId` children, ~line 100)
- Modify: `src/views/MyLeagueLayout.vue` (nav tabs ~line 97; `activeSection` computed)

- [ ] **Step 1: Add the route**

In `src/router/index.ts`, inside the `/leagues/:leagueId` `children` array, add (before `the-beat`):

```typescript
        {
          path: 'your-column',
          name: 'my-league-your-column',
          component: () => import('@/views/YourColumnView.vue'),
        },
```

(Leave the default `''` redirect pointing at `the-beat` — the spec keeps the default landing unchanged.)

- [ ] **Step 2: Add the nav tab first**

In `src/views/MyLeagueLayout.vue`, add a tab BEFORE The Beat tab (~line 97):

```vue
        <router-link
          class="league-nav-tab"
          :to="`/leagues/${routeLeagueId}/your-column`"
          :class="{ 'league-nav-tab-active': activeSection === 'column' }"
        >Your Column</router-link>
```

Then extend the `activeSection` computed so it returns `'column'` when the route path ends with `your-column` (find the existing `activeSection` computed — it maps route → 'beat'|'issue'|'chronicles' — and add the `your-column → 'column'` case mirroring the existing ones).

- [ ] **Step 3: Build + manual check**

Run: `npm run build 2>&1 | tail -2` (expect `✓ built`), then `npm run dev`, open a connected league, click **Your Column** (first tab).
Expected: logged-in user sees their team's column; the tab highlights as active.

- [ ] **Step 4: Commit**

```bash
git add src/router/index.ts src/views/MyLeagueLayout.vue
git commit -m "feat(your-column): route + first nav tab"
```

---

## Task 8: Integration verification

- [ ] **Step 1: Logged-in (commissioner) path**

`npm run dev`, open a connected **points** league (Baseball Buddies) → Your Column. Confirm: your team's hero, your live matchup line, your rival (most-played opponent, all-time record), your arc. Repeat on a **category** league.

- [ ] **Step 2: Guest path**

Open Your Column in a private window via the public/unauthenticated route (no `isMyTeam`). Confirm the **team picker** appears; pick a team → the column renders for it; reload → the pick persists (URL `?team=` + localStorage).

- [ ] **Step 3: Accuracy spot-check**

Confirm no "you" in any sentence (third-person), no em dashes, the rival record matches the league's real H2H, and any block that can't populate (e.g. no rival history early season) is omitted rather than faked.

- [ ] **Step 4: Full test run**

Run: `npm test`
Expected: all suites pass (existing 22 + the new buildH2H + buildYourColumn tests).

---

## Self-Review

- **Spec coverage:** hybrid identity (Task 5) ✓; The Column layout — stacked blocks (Task 6) ✓; voice: personal labels + third-person sentences (Task 4 logic + test asserting no "you") ✓; the four blocks + selection (Task 4) ✓; smart-nemesis rival + fallback (Task 4 `buildRival`) ✓; points H2H builder (Tasks 1–3) ✓; nav first / default unchanged (Task 7) ✓; edge cases — guest picker, omit-don't-fake, stale pick (Tasks 5–6) ✓; testing (Tasks 2/4/8) ✓. Per-block share is explicitly deferred (header) per the spec→plan scope note.
- **Placeholder scan:** none; the one NOTE (verify category matchup field names) is a real verification against the adapter, not a placeholder for missing logic, and the loop code is fully written.
- **Type consistency:** `H2HRecord` (Task 1) used by `buildH2H` (Task 2), adapters (Task 3), and `buildYourColumn` (Task 4). `YourColumnBlock`/`YourColumn` defined in Task 4 and consumed in Task 6. `buildYourColumn(LeagueData, teamId)` and `useViewerTeam(teams, leagueKey)` signatures consistent across tasks.
