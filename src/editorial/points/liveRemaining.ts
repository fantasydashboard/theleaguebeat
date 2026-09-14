/**
 * How much football each side still has coming.
 *
 * WHY THIS EXISTS. The Monday desk's whole question is "who needs
 * what", and that needs a projected final per side. ESPN publishes
 * one; Sleeper publishes none, and stamps every matchup in a week
 * with a single shared status — so without this, the desk could
 * never tell a finished game from a live one on Sleeper and gated
 * itself off entirely.
 *
 * HOW IT IS DERIVED, from two public endpoints and nothing invented:
 *
 *   1. The NFL schedule says which of this week's games are already
 *      `complete`. A starter whose team has finished has nothing
 *      left to add — whatever he scored is already in the total.
 *   2. Sleeper's season projections say what each player is worth
 *      across a season; divided by the 17 games a team plays, that
 *      is his share of a week.
 *
 * So a side's projected final is what it has scored plus the
 * per-week share of every starter whose game has not kicked off.
 * That is the same basis as the Monday-night graphic, deliberately:
 * two surfaces quoting different numbers for the same player is the
 * failure this layer exists to prevent.
 *
 * WHAT IT REFUSES TO DO. No lineup, no projection — a side with no
 * readable starters is left undefined rather than given a number
 * equal to its current score, because that would make every live
 * game look decided. Same for finished games, which need no
 * forecast, and for unknown player ids, which get zero rather than
 * an average.
 *
 * WHAT IT IS NOT. Not a win probability. Turning "12 points left
 * against a 9-point lead" into a percentage needs a variance model
 * for a partial week, and the desk does not need one: it asks only
 * whether the trailer's remaining can cover the margin, which is
 * arithmetic on real numbers.
 */
import type { LeagueDataPointsMatchup } from '../types'

/** Games a team plays in a season. Season projections are totals, so
 *  this is the divisor that turns one into a week's share. */
export const WEEKS_PER_SEASON = 17

interface ScheduleGame {
  week?: unknown
  home?: unknown
  away?: unknown
  status?: unknown
}

/**
 * The NFL teams whose game this week has not finished.
 *
 * Anything Sleeper does not explicitly call `complete` counts as
 * still to come — pregame, in progress, postponed. Treating an
 * unrecognised status as finished would silently zero out a
 * starter who has not played, which is the expensive direction to
 * be wrong in.
 */
export function teamsStillPlaying(
  schedule: readonly unknown[],
  week: number,
): Set<string> {
  const out = new Set<string>()
  for (const raw of schedule ?? []) {
    const g = raw as ScheduleGame
    if (Number(g?.week) !== week) continue
    if (String(g?.status ?? '') === 'complete') continue
    if (typeof g?.home === 'string' && g.home) out.add(g.home)
    if (typeof g?.away === 'string' && g.away) out.add(g.away)
  }
  return out
}

interface ProjectionRow {
  player_id?: unknown
  player?: { team?: unknown }
  stats?: Record<string, unknown>
}

/**
 * `playerId → points he is still expected to add this week`.
 *
 * Zero for anyone whose game is over, and for anyone the
 * projections do not cover.
 */
export function buildRemainingIndex(
  projections: readonly unknown[],
  stillPlaying: ReadonlySet<string>,
  pointsField = 'pts_half_ppr',
): (playerId: string) => number {
  const perWeek = new Map<string, number>()
  for (const raw of projections ?? []) {
    const row = raw as ProjectionRow
    const id = row?.player_id
    if (typeof id !== 'string' || !id) continue
    const team = row?.player?.team
    if (typeof team !== 'string' || !stillPlaying.has(team)) continue
    const season = Number(row?.stats?.[pointsField])
    if (!Number.isFinite(season) || season <= 0) continue
    perWeek.set(id, season / WEEKS_PER_SEASON)
  }
  return (playerId: string) => perWeek.get(playerId) ?? 0
}

export interface ProjectSidesInput {
  matchups: readonly LeagueDataPointsMatchup[]
  /** Current-week starting lineups, by team id. */
  startersByTeam: Record<string, readonly string[]>
  remainingFor: (playerId: string) => number
}

/**
 * Stamp each unfinished matchup with a projected final per side.
 * Matchups we cannot read are returned untouched.
 */
export function projectSides(input: ProjectSidesInput): LeagueDataPointsMatchup[] {
  const sideTotal = (teamId: string, scored: number): number | undefined => {
    const starters = input.startersByTeam[teamId]
    if (!starters || starters.length === 0) return undefined
    let left = 0
    for (const id of starters) left += input.remainingFor(id)
    return scored + left
  }

  return input.matchups.map((m) => {
    if (m.status === 'final') return m
    const homeProjected = sideTotal(m.homeTeamId, m.homePoints)
    const awayProjected = sideTotal(m.awayTeamId, m.awayPoints)
    if (homeProjected === undefined && awayProjected === undefined) return m
    return { ...m, homeProjected, awayProjected }
  })
}

/** Sleeper's season schedule. Public and unauthenticated. */
export const scheduleUrl = (season: number | string) =>
  `https://api.sleeper.app/schedule/nfl/regular/${season}`
