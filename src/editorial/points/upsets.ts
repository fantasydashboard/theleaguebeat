/**
 * Upsets: a team beating one the board had well above it.
 *
 * WHY THE BOARD AND NOT A PROBABILITY. The first cut of this gated on
 * pregame win probability — under 35% was an upset — on the theory
 * that rank distance lies when the board is tight. The theory was
 * sound and the calibration was fatal: the League of Record's board
 * spans 94.8 to 105.5 projected points a week, so the WORST team
 * playing the BEST one is a 38% underdog. Nothing in the league could
 * ever clear a 35% bar, and the section was dead code in the league it
 * was built for.
 *
 * The tightness is real, not a modelling error — a fantasy week is
 * mostly variance, and every game in a balanced league is close to a
 * coin flip. Which means probability cannot separate the games a
 * reader calls upsets from the ones they do not. The board can: "No. 8
 * beat No. 2" is how everybody already talks about this, and it is
 * legible without a footnote.
 *
 * THE ORIGINAL OBJECTION, and why it stopped mattering. A gap rule
 * would call No. 2 over No. 1 an upset when the two are 0.2 points
 * apart. True — and any threshold worth using excludes adjacent teams
 * anyway. The failure case was hypothetical; the dead section was not.
 *
 * SCALED TO THE FIELD, so four spots means the same thing in a
 * ten-team league and a fourteen-team one: an upset is a win from
 * roughly 40% of the field below, a heist from 65% below. In a
 * ten-team league that is four spots and seven.
 *
 * THE BOARD IS THE ONE FROM BEFORE THE WEEK. Ranking teams by a board
 * that already contains the result would let a win justify itself —
 * beat the No. 1 team and you climb past them, and the gap vanishes.
 */

import type { LeagueDataPointsMatchup } from '../types'

export interface UpsetDetectInput {
  /** The covered week's games; only finals are read. */
  results?: readonly LeagueDataPointsMatchup[]
  /** Board rank BEFORE this week. Teams the board cannot place are
   *  skipped rather than assumed. */
  priorRank: (teamId: string) => number | undefined
  /** How many teams the board ranks, so the gap can scale. */
  fieldSize: number
}

export interface Upset {
  matchupId: string
  winnerId: string
  loserId: string
  winnerRank: number
  loserRank: number
  /** Spots the winner sat below the loser. Always positive. */
  gap: number
  /** At or past the heist threshold: the escalated treatment. */
  heist: boolean
  winnerPoints: number
  loserPoints: number
  margin: number
}

/** Share of the field a winner must have come from below. */
export const UPSET_GAP_SHARE = 0.4
export const HEIST_GAP_SHARE = 0.65
/** Never call adjacent or near-adjacent teams an upset, however small
 *  the league. */
export const MIN_UPSET_GAP = 3

/** The gap thresholds for a field of this size. */
export function upsetThresholds(fieldSize: number): { upset: number; heist: number } {
  const upset = Math.max(MIN_UPSET_GAP, Math.round(fieldSize * UPSET_GAP_SHARE))
  return { upset, heist: Math.max(upset + 2, Math.round(fieldSize * HEIST_GAP_SHARE)) }
}

/**
 * How far below the loser the winner sat, or undefined when this was
 * not an upset at all (or the board cannot place both teams).
 */
export function upsetGap(
  winnerRank: number | undefined,
  loserRank: number | undefined,
  fieldSize: number,
): { gap: number; heist: boolean } | undefined {
  if (!winnerRank || !loserRank) return undefined
  const gap = winnerRank - loserRank
  const { upset, heist } = upsetThresholds(fieldSize)
  if (gap < upset) return undefined
  return { gap, heist: gap >= heist }
}

/** The covered week's upsets, biggest climb first. Empty whenever
 *  nothing qualifies — a quiet week gets no section, not a stretch. */
export function detectUpsets(input: UpsetDetectInput): Upset[] {
  const out: Upset[] = []
  for (const m of input.results ?? []) {
    if (m.status !== 'final') continue
    if (m.homePoints === m.awayPoints) continue

    const homeWon = m.homePoints > m.awayPoints
    const winnerId = homeWon ? m.homeTeamId : m.awayTeamId
    const loserId = homeWon ? m.awayTeamId : m.homeTeamId
    const winnerRank = input.priorRank(winnerId)
    const loserRank = input.priorRank(loserId)
    const verdict = upsetGap(winnerRank, loserRank, input.fieldSize)
    if (!verdict || !winnerRank || !loserRank) continue

    const winnerPoints = homeWon ? m.homePoints : m.awayPoints
    const loserPoints = homeWon ? m.awayPoints : m.homePoints
    out.push({
      matchupId: m.id,
      winnerId,
      loserId,
      winnerRank,
      loserRank,
      gap: verdict.gap,
      heist: verdict.heist,
      winnerPoints,
      loserPoints,
      margin: winnerPoints - loserPoints,
    })
  }
  // Biggest climb first; a tie goes to the wider scoreline.
  return out.sort((a, b) => b.gap - a.gap || b.margin - a.margin)
}
