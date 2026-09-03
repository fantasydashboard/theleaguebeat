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
  players: readonly { position: string; points: number }[],
  slots: readonly string[],
): { total: number; filled: number } {
  const ordered = [...slots].sort(
    (a, b) => eligibleFor(a).size - eligibleFor(b).size,
  )
  const pool = [...players].sort((a, b) => b.points - a.points)
  const used = new Array(pool.length).fill(false)

  let total = 0
  let filled = 0
  for (const slot of ordered) {
    const eligible = eligibleFor(slot)
    const i = pool.findIndex((p, idx) => !used[idx] && eligible.has(p.position.toUpperCase()))
    if (i === -1) continue
    used[i] = true
    total += pool[i].points
    filled += 1
  }
  return { total, filled }
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

  const byTeam = new Map<string, { position: string; points: number }[]>()
  for (const p of players) {
    if (!p.teamId || !p.position) continue
    // An unprojected player is worth nothing to a lineup here. That is
    // the honest treatment: a deep flier with no projection is exactly
    // the player who would not start.
    const points = pointsOf(p.playerId) ?? 0
    const list = byTeam.get(p.teamId) ?? []
    list.push({ position: p.position, points })
    byTeam.set(p.teamId, list)
  }
  if (byTeam.size === 0) return []

  const perWeek = projectionWeeks > 0 ? projectionWeeks : PROJECTION_WEEKS
  const rows = [...byTeam.entries()].map(([teamId, squad]) => {
    const { total, filled } = bestLineupPoints(squad, slots)
    return {
      teamId,
      projectedPoints: Math.round(total * 10) / 10,
      pointsPerWeek: Math.round((total / perWeek) * 10) / 10,
      slotsFilled: filled,
    }
  })

  const mean = rows.reduce((t, r) => t + r.pointsPerWeek, 0) / rows.length
  return rows
    .map((r) => ({
      ...r,
      vsLeaguePerWeek: Math.round((r.pointsPerWeek - mean) * 10) / 10,
    }))
    .sort(
      (a, b) => b.projectedPoints - a.projectedPoints || a.teamId.localeCompare(b.teamId),
    )
    .map((r, i) => ({ ...r, rank: i + 1 }))
}
