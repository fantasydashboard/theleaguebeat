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
  /** actual − consensus, in position slots. Positive means he went
   *  later than consensus had him (fell); negative means earlier. */
  delta: number
  /**
   * The overall pick where consensus would have had him — the slot the
   * Nth player at his position ACTUALLY went in this draft. Derived
   * from real picks rather than an external ADP, so it stays inside the
   * position and inside this league's own board.
   */
  expectedPickOverall: number
  /** actualPick − expectedPick, expressed in rounds. Positive is late.
   *  Rounds read far better than raw slots: "a round and a half late"
   *  is a thing people say; "13 slots" is not. */
  roundsDelta: number
}

/** Per-team draft value, aggregated across every pick we could compare. */
export interface TeamDraftValue {
  teamId: string
  /** Total rounds of value gained against consensus. Positive is good:
   *  the team got players later than consensus said they should. */
  roundsGained: number
  /** How many of the team's picks could be compared at all. */
  picksCompared: number
  /** Rank within the league, 1 = most value gained. */
  rank: number
  /** League-RELATIVE letter. See `gradeTeamDrafts` for what it does and
   *  does not mean. */
  grade: string
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
  /** Teams in the league — how many picks make a round. Without it,
   *  round figures cannot be computed and come back as 0. */
  teamCount = 0,
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
      const expectedPickOverall = byPick[consensusAtPosition - 1].pickOverall
      const roundsDelta =
        teamCount > 0 ? (p.pickOverall - expectedPickOverall) / teamCount : 0
      all.push({
        pick: p,
        consensusAtPosition,
        actualAtPosition,
        delta,
        expectedPickOverall,
        roundsDelta,
      })
    })
  }

  return {
    fell: all.filter((d) => d.delta > 0).sort((a, b) => b.delta - a.delta),
    reached: all.filter((d) => d.delta < 0).sort((a, b) => a.delta - b.delta),
    positionsCompared: positionsCompared.sort(),
  }
}

/** Rounds to the nearest half, which is the granularity people actually
 *  speak in: "a round early", "a round and a half late". */
export function roundsLabel(roundsDelta: number): string {
  const rounded = Math.round(Math.abs(roundsDelta) * 2) / 2
  const direction = roundsDelta > 0 ? 'late' : 'early'
  if (rounded < 0.5) return 'about where consensus had him'
  const n = rounded === 1 ? 'a round' : `${rounded} rounds`
  return `${n} ${direction}`
}

/** "the 9th running back off the board, a round and a half late" */
export function describeDivergence(d: Divergence, positionPlural: string): string {
  return (
    `${ordinal(d.actualAtPosition)} ${positionPlural} off the board, ` +
    `${roundsLabel(d.roundsDelta)}.`
  )
}

/**
 * Team-by-team draft value.
 *
 * Sums each team's rounds gained against consensus. A team that took
 * players consensus rated higher than where they went accumulates
 * positive rounds.
 *
 * ON THE LETTER GRADES. They are LEAGUE-RELATIVE and nothing more —
 * assigned by how far a team sits from its own league's mean, so
 * somebody always lands top and somebody always lands bottom. They do
 * not mean a draft was objectively good; consensus is frequently wrong
 * and a team can gain rounds by taking players everyone else had
 * correctly faded. Absolute grades need projections, which is UFD's
 * model. The rounds figure beside each letter is the honest number, and
 * it is why the letter is never shown without it.
 */
export function gradeTeamDrafts(divergences: Divergence[]): TeamDraftValue[] {
  const byTeam = new Map<string, { rounds: number; count: number }>()
  for (const d of divergences) {
    const cur = byTeam.get(d.pick.teamId) ?? { rounds: 0, count: 0 }
    // A pick that FELL to you is value gained, so the sign flips.
    cur.rounds += d.roundsDelta
    cur.count += 1
    byTeam.set(d.pick.teamId, cur)
  }
  if (byTeam.size === 0) return []

  const rows = [...byTeam.entries()].map(([teamId, v]) => ({
    teamId,
    roundsGained: Math.round(v.rounds * 10) / 10,
    picksCompared: v.count,
  }))

  const spread = Math.max(...rows.map((r) => r.roundsGained)) -
    Math.min(...rows.map((r) => r.roundsGained))

  const sorted = [...rows].sort(
    (a, b) => b.roundsGained - a.roundsGained || a.teamId.localeCompare(b.teamId),
  )

  /**
   * Graded on a CURVE by rank, not by distance from the mean.
   *
   * Z-scores were the first attempt and they collapse on the shape real
   * drafts produce: this league's ten teams split into four clearly
   * positive and six negative, which handed out four A grades and no
   * B+ at all. Honest arithmetic, but it reads as broken. A curve
   * spreads the letters the way anyone expects a grade sheet to look,
   * and it is no less truthful because the whole measure was already
   * league-relative.
   */
  const letter = (rank: number): string => {
    // A league where every draft gained the same is not a league with a
    // best and worst draft; grading them apart would invent a spread.
    if (spread === 0) return 'B'
    const pct = sorted.length === 1 ? 0 : (rank - 1) / (sorted.length - 1)
    if (pct <= 0.15) return 'A'
    if (pct <= 0.35) return 'B+'
    if (pct <= 0.65) return 'B'
    if (pct <= 0.85) return 'C'
    return 'D'
  }

  return sorted.map((r, i) => ({ ...r, rank: i + 1, grade: letter(i + 1) }))
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
