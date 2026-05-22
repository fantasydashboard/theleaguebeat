/**
 * Season-stage detectors — thirteen calendar-driven story types that
 * fire when the league hits specific points in the season (opening
 * week, halfway, trade deadline, playoff opener, etc.).
 *
 * Most of these are pure functions of `currentWeek` and
 * `regularSeasonEndWeek`. Each emits a STAGE-DEFINING story when the
 * league passes the relevant boundary.
 *
 * All detectors here are PURE and NEVER THROW. Missing
 * `regularSeasonEndWeek` falls back to 12 (matches the demo fixture +
 * `deriveSeasonStage` helper).
 *
 * See docs/EDITORIAL_ARCHITECTURE.md (section "G. Season stage").
 */

import type { CategoryLeagueData } from '../types'
import {
  freshnessForWeekAge,
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

const W_OPENING_WEEK = 70
const W_POST_DRAFT_AUTOPSY = 60
const W_QUARTER_POLE = 55
const W_ALL_STAR_BREAK = 50
const W_TRADE_DEADLINE_WEEK = 75
const W_HALFWAY_POINT = 50
const W_THREE_QUARTER_MARK = 50
const W_LAST_FOUR_WEEKS = 70
const W_LAST_TWO_WEEKS = 80
const W_FINAL_WEEK = 90
const W_PLAYOFF_OPENER = 95
const W_SEMIFINAL_WEEK = 92
const W_CHAMPIONSHIP_WEEK = 100

/* ─────────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────────── */

/** Default end-of-regular-season week when adapter doesn't populate
 *  it. Matches `deriveSeasonStage`'s fallback. */
const DEFAULT_END_WEEK = 12

/* ─────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────── */

/** Resolves the regular-season end week with a 12 fallback. */
function endWeekOf(data: CategoryLeagueData): number {
  return data.regularSeasonEndWeek ?? DEFAULT_END_WEEK
}

/** Builds a stable signature scoped to (storyType + season + week)
 *  so the same calendar event in the same season hashes consistently. */
function sigFor(
  type: string,
  data: CategoryLeagueData,
  week?: number,
): string {
  return signature([type, data.currentSeason, week ?? data.currentWeek])
}

/** Wraps a one-liner candidate factory — every season-stage story is
 *  scope 'league' with no team ids and a payload that mirrors the
 *  context shape the renderer needs. */
function leagueCandidate(args: {
  type: StoryCandidate['type']
  weight: number
  stages: SeasonStage[]
  data: CategoryLeagueData
  extraContext?: Record<string, unknown>
}): StoryCandidate {
  const endWeek = endWeekOf(args.data)
  return {
    type: args.type,
    category: 'seasonStage',
    weight: args.weight,
    freshness: freshnessForWeekAge(0),
    scope: 'league',
    seasonStages: args.stages,
    context: {
      week: args.data.currentWeek,
      season: args.data.currentSeason,
      regularSeasonEndWeek: endWeek,
      ...(args.extraContext ?? {}),
    },
    signature: sigFor(args.type, args.data),
  }
}

/* ─────────────────────────────────────────────────────────────────
   1. OPENING WEEK
───────────────────────────────────────────────────────────────── */

function detectOpeningWeek(data: CategoryLeagueData): StoryCandidate[] {
  if (data.currentWeek !== 1) return []
  return [
    leagueCandidate({
      type: 'opening-week',
      weight: W_OPENING_WEEK,
      stages: ['opening'],
      data,
    }),
  ]
}

/* ─────────────────────────────────────────────────────────────────
   2. POST-DRAFT AUTOPSY
   Fires in week 2 or week 3 — early enough to recap the draft, late
   enough to have at least one week of evidence to score it.
───────────────────────────────────────────────────────────────── */

function detectPostDraftAutopsy(data: CategoryLeagueData): StoryCandidate[] {
  if (data.currentWeek !== 2 && data.currentWeek !== 3) return []
  return [
    leagueCandidate({
      type: 'post-draft-autopsy',
      weight: W_POST_DRAFT_AUTOPSY,
      stages: ['opening'],
      data,
    }),
  ]
}

/* ─────────────────────────────────────────────────────────────────
   3. QUARTER POLE
   The exact week where 1/4 of the regular season has elapsed.
───────────────────────────────────────────────────────────────── */

function detectQuarterPole(data: CategoryLeagueData): StoryCandidate[] {
  const endWeek = endWeekOf(data)
  const target = Math.round(endWeek / 4)
  if (data.currentWeek !== target) return []
  return [
    leagueCandidate({
      type: 'quarter-pole',
      weight: W_QUARTER_POLE,
      stages: ['settling', 'midseason'],
      data,
      extraContext: { quarterPoleWeek: target },
    }),
  ]
}

/* ─────────────────────────────────────────────────────────────────
   4. ALL-STAR BREAK
   MLB only. The real MLB All-Star game is mid-July; without a proper
   schedule lookup we approximate by "second weekend of July" using
   the issueDate. TODO: pull this from the platform's scheduled
   break instead of hard-coding July.
───────────────────────────────────────────────────────────────── */

function detectAllStarBreak(
  data: CategoryLeagueData,
  context: IssueContext,
): StoryCandidate[] {
  // We don't have a `sport` field exposed on CategoryLeagueData, so
  // we treat the demo fixture (categories like baseball stat keys) as
  // implicitly MLB. Without a sport flag this detector is best-effort
  // and conservative — only fire mid-July, only mid-season, and only
  // when end-of-regular-season looks baseball-shaped (>= 20 weeks
  // would suggest non-MLB; baseball fantasy is ~25 weeks long).
  // TODO: replace with `data.sport === 'baseball'` once that field
  //       lands on the contract, and look up the All-Star date from
  //       the actual MLB schedule.
  const month = context.issueDate.getMonth() // 0=Jan, 6=Jul
  const day = context.issueDate.getDate()
  const inAllStarWindow = month === 6 && day >= 10 && day <= 21
  if (!inAllStarWindow) return []

  // Only fire mid-season — otherwise the calendar hit is irrelevant.
  // We approximate the mid-season window as weeks 8 through end-8.
  const endWeek = endWeekOf(data)
  if (data.currentWeek < 8 || data.currentWeek > endWeek - 8) return []

  return [
    leagueCandidate({
      type: 'all-star-break',
      weight: W_ALL_STAR_BREAK,
      stages: ['midseason'],
      data,
      extraContext: {
        approximated: true,
        issueDateIso: context.issueDate.toISOString().slice(0, 10),
      },
    }),
  ]
}

/* ─────────────────────────────────────────────────────────────────
   5. TRADE DEADLINE WEEK
   The two weeks straddling the midpoint of the regular season.
───────────────────────────────────────────────────────────────── */

function detectTradeDeadlineWeek(
  data: CategoryLeagueData,
): StoryCandidate[] {
  const endWeek = endWeekOf(data)
  const mid = Math.round(endWeek / 2)
  // Within 2 weeks of midpoint, inclusive on either side.
  if (Math.abs(data.currentWeek - mid) > 2) return []
  return [
    leagueCandidate({
      type: 'trade-deadline-week',
      weight: W_TRADE_DEADLINE_WEEK,
      stages: ['midseason'],
      data,
      extraContext: {
        deadlineWeek: mid,
        weeksUntilDeadline: mid - data.currentWeek,
      },
    }),
  ]
}

/* ─────────────────────────────────────────────────────────────────
   6. HALFWAY POINT
   The exact mid-point of the regular season.
───────────────────────────────────────────────────────────────── */

function detectHalfwayPoint(data: CategoryLeagueData): StoryCandidate[] {
  const endWeek = endWeekOf(data)
  const target = Math.round(endWeek / 2)
  if (data.currentWeek !== target) return []
  return [
    leagueCandidate({
      type: 'halfway-point',
      weight: W_HALFWAY_POINT,
      stages: ['midseason'],
      data,
      extraContext: { halfwayWeek: target },
    }),
  ]
}

/* ─────────────────────────────────────────────────────────────────
   7. THREE-QUARTER MARK
───────────────────────────────────────────────────────────────── */

function detectThreeQuarterMark(
  data: CategoryLeagueData,
): StoryCandidate[] {
  const endWeek = endWeekOf(data)
  const target = Math.round((3 * endWeek) / 4)
  if (data.currentWeek !== target) return []
  return [
    leagueCandidate({
      type: 'three-quarter-mark',
      weight: W_THREE_QUARTER_MARK,
      stages: ['midseason', 'stretch'],
      data,
      extraContext: { threeQuarterMarkWeek: target },
    }),
  ]
}

/* ─────────────────────────────────────────────────────────────────
   8. LAST FOUR WEEKS
   Fires when 4 or 3 weeks remain in the regular season.
───────────────────────────────────────────────────────────────── */

function detectLastFourWeeks(data: CategoryLeagueData): StoryCandidate[] {
  const remaining = weeksRemaining(data.currentWeek, data.regularSeasonEndWeek)
  if (remaining !== 4 && remaining !== 3) return []
  return [
    leagueCandidate({
      type: 'last-four-weeks',
      weight: W_LAST_FOUR_WEEKS,
      stages: ['stretch', 'final'],
      data,
      extraContext: { weeksRemaining: remaining },
    }),
  ]
}

/* ─────────────────────────────────────────────────────────────────
   9. LAST TWO WEEKS
───────────────────────────────────────────────────────────────── */

function detectLastTwoWeeks(data: CategoryLeagueData): StoryCandidate[] {
  const remaining = weeksRemaining(data.currentWeek, data.regularSeasonEndWeek)
  if (remaining !== 2 && remaining !== 1) return []
  return [
    leagueCandidate({
      type: 'last-two-weeks',
      weight: W_LAST_TWO_WEEKS,
      stages: ['final'],
      data,
      extraContext: { weeksRemaining: remaining },
    }),
  ]
}

/* ─────────────────────────────────────────────────────────────────
   10. FINAL WEEK
   The closing week of the regular season.
───────────────────────────────────────────────────────────────── */

function detectFinalWeek(data: CategoryLeagueData): StoryCandidate[] {
  const remaining = weeksRemaining(data.currentWeek, data.regularSeasonEndWeek)
  if (remaining !== 0) return []
  // Also guard against the playoff weeks — `weeksRemaining` clamps
  // to 0 once we're past the regular season, but the stage gate keeps
  // this story off the playoffs view too.
  if (data.currentWeek !== endWeekOf(data)) return []
  return [
    leagueCandidate({
      type: 'final-week',
      weight: W_FINAL_WEEK,
      stages: ['final'],
      data,
    }),
  ]
}

/* ─────────────────────────────────────────────────────────────────
   11. PLAYOFF OPENER
   First week of the postseason.
───────────────────────────────────────────────────────────────── */

function detectPlayoffOpener(
  data: CategoryLeagueData,
  context: IssueContext,
): StoryCandidate[] {
  if (context.seasonStage !== 'playoffs') return []
  if (data.currentWeek !== endWeekOf(data) + 1) return []
  return [
    leagueCandidate({
      type: 'playoff-opener',
      weight: W_PLAYOFF_OPENER,
      stages: ['playoffs'],
      data,
    }),
  ]
}

/* ─────────────────────────────────────────────────────────────────
   12. SEMIFINAL WEEK
───────────────────────────────────────────────────────────────── */

function detectSemifinalWeek(
  data: CategoryLeagueData,
  context: IssueContext,
): StoryCandidate[] {
  if (context.seasonStage !== 'playoffs') return []
  if (data.currentWeek !== endWeekOf(data) + 2) return []
  return [
    leagueCandidate({
      type: 'semifinal-week',
      weight: W_SEMIFINAL_WEEK,
      stages: ['playoffs'],
      data,
    }),
  ]
}

/* ─────────────────────────────────────────────────────────────────
   13. CHAMPIONSHIP WEEK
───────────────────────────────────────────────────────────────── */

function detectChampionshipWeek(
  data: CategoryLeagueData,
  context: IssueContext,
): StoryCandidate[] {
  if (context.seasonStage !== 'playoffs') return []
  if (data.currentWeek !== endWeekOf(data) + 3) return []
  return [
    leagueCandidate({
      type: 'championship-week',
      weight: W_CHAMPIONSHIP_WEEK,
      stages: ['playoffs'],
      data,
    }),
  ]
}

/* ─────────────────────────────────────────────────────────────────
   EXPORT
───────────────────────────────────────────────────────────────── */

/** Orchestrator for the season-stage module. */
export function detect(
  data: CategoryLeagueData,
  context: IssueContext,
): StoryCandidate[] {
  if (data.currentWeek == null || data.currentWeek < 1) return []

  const out: StoryCandidate[] = []

  // Detectors that only need `data`:
  const dataOnly: Array<(d: CategoryLeagueData) => StoryCandidate[]> = [
    detectOpeningWeek,
    detectPostDraftAutopsy,
    detectQuarterPole,
    detectTradeDeadlineWeek,
    detectHalfwayPoint,
    detectThreeQuarterMark,
    detectLastFourWeeks,
    detectLastTwoWeeks,
    detectFinalWeek,
  ]
  for (const run of dataOnly) {
    try {
      out.push(...run(data))
    } catch (err) {
      console.warn('[detection/seasonStage] detector threw:', err)
    }
  }

  // Detectors that need both `data` and `context`:
  const dataAndContext: Array<
    (d: CategoryLeagueData, c: IssueContext) => StoryCandidate[]
  > = [
    detectAllStarBreak,
    detectPlayoffOpener,
    detectSemifinalWeek,
    detectChampionshipWeek,
  ]
  for (const run of dataAndContext) {
    try {
      out.push(...run(data, context))
    } catch (err) {
      console.warn('[detection/seasonStage] detector threw:', err)
    }
  }

  return out
}
