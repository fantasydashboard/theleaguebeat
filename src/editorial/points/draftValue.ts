/**
 * Steals and reaches, measured honestly.
 *
 * WHAT THE BASELINE ACTUALLY IS. Sleeper publishes NO ADP — the player
 * record carries exactly one ranking field, `search_rank`, and the
 * draft object carries none. `search_rank` is a prominence/search
 * ordering, not aggregated draft position: it is static, format-blind
 * (it knows nothing of PPR, superflex or roster size) and full of ties.
 * It correlates with real draft order at about 0.79, so it carries
 * genuine signal, but it is a PROXY and the copy says "Sleeper's player
 * ranking" rather than "consensus" for that reason. True ADP would have
 * to come from UFD or a third-party feed.
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
  /**
   * How much this divergence MATTERS, as distinct from how large it is.
   *
   * Ranking on raw rounds skews the lists late, because the same
   * position-slot gap spans more picks near the bottom of a board where
   * one position runs deep. That is arithmetically true and
   * editorially wrong: three rounds on a player consensus wanted in
   * round three is a different event from three rounds on one it wanted
   * in round eleven, even though both read "3 rds".
   *
   * So divide the gap by the round consensus expected him in. It is a
   * stated heuristic, not a hidden model — deliberately so, since a
   * real value curve is a projection problem and that is UFD's.
   */
  significance: number
}

/** Per-team draft value, aggregated across every pick we could compare. */
export interface TeamDraftValue {
  teamId: string
  /**
   * Rounds of value gained PER COMPARED PICK. Positive is good: the
   * team got players later than the baseline said they should.
   *
   * Per pick, not totalled, and the difference is not cosmetic. A
   * total rewards having more of your roster inside the baseline's
   * sample, which is a property of who you drafted, not how well. On a
   * real 10-team draft the two orderings disagree sharply — one team
   * moved from sixth to second on this change alone.
   */
  roundsPerPick: number
  /** `roundsPerPick` minus the league's own mean — the figure actually
   *  shown. See `gradeTeamDrafts` for why the raw average is not. */
  vsLeague: number
  /** How many of the team's picks could be compared at all. */
  picksCompared: number
  /** Rank within the league, 1 = most value gained. */
  rank: number
  /** League-RELATIVE letter, or "—" for a team with too few compared
   *  picks to say anything. See `gradeTeamDrafts`. */
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
 * Biggest gap first, with significance only as a tie-break.
 *
 * Ordering by significance instead — the gap divided by the round it
 * was expected in — is defensible arithmetic and unreadable output.
 * The slide shows a column of round figures, and weighting the order
 * makes that column non-monotonic: a 2.5 sitting above a 7 under the
 * headline "who lasted longer than they should have" reads as a
 * sorting bug, and a reader who thinks the sort is broken discounts
 * every other number in the deck. The figure on screen has to be the
 * figure that sorts.
 *
 * Significance survives as the tie-break, which is where it costs
 * nothing: between two picks that both slid three rounds, the one
 * expected earlier led the better story.
 *
 * A significance FLOOR was tried instead of a re-sort, to keep
 * late-round noise out while ordering by size. It does not work: gaps
 * among reaches divide by a large expected round by construction, and
 * on a real draft no threshold useful for fallers left a single reach
 * standing.
 */
const byMagnitude = (a: Divergence, b: Divergence) =>
  Math.abs(b.roundsDelta) - Math.abs(a.roundsDelta) || b.significance - a.significance

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
      const expectedRound =
        teamCount > 0 ? Math.max(1, Math.ceil(expectedPickOverall / teamCount)) : 1
      const significance = Math.abs(roundsDelta) / expectedRound
      all.push({
        pick: p,
        consensusAtPosition,
        actualAtPosition,
        delta,
        expectedPickOverall,
        roundsDelta,
        significance,
      })
    })
  }

  return {
    fell: all.filter((d) => d.delta > 0).sort(byMagnitude),
    reached: all.filter((d) => d.delta < 0).sort(byMagnitude),
    positionsCompared: positionsCompared.sort(),
  }
}

/** How far off ADP a pick must be before it is worth a slide, in
 *  rounds. Under a round is the normal noise of any draft — ADP itself
 *  moves that much week to week. */
const MIN_ROUNDS_OFF_ADP = 1

/**
 * Divergences measured against real ADP, mapped by RANK.
 *
 * The player with the k-th best ADP is expected at the k-th slot this
 * draft actually used. No arithmetic converts an ADP into a pick
 * number, and that is the point.
 *
 * WHY NOT JUST SCALE THE ADP. Because it was tried and it was
 * measurably wrong. ADP is published at 12 teams, so scaling by the
 * ratio of league sizes looks principled, and a regression on a real
 * draft even returns the expected slope. But that regression also
 * carries a large intercept, and ignoring it produced a systematic
 * +1.01 round bias on the real 2026 draft — 58 fallers against 14
 * reaches, when a draft board is close to symmetric by construction.
 * Every faller read a round worse than the truth.
 *
 * Rank mapping cannot have that bias: the slots are this draft's own,
 * so the deltas sum to zero. It also stops caring whether the ADP
 * source runs early or late in absolute terms, since only the ORDER
 * is read — which matters when the source is one site's mock drafts
 * and the reader is comparing against a four-platform consensus.
 *
 * ADP already encodes positional scarcity, so unlike
 * `findDraftDivergences` this compares across the whole board rather
 * than within a position. Quarterbacks slide in a one-QB league
 * because drafters actually let them slide, and ADP has them sliding.
 * Position ORDER is still reported, because "the ninth running back
 * off the board" is how people describe a draft — but it is
 * descriptive here, not load-bearing.
 *
 * @param adpOf raw published ADP for a pick; lower is earlier.
 *              Undefined excludes the pick — an unranked player is
 *              unmeasured, not a reach.
 */
export function findAdpDivergences(
  picks: ValuedPick[],
  adpOf: (pick: ValuedPick) => number | undefined,
  teamCount: number,
): DraftDivergences {
  const empty = { fell: [], reached: [], positionsCompared: [] }
  if (teamCount <= 0) return empty

  const covered: { pick: ValuedPick; adp: number; expected: number }[] = []
  for (const p of picks) {
    if (!p.position) continue
    const adp = adpOf(p)
    if (adp === undefined) continue
    covered.push({ pick: p, adp, expected: 0 })
  }
  if (covered.length === 0) return empty

  // The slots this draft actually used, in order. Using the real slots
  // rather than 1..N keeps the gaps where uncovered picks sat, so an
  // expectation always names a pick that existed.
  const slots = covered.map((c) => c.pick.pickOverall).sort((a, b) => a - b)

  // Consensus order. Ties broken by actual pick so a rerun of the same
  // draft cannot produce different steals.
  const byAdp = [...covered].sort(
    (a, b) => a.adp - b.adp || a.pick.pickOverall - b.pick.pickOverall,
  )
  byAdp.forEach((c, i) => {
    c.expected = slots[i]
  })

  // Position ordering, over the covered picks only, so the two figures
  // in the copy describe the same set of players.
  const byPosition = new Map<string, typeof covered>()
  for (const c of covered) {
    const list = byPosition.get(c.pick.position) ?? []
    list.push(c)
    byPosition.set(c.pick.position, list)
  }
  const actualAt = new Map<typeof covered[number], number>()
  const expectedAt = new Map<typeof covered[number], number>()
  for (const [, list] of byPosition) {
    ;[...list]
      .sort((a, b) => a.pick.pickOverall - b.pick.pickOverall)
      .forEach((c, i) => actualAt.set(c, i + 1))
    ;[...list]
      .sort((a, b) => a.adp - b.adp || a.pick.pickOverall - b.pick.pickOverall)
      .forEach((c, i) => expectedAt.set(c, i + 1))
  }

  const all: Divergence[] = []
  for (const c of covered) {
    const roundsDelta = (c.pick.pickOverall - c.expected) / teamCount
    if (Math.abs(roundsDelta) < MIN_ROUNDS_OFF_ADP) continue
    const expectedRound = Math.max(1, Math.ceil(c.expected / teamCount))
    all.push({
      pick: c.pick,
      consensusAtPosition: expectedAt.get(c) ?? 0,
      actualAtPosition: actualAt.get(c) ?? 0,
      delta: roundsDelta > 0 ? 1 : -1,
      expectedPickOverall: c.expected,
      roundsDelta,
      significance: Math.abs(roundsDelta) / expectedRound,
    })
  }

  return {
    fell: all.filter((d) => d.roundsDelta > 0).sort(byMagnitude),
    reached: all.filter((d) => d.roundsDelta < 0).sort(byMagnitude),
    positionsCompared: [...byPosition.keys()].sort(),
  }
}

/** Below this many compared picks, a team's average is one or two
 *  picks wide and a single outlier decides its grade. Such teams are
 *  listed with their figure but no letter. */
const MIN_PICKS_FOR_GRADE = 3

/**
 * Team-by-team draft value.
 *
 * ON THE PER-PICK AVERAGE. Teams are compared on rounds gained per
 * COMPARED pick. Summing instead makes the grade partly a function of
 * how many of a team's players the baseline happens to cover, which is
 * not a thing anyone drafted well or badly. Averaging is also the
 * honest treatment of the gap: a pick outside the sample is unmeasured,
 * not a zero.
 *
 * ON SHOWING A RELATIVE FIGURE. The displayed number is the team's
 * average minus the league's. It has to be, because the raw averages
 * are systematically positive: a published ADP list is truncated, so a
 * player who fell from round two to round thirteen is always inside it
 * and counted, while a player who went early from outside the list
 * cannot be counted at all. Falls are captured in full and reaches are
 * undercounted, and the result is a slide where all ten teams "gained"
 * — which reads as everybody having won their draft. Centring on the
 * league mean states the same ordering without that implication. The
 * bias shrinks as coverage rises: an in-season ADP list covers a draft
 * almost completely, an archived one far less.
 *
 * ON THE LETTER GRADES. They are LEAGUE-RELATIVE and nothing more —
 * somebody always lands top and somebody always lands bottom. They do
 * not mean a draft was objectively good; a baseline is frequently
 * wrong, and a team can gain rounds by taking players everyone else
 * had correctly faded. Absolute grades need projections, which is
 * UFD's model. The rounds figure sits beside each letter for that
 * reason, and the letter is never shown without it.
 */
export function gradeTeamDrafts(divergences: Divergence[]): TeamDraftValue[] {
  const byTeam = new Map<string, { rounds: number; count: number }>()
  for (const d of divergences) {
    const cur = byTeam.get(d.pick.teamId) ?? { rounds: 0, count: 0 }
    // A pick that FELL to you is value gained, so the sign carries.
    cur.rounds += d.roundsDelta
    cur.count += 1
    byTeam.set(d.pick.teamId, cur)
  }
  if (byTeam.size === 0) return []

  const raw = [...byTeam.entries()].map(([teamId, v]) => ({
    teamId,
    perPick: v.rounds / v.count,
    picksCompared: v.count,
  }))

  const mean = raw.reduce((t, r) => t + r.perPick, 0) / raw.length
  const rows = raw.map((r) => ({
    teamId: r.teamId,
    roundsPerPick: Math.round(r.perPick * 10) / 10,
    vsLeague: Math.round((r.perPick - mean) * 10) / 10,
    picksCompared: r.picksCompared,
  }))

  const spread =
    Math.max(...rows.map((r) => r.vsLeague)) - Math.min(...rows.map((r) => r.vsLeague))

  const sorted = [...rows].sort(
    (a, b) => b.vsLeague - a.vsLeague || a.teamId.localeCompare(b.teamId),
  )

  // Only teams with enough compared picks sit on the curve; grading a
  // team off two picks would hand out a letter the data cannot support.
  const gradable = sorted.filter((r) => r.picksCompared >= MIN_PICKS_FOR_GRADE)

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
  const letter = (rankAmongGradable: number): string => {
    // A league where every draft gained the same is not a league with a
    // best and worst draft; grading them apart would invent a spread.
    if (spread === 0) return 'B'
    const pct =
      gradable.length === 1 ? 0 : (rankAmongGradable - 1) / (gradable.length - 1)
    if (pct <= 0.15) return 'A'
    if (pct <= 0.35) return 'B+'
    if (pct <= 0.65) return 'B'
    if (pct <= 0.85) return 'C'
    return 'D'
  }

  let gradedSoFar = 0
  return sorted.map((r, i) => {
    const eligible = r.picksCompared >= MIN_PICKS_FOR_GRADE
    if (eligible) gradedSoFar += 1
    return {
      ...r,
      rank: i + 1,
      grade: eligible ? letter(gradedSoFar) : '—',
    }
  })
}

export function ordinal(n: number): string {
  const rem100 = n % 100
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1: return `${n}st`
    case 2: return `${n}nd`
    case 3: return `${n}rd`
    default: return `${n}th`
  }
}
