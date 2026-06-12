# Your Players Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Your Players · Yesterday" block to Your Column — up to 2 standouts + 1 dud from the viewer's roster's most recent game date — working on points and cats, all platforms.

**Architecture:** A pure `buildYourPlayers` scorer over `playerNights` (filtered by `ownedByTeamIds`), a shared extracted `formatNightStats`, and points-adapter hydration that mirrors the cats path. The view renders a player-row list; cats already carry the data, points get it added.

**Tech Stack:** TypeScript editorial pipeline, Vue 3 view, vitest.

**Spec:** `docs/superpowers/specs/2026-06-12-your-players-design.md`

---

## File Structure

| File | Responsibility | New/Modified |
| --- | --- | --- |
| `src/editorial/players/formatNightStats.ts` | Shared stat-line formatter (moved out of detect-beat) | Create |
| `src/editorial/detect-beat.ts` | Import the formatter instead of defining it | Modify |
| `src/editorial/types.ts` | `playerNights?` on `LeagueDataH2HPoints` | Modify |
| `src/editorial/yourColumn/buildYourPlayers.ts` | Pure scorer → `YourPlayersBlock` | Create |
| `src/editorial/yourColumn/__tests__/buildYourPlayers.test.ts` | Tests | Create |
| `src/editorial/yourColumn/buildYourColumn.ts` | Add `players?` block, ordered after matchup | Modify |
| `src/views/YourColumnView.vue` | Render the players block | Modify |
| `src/editorial/adapters/yahooAdapter.ts` | Hydrate `playerNights` in the points branch | Modify |
| `src/editorial/adapters/espnAdapter.ts` | Hydrate `playerNights` in the points branch | Modify |

---

## Task 1: Extract `formatNightStats` to a shared module

Move the formatter (and its `formatIP` helper) out of `detect-beat.ts` so Your Players and The Beat share one source of truth.

**Files:**
- Create: `src/editorial/players/formatNightStats.ts`
- Modify: `src/editorial/detect-beat.ts` (remove the two local functions, import instead)

- [ ] **Step 1: Create the shared module**

Create `src/editorial/players/formatNightStats.ts` (copied verbatim from `detect-beat.ts:743`, retyped to `PlayerNight`):

```typescript
import type { PlayerNight } from './types'

/** "6.2" not "6.6666" — IP is base-10 in source but reads as base-3 outs. */
function formatIP(ip: number): string {
  const whole = Math.floor(ip)
  const frac = Math.round((ip - whole) * 10)
  return frac > 0 ? `${whole}.${frac}` : `${whole}`
}

/** Format a PlayerNight stat line into editorial-ready display.
 *  Hitter: "4-for-5, 2 HR, 6 RBI" / "3 H, 1 HR, 4 RBI" when no AB.
 *  Pitcher: "7 IP, 11 K, 0 ER" / "1 SV" / "6 IP, 0 H, 7 K" (no-hit). */
export function formatNightStats(n: PlayerNight): string {
  if (n.pitching) {
    const p = n.pitching
    const pieces: string[] = []
    if (p.noHitter || p.perfectGame) pieces.push(p.perfectGame ? 'PERFECT GAME' : 'NO-HITTER')
    if (p.inningsPitched > 0) pieces.push(`${formatIP(p.inningsPitched)} IP`)
    if (p.strikeouts > 0) pieces.push(`${p.strikeouts} K`)
    if (p.decision === 'S') pieces.push('SV')
    else if (p.decision === 'W') pieces.push('W')
    if (typeof p.earnedRuns === 'number') pieces.push(`${p.earnedRuns} ER`)
    return pieces.join(', ') || 'big start'
  }
  if (n.hitting) {
    const h = n.hitting
    const pieces: string[] = []
    if (typeof h.atBats === 'number' && h.atBats > 0) {
      pieces.push(`${h.hits}-for-${h.atBats}`)
    } else if (h.hits > 0) {
      pieces.push(`${h.hits} H`)
    }
    if (h.homeRuns > 0) pieces.push(`${h.homeRuns} HR`)
    if (h.rbi > 0) pieces.push(`${h.rbi} RBI`)
    if (h.stolenBases > 0) pieces.push(`${h.stolenBases} SB`)
    return pieces.join(', ') || 'big day'
  }
  return 'big day'
}
```

> NOTE: `formatNightStats` references `p.noHitter` / `p.perfectGame`, so those fields exist on `PitcherStats` in `players/types.ts`. Confirm by reading the interface; the copied code compiled in detect-beat, so they're present.

- [ ] **Step 2: Update detect-beat to import it**

In `src/editorial/detect-beat.ts`: delete the local `function formatNightStats(...)` (at ~line 743) and the local `function formatIP(...)` immediately after it, and add an import near the top with the other imports:

```typescript
import { formatNightStats } from './players/formatNightStats'
```

If `formatIP` is used elsewhere in detect-beat beyond `formatNightStats`, keep a local copy of `formatIP` too; otherwise remove it. (Search detect-beat for `formatIP(` — if the only caller was inside the moved `formatNightStats`, delete it.)

- [ ] **Step 3: Typecheck + existing tests**

Run: `npx vue-tsc --noEmit -p tsconfig.json 2>&1 | grep -E "detect-beat|formatNightStats" || echo CLEAN` then `npm test 2>&1 | grep -E "Tests "`
Expected: `CLEAN` and all existing tests pass (the Beat's `renderBeatPoints` suite exercises this path).

- [ ] **Step 4: Commit**

```bash
git add src/editorial/players/formatNightStats.ts src/editorial/detect-beat.ts
git commit -m "refactor(players): extract shared formatNightStats from detect-beat"
```

---

## Task 2: `playerNights` on the points type

**Files:**
- Modify: `src/editorial/types.ts`

- [ ] **Step 1: Add the field**

In `LeagueDataH2HPoints` (next to `seasonRankHistory?` / `h2hRecords?`), add:

```typescript
  /** Daily MLB player performances for rosters in this league, same
   *  shape The Beat uses. Optional — populated by the adapter's daily
   *  hydration; absent when it can't run. Drives Your Players. */
  playerNights?: import('./players/types').PlayerNight[]
```

- [ ] **Step 2: Typecheck**

Run: `npx vue-tsc --noEmit -p tsconfig.json 2>&1 | grep -E "types.ts" || echo CLEAN`
Expected: `CLEAN`

- [ ] **Step 3: Commit**

```bash
git add src/editorial/types.ts
git commit -m "feat(your-players): playerNights on LeagueDataH2HPoints"
```

---

## Task 3: `buildYourPlayers` (the scorer, pure + tests)

**Files:**
- Create: `src/editorial/yourColumn/buildYourPlayers.ts`
- Test: `src/editorial/yourColumn/__tests__/buildYourPlayers.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { buildYourPlayers } from '@/editorial/yourColumn/buildYourPlayers'
import type { PlayerNight } from '@/editorial/players/types'

const hit = (mlbId: number, name: string, h: Partial<PlayerNight['hitting']>, owned: string[], date = '2026-06-11'): PlayerNight =>
  ({ mlbId, name, gameDate: date, ownedByTeamIds: owned, hitting: { atBats: 0, hits: 0, runs: 0, rbi: 0, homeRuns: 0, doubles: 0, triples: 0, walks: 0, strikeouts: 0, stolenBases: 0, hitByPitch: 0, ...h } } as PlayerNight)
const pit = (mlbId: number, name: string, p: Partial<PlayerNight['pitching']>, owned: string[], date = '2026-06-11'): PlayerNight =>
  ({ mlbId, name, gameDate: date, ownedByTeamIds: owned, pitching: { inningsPitched: 0, hits: 0, runs: 0, earnedRuns: 0, walks: 0, strikeouts: 0, homeRunsAllowed: 0, ...p } } as PlayerNight)

describe('buildYourPlayers', () => {
  it('picks up to 2 standouts + 1 dud for the team, skipping quiet and other teams', () => {
    const nights = [
      hit(1, 'Judge', { atBats: 4, hits: 3, runs: 2, rbi: 5, homeRuns: 2 }, ['t1']),     // standout
      pit(2, 'Cole', { inningsPitched: 7, earnedRuns: 0, strikeouts: 11 }, ['t1']),       // standout
      hit(3, 'Soto', { atBats: 4, hits: 0, strikeouts: 4 }, ['t1']),                      // dud
      hit(4, 'Quiet', { atBats: 4, hits: 1, strikeouts: 1 }, ['t1']),                     // neither
      hit(5, 'NotMine', { atBats: 4, hits: 4, homeRuns: 3 }, ['t2']),                     // other team
    ]
    const block = buildYourPlayers(nights, 't1')!
    expect(block.players.map((p) => p.name)).toEqual(['Judge', 'Cole', 'Soto'])
    expect(block.players[0].tone).toBe('up')
    expect(block.players[2].tone).toBe('down')
    expect(block.players[2].line).toMatch(/4 K/)   // hitter dud shows the Ks
    expect(block.label).toBe('Your Players')
    expect(block.eyebrow).toBe('YESTERDAY')
  })

  it('uses only the most recent game date', () => {
    const nights = [
      hit(1, 'Old', { atBats: 4, hits: 4, homeRuns: 2 }, ['t1'], '2026-06-10'),
      hit(2, 'New', { atBats: 4, hits: 3, rbi: 4 }, ['t1'], '2026-06-11'),
    ]
    expect(buildYourPlayers(nights, 't1')!.players.map((p) => p.name)).toEqual(['New'])
  })

  it('omits the block when nothing clears the bars', () => {
    const nights = [hit(1, 'Meh', { atBats: 4, hits: 1, strikeouts: 1 }, ['t1'])]
    expect(buildYourPlayers(nights, 't1')).toBeUndefined()
    expect(buildYourPlayers([], 't1')).toBeUndefined()
  })

  it('scores a two-way player on the pitching line', () => {
    const ohtani = { mlbId: 9, name: 'Ohtani', gameDate: '2026-06-11', ownedByTeamIds: ['t1'],
      hitting: { atBats: 4, hits: 0, runs: 0, rbi: 0, homeRuns: 0, doubles: 0, triples: 0, walks: 0, strikeouts: 3, stolenBases: 0, hitByPitch: 0 },
      pitching: { inningsPitched: 7, hits: 2, runs: 0, earnedRuns: 0, walks: 1, strikeouts: 10, homeRunsAllowed: 0 } } as PlayerNight
    const block = buildYourPlayers([ohtani], 't1')!
    expect(block.players[0]).toMatchObject({ name: 'Ohtani', tone: 'up' })
    expect(block.players[0].line).toMatch(/IP/)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- buildYourPlayers`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/editorial/yourColumn/buildYourPlayers.ts`:

```typescript
/**
 * buildYourPlayers — the viewer's roster's best and worst from the most
 * recent game date. Pure. Reuses the shared formatNightStats so the lines
 * match The Beat. Two-way players are scored/rendered on their pitching
 * line (matching formatNightStats' pitcher-first priority).
 */
import type { PlayerNight } from '@/editorial/players/types'
import { formatNightStats } from '@/editorial/players/formatNightStats'

export interface YourPlayerRow {
  name: string
  line: string
  detail?: string // "OF · NYY"
  tone: 'up' | 'down'
}
export interface YourPlayersBlock {
  label: string
  eyebrow: string
  players: YourPlayerRow[] // standouts (up to 2) then the dud (0-1)
}

interface Scored {
  good: number
  bad: number
  isStandout: boolean
  isDud: boolean
}

function scoreNight(n: PlayerNight): Scored {
  if (n.pitching) {
    const p = n.pitching
    const ip = p.inningsPitched
    const gem = !!p.noHitter || !!p.perfectGame
    return {
      isStandout: gem || (ip >= 6 && p.earnedRuns <= 1) || (p.strikeouts >= 8 && p.earnedRuns <= 2),
      isDud: p.earnedRuns >= 5 || (ip <= 3 && p.earnedRuns >= 4),
      good: p.strikeouts + ip * 1.5 - p.earnedRuns * 2 + (gem ? 10 : 0),
      bad: p.earnedRuns * 2 + (ip <= 3 ? 3 : 0) + p.homeRunsAllowed,
    }
  }
  if (n.hitting) {
    const h = n.hitting
    return {
      isStandout: (h.hits >= 2 && h.homeRuns >= 1) || h.hits >= 3 || h.rbi >= 4 || h.homeRuns >= 2 || h.stolenBases >= 3,
      isDud: h.atBats >= 4 && h.hits === 0 && h.strikeouts >= 2,
      good: h.homeRuns * 4 + h.rbi * 1.5 + h.hits + h.stolenBases * 1.5 + h.runs * 0.5,
      bad: h.atBats + h.strikeouts,
    }
  }
  return { good: 0, bad: 0, isStandout: false, isDud: false }
}

function toRow(n: PlayerNight, tone: 'up' | 'down'): YourPlayerRow {
  let line = formatNightStats(n)
  // formatNightStats omits hitter strikeouts; a dud hitter reads better with them.
  if (tone === 'down' && n.hitting && !n.pitching && n.hitting.strikeouts > 0) {
    line += `, ${n.hitting.strikeouts} K`
  }
  const detail = [n.position, n.mlbTeam].filter(Boolean).join(' · ') || undefined
  return { name: n.name, line, detail, tone }
}

export function buildYourPlayers(nights: PlayerNight[], teamId: string): YourPlayersBlock | undefined {
  if (!nights.length) return undefined
  const latest = nights.reduce((d, n) => (n.gameDate > d ? n.gameDate : d), '')
  const mine = nights.filter((n) => n.gameDate === latest && n.ownedByTeamIds.includes(teamId))
  if (!mine.length) return undefined

  const scored = mine.map((n) => ({ n, ...scoreNight(n) }))
  const standouts = scored
    .filter((s) => s.isStandout)
    .sort((a, b) => b.good - a.good)
    .slice(0, 2)
  const standoutIds = new Set(standouts.map((s) => s.n.mlbId))
  const dud = scored
    .filter((s) => s.isDud && !standoutIds.has(s.n.mlbId))
    .sort((a, b) => b.bad - a.bad)[0]

  const players: YourPlayerRow[] = standouts.map((s) => toRow(s.n, 'up'))
  if (dud) players.push(toRow(dud.n, 'down'))
  if (!players.length) return undefined
  return { label: 'Your Players', eyebrow: 'YESTERDAY', players }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- buildYourPlayers`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/editorial/yourColumn/buildYourPlayers.ts src/editorial/yourColumn/__tests__/buildYourPlayers.test.ts
git commit -m "feat(your-players): buildYourPlayers scorer + tests"
```

---

## Task 4: Wire into `buildYourColumn`

**Files:**
- Modify: `src/editorial/yourColumn/buildYourColumn.ts`
- Test: `src/editorial/yourColumn/__tests__/buildYourColumn.test.ts`

- [ ] **Step 1: Add the failing test**

Append inside the existing `describe('buildYourColumn', ...)` in `buildYourColumn.test.ts`:

```typescript
  it('includes a Your Players block from playerNights, ordered after the matchup', () => {
    const withNights = {
      ...data,
      playerNights: [
        { mlbId: 1, name: 'Judge', gameDate: '2026-06-11', ownedByTeamIds: ['t1'],
          hitting: { atBats: 4, hits: 3, runs: 2, rbi: 5, homeRuns: 2, doubles: 0, triples: 0, walks: 0, strikeouts: 0, stolenBases: 0, hitByPitch: 0 } },
      ],
    } as unknown as LeagueDataH2HPoints
    const col = buildYourColumn(withNights, 't1')
    expect(col.players?.players[0].name).toBe('Judge')
  })
  it('omits Your Players when there are no nights', () => {
    expect(buildYourColumn(data, 't1').players).toBeUndefined()
  })
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- buildYourColumn`
Expected: FAIL — `players` not on the result.

- [ ] **Step 3: Implement**

In `buildYourColumn.ts`, add the import and extend the type + builder:

```typescript
import { buildYourPlayers, type YourPlayersBlock } from '@/editorial/yourColumn/buildYourPlayers'
```

Add `players?` to the `YourColumn` interface (between `matchup` and `rival`):

```typescript
export interface YourColumn {
  hero: YourColumnBlock
  matchup?: YourColumnBlock
  players?: YourPlayersBlock
  rival?: YourColumnBlock
  arc?: YourColumnBlock
}
```

And in `buildYourColumn(...)`'s returned object, add the players line:

```typescript
  return {
    hero: buildHero(data, teamId),
    matchup: buildMatchup(data, teamId),
    players: buildYourPlayers(data.playerNights ?? [], teamId),
    rival: buildRival(data, teamId),
    arc: buildArc(data, teamId),
  }
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- buildYourColumn`
Expected: PASS (all, including the 2 new).

- [ ] **Step 5: Commit**

```bash
git add src/editorial/yourColumn/buildYourColumn.ts src/editorial/yourColumn/__tests__/buildYourColumn.test.ts
git commit -m "feat(your-players): wire Your Players into buildYourColumn"
```

---

## Task 5: Render the players block in the view

The players block has a different shape (a `players[]` list, no headline/chips/viz), so `renderedBlocks` becomes a tagged list and the template branches on it.

**Files:**
- Modify: `src/views/YourColumnView.vue`

- [ ] **Step 1: Make `renderedBlocks` a tagged list**

In the `<script setup>`, update the import and replace the `renderedBlocks` computed:

```typescript
import { buildYourColumn, type YourColumnBlock } from '@/editorial/yourColumn/buildYourColumn'
import type { YourPlayersBlock } from '@/editorial/yourColumn/buildYourPlayers'

type ColumnEntry =
  | { kind: 'block'; block: YourColumnBlock }
  | { kind: 'players'; block: YourPlayersBlock }

const renderedBlocks = computed<ColumnEntry[]>(() => {
  const c = column.value
  if (!c) return []
  const out: ColumnEntry[] = [{ kind: 'block', block: c.hero }]
  if (c.matchup) out.push({ kind: 'block', block: c.matchup })
  if (c.players) out.push({ kind: 'players', block: c.players })
  if (c.rival) out.push({ kind: 'block', block: c.rival })
  if (c.arc) out.push({ kind: 'block', block: c.arc })
  return out
})
```

- [ ] **Step 2: Branch the template**

Replace the existing `<section v-for="(block, i) in renderedBlocks" ...>` element (the whole block from `<section ...>` through its closing `</section>`) with this — a wrapper that keeps the standard block markup for `kind === 'block'` and adds the players list for `kind === 'players'`:

```vue
        <section
          v-for="(entry, i) in renderedBlocks"
          :key="entry.block.label"
          class="yc-block"
          :class="{ 'yc-block-focal': entry.kind === 'block' && entry.block.label === 'Your matchup' }"
        >
          <div class="yc-block-head">
            <span class="yc-block-num">{{ String(i + 1).padStart(2, '0') }}</span>
            <p class="yc-block-kicker">
              <span class="yc-k-label">{{ entry.block.label }}</span>
              <template
                v-if="entry.block.eyebrow && entry.block.eyebrow.toUpperCase() !== entry.block.label.toUpperCase()"
              >
                <span class="yc-k-sep" aria-hidden="true">/</span>
                <span class="yc-k-eyebrow" :class="{ 'is-live': entry.block.eyebrow === 'LIVE' }">
                  <span v-if="entry.block.eyebrow === 'LIVE'" class="yc-live-dot" aria-hidden="true"></span>{{ entry.block.eyebrow }}
                </span>
              </template>
            </p>
          </div>

          <!-- Players list -->
          <ul v-if="entry.kind === 'players'" class="yc-players">
            <li v-for="(p, pi) in entry.block.players" :key="pi" class="yc-player" :class="`tone-${p.tone}`">
              <span class="yc-player-mark" aria-hidden="true">{{ p.tone === 'up' ? '↑' : '↓' }}</span>
              <span class="yc-player-name">{{ p.name }}</span>
              <span class="yc-player-line">{{ p.line }}</span>
              <span v-if="p.detail" class="yc-player-detail">{{ p.detail }}</span>
            </li>
          </ul>

          <!-- Standard block -->
          <template v-else>
            <h2 class="yc-block-headline">{{ entry.block.headline }}</h2>
            <p v-if="entry.block.body" class="yc-block-body">{{ entry.block.body }}</p>

            <div v-if="entry.block.viz && entry.block.viz.kind === 'scoreBar'" class="yc-scorebar">
              <div
                v-for="(row, r) in scoreBarRows(entry.block.viz)"
                :key="r"
                class="yc-sb-row"
                :class="{ 'yc-sb-mine': row.mine }"
              >
                <div class="yc-sb-meta">
                  <span class="yc-sb-name">{{ row.name }}</span>
                  <span class="yc-sb-score">{{ fmtScore(row.score) }}</span>
                </div>
                <div class="yc-sb-track">
                  <div class="yc-sb-fill" :style="{ width: row.pct + '%' }"></div>
                  <div
                    v-if="row.projPct != null"
                    class="yc-sb-proj"
                    :style="{ left: row.projPct + '%' }"
                    title="projected finish"
                  ></div>
                </div>
              </div>
            </div>

            <div v-else-if="entry.block.viz && entry.block.viz.kind === 'rankLine'" class="yc-rankline">
              <div class="yc-rl-scale">
                <span>#{{ entry.block.viz.best }}</span>
                <span>#{{ entry.block.viz.worst }}</span>
              </div>
              <svg
                :viewBox="`0 0 100 ${RANK_H}`"
                preserveAspectRatio="none"
                class="yc-rl-svg"
                role="img"
                :aria-label="`Season rank, best #${entry.block.viz.best}, worst #${entry.block.viz.worst}`"
              >
                <polyline :points="rankLine(entry.block.viz)" class="yc-rl-line" :class="`tone-${entry.block.viz.tone}`" />
              </svg>
            </div>

            <ul
              v-if="entry.block.chips && entry.block.chips.length && !(entry.block.viz && entry.block.viz.kind === 'rankLine')"
              class="yc-block-chips"
            >
              <li v-for="(c, ci) in entry.block.chips" :key="ci">
                <span class="yc-chip-num">{{ c.value }}</span>
                <span class="yc-chip-label">{{ c.label }}</span>
              </li>
            </ul>
          </template>
        </section>
```

> The `scoreBarRows`, `rankLine`, `fmtScore`, `RANK_H` helpers are unchanged. The `YourColumnBlock` import already exists; only the `YourPlayersBlock` import + `ColumnEntry` type are new.

- [ ] **Step 3: Add player-row styles**

In the scoped `<style>`, after the `.yc-block-chips` rules, add:

```css
/* ─── YOUR PLAYERS ─────────────────────────────────────────────── */
.yc-players {
  list-style: none;
  padding: 0;
  margin: 6px 0 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 560px;
}
.yc-player {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: baseline;
  gap: 10px;
}
.yc-player-mark {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.05rem;
  line-height: 1;
}
.yc-player.tone-up .yc-player-mark { color: oklch(0.8 0.17 155); }
.yc-player.tone-down .yc-player-mark { color: oklch(0.68 0.19 25); }
.yc-player-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 1.18rem;
  letter-spacing: -0.01em;
  color: var(--ink-1);
}
.yc-player-line {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--ink-2);
  font-variant-numeric: tabular-nums;
  text-align: right;
  white-space: nowrap;
}
.yc-player-detail {
  display: none;
}
@media (min-width: 520px) {
  .yc-player {
    grid-template-columns: auto auto 1fr auto;
  }
  .yc-player-detail {
    display: inline;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 600;
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
}
```

> The detail column (`OF · NYY`) is ordered after the name on wide screens via grid; the line stays right-aligned. On narrow screens the detail hides to keep one clean row.

- [ ] **Step 4: Typecheck + build**

Run: `npx vue-tsc --noEmit -p tsconfig.json 2>&1 | grep -E "YourColumnView" || echo CLEAN` then `npm run build 2>&1 | tail -1`
Expected: `CLEAN` and `✓ built`.

- [ ] **Step 5: Commit**

```bash
git add src/views/YourColumnView.vue
git commit -m "feat(your-players): render the players block in the view"
```

---

## Task 6: Hydrate `playerNights` in the Yahoo points branch

**Files:**
- Modify: `src/editorial/adapters/yahooAdapter.ts` (points branch, ~line 257-340)

- [ ] **Step 1: Add the hydration**

In `buildYahooLeagueData`'s `if (isPoints)` branch, after `teamList` is built (the `pointsTeams.map(...)` block) and before the points `out` object, add:

```typescript
    // Daily player nights for Your Players — mirror the cats path: build a
    // name->teamKey roster index from the standings, then fetch nights.
    // ownedByTeamIds end up keyed by team_key, matching teamList[].id.
    const myTeamKeyPoints = teamList.find((t) => t.isMyTeam)?.id
    const pointsRoster = await fetchYahooRostersOnce(pointsRawStandings, myTeamKeyPoints).catch(
      () => ({ rosterByName: new Map<string, string[]>(), myBenchedPlayers: undefined as Set<string> | undefined }),
    )
    const pointsPlayerNights = await buildPlayerNights({
      rosterByName: pointsRoster.rosterByName,
      includeUnowned: true,
    }).catch(() => [] as PlayerNight[])
```

Then add `playerNights: pointsPlayerNights` to the points `out` object.

> `fetchYahooRostersOnce`, `buildPlayerNights`, `PlayerNight`, and `pointsRawStandings` are all already in scope (the cats path uses the first two; `pointsRawStandings` is the `getStandings` result in the points `Promise.all`). `fetchYahooRostersOnce` is a hoisted function declaration, so calling it before its definition is fine.

- [ ] **Step 2: Verify team-id space (the silent-failure guard)**

Confirm `pointsRawStandings` rows carry `team_key` (the same field the cats `rawStandings` uses) — `fetchYahooRostersOnce` maps `s.team_key`, and `teamList[].id` is `t.team_key`, so `ownedByTeamIds` (team_keys) match. Read the points `getStandings` mapping if unsure; if the field name differs, the roster index keys won't match `teamList[].id` and Your Players will silently show nothing.

- [ ] **Step 3: Typecheck + build**

Run: `npx vue-tsc --noEmit -p tsconfig.json 2>&1 | grep -E "yahooAdapter" || echo CLEAN` then `npm run build 2>&1 | tail -1`
Expected: `CLEAN` and `✓ built`.

- [ ] **Step 4: Commit**

```bash
git add src/editorial/adapters/yahooAdapter.ts
git commit -m "feat(your-players): hydrate playerNights in the Yahoo points branch"
```

---

## Task 7: Hydrate `playerNights` in the ESPN points branch

**Files:**
- Modify: `src/editorial/adapters/espnAdapter.ts` (points branch, ~line 388-402)

- [ ] **Step 1: Add the hydration**

In `espnLeagueToCategoryData`'s points branch, before the points `out` object, add:

```typescript
    // Daily player nights for Your Players. buildEspnPlayerNights builds the
    // roster index internally (keyed to String(team id), matching teams[].id)
    // and is already error-tolerant.
    const pointsPlayerNights = await buildEspnPlayerNights(league)
```

Then add `playerNights: pointsPlayerNights` to the points `out` object.

> `buildEspnPlayerNights(league)` is a hoisted `async function` declaration defined later in the file; the cats path already calls it. The `league` object is in scope in the points branch (used as `String(league.id)`).

- [ ] **Step 2: Typecheck + build**

Run: `npx vue-tsc --noEmit -p tsconfig.json 2>&1 | grep -E "espnAdapter" || echo CLEAN` then `npm run build 2>&1 | tail -1`
Expected: `CLEAN` and `✓ built`.

- [ ] **Step 3: Commit**

```bash
git add src/editorial/adapters/espnAdapter.ts
git commit -m "feat(your-players): hydrate playerNights in the ESPN points branch"
```

---

## Task 8: Integration verification

- [ ] **Step 1: Full test run**

Run: `npm test 2>&1 | grep -E "Test Files|Tests "`
Expected: all suites pass (existing + `buildYourPlayers` + the 2 new `buildYourColumn` tests).

- [ ] **Step 2: Live — points**

`npm run dev`, open Baseball Buddies (Yahoo points) → Your Column. Confirm block **03 "Your Players · Yesterday"** appears (when there were games), with up to 2 green standouts + 1 red dud, real stat lines, and that the players are actually on your roster. Repeat on Winner's Den (ESPN points).

- [ ] **Step 3: Live — cats + accuracy**

Open a cats league (Triple Crown). Confirm Your Players renders there too (data was already present). Spot-check: the named players are yours, the dud is a genuine stinker (not a quiet 0-3), no player appears twice, and on a no-games day the block is absent rather than empty.

- [ ] **Step 4: Verify no points-load regression**

Confirm the points page still loads (the added roster fetch is `.catch`-guarded; a roster failure must not break the page — Your Players just omits).

---

## Self-Review

- **Spec coverage:** composition 2+1 (Task 3 `slice(0,2)` + single dud) ✓; placement after matchup (Task 4 order + Task 5 tagged list) ✓; scope points+cats (Tasks 6/7 hydrate points; cats already had it) ✓; compact stat lines + ↑/↓ tone (Task 5) ✓; shared formatter (Task 1) ✓; scoring bars (Task 3 `scoreNight`) ✓; edge cases — quiet→omit, latest-date, two-way→pitching, no self-dup, off-day→omit (Task 3 tests) ✓; team-id-space risk (Task 6 Step 2 + Task 7 note) ✓; testing (Tasks 3/4/8) ✓.
- **Placeholder scan:** none; the two NOTEs are real verifications (field presence, id space), with the surrounding code fully written.
- **Type consistency:** `YourPlayersBlock`/`YourPlayerRow` defined in Task 3, consumed in Tasks 4 (`players?`) and 5 (`ColumnEntry`). `buildYourPlayers(nights, teamId)` signature consistent across Tasks 3–4. `formatNightStats(PlayerNight)` defined in Task 1, used in Task 3.
