/**
 * Upsets: the results the board said should not have happened.
 *
 * GATED ON PROBABILITY, NARRATED WITH RANKS. The obvious rule — "the
 * winner was ranked N spots lower" — lies whenever the board is
 * tight: the League of Record's top two sit 0.2 projected points
 * apart, and No. 2 beating No. 1 is a coin flip, not a story. Rank
 * distance does not measure surprise; pregame win probability does.
 * The ranks ride along because "No. 9 over No. 2" is how the sentence
 * gets written.
 *
 * THE EXPECTATION IS PRE-KICKOFF. Each team's scoring average across
 * the weeks BEFORE the covered one — never including the upset
 * itself, or every upset would partially justify itself. And one
 * prior week is not an expectation, so the detector stays silent
 * until two exist: week two's issue can call a result surprising, it
 * cannot call it a 24% shot.
 *
 * THE THRESHOLDS. Under 35% is an upset — at these leagues' variance
 * a ~10-point underdog a week, roughly one call every other week on
 * a five-game slate. Under 25% is the heist, a ~20-point dog landing,
 * a few times a season. A section that fires on 45/55 games teaches
 * readers the word means nothing, which is the same failure as a
 * manufactured milestone.
 */
import type { LeagueDataPointsMatchup } from '../types'

export interface UpsetDetectInput {
  /** The covered week's games; only finals are read. */
  results?: readonly LeagueDataPointsMatchup[]
  /** Scoring average per week BEFORE the covered week. Undefined for
   *  a team means no expectation existed; their games are skipped. */
  priorPointsPerWeek: (teamId: string) => number | undefined
  /** How many completed weeks that average is built on. */
  priorWeeks: number
  /** Board rank before the covered week, for the sentence. */
  priorRank?: (teamId: string) => number | undefined
}

export interface Upset {
  matchupId: string
  winnerId: string
  loserId: string
  /** The winner's pregame chance, 0..1. */
  winProb: number
  /** Under HEIST_MAX_PROB: the escalated treatment. */
  heist: boolean
  winnerPoints: number
  loserPoints: number
  margin: number
  winnerRank?: number
  loserRank?: number
}

export const UPSET_MAX_PROB = 0.35
export const HEIST_MAX_PROB = 0.25
export const MIN_PRIOR_WEEKS = 2

/** Weekly scoring spread per team. Matches the projection engine's
 *  working figure; the difference of two teams is σ√2. */
const TEAM_SIGMA = 25
const SIGMA_DIFF = TEAM_SIGMA * Math.SQRT2

/**
 * P(A beats B) given the pregame mean difference, via the standard
 * tanh approximation of the normal CDF: Φ(z) ≈ ½(1 + tanh(√(2/π)(z +
 * 0.044715 z³))). Accurate to ~1e-3, which is plenty for a 35% gate.
 *
 * NOTE the constants. The graphics generator shipped this with
 * √(π/8) outside and π/8 inside, which compresses every probability
 * toward a coin flip — a 33% dog reads 37%. A gate built on that
 * misses real upsets at the margin, so this is the corrected form
 * and the generator was brought in line with it.
 */
export function winProbability(meanDiff: number): number {
  const z = meanDiff / SIGMA_DIFF
  return 0.5 * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (z + 0.044715 * z ** 3)))
}

/** The covered week's upsets, most improbable first. Empty whenever
 *  nothing qualifies — a quiet week gets no section, not a stretch. */
export function detectUpsets(input: UpsetDetectInput): Upset[] {
  if (input.priorWeeks < MIN_PRIOR_WEEKS) return []

  const out: Upset[] = []
  for (const m of input.results ?? []) {
    if (m.status !== 'final') continue
    if (m.homePoints === m.awayPoints) continue

    const homeWon = m.homePoints > m.awayPoints
    const winnerId = homeWon ? m.homeTeamId : m.awayTeamId
    const loserId = homeWon ? m.awayTeamId : m.homeTeamId
    const winnerMean = input.priorPointsPerWeek(winnerId)
    const loserMean = input.priorPointsPerWeek(loserId)
    if (winnerMean === undefined || loserMean === undefined) continue

    const winProb = winProbability(winnerMean - loserMean)
    if (winProb >= UPSET_MAX_PROB) continue

    const winnerPoints = homeWon ? m.homePoints : m.awayPoints
    const loserPoints = homeWon ? m.awayPoints : m.homePoints
    out.push({
      matchupId: m.id,
      winnerId,
      loserId,
      winProb,
      heist: winProb < HEIST_MAX_PROB,
      winnerPoints,
      loserPoints,
      margin: winnerPoints - loserPoints,
      winnerRank: input.priorRank?.(winnerId),
      loserRank: input.priorRank?.(loserId),
    })
  }
  return out.sort((a, b) => a.winProb - b.winProb)
}
