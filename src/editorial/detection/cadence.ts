/**
 * Cadence detectors — five day-of-week story types. Unlike most
 * detectors these key off `context.issueDate.getDay()` rather than
 * week-of-season. They're the "rhythm" of a magazine that ships every
 * day: Monday is a recap, Friday is a preview, Sunday is the final
 * push, etc.
 *
 * All detectors here are PURE and NEVER THROW. They only emit during
 * active in-season stages (no Monday recap in the preseason).
 *
 * See docs/EDITORIAL_ARCHITECTURE.md (section "H. Day-of-week cadence").
 */

import type { LeagueData } from '../types'
import { freshnessForAgeHours, signature } from './helpers'
import type { IssueContext, SeasonStage, StoryCandidate } from './types'

/* ─────────────────────────────────────────────────────────────────
   WEIGHTS
───────────────────────────────────────────────────────────────── */

const W_MONDAY_RECAP = 65
const W_MIDWEEK_TRADE_TALK = 45
const W_FRIDAY_PREVIEW = 50
const W_SUNDAY_FINAL_PUSH = 60
const W_OFF_DAY_DEEP_DIVE = 35

/* ─────────────────────────────────────────────────────────────────
   STAGE SETS
───────────────────────────────────────────────────────────────── */

/** Every in-season stage. The cadence stories don't fire offseason. */
const ALL_IN_SEASON: SeasonStage[] = [
  'opening',
  'settling',
  'midseason',
  'stretch',
  'final',
  'playoffs',
]

/** Mid-week trade talk skips the first three weeks — no trades that
 *  fresh into the season. */
const SETTLING_TO_FINAL: SeasonStage[] = [
  'settling',
  'midseason',
  'stretch',
  'final',
]

/* ─────────────────────────────────────────────────────────────────
   DAY-OF-WEEK CONSTANTS
   JavaScript's Date.getDay(): 0=Sun, 1=Mon, ..., 6=Sat.
───────────────────────────────────────────────────────────────── */

const SUN = 0
const MON = 1
const TUE = 2
const WED = 3
const THU = 4
const FRI = 5

const DAY_LABELS: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
}

/* ─────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────── */

/** Freshness for cadence stories — they're hours-fresh by definition
 *  (we're emitting them on the day-of). We feed 0 hours through the
 *  curve so every cadence story starts at 1.0. */
function cadenceFreshness(): number {
  return freshnessForAgeHours(0)
}

/** Compose the shared context payload every cadence story carries.
 *
 *  Takes `LeagueData` directly rather than a projected `LeagueCore`
 *  -- cadence only reads league meta (`currentWeek`, `currentSeason`),
 *  which is a required field on both format interfaces, so there's
 *  nothing here that needs the standings-bearing projection. Going
 *  through `asLeagueCore()` would silently invent a standings
 *  precondition this module never had, which matters concretely: a
 *  football league in `pre_draft` legitimately has no standings yet,
 *  and cadence stories (which don't touch standings at all) still
 *  need to fire for it. */
function cadenceContext(
  data: LeagueData,
  context: IssueContext,
  extra?: Record<string, unknown>,
): Record<string, unknown> {
  const dow = context.issueDate.getDay()
  return {
    dayOfWeek: dow,
    dayLabel: DAY_LABELS[dow],
    hour: context.issueDate.getHours(),
    week: data.currentWeek,
    season: data.currentSeason,
    ...(extra ?? {}),
  }
}

function sigFor(
  type: string,
  data: LeagueData,
  context: IssueContext,
): string {
  // Date stamp the signature down to the day so the same cadence
  // story re-fires per-day but dedupes within a day.
  const isoDay = context.issueDate.toISOString().slice(0, 10)
  return signature([type, data.leagueId, data.currentSeason, isoDay])
}

/* ─────────────────────────────────────────────────────────────────
   1. MONDAY RECAP
───────────────────────────────────────────────────────────────── */

function detectMondayRecap(
  data: LeagueData,
  context: IssueContext,
): StoryCandidate[] {
  if (context.issueDate.getDay() !== MON) return []
  return [
    {
      type: 'monday-recap',
      category: 'cadence',
      weight: W_MONDAY_RECAP,
      freshness: cadenceFreshness(),
      scope: 'league',
      seasonStages: ALL_IN_SEASON,
      context: cadenceContext(data, context),
      signature: sigFor('monday-recap', data, context),
    },
  ]
}

/* ─────────────────────────────────────────────────────────────────
   2. MIDWEEK TRADE TALK
   Tuesday or Wednesday. Skips opening weeks (no trades yet).
───────────────────────────────────────────────────────────────── */

function detectMidweekTradeTalk(
  data: LeagueData,
  context: IssueContext,
): StoryCandidate[] {
  const dow = context.issueDate.getDay()
  if (dow !== TUE && dow !== WED) return []
  return [
    {
      type: 'midweek-trade-talk',
      category: 'cadence',
      weight: W_MIDWEEK_TRADE_TALK,
      freshness: cadenceFreshness(),
      scope: 'league',
      seasonStages: SETTLING_TO_FINAL,
      context: cadenceContext(data, context),
      signature: sigFor('midweek-trade-talk', data, context),
    },
  ]
}

/* ─────────────────────────────────────────────────────────────────
   3. FRIDAY PREVIEW
───────────────────────────────────────────────────────────────── */

function detectFridayPreview(
  data: LeagueData,
  context: IssueContext,
): StoryCandidate[] {
  if (context.issueDate.getDay() !== FRI) return []
  return [
    {
      type: 'friday-preview',
      category: 'cadence',
      weight: W_FRIDAY_PREVIEW,
      freshness: cadenceFreshness(),
      scope: 'league',
      seasonStages: ALL_IN_SEASON,
      context: cadenceContext(data, context),
      signature: sigFor('friday-preview', data, context),
    },
  ]
}

/* ─────────────────────────────────────────────────────────────────
   4. SUNDAY FINAL PUSH
───────────────────────────────────────────────────────────────── */

function detectSundayFinalPush(
  data: LeagueData,
  context: IssueContext,
): StoryCandidate[] {
  if (context.issueDate.getDay() !== SUN) return []
  return [
    {
      type: 'sunday-final-push',
      category: 'cadence',
      weight: W_SUNDAY_FINAL_PUSH,
      freshness: cadenceFreshness(),
      scope: 'league',
      seasonStages: ALL_IN_SEASON,
      context: cadenceContext(data, context),
      signature: sigFor('sunday-final-push', data, context),
    },
  ]
}

/* ─────────────────────────────────────────────────────────────────
   5. OFF-DAY DEEP DIVE
   Thursday — historically a quiet day in MLB, used for analysis.
───────────────────────────────────────────────────────────────── */

function detectOffDayDeepDive(
  data: LeagueData,
  context: IssueContext,
): StoryCandidate[] {
  if (context.issueDate.getDay() !== THU) return []
  return [
    {
      type: 'off-day-deep-dive',
      category: 'cadence',
      weight: W_OFF_DAY_DEEP_DIVE,
      freshness: cadenceFreshness(),
      scope: 'league',
      seasonStages: ALL_IN_SEASON,
      context: cadenceContext(data, context),
      signature: sigFor('off-day-deep-dive', data, context),
    },
  ]
}

/* ─────────────────────────────────────────────────────────────────
   EXPORT
───────────────────────────────────────────────────────────────── */

/** Orchestrator for the cadence module.
 *
 *  Works for both formats: cadence stories key off the day of week
 *  and league meta, not how a week was scored or whether standings
 *  have accrued yet. Deliberately does NOT project through
 *  `asLeagueCore()` -- these detectors have no standings
 *  precondition to project onto in the first place, and adding one
 *  would silently stop cadence stories from firing for any league
 *  (e.g. a pre-draft football league) that hasn't built standings
 *  yet, which is a real regression, not tidiness. */
export function detect(
  data: LeagueData,
  context: IssueContext,
): StoryCandidate[] {
  if (!context || !context.issueDate) return []

  const out: StoryCandidate[] = []
  const runners = [
    detectMondayRecap,
    detectMidweekTradeTalk,
    detectFridayPreview,
    detectSundayFinalPush,
    detectOffDayDeepDive,
  ]
  for (const run of runners) {
    try {
      out.push(...run(data, context))
    } catch (err) {
      console.warn('[detection/cadence] detector threw:', err)
    }
  }
  return out
}
