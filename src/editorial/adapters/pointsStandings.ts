/**
 * Points-league standings + season rank history.
 *
 * Platform-neutral: both the Yahoo and ESPN adapters already map their
 * raw weekly data to `LeagueDataPointsMatchup[]`, so this module takes
 * that shape (keyed by week) and derives the season record the
 * cover-story arc detectors need.
 *
 * A "win" in a points league is simply the higher weekly score. We walk
 * every completed week, accumulate W/L/T + points-for per team, rank the
 * cumulative table at each week (that's the rank history), and emit the
 * final standings from the last completed week.
 *
 * The output reuses the category `CategoryLeagueDataStanding` /
 * `CategoryLeagueDataWeeklyRanks` shapes so `detectCoverStory` can run
 * unchanged. `catWins/catLosses/catTies` carry the matchup record (there
 * are no categories in a points league); `ownsCount` / `bleedingCount`
 * are always 0 (no per-category data), which is also why the
 * category-only CELLAR_LOCK detector is gated off for points upstream.
 */

import type {
  PointsWeeklyScore,
  CategoryLeagueDataTeam,
  CategoryLeagueDataStanding,
  CategoryLeagueDataWeeklyRanks,
  LeagueDataPointsMatchup,
  WLT,
} from '../types'

interface Cumulative {
  wins: number
  losses: number
  ties: number
  pointsFor: number
  outcomes: WLT[] // chronological, one per completed week played
}

function winPctOf(c: Cumulative): number {
  const denom = c.wins + c.losses + c.ties
  return denom > 0 ? (c.wins + c.ties * 0.5) / denom : 0
}

function computeStreak(outcomes: WLT[]): { type: WLT; length: number } {
  if (outcomes.length === 0) return { type: 'T', length: 0 }
  const last = outcomes[outcomes.length - 1]
  let length = 1
  for (let i = outcomes.length - 2; i >= 0; i--) {
    if (outcomes[i] === last) length++
    else break
  }
  return { type: last, length }
}

/** Rank a cumulative table: win% desc, then points-for desc (the
 *  points-league tiebreak), then teamId for stability. Returns a
 *  teamId → 1-based rank map. */
function rankTable(table: Map<string, Cumulative>): Record<string, number> {
  const rows = [...table.entries()].sort((a, b) => {
    const [aId, ac] = a
    const [bId, bc] = b
    const aw = winPctOf(ac)
    const bw = winPctOf(bc)
    if (bw !== aw) return bw - aw
    if (bc.pointsFor !== ac.pointsFor) return bc.pointsFor - ac.pointsFor
    return aId.localeCompare(bId)
  })
  const ranks: Record<string, number> = {}
  rows.forEach(([id], idx) => (ranks[id] = idx + 1))
  return ranks
}

export interface PointsStandingsResult {
  standings: CategoryLeagueDataStanding[]
  seasonRankHistory: CategoryLeagueDataWeeklyRanks[]
}

/**
 * Build standings + per-week rank history from completed points weeks.
 *
 * @param teams           the league's teams (defines who appears, even at 0-0)
 * @param matchupsByWeek  completed weeks only; a live current week should
 *                        be omitted by the caller so it doesn't move the record
 */
export function buildPointsStandings(
  teams: CategoryLeagueDataTeam[],
  matchupsByWeek: Map<number, LeagueDataPointsMatchup[]>,
): PointsStandingsResult {
  // Seed every team at 0-0 so a team with a bye / missing week still
  // appears in the table and the ranks are dense.
  const table = new Map<string, Cumulative>()
  for (const t of teams) {
    table.set(t.id, { wins: 0, losses: 0, ties: 0, pointsFor: 0, outcomes: [] })
  }

  const weeks = [...matchupsByWeek.keys()].sort((a, b) => a - b)
  const seasonRankHistory: CategoryLeagueDataWeeklyRanks[] = []

  for (const week of weeks) {
    const matchups = matchupsByWeek.get(week) ?? []
    let weekHadResult = false

    for (const m of matchups) {
      // Only decided matchups move the record. A live week passed in by
      // mistake (status !== 'final') is skipped rather than scored.
      if (m.status !== 'final') continue
      // A real completed points game is never 0-0. A 0-0 is an unplayed /
      // bye / placeholder period (ESPN's getAllMatchups can return these
      // below the current week); scoring it would mint a false tie.
      if (m.homePoints === 0 && m.awayPoints === 0) continue
      const home = table.get(m.homeTeamId)
      const away = table.get(m.awayTeamId)
      if (!home || !away) continue
      weekHadResult = true

      home.pointsFor += m.homePoints
      away.pointsFor += m.awayPoints

      if (m.homePoints > m.awayPoints) {
        home.wins++; away.losses++
        home.outcomes.push('W'); away.outcomes.push('L')
      } else if (m.awayPoints > m.homePoints) {
        away.wins++; home.losses++
        away.outcomes.push('W'); home.outcomes.push('L')
      } else {
        home.ties++; away.ties++
        home.outcomes.push('T'); away.outcomes.push('T')
      }
    }

    // Snapshot the cumulative ranking after each week that produced a
    // result. Weeks with no decided matchups don't get a snapshot (they
    // would just duplicate the prior week's ranks).
    if (weekHadResult) {
      seasonRankHistory.push({ week, ranks: rankTable(table) })
    }
  }

  const finalRanks = rankTable(table)
  const standings: CategoryLeagueDataStanding[] = teams.map((t) => {
    const c = table.get(t.id) ?? { wins: 0, losses: 0, ties: 0, pointsFor: 0, outcomes: [] }
    const denom = c.wins + c.losses + c.ties
    return {
      rank: finalRanks[t.id] ?? 0,
      teamId: t.id,
      catWins: c.wins,
      catLosses: c.losses,
      catTies: c.ties,
      winPct: denom > 0 ? (c.wins + c.ties * 0.5) / denom : 0,
      streak: computeStreak(c.outcomes),
      lastSix: c.outcomes.slice(-6),
      ownsCount: 0,
      bleedingCount: 0,
    }
  })
  standings.sort((a, b) => a.rank - b.rank)

  return { standings, seasonRankHistory }
}


/**
 * Every team's own score for each completed week.
 *
 * The contract wants a team's OWN score rather than a matchup result,
 * because that is what a points league is measured on and because
 * reading it per-team survives byes, odd roster counts and
 * median-match leagues without any pairing logic. All-play — the
 * record a team would hold having played everyone every week — is
 * computable from this and from nothing else the contract carries.
 *
 * Platform-neutral by construction: both the ESPN and Yahoo adapters
 * already map their raw weeks into `LeagueDataPointsMatchup[]` for the
 * standings above, so this reads the same input and needs no per-
 * platform knowledge. Sleeper builds its own from raw matchups because
 * it never goes through this shape.
 *
 * A 0-0 matchup is an unplayed week, not two catastrophic
 * performances, and is skipped. Downstream `computePointsPowerScores`
 * also drops non-positive scores, but emitting them here would put
 * fiction on the contract for every other consumer to re-filter.
 */
export function buildWeeklyScoresFromMatchups(
  byWeek: Map<number, LeagueDataPointsMatchup[]>,
): PointsWeeklyScore[] {
  const out: PointsWeeklyScore[] = []
  const weeks = [...byWeek.keys()].sort((a, b) => a - b)

  for (const week of weeks) {
    for (const m of byWeek.get(week) ?? []) {
      if (m.status !== 'final') continue
      if (m.homePoints === 0 && m.awayPoints === 0) continue
      if (Number.isFinite(m.homePoints)) {
        out.push({ teamId: m.homeTeamId, week, points: m.homePoints })
      }
      if (Number.isFinite(m.awayPoints)) {
        out.push({ teamId: m.awayTeamId, week, points: m.awayPoints })
      }
    }
  }
  return out
}
