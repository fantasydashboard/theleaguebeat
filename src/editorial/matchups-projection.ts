/**
 * Honest matchup projection.
 *
 * Category H2H matchups have a defined end-of-week probability under a
 * stated heuristic — never a Monte Carlo simulation. The model:
 *
 *  - Each LOCKED cat (matchup finalized + decided, or one side punted)
 *    contributes a certain win to its side.
 *  - Each LIVE (in-play) cat gets a per-cat P(home wins this cat) based
 *    on who's currently leading and how much of the week has elapsed.
 *    Early-week leads are nearly coin flips; end-of-week leads approach
 *    1.0 for the current leader. The shape is concave so "a lead on
 *    Monday is fragile but a lead on Saturday is mostly safe."
 *  - The matchup win is the sum over all per-cat outcome combinations
 *    where home final cat total > away final cat total, computed via a
 *    convolution (DP) over the in-play cats. Tied final cat totals are
 *    split 50/50.
 *
 * Output is labeled as a projection, not a simulation, and the UI must
 * not describe it as Monte Carlo.
 */

import type { CategoryLeagueDataCatLine } from './types.ts'

export interface MatchupProjection {
  homeWinProb: number   // 0..1
  awayWinProb: number   // 0..1
  homeProj: number      // expected end-of-week home cat wins
  awayProj: number      // expected end-of-week away cat wins
}

/** Lower-better category ids for baseball. Pitching: ERA, WHIP, BAA,
 *  losses, blown saves. Add other-sport lower-better cats when those
 *  adapters land. */
export const LOWER_BETTER_BASEBALL_CATS = new Set([
  'ERA', 'WHIP', 'BAA', 'L', 'LOSS', 'LOSSES', 'BSV', 'BS', 'HRA', 'BB',
])

/* ─────────────────────────────────────────────────────────────────
   CORE PROJECTION
───────────────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────────────
   SEASON-STRENGTH PRIOR
───────────────────────────────────────────────────────────────── */

/** Bradley-Terry style prior for "P(home beats away)" using season
 *  cat-record win percentages. Used to blend with the cat-based
 *  projection early in the week, before per-cat data has moved enough
 *  to be informative. On Monday with 0-0 records across every cat,
 *  this is the only signal that gives Juuuust a bit outside (#1)
 *  the favorite over Frozen shah (#8). */
export function seasonStrengthPrior(
  homeWinPct: number | undefined,
  awayWinPct: number | undefined,
): number {
  if (homeWinPct === undefined || awayWinPct === undefined) return 0.5
  const h = Math.max(0.01, homeWinPct)
  const a = Math.max(0.01, awayWinPct)
  const sum = h + a
  if (sum <= 0) return 0.5
  const raw = h / sum
  // Clamp 20-80% — even a vast season mismatch shouldn't claim 99%
  // confidence on Monday morning when no cats have moved.
  return Math.max(0.20, Math.min(0.80, raw))
}

/** Pure projection from a per-in-play-cat home-win-probability array
 *  + the count of cats already locked for each side. */
export function computeProjectionFromPerCat(
  perCatHomeWinProb: number[],
  lockedHomeWins: number,
  lockedAwayWins: number,
): MatchupProjection {
  const N = perCatHomeWinProb.length
  const H = Math.max(0, Math.round(lockedHomeWins))
  const A = Math.max(0, Math.round(lockedAwayWins))

  // DP: dp[k] = P(home wins exactly k of the N in-play cats).
  let dp: number[] = [1]
  for (const p of perCatHomeWinProb) {
    const next = new Array(dp.length + 1).fill(0) as number[]
    for (let k = 0; k < dp.length; k++) {
      next[k] += dp[k] * (1 - p)
      next[k + 1] += dp[k] * p
    }
    dp = next
  }

  let homeProb = 0
  let tieProb = 0
  let homeExpectedK = 0
  for (let k = 0; k < dp.length; k++) {
    const p = dp[k]
    const homeFinal = H + k
    const awayFinal = A + (N - k)
    if (homeFinal > awayFinal) homeProb += p
    else if (homeFinal === awayFinal) tieProb += p
    homeExpectedK += p * k
  }
  const homeWinProb = homeProb + tieProb / 2
  return {
    homeWinProb,
    awayWinProb: 1 - homeWinProb,
    homeProj: H + homeExpectedK,
    awayProj: A + (N - homeExpectedK),
  }
}

/* ─────────────────────────────────────────────────────────────────
   ADAPTER HELPER — cat-lines → projection
───────────────────────────────────────────────────────────────── */

export interface ProjectionFromCatLinesArgs {
  catLines: CategoryLeagueDataCatLine[]
  /** Catids where lower numeric value is better (ERA, WHIP, ...). */
  lowerBetterCats?: Set<string>
  /** Day-of-week index, 0 = Monday, 6 = Sunday. */
  daysInWeek: number
  /** Total days in a scoring week — almost always 7. */
  weekLength?: number
  /** True when the matchup has finalized (Yahoo `winner_team_key` set,
   *  ESPN `winner` set, etc.). Locked-but-leading cats during a live
   *  week should set isFinal=false. */
  isFinal: boolean
  /** Optional season-strength prior — P(home beats away) derived
   *  from season cat-record win percentages. When provided, blended
   *  with the cat-based result so Monday matchups carry the season's
   *  signal instead of 50/50 across the board. Blend weight follows
   *  the same day-factor curve as per-cat probabilities — heavy
   *  reliance on the prior early, full deference to cats by Sunday. */
  homePrior?: number
}

/** Compute a projection directly from the matchup's cat lines.
 *
 *  Each contested cat's home-win probability is:
 *    - 1.0 if the matchup is final and the cat is locked for home.
 *    - 0.0 if final and locked for away.
 *    - 0.5 if currently tied during a live week.
 *    - 0.5 + 0.5 * dayFactor if home is currently leading the cat.
 *    - 0.5 - 0.5 * dayFactor if away is currently leading the cat.
 *
 *  `dayFactor` is `(daysIn / weekLength)^0.7` — concave so early-week
 *  leads stay fragile and late-week leads approach certainty. */
export function buildProjectionFromCatLines(args: ProjectionFromCatLinesArgs): MatchupProjection {
  const weekLength = args.weekLength ?? 7
  const dayFactor = Math.max(
    0,
    Math.min(1, Math.pow(Math.max(0, args.daysInWeek) / weekLength, 0.7)),
  )
  const lowerBetter = args.lowerBetterCats ?? LOWER_BETTER_BASEBALL_CATS

  const perCat: number[] = []
  let lockedHome = 0
  let lockedAway = 0

  for (const line of args.catLines) {
    if (line.status === 'punted-home') {
      // Home conceded — away gets the cat for free.
      lockedAway += 1
      continue
    }
    if (line.status === 'punted-away') {
      lockedHome += 1
      continue
    }
    if (args.isFinal) {
      // After finalization, decided-X is a locked win.
      if (line.status === 'decided-home') lockedHome += 1
      else if (line.status === 'decided-away') lockedAway += 1
      else perCat.push(0.5)   // an unresolved cat at finalization is rare
      continue
    }
    // Live or upcoming: even cats with status `decided-X` (mid-week
    // leader per Yahoo) are NOT locked. They contribute to the binomial
    // with a per-cat probability based on their current direction.
    const lb = lowerBetter.has(line.catId)
    const homeLeading = lb
      ? line.homeCurrent < line.awayCurrent
      : line.homeCurrent > line.awayCurrent
    const awayLeading = lb
      ? line.awayCurrent < line.homeCurrent
      : line.awayCurrent > line.homeCurrent

    if (!homeLeading && !awayLeading) {
      perCat.push(0.5)
    } else if (homeLeading) {
      perCat.push(0.5 + 0.5 * dayFactor)
    } else {
      perCat.push(0.5 - 0.5 * dayFactor)
    }
  }

  const catProjection = computeProjectionFromPerCat(perCat, lockedHome, lockedAway)

  // No prior provided, or matchup is final — return the pure cat-based
  // projection unchanged.
  if (args.homePrior === undefined || args.isFinal) return catProjection

  // Blend with the season-strength prior. Monday (dayFactor=0) leans
  // entirely on the prior; Sunday (dayFactor≈0.88) leans heavily on
  // the cats. The same dayFactor that scales per-cat lead confidence
  // scales the prior's reverse-weight, so the model transitions
  // smoothly across the week.
  const priorWeight = 1 - dayFactor
  const blendedHomeWinProb =
    args.homePrior * priorWeight + catProjection.homeWinProb * (1 - priorWeight)
  const clampedHome = Math.max(0.01, Math.min(0.99, blendedHomeWinProb))
  return {
    homeWinProb: clampedHome,
    awayWinProb: 1 - clampedHome,
    homeProj: catProjection.homeProj,
    awayProj: catProjection.awayProj,
  }
}

/* ─────────────────────────────────────────────────────────────────
   DAYS-IN-WEEK HELPER
───────────────────────────────────────────────────────────────── */

/** Days elapsed within the current Yahoo scoring week. Yahoo weeks run
 *  Mon→Sun, so Monday = 0 and Sunday = 6. */
export function daysInCurrentWeek(now: Date = new Date()): number {
  const dow = now.getDay()   // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  // Convert to Mon=0..Sun=6.
  return dow === 0 ? 6 : dow - 1
}

/** Days REMAINING in the current week, including today. Monday = 7,
 *  Sunday = 1. Drives the cat-lock heuristic ("can this margin
 *  realistically close before the week ends?"). */
export function daysLeftInCurrentWeek(now: Date = new Date()): number {
  return 7 - daysInCurrentWeek(now)
}

/* ─────────────────────────────────────────────────────────────────
   FUNCTIONAL LOCK DETECTOR
───────────────────────────────────────────────────────────────── */

/** A cat's *effective* status — what a magazine writer would say
 *  about it. Distinguishes "currently leading" from "mathematically
 *  out of reach," which Yahoo's data model doesn't. */
export type EffectiveCatStatus =
  | 'locked-home'
  | 'locked-away'
  | 'live'
  | 'tied'
  | 'punted-home'
  | 'punted-away'

/** Per-cat heuristic for how much the margin can realistically swing
 *  in one day. Counting cats with high daily volume (R/H/RBI/K) move
 *  in big steps; rate cats (AVG/ERA/WHIP) stabilize fast. */
function maxDailySwing(catId: string): number {
  if (catId === 'AVG' || catId === 'OBP' || catId === 'SLG' || catId === 'OPS') return 0.018
  if (catId === 'ERA' || catId === 'WHIP' || catId === 'BAA') return 0.35
  if (catId === 'K/9') return 0.45
  if (catId === 'R' || catId === 'H' || catId === 'RBI' || catId === 'K') return 4
  // HR, SB, BB, W, SV, HLD, L — lower-volume counting cats
  return 1.5
}

/** Compute the effective status of a single cat-line given how many
 *  days are left in the scoring week. A cat is "locked" when the
 *  current leader's margin exceeds what the trailer could realistically
 *  close in `daysLeft` days. */
export function effectiveCatStatus(
  line: CategoryLeagueDataCatLine,
  daysLeft: number,
  lowerBetterCats: Set<string> = LOWER_BETTER_BASEBALL_CATS,
): EffectiveCatStatus {
  if (line.status === 'punted-home') return 'punted-home'
  if (line.status === 'punted-away') return 'punted-away'
  // Yahoo-decided cats (only true after the week finalizes) ARE locks.
  if (line.status === 'decided-home') return 'locked-home'
  if (line.status === 'decided-away') return 'locked-away'

  if (line.homeCurrent === line.awayCurrent) return 'tied'

  const lb = lowerBetterCats.has(line.catId)
  const homeLeads = lb
    ? line.homeCurrent < line.awayCurrent
    : line.homeCurrent > line.awayCurrent
  const margin = Math.abs(line.homeCurrent - line.awayCurrent)

  // Use at least 1 day so we don't claim mid-Sunday locks for cats
  // that could still swing with a single game.
  const d = Math.max(1, daysLeft)
  const threshold = d * maxDailySwing(line.catId)

  if (margin > threshold) {
    return homeLeads ? 'locked-home' : 'locked-away'
  }
  return 'live'
}

/** Lock-aware counts for a matchup — drives state-of-play copy. */
export interface MatchupLockSummary {
  homeLocks: number
  awayLocks: number
  liveCats: number      // contested, could realistically flip
  tiedCats: number      // currently even, either way is open
  homePunts: number
  awayPunts: number
  totalCats: number
  /** Cat ids that are still in play (live + tied). Ordered as in catLines. */
  movingCatIds: string[]
}

export function summarizeLocks(
  catLines: CategoryLeagueDataCatLine[],
  daysLeft: number,
  lowerBetterCats?: Set<string>,
): MatchupLockSummary {
  let homeLocks = 0
  let awayLocks = 0
  let liveCats = 0
  let tiedCats = 0
  let homePunts = 0
  let awayPunts = 0
  const movingCatIds: string[] = []
  for (const line of catLines) {
    const status = effectiveCatStatus(line, daysLeft, lowerBetterCats)
    switch (status) {
      case 'locked-home': homeLocks++; break
      case 'locked-away': awayLocks++; break
      case 'punted-home': homePunts++; break
      case 'punted-away': awayPunts++; break
      case 'tied':        tiedCats++; movingCatIds.push(line.catId); break
      case 'live':        liveCats++; movingCatIds.push(line.catId); break
    }
  }
  return {
    homeLocks, awayLocks, liveCats, tiedCats, homePunts, awayPunts,
    totalCats: catLines.length,
    movingCatIds,
  }
}
