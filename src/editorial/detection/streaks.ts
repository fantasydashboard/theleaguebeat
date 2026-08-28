/**
 * Streak detectors — eight story types that key off rolling rank +
 * W/L behaviour across the last few weeks.
 *
 * All detectors here are PURE and NEVER THROW. When the underlying
 * data is missing (no history, no standings, etc.) the detector
 * returns an empty array.
 *
 * See docs/EDITORIAL_ARCHITECTURE.md (section "C. Streaks") for the
 * taxonomy.
 */

import type { LeagueData } from '../types'
import { asLeagueCore, type LeagueCore } from '../leagueCore'
import {
  consecutiveWeeksAtRank,
  consistentlyAtOrAbove,
  freshnessForWeekAge,
  rankAtWeek,
  signature,
} from './helpers'
import type {
  IssueContext,
  SeasonStage,
  StoryCandidate,
} from './types'

/* ─────────────────────────────────────────────────────────────────
   WEIGHTS — keep them at the top so relative scoring is auditable
   at a glance. See EDITORIAL_ARCHITECTURE.md for the rubric.
───────────────────────────────────────────────────────────────── */

const W_STREAK_BROKEN = 65
const W_STREAK_BUILT = 55
const W_CONSISTENCY = 50
const W_INCONSISTENCY = 35
const W_BASEMENT_STREAK = 45
const W_THRONE_STREAK = 70
const W_THREE_WEEK_COMEBACK = 60
const W_THREE_WEEK_COLLAPSE = 60

/* ─────────────────────────────────────────────────────────────────
   STAGE SETS
───────────────────────────────────────────────────────────────── */

/** Every in-season stage. Used by streak detectors that fire all year. */
const ALL_IN_SEASON: SeasonStage[] = [
  'opening',
  'settling',
  'midseason',
  'stretch',
  'final',
  'playoffs',
]

/** Stages where the "consistency" awards only make sense — you need
 *  a handful of weeks under your belt before "consistency" is a thing. */
const MID_TO_FINAL: SeasonStage[] = ['midseason', 'stretch', 'final']

/** Comeback / collapse detectors need at least a few weeks of history. */
const SETTLING_TO_FINAL: SeasonStage[] = [
  'settling',
  'midseason',
  'stretch',
  'final',
]

/* ─────────────────────────────────────────────────────────────────
   1. STREAK BROKEN
   A W or L streak of >= 3 just got snapped this week. Coarse proxy:
   the team's current streak.length === 1 (so it just turned over),
   and the count of consecutive opposite results immediately preceding
   was >= 3.
───────────────────────────────────────────────────────────────── */

function detectStreakBroken(
  data: LeagueCore,
  _context: IssueContext,
): StoryCandidate[] {
  const out: StoryCandidate[] = []

  for (const standing of data.standings) {
    // `lastSix` is ordered oldest → newest in the fixtures. Most-recent
    // result is the last element; the broken streak is what came BEFORE
    // that single new result.
    const six = standing.lastSix
    if (!six || six.length < 2) continue

    const latest = six[six.length - 1]
    if (!latest || latest === 'T') continue

    // The "current" streak.length should be 1 (it just turned over).
    if (standing.streak.length !== 1) continue
    if (standing.streak.type !== latest) continue

    // Count opposite results immediately before the latest one.
    const opposite: 'W' | 'L' = latest === 'W' ? 'L' : 'W'
    let priorRun = 0
    for (let i = six.length - 2; i >= 0; i--) {
      if (six[i] === opposite) priorRun++
      else break
    }

    if (priorRun < 3) continue

    out.push({
      type: 'streak-broken',
      category: 'streak',
      weight: W_STREAK_BROKEN,
      freshness: freshnessForWeekAge(0),
      scope: 'team',
      teamIds: [standing.teamId],
      seasonStages: ALL_IN_SEASON,
      context: {
        teamId: standing.teamId,
        brokenStreakType: opposite,
        brokenStreakLength: priorRun,
        newResult: latest,
        week: data.currentWeek,
      },
      signature: signature([
        'streak-broken',
        standing.teamId,
        data.currentWeek,
      ]),
    })
  }

  return out
}

/* ─────────────────────────────────────────────────────────────────
   2. STREAK BUILT
   Team just hit a 3-game or 5+ game win streak this week.
───────────────────────────────────────────────────────────────── */

function detectStreakBuilt(
  data: LeagueCore,
  _context: IssueContext,
): StoryCandidate[] {
  const out: StoryCandidate[] = []

  for (const standing of data.standings) {
    if (standing.streak.type !== 'W') continue
    const len = standing.streak.length
    // Milestones: hitting 3, or hitting 5/6/7+ (anything 5 or higher
    // qualifies but we only emit on the "build" weeks).
    const isMilestone = len === 3 || len >= 5
    if (!isMilestone) continue

    out.push({
      type: 'streak-built',
      category: 'streak',
      weight: W_STREAK_BUILT,
      freshness: freshnessForWeekAge(0),
      scope: 'team',
      teamIds: [standing.teamId],
      seasonStages: ALL_IN_SEASON,
      context: {
        teamId: standing.teamId,
        streakType: 'W',
        streakLength: len,
        week: data.currentWeek,
      },
      signature: signature([
        'streak-built',
        standing.teamId,
        len,
        data.currentWeek,
      ]),
    })
  }

  return out
}

/* ─────────────────────────────────────────────────────────────────
   3. CONSISTENCY AWARD
   Team has been .500+ in their last six weekly matchups. Counts
   W + T as half-credit toward .500.
───────────────────────────────────────────────────────────────── */

function detectConsistencyAward(
  data: LeagueCore,
  _context: IssueContext,
): StoryCandidate[] {
  const out: StoryCandidate[] = []

  for (const standing of data.standings) {
    const six = standing.lastSix
    if (!six || six.length < 6) continue

    const wins = six.filter((r) => r === 'W').length
    const ties = six.filter((r) => r === 'T').length
    const score = wins + ties // ties count as half-and-half, but ≥4 W+T = .500+

    if (score < 4) continue

    out.push({
      type: 'consistency-award',
      category: 'streak',
      weight: W_CONSISTENCY,
      freshness: freshnessForWeekAge(0),
      scope: 'team',
      teamIds: [standing.teamId],
      seasonStages: MID_TO_FINAL,
      context: {
        teamId: standing.teamId,
        wins,
        ties,
        losses: six.length - wins - ties,
        window: 6,
        week: data.currentWeek,
      },
      signature: signature([
        'consistency-award',
        standing.teamId,
        data.currentWeek,
      ]),
    })
  }

  return out
}

/* ─────────────────────────────────────────────────────────────────
   4. INCONSISTENCY AWARD
   Team has alternated W/L for the last six results — exactly 3 W
   and 3 L, in an alternating pattern (WLWLWL or LWLWLW).
───────────────────────────────────────────────────────────────── */

function detectInconsistencyAward(
  data: LeagueCore,
  _context: IssueContext,
): StoryCandidate[] {
  const out: StoryCandidate[] = []

  for (const standing of data.standings) {
    const six = standing.lastSix
    if (!six || six.length < 6) continue

    const wins = six.filter((r) => r === 'W').length
    const losses = six.filter((r) => r === 'L').length
    if (wins !== 3 || losses !== 3) continue

    // Check alternating pattern — every result differs from its
    // immediate neighbour.
    let alternating = true
    for (let i = 1; i < six.length; i++) {
      if (six[i] === six[i - 1]) {
        alternating = false
        break
      }
    }
    if (!alternating) continue

    out.push({
      type: 'inconsistency-award',
      category: 'streak',
      weight: W_INCONSISTENCY,
      freshness: freshnessForWeekAge(0),
      scope: 'team',
      teamIds: [standing.teamId],
      seasonStages: MID_TO_FINAL,
      context: {
        teamId: standing.teamId,
        pattern: six.join(''),
        week: data.currentWeek,
      },
      signature: signature([
        'inconsistency-award',
        standing.teamId,
        data.currentWeek,
      ]),
    })
  }

  return out
}

/* ─────────────────────────────────────────────────────────────────
   5. BASEMENT STREAK
   Team has sat in the bottom of the standings (rank >= teams.length
   - 1, i.e. last or second-to-last in a 10-team league) for 5+
   consecutive weeks.
───────────────────────────────────────────────────────────────── */

function detectBasementStreak(
  data: LeagueCore,
  _context: IssueContext,
): StoryCandidate[] {
  const out: StoryCandidate[] = []
  const teamCount = data.teams.length
  if (teamCount < 4) return out
  const basementCutoff = teamCount - 1

  for (const standing of data.standings) {
    // Cheap pre-filter — must currently be in the basement.
    if (standing.rank < basementCutoff) continue

    // Count consecutive weeks back from current at-or-below the cutoff.
    let consecutive = 0
    for (let w = data.currentWeek; w >= 1; w--) {
      const r = rankAtWeek(data, standing.teamId, w)
      if (r != null && r >= basementCutoff) consecutive++
      else break
    }

    if (consecutive < 5) continue

    out.push({
      type: 'basement-streak',
      category: 'streak',
      weight: W_BASEMENT_STREAK,
      freshness: freshnessForWeekAge(0),
      scope: 'team',
      teamIds: [standing.teamId],
      seasonStages: MID_TO_FINAL,
      context: {
        teamId: standing.teamId,
        weeks: consecutive,
        rank: standing.rank,
        basementCutoff,
        week: data.currentWeek,
      },
      signature: signature([
        'basement-streak',
        standing.teamId,
        consecutive,
        data.currentWeek,
      ]),
    })
  }

  return out
}

/* ─────────────────────────────────────────────────────────────────
   6. THRONE STREAK
   Team has been at rank 1 for 5+ consecutive weeks.
───────────────────────────────────────────────────────────────── */

function detectThroneStreak(
  data: LeagueCore,
  _context: IssueContext,
): StoryCandidate[] {
  const out: StoryCandidate[] = []

  for (const standing of data.standings) {
    if (standing.rank !== 1) continue
    if (!consistentlyAtOrAbove(data, standing.teamId, 1, 5)) continue

    const weeksAtTop = consecutiveWeeksAtRank(
      data,
      standing.teamId,
      1,
      data.currentWeek,
    )

    out.push({
      type: 'throne-streak',
      category: 'streak',
      weight: W_THRONE_STREAK,
      freshness: freshnessForWeekAge(0),
      scope: 'team',
      teamIds: [standing.teamId],
      seasonStages: ALL_IN_SEASON,
      context: {
        teamId: standing.teamId,
        weeks: weeksAtTop,
        week: data.currentWeek,
      },
      signature: signature([
        'throne-streak',
        standing.teamId,
        weeksAtTop,
        data.currentWeek,
      ]),
    })
  }

  return out
}

/* ─────────────────────────────────────────────────────────────────
   7. THREE-WEEK COMEBACK
   Rank improved (number decreased) in each of the last 3 weeks.
   Requires 4 datapoints (w-3, w-2, w-1, w).
───────────────────────────────────────────────────────────────── */

function detectThreeWeekComeback(
  data: LeagueCore,
  _context: IssueContext,
): StoryCandidate[] {
  const out: StoryCandidate[] = []
  const w = data.currentWeek
  if (w < 4) return out

  for (const team of data.teams) {
    const ranks: number[] = []
    for (let i = w - 3; i <= w; i++) {
      const r = rankAtWeek(data, team.id, i)
      if (r == null) break
      ranks.push(r)
    }
    if (ranks.length < 4) continue

    // Each weekly delta must be strictly improving (rank number going down).
    let improvedEveryWeek = true
    for (let i = 1; i < ranks.length; i++) {
      if (ranks[i] >= ranks[i - 1]) {
        improvedEveryWeek = false
        break
      }
    }
    if (!improvedEveryWeek) continue

    const totalDelta = ranks[0] - ranks[ranks.length - 1]

    out.push({
      type: 'three-week-comeback',
      category: 'streak',
      weight: W_THREE_WEEK_COMEBACK,
      freshness: freshnessForWeekAge(0),
      scope: 'team',
      teamIds: [team.id],
      seasonStages: SETTLING_TO_FINAL,
      context: {
        teamId: team.id,
        ranks,
        totalDelta,
        week: w,
      },
      signature: signature([
        'three-week-comeback',
        team.id,
        w,
      ]),
    })
  }

  return out
}

/* ─────────────────────────────────────────────────────────────────
   8. THREE-WEEK COLLAPSE
   Rank dropped (number increased) in each of the last 3 weeks.
───────────────────────────────────────────────────────────────── */

function detectThreeWeekCollapse(
  data: LeagueCore,
  _context: IssueContext,
): StoryCandidate[] {
  const out: StoryCandidate[] = []
  const w = data.currentWeek
  if (w < 4) return out

  for (const team of data.teams) {
    const ranks: number[] = []
    for (let i = w - 3; i <= w; i++) {
      const r = rankAtWeek(data, team.id, i)
      if (r == null) break
      ranks.push(r)
    }
    if (ranks.length < 4) continue

    let droppedEveryWeek = true
    for (let i = 1; i < ranks.length; i++) {
      if (ranks[i] <= ranks[i - 1]) {
        droppedEveryWeek = false
        break
      }
    }
    if (!droppedEveryWeek) continue

    const totalDelta = ranks[ranks.length - 1] - ranks[0]

    out.push({
      type: 'three-week-collapse',
      category: 'streak',
      weight: W_THREE_WEEK_COLLAPSE,
      freshness: freshnessForWeekAge(0),
      scope: 'team',
      teamIds: [team.id],
      seasonStages: SETTLING_TO_FINAL,
      context: {
        teamId: team.id,
        ranks,
        totalDelta,
        week: w,
      },
      signature: signature([
        'three-week-collapse',
        team.id,
        w,
      ]),
    })
  }

  return out
}

/* ─────────────────────────────────────────────────────────────────
   EXPORT
───────────────────────────────────────────────────────────────── */

/** Orchestrator for the streaks module. Runs every streak detector
 *  and returns the merged candidate list.
 *
 *  Works for both formats: every story below is about wins, losses
 *  and rank movement, none of which care how a week was scored. */
export function detect(
  data: LeagueData,
  context: IssueContext,
): StoryCandidate[] {
  // Projects either format onto the narrow core shape these
  // detectors need. Returns [] when standings aren't available yet
  // (e.g. a points league that hasn't accrued them).
  const core = asLeagueCore(data)
  if (!core) return []

  const out: StoryCandidate[] = []

  const runners = [
    detectStreakBroken,
    detectStreakBuilt,
    detectConsistencyAward,
    detectInconsistencyAward,
    detectBasementStreak,
    detectThroneStreak,
    detectThreeWeekComeback,
    detectThreeWeekCollapse,
  ]

  for (const run of runners) {
    try {
      out.push(...run(core, context))
    } catch (err) {
      // Detectors must never throw — but if one does, swallow it so
      // the rest of the issue still composes.
      console.warn('[detection/streaks] detector threw:', err)
    }
  }

  return out
}
