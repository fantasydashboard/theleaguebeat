/**
 * Last week's power board, so this week's can show movement.
 *
 * "Up three since last week" is what turns a leaderboard into a power
 * ranking. The number is only worth printing if it is the SAME
 * measure a week earlier — so this rebuilds the board through
 * `computePointsPowerScores`, the identical function, on the league as
 * it stood before the most recent week landed.
 *
 * WHY NOT JUST DROP A WEEK OF SCORES. Because the power score reads
 * `standings.winPct` for its record component, and a standings table
 * left at today's values while the scores rewind produces movement
 * that is half real and half arithmetic. So the week's results are
 * backed out of the standings too, using `previousWeekMatchups` —
 * the games that produced them.
 *
 * WHY NOT `seasonRankHistory`. That is STANDINGS rank. Printing it as
 * movement beside a power score would silently compare two different
 * measures, which is the exact drift this whole layer exists to stop.
 *
 * Returns null whenever the rewind cannot be done exactly. A movement
 * column is worth having; a fabricated one is not.
 */
import { computePointsPowerScores } from './powerScore'
import type { CategoryLeagueDataStanding, LeagueDataH2HPoints } from '../types'

/**
 * @returns `teamId → rank as of last week`, or null when the league
 *          has not played enough, or the data needed to rewind the
 *          standings is missing.
 */
export function previousPowerRanks(
  data: LeagueDataH2HPoints,
): Map<string, number> | null {
  const scores = data.weeklyScores ?? []
  const weeks = [...new Set(scores.map((s) => s.week))].sort((a, b) => a - b)
  if (weeks.length === 0) return null

  // No separate "at least two weeks" guard: after one week `before` is
  // empty, the board comes back empty, and the check at the bottom
  // returns null. A second rule saying the same thing is one more
  // thing to keep in step with the first.
  const latest = weeks[weeks.length - 1]
  const before = scores.filter((s) => s.week < latest)

  // Back the latest week's results out of the standings. Without the
  // games that produced them there is no exact rewind, so rather than
  // approximate, the movement column simply does not run.
  let standings: CategoryLeagueDataStanding[] | undefined
  if (data.standings?.length) {
    const games = (data.previousWeekMatchups ?? []).filter((m) => m.status === 'final')
    if (games.length === 0) return null

    const result = new Map<string, 'W' | 'L' | 'T'>()
    for (const m of games) {
      const tied = m.homePoints === m.awayPoints
      result.set(m.homeTeamId, tied ? 'T' : m.homePoints > m.awayPoints ? 'W' : 'L')
      result.set(m.awayTeamId, tied ? 'T' : m.awayPoints > m.homePoints ? 'W' : 'L')
    }

    standings = data.standings.map((s) => {
      const r = result.get(s.teamId)
      const catWins = s.catWins - (r === 'W' ? 1 : 0)
      const catLosses = s.catLosses - (r === 'L' ? 1 : 0)
      const catTies = s.catTies - (r === 'T' ? 1 : 0)
      const played = catWins + catLosses + catTies
      return {
        ...s,
        catWins,
        catLosses,
        catTies,
        winPct: played > 0 ? (catWins + 0.5 * catTies) / played : 0,
      }
    })

    // A negative tally means the standings and the matchups disagree
    // about what happened — a mid-week fetch, a corrected result, a
    // platform quirk. Whatever the cause, the rewind is not sound.
    if (standings.some((s) => s.catWins < 0 || s.catLosses < 0 || s.catTies < 0)) {
      return null
    }
  }

  const board = computePointsPowerScores({ ...data, weeklyScores: before, standings })
  if (board.length === 0) return null

  const ranked = [...board].sort((a, b) => b.score - a.score)
  return new Map(ranked.map((row, i) => [row.teamId, i + 1]))
}
