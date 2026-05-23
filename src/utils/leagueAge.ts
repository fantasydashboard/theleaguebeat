/**
 * leagueAge — derives how long a league has existed from the user's
 * connected-league rows.
 *
 * Yahoo treats each season of the same league as a separate
 * `league_id`, so multi-season users have multiple `leagues` rows
 * with the same `league_name + platform`. ESPN and Sleeper behave
 * similarly across seasons. We use that to compute the earliest
 * season we know about for this league, which drives:
 *   - the magazine volume number on the IssueMasthead
 *   - the "founded YYYY" line on the History page (future)
 *
 * Limits: only counts seasons the user has connected to TLB. A
 * league that's existed for 10 years but only had its 2026 season
 * connected here will report as Vol. 1. That's acceptable — we
 * understate rather than fabricate.
 *
 * A future enhancement could probe each platform's API for
 * historical seasons (ESPN ?seasonId=, Sleeper previous_league_id
 * chain, Yahoo game-history), but that's a bigger lift.
 */

import type { League } from '@/types/supabase'

/**
 * Find the earliest season we have stored for the same league
 * (matched by name + platform). Returns the current league's
 * own season when no other matches are found (Vol. 1 case).
 */
export function leagueFoundedSeason(
  currentLeague: { league_name: string; platform: string; season: string | number },
  allLeagues: League[] | null | undefined,
): number {
  const ownSeason = parseYear(currentLeague.season)
  if (!allLeagues || allLeagues.length === 0) return ownSeason

  const candidates = allLeagues.filter(
    (l) =>
      l.platform === currentLeague.platform &&
      l.league_name === currentLeague.league_name,
  )
  if (candidates.length === 0) return ownSeason

  const seasons = candidates
    .map((l) => parseYear(l.season))
    .filter((s): s is number => Number.isFinite(s))

  if (seasons.length === 0) return ownSeason
  return Math.min(...seasons)
}

/**
 * Volume number for the masthead. Vol 1 in the league's founding
 * season; increments by one each subsequent season we have data for.
 *
 *   founded 2024, current 2026 → Vol 3
 *   founded 2026, current 2026 → Vol 1
 */
export function leagueVolume(
  currentSeason: number,
  foundedSeason: number,
): number {
  if (!Number.isFinite(currentSeason) || !Number.isFinite(foundedSeason)) {
    return 1
  }
  return Math.max(1, currentSeason - foundedSeason + 1)
}

function parseYear(season: string | number | null | undefined): number {
  if (typeof season === 'number') return season
  if (typeof season === 'string') {
    const n = parseInt(season, 10)
    if (!Number.isNaN(n)) return n
  }
  return Number.NaN
}
