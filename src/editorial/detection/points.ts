/**
 * Points detectors — the six story types that exist ONLY because
 * football (and any other h2h-points sport) is scored on a continuous
 * points scale rather than discrete category wins: blowouts, photo
 * finishes, shootouts, slugfests, and the week's high/low score.
 *
 * THE CENTRAL RULE: every threshold here is a MULTIPLE of the
 * league's own weekly scoring average, never a bare point value. A
 * 40-point margin is a rout in a standard league and unremarkable in
 * a superflex PPR league — an absolute threshold would misfire across
 * leagues, so everything is scaled against `weeklyPointsAverage`.
 *
 * Design rules (per detection/types.ts):
 *   - Pure. Same input -> same output.
 *   - Never throw. Return `[]` when the format guard fails or there's
 *     no final matchup to look at.
 *   - Only `status === 'final'` matchups count — a live game hasn't
 *     finished happening, so its margin isn't real yet.
 *   - Never fabricate a baseline. With no `weeklyPointsAverage` and
 *     fewer than two final games to average ourselves, the margin
 *     detectors emit nothing rather than invent a number.
 */
import type {
  LeagueData,
  LeagueDataH2HPoints,
  LeagueDataPointsMatchup,
} from '../types'
import {
  ALL_ACTIVE_STAGES,
  type IssueContext,
  type SeasonStage,
  type StoryCandidate,
} from './types'
import { freshnessForWeekAge, signature } from './helpers'

/* ─────────────────────────────────────────────────────────────────
   WEIGHTS + THRESHOLDS
   Kept at the top so relative scoring/thresholds are auditable at a
   glance. Multipliers come from the task brief; see the module doc
   comment for why they're multiples, not constants.
───────────────────────────────────────────────────────────────── */

const W = {
  blowout: 60,      // mirrors category `blowout` — common-ish, not always lead-worthy
  photoFinish: 70,  // tied-or-near-tied final = high drama
  shootout: 65,     // both offenses went off — strong angle
  slugfest: 45,     // grind-it-out low scorer — quieter angle
  highScore: 55,    // week's top output — solid secondary
  lowScore: 35,     // week's bottom output — quiet-humor angle, low priority
} as const

const THRESHOLD = {
  blowoutMult: 0.40,
  photoFinishMult: 0.03,
  shootoutMult: 1.25,
  slugfestMult: 0.75,
} as const

/** Stages where weekly matchup stories make sense — same set the
 *  category matchup detectors use. */
const IN_SEASON_STAGES: SeasonStage[] = ALL_ACTIVE_STAGES

/* ─────────────────────────────────────────────────────────────────
   LOCAL HELPERS
───────────────────────────────────────────────────────────────── */

/** Only `final` matchups have a real, finished margin. */
function isFinal(m: LeagueDataPointsMatchup): boolean {
  return m.status === 'final'
}

/** Resolves this week's per-team scoring baseline.
 *
 *  Prefers the adapter-supplied season average. When that's absent,
 *  falls back to the mean of this week's own final-game team totals —
 *  but only when there are at least two games, so the fallback means
 *  something. Returns `undefined` rather than inventing a number when
 *  neither source is available; callers must treat `undefined` (and
 *  any non-positive value) as "skip the margin stories". */
function resolveBaseline(
  data: LeagueDataH2HPoints,
  finalGames: LeagueDataPointsMatchup[],
): number | undefined {
  if (typeof data.weeklyPointsAverage === 'number') {
    return data.weeklyPointsAverage
  }
  if (finalGames.length < 2) return undefined
  const totals = finalGames.flatMap((m) => [m.homePoints, m.awayPoints])
  return totals.reduce((sum, v) => sum + v, 0) / totals.length
}

/* ─────────────────────────────────────────────────────────────────
   1. BLOWOUT
   Margin between the two sides is at least 40% of the weekly average.
───────────────────────────────────────────────────────────────── */

function detectBlowout(
  data: LeagueDataH2HPoints,
  context: IssueContext,
  finalGames: LeagueDataPointsMatchup[],
  baseline: number | undefined,
): StoryCandidate[] {
  const out: StoryCandidate[] = []
  if (baseline == null || baseline <= 0) return out

  for (const m of finalGames) {
    const margin = Math.abs(m.homePoints - m.awayPoints)
    if (margin < THRESHOLD.blowoutMult * baseline) continue

    const winnerId = m.homePoints > m.awayPoints ? m.homeTeamId : m.awayTeamId
    const loserId = winnerId === m.homeTeamId ? m.awayTeamId : m.homeTeamId
    const winnerPoints = Math.max(m.homePoints, m.awayPoints)
    const loserPoints = Math.min(m.homePoints, m.awayPoints)

    out.push({
      type: 'points-blowout',
      category: 'matchup',
      weight: W.blowout,
      freshness: freshnessForWeekAge(0),
      scope: 'matchup',
      teamIds: [winnerId, loserId],
      seasonStages: IN_SEASON_STAGES,
      context: {
        matchupId: m.id,
        winnerTeamId: winnerId,
        loserTeamId: loserId,
        winnerPoints,
        loserPoints,
        margin,
        baseline,
        week: context.currentWeek,
      },
      signature: signature([
        'points-blowout',
        data.currentSeason,
        context.currentWeek,
        ...[winnerId, loserId].sort(),
      ]),
    })
  }
  return out
}

/* ─────────────────────────────────────────────────────────────────
   2. PHOTO-FINISH
   Margin is inside 3% of the weekly average. A tie (margin 0) always
   qualifies here and never qualifies as a blowout — the two
   thresholds can't both be satisfied by the same margin.
───────────────────────────────────────────────────────────────── */

function detectPhotoFinish(
  data: LeagueDataH2HPoints,
  context: IssueContext,
  finalGames: LeagueDataPointsMatchup[],
  baseline: number | undefined,
): StoryCandidate[] {
  const out: StoryCandidate[] = []
  if (baseline == null || baseline <= 0) return out

  for (const m of finalGames) {
    const margin = Math.abs(m.homePoints - m.awayPoints)
    if (margin > THRESHOLD.photoFinishMult * baseline) continue

    const pair = [m.homeTeamId, m.awayTeamId]
    out.push({
      type: 'points-photo-finish',
      category: 'matchup',
      weight: W.photoFinish,
      freshness: freshnessForWeekAge(0),
      scope: 'matchup',
      teamIds: pair,
      seasonStages: IN_SEASON_STAGES,
      context: {
        matchupId: m.id,
        homeTeamId: m.homeTeamId,
        awayTeamId: m.awayTeamId,
        homePoints: m.homePoints,
        awayPoints: m.awayPoints,
        margin,
        baseline,
        week: context.currentWeek,
      },
      signature: signature([
        'points-photo-finish',
        data.currentSeason,
        context.currentWeek,
        ...[...pair].sort(),
      ]),
    })
  }
  return out
}

/* ─────────────────────────────────────────────────────────────────
   3. SHOOTOUT
   Both sides cleared 125% of the weekly average — two offenses that
   both went off.
───────────────────────────────────────────────────────────────── */

function detectShootout(
  data: LeagueDataH2HPoints,
  context: IssueContext,
  finalGames: LeagueDataPointsMatchup[],
  baseline: number | undefined,
): StoryCandidate[] {
  const out: StoryCandidate[] = []
  if (baseline == null || baseline <= 0) return out

  const cutoff = THRESHOLD.shootoutMult * baseline
  for (const m of finalGames) {
    if (m.homePoints < cutoff || m.awayPoints < cutoff) continue

    const pair = [m.homeTeamId, m.awayTeamId]
    out.push({
      type: 'points-shootout',
      category: 'matchup',
      weight: W.shootout,
      freshness: freshnessForWeekAge(0),
      scope: 'matchup',
      teamIds: pair,
      seasonStages: IN_SEASON_STAGES,
      context: {
        matchupId: m.id,
        homeTeamId: m.homeTeamId,
        awayTeamId: m.awayTeamId,
        homePoints: m.homePoints,
        awayPoints: m.awayPoints,
        baseline,
        week: context.currentWeek,
      },
      signature: signature([
        'points-shootout',
        data.currentSeason,
        context.currentWeek,
        ...[...pair].sort(),
      ]),
    })
  }
  return out
}

/* ─────────────────────────────────────────────────────────────────
   4. SLUGFEST
   Both sides stayed at or below 75% of the weekly average — a
   grind-it-out week where neither offense showed up.
───────────────────────────────────────────────────────────────── */

function detectSlugfest(
  data: LeagueDataH2HPoints,
  context: IssueContext,
  finalGames: LeagueDataPointsMatchup[],
  baseline: number | undefined,
): StoryCandidate[] {
  const out: StoryCandidate[] = []
  if (baseline == null || baseline <= 0) return out

  const cutoff = THRESHOLD.slugfestMult * baseline
  for (const m of finalGames) {
    if (m.homePoints > cutoff || m.awayPoints > cutoff) continue

    const pair = [m.homeTeamId, m.awayTeamId]
    out.push({
      type: 'points-slugfest',
      category: 'matchup',
      weight: W.slugfest,
      freshness: freshnessForWeekAge(0),
      scope: 'matchup',
      teamIds: pair,
      seasonStages: IN_SEASON_STAGES,
      context: {
        matchupId: m.id,
        homeTeamId: m.homeTeamId,
        awayTeamId: m.awayTeamId,
        homePoints: m.homePoints,
        awayPoints: m.awayPoints,
        baseline,
        week: context.currentWeek,
      },
      signature: signature([
        'points-slugfest',
        data.currentSeason,
        context.currentWeek,
        ...[...pair].sort(),
      ]),
    })
  }
  return out
}

/* ─────────────────────────────────────────────────────────────────
   5 + 6. HIGH-SCORE / LOW-SCORE
   The week's single highest and lowest team total across every final
   matchup. League-scoped — not about any one pairing. Independent of
   the baseline: these are facts about the week, not relative margins.
───────────────────────────────────────────────────────────────── */

interface TeamTotal {
  teamId: string
  points: number
  matchupId: string
}

function teamTotals(finalGames: LeagueDataPointsMatchup[]): TeamTotal[] {
  const out: TeamTotal[] = []
  for (const m of finalGames) {
    out.push({ teamId: m.homeTeamId, points: m.homePoints, matchupId: m.id })
    out.push({ teamId: m.awayTeamId, points: m.awayPoints, matchupId: m.id })
  }
  return out
}

function detectHighLowScore(
  data: LeagueDataH2HPoints,
  context: IssueContext,
  finalGames: LeagueDataPointsMatchup[],
): StoryCandidate[] {
  const totals = teamTotals(finalGames)
  if (totals.length === 0) return []

  // Strict comparisons keep the first occurrence on ties, so the same
  // input always resolves to the same team — stable signatures.
  let high = totals[0]
  let low = totals[0]
  for (const t of totals) {
    if (t.points > high.points) high = t
    if (t.points < low.points) low = t
  }

  return [
    {
      type: 'points-high-score',
      category: 'matchup',
      weight: W.highScore,
      freshness: freshnessForWeekAge(0),
      scope: 'league',
      teamIds: [high.teamId],
      seasonStages: IN_SEASON_STAGES,
      context: {
        matchupId: high.matchupId,
        teamId: high.teamId,
        points: high.points,
        week: context.currentWeek,
      },
      signature: signature([
        'points-high-score',
        data.currentSeason,
        context.currentWeek,
        high.teamId,
      ]),
    },
    {
      type: 'points-low-score',
      category: 'matchup',
      weight: W.lowScore,
      freshness: freshnessForWeekAge(0),
      scope: 'league',
      teamIds: [low.teamId],
      seasonStages: IN_SEASON_STAGES,
      context: {
        matchupId: low.matchupId,
        teamId: low.teamId,
        points: low.points,
        week: context.currentWeek,
      },
      signature: signature([
        'points-low-score',
        data.currentSeason,
        context.currentWeek,
        low.teamId,
      ]),
    },
  ]
}

/* ─────────────────────────────────────────────────────────────────
   ORCHESTRATOR
───────────────────────────────────────────────────────────────── */

export function detectPointsStories(
  data: LeagueData,
  context: IssueContext,
): StoryCandidate[] {
  // Points-only. These stories are built from continuous point totals,
  // which a category league has no equivalent of — that's cat-sweep,
  // blowout, etc. in matchups.ts.
  if (data.format !== 'h2h-points') return []

  const allGames = data.currentWeekMatchups ?? []
  const finalGames = allGames.filter(isFinal)
  if (finalGames.length === 0) return []

  const baseline = resolveBaseline(data, finalGames)

  return [
    ...detectBlowout(data, context, finalGames, baseline),
    ...detectPhotoFinish(data, context, finalGames, baseline),
    ...detectShootout(data, context, finalGames, baseline),
    ...detectSlugfest(data, context, finalGames, baseline),
    ...detectHighLowScore(data, context, finalGames),
  ]
}
