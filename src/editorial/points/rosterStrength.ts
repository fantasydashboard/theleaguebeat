/**
 * What a team actually drafted, in projected points.
 *
 * THE DIFFERENCE FROM VALUE-AGAINST-ADP. The other grade in this
 * codebase measures who beat the board — who took players later than
 * the market said they should go. That is a real thing and it is not
 * the same as having a good team. A manager can beat ADP all day by
 * taking players the market had correctly faded, and a manager who
 * paid market price for the best available player every round beats
 * the board by nothing at all while walking out with the strongest
 * roster in the league.
 *
 * This measures the roster. It is the grade a league actually argues
 * about, and it needs projections, which is why it could not exist
 * until Sleeper's were found.
 *
 * STARTERS ONLY, AND WHY THAT IS THE WHOLE POINT. Summing every
 * drafted player rewards hoarding: in a one-quarterback league four
 * quarterbacks score more projected points than one quarterback and
 * three bench receivers, and exactly none of that reaches a lineup.
 * So this fills the league's OWN starting slots with the best
 * available player for each, flex included, and counts nothing else.
 * A fifth wide receiver in a three-flex league is worth zero here,
 * which is very close to what it is worth in October.
 *
 * WHAT IT IS NOT. A projection is a forecast published before a snap,
 * and the ranking it produces is a ranking of forecasts. It says who
 * drafted the best team on paper. Whether paper matters is what the
 * season is for, and the copy says so rather than pretending this
 * settles anything.
 */

/** A drafted player, reduced to what the lineup needs. */
export interface RosterPlayer {
  playerId: string
  position: string
  teamId: string
}

export interface TeamStrength {
  teamId: string
  /** Projected points from the best startable lineup. */
  projectedPoints: number
  /** Per week over the projected season — the figure a reader can
   *  hold. "1,887 points" means nothing; "11 points a week better
   *  than the worst roster in the league" means something. */
  pointsPerWeek: number
  /** Difference from the league's own mean, per week. */
  vsLeaguePerWeek: number
  /** How many starting slots could actually be filled. Fewer than the
   *  lineup requires means the team drafted no eligible player for a
   *  slot, and its total is not comparable — the caller shows this. */
  slotsFilled: number
  /** 1 = strongest projected roster. */
  rank: number
  /** Highest-projected player who makes the starting lineup, for the
   *  team card. The bench's best is not the team's best. */
  bestStarterId?: string
  /** Projected points of that player. */
  bestStarterPoints?: number
  /**
   * The starter furthest ABOVE the league's average starter at his own
   * position — the team's genuine edge.
   *
   * Not the same as the highest scorer, and that difference is the
   * whole reason this exists. Quarterbacks out-project every other
   * position in raw points, so "who scores most" named the QB on all
   * ten cards and told a league nothing it did not already know.
   * Measuring against positional peers surfaces the player a team is
   * actually ahead on.
   */
  edgePlayerId?: string
  edgePlayerPosition?: string
  /** How far above the average starter at that position, PER WEEK.
   *  Season totals read as abstract next to a per-week headline; the
   *  card states one unit throughout. */
  edgePlayerVsLeague?: number
  /**
   * Strongest and thinnest starting positions against the league, per
   * week across the whole position group.
   *
   * A total, not a per-starter average, and deliberately: a team that
   * flexes three receivers really does get more of its week from
   * receivers than the league does. That is a fact about the lineup it
   * fields, which is what this measures.
   */
  bestPosition?: { position: string; vsLeague: number }
  worstPosition?: { position: string; vsLeague: number }
}

/**
 * Contender / Bubble / Rebuilder, by thirds of the field.
 *
 * Ported from the sister product's power rankings so the two describe
 * a league the same way — a team told it is a "Contender" in one place
 * and given no such label in the other is a product with two opinions.
 * Deliberately strength-only: it holds up in preseason, where the
 * luck read that sits beside it over there cannot (with every team at
 * 0-0 there is nothing for luck to be measured against).
 */
export function tierFor(rank: number, fieldSize: number): 'Contender' | 'Bubble' | 'Rebuilder' {
  const third = Math.max(1, Math.round(fieldSize / 3))
  if (rank <= third) return 'Contender'
  if (rank >= fieldSize - third + 1) return 'Rebuilder'
  return 'Bubble'
}

/** Positions a FLEX slot accepts. Deliberately not configurable: every
 *  Sleeper league using plain `FLEX` means these three. */
const FLEX_ELIGIBLE = new Set(['RB', 'WR', 'TE'])
const SUPERFLEX_ELIGIBLE = new Set(['QB', 'RB', 'WR', 'TE'])

/** Slots that hold no starter and are excluded from the lineup. */
const NON_STARTING = new Set(['BN', 'IR', 'TAXI'])

/** Which positions a lineup slot will accept. */
function eligibleFor(slot: string): Set<string> {
  const s = slot.toUpperCase()
  if (s === 'FLEX' || s === 'WRRB_FLEX' || s === 'REC_FLEX') return FLEX_ELIGIBLE
  if (s === 'SUPER_FLEX') return SUPERFLEX_ELIGIBLE
  if (s === 'IDP_FLEX') return new Set(['DL', 'LB', 'DB'])
  return new Set([s])
}

/** The starting slots, in the order they should be filled. */
export function startingSlots(rosterPositions: readonly string[]): string[] {
  return rosterPositions
    .map((s) => String(s).toUpperCase())
    .filter((s) => !NON_STARTING.has(s))
}

/**
 * Best lineup a squad can field, by projected points.
 *
 * Slots are filled MOST RESTRICTIVE FIRST — a slot accepting one
 * position before any flex — so a flex never consumes the only tight
 * end and leaves the TE slot empty. Filling in listed order would do
 * exactly that whenever flex appears before a specific slot, and
 * understate the team through no fault of its draft.
 */
export function bestLineupPoints(
  players: readonly { position: string; points: number; playerId?: string }[],
  slots: readonly string[],
): {
  total: number
  filled: number
  best?: { playerId?: string; points: number }
  /** Who actually started, so callers can analyse the lineup by
   *  position rather than re-deriving it. */
  starters: { playerId?: string; position: string; points: number }[]
} {
  const ordered = [...slots].sort(
    (a, b) => eligibleFor(a).size - eligibleFor(b).size,
  )
  const pool = [...players].sort((a, b) => b.points - a.points)
  const used = new Array(pool.length).fill(false)

  let total = 0
  let filled = 0
  let best: { playerId?: string; points: number } | undefined
  const starters: { playerId?: string; position: string; points: number }[] = []
  for (const slot of ordered) {
    const eligible = eligibleFor(slot)
    const i = pool.findIndex((p, idx) => !used[idx] && eligible.has(p.position.toUpperCase()))
    if (i === -1) continue
    used[i] = true
    total += pool[i].points
    filled += 1
    starters.push({
      playerId: pool[i].playerId,
      position: pool[i].position.toUpperCase(),
      points: pool[i].points,
    })
    // Best STARTER, not best rostered player — a monster on the bench
    // is not what this team puts on the field.
    if (!best || pool[i].points > best.points) {
      best = { playerId: pool[i].playerId, points: pool[i].points }
    }
  }
  return { total, filled, best, starters }
}

/**
 * How many weeks a Sleeper season projection covers — the NFL regular
 * season, not the fantasy one.
 *
 * These are different numbers and using the wrong one is a silent 20%
 * error. This league's fantasy regular season ends at week 14, but the
 * projection totals span all 17 NFL weeks, so dividing by 14 would
 * inflate every team's per-week rate by a fifth while still looking
 * entirely plausible on screen.
 */
const PROJECTION_WEEKS = 17

/**
 * Rank every team by the roster it drafted.
 *
 * @param projectionWeeks how many weeks the projection totals span.
 *        Defaults to the NFL regular season. NOT the league's fantasy
 *        schedule — see `PROJECTION_WEEKS`.
 */
export function rankRosterStrength(
  players: readonly RosterPlayer[],
  pointsOf: (playerId: string) => number | undefined,
  rosterPositions: readonly string[],
  projectionWeeks = PROJECTION_WEEKS,
): TeamStrength[] {
  const slots = startingSlots(rosterPositions)
  if (slots.length === 0) return []

  const byTeam = new Map<string, { position: string; points: number; playerId: string }[]>()
  for (const p of players) {
    if (!p.teamId || !p.position) continue
    // An unprojected player is worth nothing to a lineup here. That is
    // the honest treatment: a deep flier with no projection is exactly
    // the player who would not start.
    const points = pointsOf(p.playerId) ?? 0
    const list = byTeam.get(p.teamId) ?? []
    list.push({ position: p.position, points, playerId: p.playerId })
    byTeam.set(p.teamId, list)
  }
  if (byTeam.size === 0) return []

  const perWeek = projectionWeeks > 0 ? projectionWeeks : PROJECTION_WEEKS
  const lineups = [...byTeam.entries()].map(([teamId, squad]) => ({
    teamId,
    ...bestLineupPoints(squad, slots),
  }))

  // League averages per position, over STARTERS only. Bench players
  // are excluded for the same reason they score nothing above: they
  // are not what a team puts on the field, and including them would
  // let a deep bench disguise a thin lineup.
  const leaguePositionTotals = new Map<string, number[]>()
  const leaguePlayerPoints = new Map<string, number[]>()
  for (const l of lineups) {
    const perPosition = new Map<string, number>()
    for (const st of l.starters) {
      perPosition.set(st.position, (perPosition.get(st.position) ?? 0) + st.points)
      leaguePlayerPoints.set(st.position, [
        ...(leaguePlayerPoints.get(st.position) ?? []),
        st.points,
      ])
    }
    for (const [position, points] of perPosition) {
      leaguePositionTotals.set(position, [
        ...(leaguePositionTotals.get(position) ?? []),
        points,
      ])
    }
  }
  const mean = (xs: number[]) => xs.reduce((t, x) => t + x, 0) / xs.length
  const positionMean = new Map(
    [...leaguePositionTotals].map(([position, totals]) => [position, mean(totals)]),
  )
  const playerMean = new Map(
    [...leaguePlayerPoints].map(([position, pts]) => [position, mean(pts)]),
  )

  const rows = lineups.map((l) => {
    const perPosition = new Map<string, number>()
    for (const st of l.starters) {
      perPosition.set(st.position, (perPosition.get(st.position) ?? 0) + st.points)
    }
    const deltas = [...perPosition].map(([position, points]) => ({
      position,
      vsLeague:
        Math.round(((points - (positionMean.get(position) ?? points)) / perWeek) * 10) / 10,
    }))
    const sorted = [...deltas].sort((a, b) => b.vsLeague - a.vsLeague)

    // The edge player: furthest above the average starter at his own
    // position, rather than the highest raw scorer.
    let edge: { playerId?: string; position: string; vsLeague: number } | undefined
    for (const st of l.starters) {
      const over = st.points - (playerMean.get(st.position) ?? st.points)
      if (!edge || over > edge.vsLeague) {
        edge = { playerId: st.playerId, position: st.position, vsLeague: over }
      }
    }

    return {
      teamId: l.teamId,
      projectedPoints: Math.round(l.total * 10) / 10,
      pointsPerWeek: Math.round((l.total / perWeek) * 10) / 10,
      slotsFilled: l.filled,
      bestStarterId: l.best?.playerId,
      bestStarterPoints: l.best ? Math.round(l.best.points * 10) / 10 : undefined,
      edgePlayerId: edge?.playerId,
      edgePlayerPosition: edge?.position,
      edgePlayerVsLeague: edge ? Math.round((edge.vsLeague / perWeek) * 10) / 10 : undefined,
      bestPosition: sorted[0],
      worstPosition: sorted.length > 1 ? sorted[sorted.length - 1] : undefined,
    }
  })

  const leagueMean = rows.reduce((t, r) => t + r.pointsPerWeek, 0) / rows.length
  return rows
    .map((r) => ({
      ...r,
      vsLeaguePerWeek: Math.round((r.pointsPerWeek - leagueMean) * 10) / 10,
    }))
    .sort(
      (a, b) => b.projectedPoints - a.projectedPoints || a.teamId.localeCompare(b.teamId),
    )
    .map((r, i) => ({ ...r, rank: i + 1 }))
}
