/**
 * What the season looks like before a snap of it is played.
 *
 * Two questions, and they are not the same one:
 *
 *   1. Who has the best roster?  — projected points per week.
 *   2. Who has the best SEASON?  — that, run through the schedule.
 *
 * The gap between them is schedule luck, and preseason is the only
 * moment it can be named before it happens rather than blamed
 * afterwards. Whether the gap is large is an empirical question per
 * league, and on a real 10-team league it is small: 1.5 points of
 * strength-of-schedule spread against 10.4 points of roster spread,
 * moving nobody. That is a finding worth stating on a slide, not a
 * reason to leave the calculation out — a 12-team league with
 * divisions, or an unbalanced schedule, will not look like that.
 *
 * ON VARIANCE, AND WHY IT IS NOT A CONSTANT. A projected record built
 * by asking "is my average higher than theirs" makes every matchup a
 * certainty and hands the best roster a 13-1. Fantasy weeks do not
 * work that way; the better team loses constantly. So each week is
 * modelled as a normal draw around the team's projected average, and
 * the win probability is the chance one draw beats the other.
 *
 * The spread of those draws is measured from the league's OWN prior
 * season rather than assumed. On the real league that is 23.8 points,
 * and it is what turns a 13-1 into a 7.9-6.1 — which is what a
 * fantasy season actually looks like.
 */

/** One scheduled meeting. */
export interface ScheduledGame {
  week: number
  homeTeamId: string
  awayTeamId: string
}

export interface ProjectedTeam {
  teamId: string
  /** Projected points per week from the best startable lineup. */
  pointsPerWeek: number
}

export interface ProjectedSeasonRow {
  teamId: string
  pointsPerWeek: number
  /** Expected wins across the scheduled weeks. Fractional on purpose:
   *  rounding to an integer implies a precision the model does not
   *  have, and "7.9-6.1" reads as an estimate, which it is. */
  expectedWins: number
  gamesScheduled: number
  /** Mean projected points per week of everyone this team faces. The
   *  strength-of-schedule figure. */
  opponentPointsPerWeek: number
  /** Rank by roster alone, 1 = strongest. */
  powerRank: number
  /** Rank by expected wins, 1 = best season. */
  seasonRank: number
  /** powerRank − seasonRank. Positive means the schedule HELPED: the
   *  team projects to finish better than its roster alone deserves. */
  scheduleSwing: number
}

/**
 * Standard normal CDF.
 *
 * `Math.erf` does not exist in JavaScript, so this is the
 * Abramowitz–Stegun 7.1.26 approximation, accurate to about 1.5e-7 —
 * several orders of magnitude finer than a projection deserves.
 */
function normalCdf(x: number): number {
  const sign = x < 0 ? -1 : 1
  const z = Math.abs(x) / Math.SQRT2
  const t = 1 / (1 + 0.3275911 * z)
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-z * z)
  return 0.5 * (1 + sign * y)
}

/**
 * Week-to-week spread of a team's scoring, from real results.
 *
 * @param weeklyScores every team-week score from a completed season.
 * @returns the population standard deviation, or undefined when there
 *          is not enough history to measure one. Undefined is the
 *          honest answer for a league in its first season — the caller
 *          decides what to do about it rather than being handed a
 *          number that looks measured and is not.
 */
export function weeklyScoreSpread(weeklyScores: readonly number[]): number | undefined {
  const real = weeklyScores.filter((s) => Number.isFinite(s) && s > 0)
  // Two scores can produce a standard deviation and it would mean
  // nothing. Ten is still thin but it is a season's worth of a team.
  if (real.length < 10) return undefined
  const mean = real.reduce((t, s) => t + s, 0) / real.length
  const variance = real.reduce((t, s) => t + (s - mean) ** 2, 0) / real.length
  return Math.sqrt(variance)
}

/**
 * Fallback spread for a league with no history to measure.
 *
 * Chosen from the real league's measured 23.8 rather than invented.
 * Used only when `weeklyScoreSpread` returns undefined, and the copy
 * never claims a measured figure in that case.
 */
export const DEFAULT_SCORE_SPREAD = 24

/** Project the season from rosters and the schedule. */
export function projectSeason(
  teams: readonly ProjectedTeam[],
  schedule: readonly ScheduledGame[],
  scoreSpread: number = DEFAULT_SCORE_SPREAD,
): ProjectedSeasonRow[] {
  if (teams.length === 0) return []

  const ppg = new Map(teams.map((t) => [t.teamId, t.pointsPerWeek]))
  const opponents = new Map<string, string[]>()
  for (const g of schedule) {
    if (!ppg.has(g.homeTeamId) || !ppg.has(g.awayTeamId)) continue
    if (g.homeTeamId === g.awayTeamId) continue
    opponents.set(g.homeTeamId, [...(opponents.get(g.homeTeamId) ?? []), g.awayTeamId])
    opponents.set(g.awayTeamId, [...(opponents.get(g.awayTeamId) ?? []), g.homeTeamId])
  }

  // Difference of two independent normals has the spread of both.
  // Guarded: a zero spread would divide by zero and return NaN wins.
  const spread = scoreSpread > 0 ? scoreSpread : DEFAULT_SCORE_SPREAD
  const denominator = Math.SQRT2 * spread

  const rows = teams.map((t) => {
    const opps = opponents.get(t.teamId) ?? []
    const expectedWins = opps.reduce(
      (total, o) => total + normalCdf((t.pointsPerWeek - (ppg.get(o) ?? 0)) / denominator),
      0,
    )
    const opponentPointsPerWeek = opps.length
      ? opps.reduce((total, o) => total + (ppg.get(o) ?? 0), 0) / opps.length
      : 0
    return {
      teamId: t.teamId,
      pointsPerWeek: t.pointsPerWeek,
      expectedWins: Math.round(expectedWins * 10) / 10,
      gamesScheduled: opps.length,
      opponentPointsPerWeek: Math.round(opponentPointsPerWeek * 10) / 10,
    }
  })

  const powerRank = new Map(
    [...rows]
      .sort((a, b) => b.pointsPerWeek - a.pointsPerWeek || a.teamId.localeCompare(b.teamId))
      .map((r, i) => [r.teamId, i + 1]),
  )

  return [...rows]
    .sort((a, b) => b.expectedWins - a.expectedWins || b.pointsPerWeek - a.pointsPerWeek)
    .map((r, i) => ({
      ...r,
      powerRank: powerRank.get(r.teamId)!,
      seasonRank: i + 1,
      scheduleSwing: powerRank.get(r.teamId)! - (i + 1),
    }))
}

/**
 * How much the schedule matters, as a single comparison.
 *
 * Returns the spread of strength-of-schedule against the spread of
 * roster strength. When the first is small beside the second, no
 * schedule saves anybody and the slide can say so with a number
 * behind it.
 */
export function scheduleWeight(rows: readonly ProjectedSeasonRow[]): {
  scheduleSpread: number
  rosterSpread: number
  movesAnyone: boolean
} {
  if (rows.length === 0) return { scheduleSpread: 0, rosterSpread: 0, movesAnyone: false }
  const sos = rows.map((r) => r.opponentPointsPerWeek)
  const power = rows.map((r) => r.pointsPerWeek)
  return {
    scheduleSpread: Math.round((Math.max(...sos) - Math.min(...sos)) * 10) / 10,
    rosterSpread: Math.round((Math.max(...power) - Math.min(...power)) * 10) / 10,
    movesAnyone: rows.some((r) => r.scheduleSwing !== 0),
  }
}
