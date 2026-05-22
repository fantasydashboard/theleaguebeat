/**
 * Shared detector helpers — pure functions used by multiple detector
 * modules. Keep math out of detectors; put it here so it's tested
 * once and reused.
 */

import type {
  CategoryLeagueData,
  CategoryLeagueDataStanding,
  CategoryLeagueDataTeam,
} from '../types'
import type { SeasonStage } from './types'

/* ─────────────────────────────────────────────────────────────────
   STAGE DERIVATION
───────────────────────────────────────────────────────────────── */

/** Bucket the current week into a season stage. Drives which
 *  detectors fire and how composition composes the page. */
export function deriveSeasonStage(
  currentWeek: number,
  regularSeasonEndWeek: number | undefined,
): SeasonStage {
  if (currentWeek < 1) return 'preseason'

  // Fall back to 12 if the adapter didn't populate end week (legacy
  // demo fixture). Same fallback as in detect.ts today.
  const endWeek = regularSeasonEndWeek ?? 12

  if (currentWeek > endWeek + 3) return 'offseason'
  if (currentWeek > endWeek) return 'playoffs'

  const remaining = endWeek - currentWeek
  if (currentWeek <= 3) return 'opening'
  if (currentWeek <= 7) return 'settling'
  if (remaining <= 2) return 'final'
  if (remaining <= 5) return 'stretch'
  return 'midseason'
}

/* ─────────────────────────────────────────────────────────────────
   RANK / STANDINGS LOOKUPS
───────────────────────────────────────────────────────────────── */

export function standingFor(
  data: CategoryLeagueData,
  teamId: string,
): CategoryLeagueDataStanding | undefined {
  return data.standings.find((s) => s.teamId === teamId)
}

export function teamFor(
  data: CategoryLeagueData,
  teamId: string,
): CategoryLeagueDataTeam | undefined {
  return data.teams.find((t) => t.id === teamId)
}

/** Rank for a team at a specific week. Falls back to current
 *  standings when the in-progress week isn't in history yet
 *  (ESPN only writes history for fully-decided weeks). */
export function rankAtWeek(
  data: CategoryLeagueData,
  teamId: string,
  week: number,
): number | undefined {
  const wk = data.seasonRankHistory.find((w) => w.week === week)
  if (wk) return wk.ranks[teamId]
  if (week === data.currentWeek) {
    return data.standings.find((s) => s.teamId === teamId)?.rank
  }
  return undefined
}

/** Which team holds the given rank at the given week. */
export function findTeamAtRank(
  data: CategoryLeagueData,
  week: number,
  rank: number,
): string | undefined {
  const wk = data.seasonRankHistory.find((w) => w.week === week)
  if (wk) {
    for (const [teamId, r] of Object.entries(wk.ranks)) {
      if (r === rank) return teamId
    }
    return undefined
  }
  if (week === data.currentWeek) {
    return data.standings.find((s) => s.rank === rank)?.teamId
  }
  return undefined
}

/** Top-team helpers. */
export function currentWeekTopTeam(data: CategoryLeagueData): string | undefined {
  return findTeamAtRank(data, data.currentWeek, 1)
}
export function previousWeekTopTeam(data: CategoryLeagueData): string | undefined {
  const prev = findTeamAtRank(data, data.currentWeek - 1, 1)
  if (prev) return prev
  const completed = [...data.seasonRankHistory]
    .filter((w) => w.week < data.currentWeek)
    .sort((a, b) => b.week - a.week)[0]
  if (completed) {
    for (const [teamId, r] of Object.entries(completed.ranks)) {
      if (r === 1) return teamId
    }
  }
  return undefined
}

/* ─────────────────────────────────────────────────────────────────
   STREAK / TRAJECTORY MATH
───────────────────────────────────────────────────────────────── */

/** How many consecutive weeks (ending at `endWeek`) the team held a
 *  given rank. */
export function consecutiveWeeksAtRank(
  data: CategoryLeagueData,
  teamId: string,
  rank: number,
  endWeek: number,
): number {
  let count = 0
  for (let w = endWeek; w >= 1; w--) {
    if (rankAtWeek(data, teamId, w) === rank) count++
    else break
  }
  return count
}

/** Season-best (lowest) and season-worst (highest) rank held. */
export function seasonRankExtremes(
  data: CategoryLeagueData,
  teamId: string,
): { high: number; low: number } {
  let high = Infinity
  let low = -Infinity
  for (const w of data.seasonRankHistory) {
    const r = w.ranks[teamId]
    if (r == null) continue
    if (r < high) high = r
    if (r > low) low = r
  }
  return {
    high: isFinite(high) ? high : 10,
    low: isFinite(low) ? low : 10,
  }
}

/** Rank delta vs week 1 (positive = climbed; negative = fell). */
export function rankDeltaSinceWeek1(
  data: CategoryLeagueData,
  teamId: string,
): number {
  const week1 = rankAtWeek(data, teamId, 1)
  const current = rankAtWeek(data, teamId, data.currentWeek)
  if (week1 == null || current == null) return 0
  return week1 - current
}

/** Has this team been at or above a given rank for the last N weeks? */
export function consistentlyAtOrAbove(
  data: CategoryLeagueData,
  teamId: string,
  rank: number,
  weeks: number,
): boolean {
  let hits = 0
  for (let w = data.currentWeek; w >= Math.max(1, data.currentWeek - weeks + 1); w--) {
    const r = rankAtWeek(data, teamId, w)
    if (r != null && r <= rank) hits++
    else return false
  }
  return hits >= weeks
}

/* ─────────────────────────────────────────────────────────────────
   PLAYOFF / ELIMINATION MATH
───────────────────────────────────────────────────────────────── */

/** Remaining matchup weeks (excluding current). */
export function weeksRemaining(
  currentWeek: number,
  regularSeasonEndWeek: number | undefined,
): number {
  const end = regularSeasonEndWeek ?? 12
  return Math.max(0, end - currentWeek)
}

/** Approximate cat-wins available between a team and the bubble line
 *  in the remaining weeks. Each weekly matchup decides up to
 *  `categoryCount` cats (we approximate with 11 = baseball, fall back
 *  to `data.categories.length`). */
export function maxCatWinsRemaining(
  data: CategoryLeagueData,
  weeks: number,
): number {
  const cats = data.categories.length || 11
  return weeks * cats
}

/** Is this team mathematically eliminated from the cut? Optimistic:
 *  assumes they win every remaining cat and the cut-team loses every
 *  remaining cat. If still behind, eliminated. */
export function isMathematicallyEliminated(
  data: CategoryLeagueData,
  teamId: string,
): boolean {
  const teamStanding = standingFor(data, teamId)
  if (!teamStanding) return false

  const cut = data.standings.find((s) => s.rank === data.playoffCutoff)
  if (!cut || cut.teamId === teamId) return false

  const weeks = weeksRemaining(data.currentWeek, data.regularSeasonEndWeek)
  if (weeks === 0) return teamStanding.rank > data.playoffCutoff

  const maxCats = maxCatWinsRemaining(data, weeks)
  // Optimistic max for this team:
  const teamMax = teamStanding.catWins + maxCats
  // Pessimistic min for the cut team (still wins 0 more cats):
  const cutMin = cut.catWins
  return teamMax < cutMin
}

/** Is this team mathematically locked into the cut (can't be caught)? */
export function isLockedIntoCut(
  data: CategoryLeagueData,
  teamId: string,
): boolean {
  const teamStanding = standingFor(data, teamId)
  if (!teamStanding) return false

  // The team immediately below the cut is the dangerous one
  const challenger = data.standings.find(
    (s) => s.rank === data.playoffCutoff + 1,
  )
  if (!challenger) return teamStanding.rank <= data.playoffCutoff

  const weeks = weeksRemaining(data.currentWeek, data.regularSeasonEndWeek)
  if (weeks === 0) return teamStanding.rank <= data.playoffCutoff

  const maxCats = maxCatWinsRemaining(data, weeks)
  // Optimistic max for the challenger:
  const challengerMax = challenger.catWins + maxCats
  // Pessimistic min for our team:
  const teamMin = teamStanding.catWins
  return teamMin > challengerMax
}

/* ─────────────────────────────────────────────────────────────────
   FRESHNESS MULTIPLIER
───────────────────────────────────────────────────────────────── */

/** Recency curve for events:
 *  - Today          → 1.0
 *  - 24-72 hrs      → 0.6-0.85
 *  - 3-7 days       → 0.3-0.6
 *  - older          → 0 (caller should skip emitting)
 */
export function freshnessForAgeHours(hours: number): number {
  if (hours <= 0) return 1
  if (hours <= 24) return 0.85 + 0.15 * (1 - hours / 24)
  if (hours <= 72) return 0.6 + 0.25 * (1 - (hours - 24) / 48)
  if (hours <= 168) return 0.3 + 0.3 * (1 - (hours - 72) / 96)
  return 0
}

/** Freshness for an event N weeks ago. Used by detectors keyed to
 *  weekly events (most of the standings + matchup detectors). */
export function freshnessForWeekAge(weeksAgo: number): number {
  if (weeksAgo <= 0) return 1
  if (weeksAgo === 1) return 0.7
  if (weeksAgo === 2) return 0.4
  if (weeksAgo === 3) return 0.2
  return 0
}

/* ─────────────────────────────────────────────────────────────────
   SIGNATURE HASHING
───────────────────────────────────────────────────────────────── */

/** Stable fingerprint for a story candidate. Used for impression
 *  tracking + dedup. Detectors compose with their type + relevant
 *  ids + the triggering week so the same event hashes the same
 *  signature on repeat detections. */
export function signature(parts: (string | number | undefined)[]): string {
  return parts.filter((p) => p != null).join('|')
}
