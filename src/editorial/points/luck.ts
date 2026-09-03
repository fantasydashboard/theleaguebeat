/**
 * Luck: the gap between how good a team IS and what its record says.
 *
 * A points league's win-loss is heavily schedule-dependent — the
 * highest scorer in the league can sit at 2-4 purely because of who it
 * drew. Power score already strips that out via all-play. Comparing
 * the two rankings names what the schedule did:
 *
 *   record BETTER than power  → riding luck, due to regress
 *   record WORSE than power   → better than the standings say
 *
 * Ported from the sister product's power rankings so both describe a
 * league the same way. A team told it is "due to regress" in one
 * product and given no such read in the other is a product with two
 * opinions.
 *
 * WHY IT IS GATED. Before enough weeks, every team's record is a coin
 * toss and this reads noise as fate. The sister product learned it the
 * hard way in preseason: at 0-0 the record ranking ties everyone at
 * first, the delta collapses to "power rank minus one", and seven of
 * ten teams get branded frauds on the evidence of no football at all.
 * Below the threshold there is no verdict — the ranking stands alone,
 * which is the honest thing for an early-season board to do.
 */

/** Weeks of real results before luck means anything. */
export const MIN_WEEKS_FOR_LUCK = 3

export type LuckVerdict = 'riding-luck' | 'better-than-record' | 'fair'

export interface LuckRead {
  teamId: string
  /** 1 = strongest by power score. */
  powerRank: number
  /** 1 = best actual record. */
  recordRank: number
  /** powerRank − recordRank. Positive means the record flatters. */
  delta: number
  verdict: LuckVerdict
}

/** Dense rank, 1 = best, ties sharing the better rank. */
function rankBy<T>(items: readonly T[], key: (t: T) => number): Map<T, number> {
  const sorted = [...items].sort((a, b) => key(b) - key(a))
  const out = new Map<T, number>()
  let rank = 0
  let previous = Infinity
  sorted.forEach((item, i) => {
    const k = key(item)
    if (k < previous) {
      rank = i + 1
      previous = k
    }
    out.set(item, rank)
  })
  return out
}

export interface LuckInput {
  teamId: string
  /** Power score — how good the team actually is. */
  power: number
  wins: number
  losses: number
  ties?: number
  /** Tiebreaker for the record ranking, and only that. */
  pointsFor?: number
}

/**
 * Read luck across a league.
 *
 * @param weeksPlayed completed weeks. Below `MIN_WEEKS_FOR_LUCK` every
 *                    verdict comes back 'fair' — the ranks are still
 *                    reported, because they are real; only the
 *                    judgement is withheld.
 */
export function readLuck(teams: readonly LuckInput[], weeksPlayed: number): LuckRead[] {
  if (teams.length === 0) return []

  const powerRank = rankBy(teams, (t) => t.power)
  const recordRank = rankBy(teams, (t) => {
    const games = t.wins + t.losses + (t.ties ?? 0)
    const pct = games > 0 ? (t.wins + 0.5 * (t.ties ?? 0)) / games : 0
    // Points-for breaks ties without ever outweighing a win.
    return pct * 1000 + (t.pointsFor ?? 0) / 1e6
  })

  // The gap that counts as luck, scaled to league size so a two-place
  // wobble in a twelve-team league is not called fate. Roughly a
  // quarter of the field has to separate the two rankings.
  const tolerance = Math.max(2, Math.round(teams.length / 4))
  const readable = weeksPlayed >= MIN_WEEKS_FOR_LUCK

  return teams.map((t) => {
    const pr = powerRank.get(t)!
    const rr = recordRank.get(t)!
    const delta = pr - rr
    let verdict: LuckVerdict = 'fair'
    if (readable) {
      if (delta >= tolerance) verdict = 'riding-luck'
      else if (delta <= -tolerance) verdict = 'better-than-record'
    }
    return { teamId: t.teamId, powerRank: pr, recordRank: rr, delta, verdict }
  })
}

/** Sentence for a card, or null when there is nothing to say. */
export function describeLuck(read: LuckRead, teamName: string): string | null {
  if (read.verdict === 'riding-luck') {
    return (
      `${teamName} sits ${ordinalish(read.recordRank)} in the standings and ` +
      `${ordinalish(read.powerRank)} on power — the record flatters them, and ` +
      'schedules even out.'
    )
  }
  if (read.verdict === 'better-than-record') {
    return (
      `Better than their record: ${ordinalish(read.powerRank)} on power, only ` +
      `${ordinalish(read.recordRank)} in the standings. They have been losing ` +
      'weeks they scored enough to win.'
    )
  }
  return null
}

function ordinalish(n: number): string {
  const rem100 = n % 100
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1: return `${n}st`
    case 2: return `${n}nd`
    case 3: return `${n}rd`
    default: return `${n}th`
  }
}
