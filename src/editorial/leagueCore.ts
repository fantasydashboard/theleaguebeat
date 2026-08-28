/**
 * leagueCore — the seam that lets one detector serve both league
 * formats.
 *
 * `LeagueDataH2HCategory` and `LeagueDataH2HPoints` already share the
 * types that most stories are actually about: teams, standings, rank
 * history, divisions. What differs is that the points variant declares
 * several of them optional, because a points adapter may not have built
 * standings yet.
 *
 * `LeagueCore` is the intersection, with those fields made REQUIRED, and
 * `asLeagueCore` is the single place that checks. A detector that takes
 * a `LeagueCore` cannot reach a category-only field — the compiler stops
 * it — so format-agnosticism is enforced rather than merely intended.
 */

import type {
  CategoryLeagueDataDivision,
  CategoryLeagueDataStanding,
  CategoryLeagueDataTeam,
  CategoryLeagueDataWeeklyRanks,
  LeagueData,
  LeagueSport,
} from './types'

export type { LeagueSport }

/** Resolves a league's sport.
 *
 *  Defaults to 'mlb' because every snapshot written before the field
 *  existed is a baseball league. The default lives here and nowhere
 *  else, so it can be removed in one edit once those rows have aged out.
 */
export function sportOf(data: LeagueData): LeagueSport {
  return data.sport ?? 'mlb'
}

/** The shape a format-agnostic detector needs. Deliberately narrow. */
export interface LeagueCore {
  leagueId: string
  leagueName: string
  currentWeek: number
  currentSeason: number
  regularSeasonEndWeek?: number
  sport: LeagueSport
  teams: CategoryLeagueDataTeam[]
  standings: CategoryLeagueDataStanding[]
  seasonRankHistory: CategoryLeagueDataWeeklyRanks[]
  divisions?: CategoryLeagueDataDivision[]
}

/**
 * Projects either format onto `LeagueCore`, or returns null when the
 * league lacks the standings every agnostic story depends on.
 *
 * Returning null rather than an empty-standings core is deliberate: a
 * detector handed a core can trust it, so the "do we have enough data"
 * question is answered exactly once, here.
 */
export function asLeagueCore(data: LeagueData): LeagueCore | null {
  const standings = data.standings
  if (!standings || standings.length === 0) return null

  return {
    leagueId: data.leagueId,
    leagueName: data.leagueName,
    currentWeek: data.currentWeek,
    currentSeason: data.currentSeason,
    regularSeasonEndWeek: data.regularSeasonEndWeek,
    sport: sportOf(data),
    teams: data.teams,
    standings,
    // Absent on a points league that has not accrued history yet. An
    // empty array is honest here — it means "no weeks recorded", which
    // is exactly what the detectors should see.
    seasonRankHistory: data.seasonRankHistory ?? [],
    divisions: data.divisions,
  }
}
