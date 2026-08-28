/**
 * Division detectors — five story types that read off the league's
 * division metadata. Most ESPN leagues have N/S or E/W splits; Yahoo
 * and Sleeper rarely do. If `data.divisions` isn't populated this
 * module no-ops.
 *
 * All detectors here are PURE and NEVER THROW.
 *
 * See docs/EDITORIAL_ARCHITECTURE.md (section "M. Division-specific").
 */

import type {
  CategoryLeagueData,
  CategoryLeagueDataStanding,
  LeagueData,
} from '../types'
import {
  freshnessForWeekAge,
  maxCatWinsRemaining,
  signature,
  weeksRemaining,
} from './helpers'
import type {
  IssueContext,
  SeasonStage,
  StoryCandidate,
} from './types'

/* ─────────────────────────────────────────────────────────────────
   WEIGHTS
───────────────────────────────────────────────────────────────── */

const W_DIVISION_RACE_TIGHT = 65
const W_DIVISION_LOCKED_UP = 70
const W_DIVISION_RIVAL_STREAK = 50
const W_CROSS_DIVISION_POWER_SHIFT = 60
const W_DIVISIONAL_WILD_CARD = 70

/* ─────────────────────────────────────────────────────────────────
   STAGE SETS
───────────────────────────────────────────────────────────────── */

const MID_TO_FINAL: SeasonStage[] = ['midseason', 'stretch', 'final']
const STRETCH_TO_FINAL: SeasonStage[] = ['stretch', 'final']
const SETTLING_TO_FINAL: SeasonStage[] = [
  'settling',
  'midseason',
  'stretch',
  'final',
]

/* ─────────────────────────────────────────────────────────────────
   PRECONDITION HELPERS
───────────────────────────────────────────────────────────────── */

/** Has this league been set up with divisions and are at least some
 *  teams tagged into them? */
function hasUsableDivisions(data: CategoryLeagueData): boolean {
  if (!data.divisions || data.divisions.length === 0) return false
  // Need at least one team carrying a divisionId — otherwise the
  // metadata exists but is dead weight.
  return data.teams.some((t) => !!t.divisionId)
}

/** teamId → divisionId map. */
function teamDivisionMap(data: CategoryLeagueData): Map<string, string> {
  const map = new Map<string, string>()
  for (const t of data.teams) {
    if (t.divisionId) map.set(t.id, t.divisionId)
  }
  return map
}

/** Group standings rows by division. Teams without a divisionId are
 *  silently dropped from the grouping. Each bucket is sorted by rank
 *  (ascending — best first). */
function standingsByDivision(
  data: CategoryLeagueData,
): Map<string, CategoryLeagueDataStanding[]> {
  const teamDiv = teamDivisionMap(data)
  const buckets = new Map<string, CategoryLeagueDataStanding[]>()
  for (const s of data.standings) {
    const div = teamDiv.get(s.teamId)
    if (!div) continue
    if (!buckets.has(div)) buckets.set(div, [])
    buckets.get(div)!.push(s)
  }
  for (const arr of buckets.values()) {
    arr.sort((a, b) => a.rank - b.rank)
  }
  return buckets
}

/* ─────────────────────────────────────────────────────────────────
   1. DIVISION RACE TIGHT
   Any division where the top two teams' winPct is within 0.050.
───────────────────────────────────────────────────────────────── */

function detectDivisionRaceTight(
  data: CategoryLeagueData,
): StoryCandidate[] {
  const out: StoryCandidate[] = []
  const buckets = standingsByDivision(data)

  for (const [divisionId, rows] of buckets) {
    if (rows.length < 2) continue
    const [first, second] = rows
    const diff = Math.abs(first.winPct - second.winPct)
    if (diff > 0.05) continue

    out.push({
      type: 'division-race-tight',
      category: 'division',
      weight: W_DIVISION_RACE_TIGHT,
      freshness: freshnessForWeekAge(0),
      scope: 'league',
      teamIds: [first.teamId, second.teamId],
      seasonStages: MID_TO_FINAL,
      context: {
        divisionId,
        leaderTeamId: first.teamId,
        runnerUpTeamId: second.teamId,
        winPctGap: diff,
        leaderWinPct: first.winPct,
        runnerUpWinPct: second.winPct,
        week: data.currentWeek,
      },
      signature: signature([
        'division-race-tight',
        divisionId,
        data.currentWeek,
      ]),
    })
  }
  return out
}

/* ─────────────────────────────────────────────────────────────────
   2. DIVISION LOCKED UP
   The top team in a division has a mathematically insurmountable
   lead. Coarse approximation: winPct gap > 0.10 AND remaining
   cat-wins available are less than the leader's catWins surplus
   over the runner-up.
───────────────────────────────────────────────────────────────── */

function detectDivisionLockedUp(
  data: CategoryLeagueData,
): StoryCandidate[] {
  const out: StoryCandidate[] = []
  const buckets = standingsByDivision(data)
  const remaining = weeksRemaining(data.currentWeek, data.regularSeasonEndWeek)
  const maxCats = maxCatWinsRemaining(data, remaining)

  for (const [divisionId, rows] of buckets) {
    if (rows.length < 2) continue
    const [leader, second] = rows
    const winPctGap = leader.winPct - second.winPct
    if (winPctGap <= 0.1) continue

    // Cat-wins surplus the leader has built up. If the runner-up
    // can't close it even by winning every remaining cat, it's done.
    const catSurplus = leader.catWins - second.catWins
    if (catSurplus <= 0) continue
    if (maxCats >= catSurplus) continue

    out.push({
      type: 'division-locked-up',
      category: 'division',
      weight: W_DIVISION_LOCKED_UP,
      freshness: freshnessForWeekAge(0),
      scope: 'league',
      teamIds: [leader.teamId],
      seasonStages: STRETCH_TO_FINAL,
      context: {
        divisionId,
        leaderTeamId: leader.teamId,
        runnerUpTeamId: second.teamId,
        winPctGap,
        catSurplus,
        weeksRemaining: remaining,
        week: data.currentWeek,
      },
      signature: signature([
        'division-locked-up',
        divisionId,
        data.currentWeek,
      ]),
    })
  }

  return out
}

/* ─────────────────────────────────────────────────────────────────
   3. DIVISION RIVAL STREAK
   Two teams from the same division each carrying a streak of >= 3,
   either both winning or both losing. Highlights drama within the
   division.
───────────────────────────────────────────────────────────────── */

function detectDivisionRivalStreak(
  data: CategoryLeagueData,
): StoryCandidate[] {
  const out: StoryCandidate[] = []
  const buckets = standingsByDivision(data)

  for (const [divisionId, rows] of buckets) {
    if (rows.length < 2) continue

    // Find any two teams with active streaks of length 3+. We emit
    // one candidate per division — pair the two longest streaks of
    // the same type.
    const streakers = rows
      .filter((s) => s.streak.length >= 3)
      .sort((a, b) => b.streak.length - a.streak.length)
    if (streakers.length < 2) continue

    // Try to find two of the same type first; fall back to mismatched.
    let pair: [CategoryLeagueDataStanding, CategoryLeagueDataStanding] | null = null
    for (let i = 0; i < streakers.length && !pair; i++) {
      for (let j = i + 1; j < streakers.length && !pair; j++) {
        if (streakers[i].streak.type === streakers[j].streak.type) {
          pair = [streakers[i], streakers[j]]
        }
      }
    }
    if (!pair) continue

    const [a, b] = pair
    out.push({
      type: 'division-rival-streak',
      category: 'division',
      weight: W_DIVISION_RIVAL_STREAK,
      freshness: freshnessForWeekAge(0),
      scope: 'league',
      teamIds: [a.teamId, b.teamId],
      seasonStages: MID_TO_FINAL,
      context: {
        divisionId,
        streakType: a.streak.type,
        teamA: {
          teamId: a.teamId,
          streakLength: a.streak.length,
        },
        teamB: {
          teamId: b.teamId,
          streakLength: b.streak.length,
        },
        week: data.currentWeek,
      },
      signature: signature([
        'division-rival-streak',
        divisionId,
        a.teamId,
        b.teamId,
        data.currentWeek,
      ]),
    })
  }

  return out
}

/* ─────────────────────────────────────────────────────────────────
   4. CROSS-DIVISION POWER SHIFT
   One division collectively outperforming the others. We aggregate
   winPct per division and emit when the gap between best- and
   worst-performing divisions exceeds 0.10.
───────────────────────────────────────────────────────────────── */

function detectCrossDivisionPowerShift(
  data: CategoryLeagueData,
): StoryCandidate[] {
  const buckets = standingsByDivision(data)
  if (buckets.size < 2) return []

  const summaries: Array<{
    divisionId: string
    avgWinPct: number
    teamIds: string[]
  }> = []

  for (const [divisionId, rows] of buckets) {
    if (rows.length === 0) continue
    const sum = rows.reduce((acc, r) => acc + r.winPct, 0)
    summaries.push({
      divisionId,
      avgWinPct: sum / rows.length,
      teamIds: rows.map((r) => r.teamId),
    })
  }
  if (summaries.length < 2) return []

  summaries.sort((a, b) => b.avgWinPct - a.avgWinPct)
  const best = summaries[0]
  const worst = summaries[summaries.length - 1]
  const gap = best.avgWinPct - worst.avgWinPct
  if (gap <= 0.1) return []

  return [
    {
      type: 'cross-division-power-shift',
      category: 'division',
      weight: W_CROSS_DIVISION_POWER_SHIFT,
      freshness: freshnessForWeekAge(0),
      scope: 'league',
      seasonStages: SETTLING_TO_FINAL,
      context: {
        leadingDivisionId: best.divisionId,
        trailingDivisionId: worst.divisionId,
        leadingAvgWinPct: best.avgWinPct,
        trailingAvgWinPct: worst.avgWinPct,
        gap,
        leadingTeamIds: best.teamIds,
        trailingTeamIds: worst.teamIds,
        week: data.currentWeek,
      },
      signature: signature([
        'cross-division-power-shift',
        best.divisionId,
        worst.divisionId,
        data.currentWeek,
      ]),
    },
  ]
}

/* ─────────────────────────────────────────────────────────────────
   5. DIVISIONAL WILD-CARD IMPLICATION
   A team currently outside the auto-qualify spot (top 1 per division)
   but in wild-card contention. Coarse model: top team per division
   gets a guaranteed slot, remaining playoff slots go to the next-best
   winPct across the league.
───────────────────────────────────────────────────────────────── */

function detectDivisionalWildCardImplication(
  data: CategoryLeagueData,
): StoryCandidate[] {
  const buckets = standingsByDivision(data)
  if (buckets.size < 2) return []

  // 1. Identify auto-qualifiers — top team in each division.
  const autoQualifiers = new Set<string>()
  for (const rows of buckets.values()) {
    if (rows[0]) autoQualifiers.add(rows[0].teamId)
  }

  // 2. Compute remaining playoff slots.
  const cutoff = data.playoffCutoff
  const wildCardSlots = cutoff - autoQualifiers.size
  if (wildCardSlots <= 0) return []

  // 3. Build the wild-card pool — everyone not auto-qualified — and
  //    rank by winPct descending.
  const pool = data.standings
    .filter((s) => !autoQualifiers.has(s.teamId))
    .slice()
    .sort((a, b) => b.winPct - a.winPct)

  if (pool.length === 0) return []

  // 4. The current in-line teams are the top `wildCardSlots` of the
  //    pool. The bubble line is the winPct of the team holding the
  //    last in-line slot.
  const inLine = pool.slice(0, wildCardSlots)
  const bubble = pool[wildCardSlots - 1]
  if (!bubble) return []

  // 5. Contenders: any pool team within 0.10 winPct of the bubble.
  //    (Including teams already in-line — they're still "in
  //    contention" because they can be bumped.)
  const contenders = pool.filter(
    (s) => Math.abs(s.winPct - bubble.winPct) <= 0.1,
  )
  if (contenders.length < 2) return []

  const out: StoryCandidate[] = []
  for (const contender of contenders) {
    // Only fire team-scope stories for teams NOT already in auto-
    // qualify position (which is enforced by pool membership).
    const inWildCard = inLine.some((s) => s.teamId === contender.teamId)
    out.push({
      type: 'divisional-wild-card-implication',
      category: 'division',
      weight: W_DIVISIONAL_WILD_CARD,
      freshness: freshnessForWeekAge(0),
      scope: 'team',
      teamIds: [contender.teamId],
      seasonStages: STRETCH_TO_FINAL,
      context: {
        teamId: contender.teamId,
        currentlyInWildCard: inWildCard,
        wildCardSlots,
        bubbleTeamId: bubble.teamId,
        bubbleWinPct: bubble.winPct,
        contenderWinPct: contender.winPct,
        gapToBubble: contender.winPct - bubble.winPct,
        autoQualifierTeamIds: Array.from(autoQualifiers),
        week: data.currentWeek,
      },
      signature: signature([
        'divisional-wild-card-implication',
        contender.teamId,
        data.currentWeek,
      ]),
    })
  }

  return out
}

/* ─────────────────────────────────────────────────────────────────
   EXPORT
───────────────────────────────────────────────────────────────── */

/** Orchestrator for the divisions module. Bails immediately when the
 *  league has no usable division metadata. */
export function detect(
  data: LeagueData,
  _context: IssueContext,
): StoryCandidate[] {
  // Category-only. Division race/lock/streak framing reads winPct and
  // streak shape off per-category standings; a points league doesn't
  // share that shape yet. Football's stories live in points.ts.
  if (data.format !== 'h2h-category') return []

  if (!hasUsableDivisions(data)) return []
  if (!data.standings || data.standings.length === 0) return []

  const out: StoryCandidate[] = []
  const runners: Array<(d: CategoryLeagueData) => StoryCandidate[]> = [
    detectDivisionRaceTight,
    detectDivisionLockedUp,
    detectDivisionRivalStreak,
    detectCrossDivisionPowerShift,
    detectDivisionalWildCardImplication,
  ]
  for (const run of runners) {
    try {
      out.push(...run(data))
    } catch (err) {
      console.warn('[detection/divisions] detector threw:', err)
    }
  }
  return out
}
