/**
 * Steals and reaches, measured honestly.
 *
 * THE PROBLEM WITH THE OBVIOUS APPROACH. Sleeper's `search_rank` is the
 * only consensus-ish number available without a projection model, and
 * comparing it to pick order directly does not work. Against a real
 * 140-pick draft it correlates at 0.79, carries 45 duplicate values,
 * and — fatally — is blind to positional scarcity. Ranked that way, the
 * four biggest "steals" of the draft come back as Mahomes, Purdy, Nix
 * and Dart: every one a quarterback, "falling" only because
 * quarterbacks always fall in a one-QB league. Any reader would spot
 * that instantly.
 *
 * WHAT THIS DOES INSTEAD. Compare like with like: within a single
 * position, does the order the league took players match the order
 * consensus has them in? A running back consensus rates fourth at his
 * position who went ninth among running backs FELL. One rated
 * fourteenth who went sixth was a REACH. Positional scarcity cancels
 * out because every comparison happens inside one position.
 *
 * WHAT THIS IS NOT. It is not a claim that a pick was good. It measures
 * divergence from consensus ORDER, nothing else — a player can fall for
 * excellent reasons, and consensus is frequently wrong. Real value
 * grades need projections, which is UFD's model; when those arrive they
 * replace this rather than sit beside it.
 */

/** The minimum players a position needs before its internal ordering
 *  says anything. Comparing two kickers is noise. */
const MIN_AT_POSITION = 5

/** How far out of order a pick must be before it is worth a slide.
 *  Small divergences are the normal texture of any draft. */
const MIN_DIVERGENCE = 3

export interface ValuedPick {
  pickOverall: number
  round: number
  playerId: string
  playerName: string
  position: string
  teamId: string
}

export interface Divergence {
  pick: ValuedPick
  /** Where consensus had him among players at his position, 1-based. */
  consensusAtPosition: number
  /** Where this league actually took him among that position, 1-based. */
  actualAtPosition: number
  /** actual − consensus. Positive means he went later than consensus
   *  had him (fell); negative means earlier (reach). */
  delta: number
}

export interface DraftDivergences {
  fell: Divergence[]
  reached: Divergence[]
  /** Positions that had enough drafted players to compare. Useful for
   *  copy that wants to say what the read is based on. */
  positionsCompared: string[]
}

/**
 * @param picks   every pick in the draft
 * @param rankOf  consensus rank for a player id; lower is better.
 *                Return undefined for players with no ranking — they
 *                are excluded rather than assumed to be poor.
 */
export function findDraftDivergences(
  picks: ValuedPick[],
  rankOf: (playerId: string) => number | undefined,
): DraftDivergences {
  const byPosition = new Map<string, ValuedPick[]>()
  for (const p of picks) {
    if (!p.position || !p.playerId) continue
    if (rankOf(p.playerId) === undefined) continue
    const list = byPosition.get(p.position) ?? []
    list.push(p)
    byPosition.set(p.position, list)
  }

  const all: Divergence[] = []
  const positionsCompared: string[] = []

  for (const [position, list] of byPosition) {
    if (list.length < MIN_AT_POSITION) continue
    positionsCompared.push(position)

    // Order the league actually took them in.
    const byPick = [...list].sort((a, b) => a.pickOverall - b.pickOverall)
    const actualIndex = new Map(byPick.map((p, i) => [p.playerId, i + 1]))

    // Order consensus has them in. Ties broken by pick order so the
    // comparison stays deterministic — `search_rank` has genuine
    // duplicates, and an unstable sort would make the same draft
    // produce different "steals" on different runs.
    const byConsensus = [...list].sort((a, b) => {
      const ra = rankOf(a.playerId)!
      const rb = rankOf(b.playerId)!
      return ra - rb || a.pickOverall - b.pickOverall
    })

    byConsensus.forEach((p, i) => {
      const consensusAtPosition = i + 1
      const actualAtPosition = actualIndex.get(p.playerId)!
      const delta = actualAtPosition - consensusAtPosition
      if (Math.abs(delta) < MIN_DIVERGENCE) return
      all.push({ pick: p, consensusAtPosition, actualAtPosition, delta })
    })
  }

  return {
    fell: all.filter((d) => d.delta > 0).sort((a, b) => b.delta - a.delta),
    reached: all.filter((d) => d.delta < 0).sort((a, b) => a.delta - b.delta),
    positionsCompared: positionsCompared.sort(),
  }
}

/** "the 9th running back off the board, 5 spots later than consensus" */
export function describeDivergence(d: Divergence, positionPlural: string): string {
  const spots = Math.abs(d.delta)
  const direction = d.delta > 0 ? 'later' : 'earlier'
  return (
    `${ordinal(d.actualAtPosition)} ${positionPlural} off the board, ` +
    `${spots} ${spots === 1 ? 'spot' : 'spots'} ${direction} than consensus had him.`
  )
}

function ordinal(n: number): string {
  const rem100 = n % 100
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1: return `${n}st`
    case 2: return `${n}nd`
    case 3: return `${n}rd`
    default: return `${n}th`
  }
}
