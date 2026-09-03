/**
 * Sleeper's own ADP and season projections.
 *
 * WHERE THIS LIVES, AND WHY IT WAS MISSED. Sleeper publishes both on
 * the PROJECTIONS endpoint, not on `/players/nfl` and not in GraphQL —
 * the two places an obvious search looks. The player record carries
 * only `search_rank`, and GraphQL's 240 query fields contain no ADP at
 * all, which is why an earlier version of this code concluded Sleeper
 * had no ADP and fell back to a third-party source. It does have ADP,
 * on `/projections/nfl/<season>`, and it has projections beside it.
 *
 * WHY IT BEATS THE THIRD-PARTY SOURCE IT REPLACED, measured on a real
 * 140-pick draft:
 *
 *   coverage    100% vs 98.6%
 *   matching    exact `player_id` vs fuzzy name + position + team
 *   CORS        permissive, so no serverless proxy
 *   agreement   0.5 picks from a four-platform consensus tool, vs ~20
 *   projections yes vs none
 *
 * The matching difference is the one that matters most. Name matching
 * needed a normalizer for accents, punctuation and generational
 * suffixes, plus a separate path keyed on NFL team for defenses,
 * because no two sources name a defense alike. Sleeper's draft picks
 * and Sleeper's projections use the same ids, so none of that exists.
 *
 * It is also the ADP of the platform this league actually drafted on,
 * which is the right baseline for judging what its room did.
 *
 * WHAT PROJECTIONS ARE AND ARE NOT. Season point totals, Sleeper's own
 * model. They make an ABSOLUTE roster grade possible — how good a team
 * is, not merely how far it beat the board — which is a different and
 * better claim than value against ADP. They are still projections: a
 * forecast, published before a snap, and the deck says so.
 */

/** Scoring formats Sleeper publishes ADP and points for. */
export type SleeperScoring = 'std' | 'half_ppr' | 'ppr' | '2qb'

/** Sentinel Sleeper uses for "no meaningful ADP". Values at or above
 *  this are unranked, not late — treating 999 as a real draft position
 *  would report every undrafted flier as the steal of the century. */
const ADP_SENTINEL = 999

export interface DraftBaseline {
  /** Average draft position, or undefined when unranked. */
  adpOf: (playerId: string) => number | undefined
  /** Projected season points, or undefined when unprojected. */
  pointsOf: (playerId: string) => number | undefined
  /** Roster position. Carried here because the projections payload
   *  already includes it, which spares every caller a second lookup
   *  against the 15MB player blob just to learn that a player is a
   *  running back. */
  positionOf: (playerId: string) => string | undefined
  /** Human label, e.g. "Sleeper half-PPR ADP". */
  basis: string
  /** e.g. "half-PPR" — for copy that names the format. */
  formatLabel: string
}

/**
 * Which ADP and points series match this league's scoring.
 *
 * Superflex is checked FIRST and wins outright: a second startable
 * quarterback moves quarterbacks so far up the board that reception
 * scoring is a rounding error beside it.
 */
export function scoringFor(
  scoring: Record<string, unknown> | null | undefined,
  rosterPositions?: readonly string[] | null,
): SleeperScoring {
  const slots = (rosterPositions ?? []).map((s) => String(s).toUpperCase())
  const superflex =
    slots.includes('SUPER_FLEX') || slots.filter((s) => s === 'QB').length >= 2
  if (superflex) return '2qb'

  const rec = scoring?.rec
  if (typeof rec !== 'number' || rec <= 0) return 'std'
  if (rec >= 0.75) return 'ppr'
  return 'half_ppr'
}

const FORMAT_LABEL: Record<SleeperScoring, string> = {
  std: 'standard',
  half_ppr: 'half-PPR',
  ppr: 'PPR',
  '2qb': 'superflex',
}

/**
 * Points series for a scoring format.
 *
 * Superflex changes which players START, not what a catch is worth, so
 * it reads the same points as any one-QB league of its reception
 * setting. There is no `pts_2qb` and there should not be — projecting
 * a player's points does not depend on how many quarterbacks a lineup
 * allows. Defaulting superflex to half-PPR points is a stated
 * approximation: the roster slots carry the superflex effect, and the
 * ADP series already does the rest.
 */
function pointsKey(scoring: SleeperScoring): string {
  if (scoring === 'ppr') return 'pts_ppr'
  if (scoring === 'std') return 'pts_std'
  return 'pts_half_ppr'
}

/** Shape of one projection row, as far as we rely on it. */
interface RawProjection {
  player_id?: unknown
  stats?: Record<string, unknown>
}

/**
 * Parse the projections payload into a baseline.
 *
 * Returns null rather than a partial structure when the response
 * carries no usable rows — the deck then omits the slides that depend
 * on it, which is the right outcome for an upstream that changed shape
 * and far better than publishing grades computed from a half-read
 * payload.
 */
export function buildDraftBaseline(
  raw: unknown,
  scoring: SleeperScoring,
): DraftBaseline | null {
  if (!Array.isArray(raw) || raw.length === 0) return null

  const adpField = `adp_${scoring}`
  const ptsField = pointsKey(scoring)
  const adp = new Map<string, number>()
  const points = new Map<string, number>()
  const position = new Map<string, string>()

  for (const entry of raw as RawProjection[]) {
    if (!entry || typeof entry !== 'object') continue
    const id = entry.player_id
    if (typeof id !== 'string' || !id) continue
    const pos = (entry as { player?: { position?: unknown } }).player?.position
    if (typeof pos === 'string' && pos) position.set(id, pos.toUpperCase())

    const stats = entry.stats
    if (!stats || typeof stats !== 'object') continue

    const a = Number(stats[adpField])
    if (Number.isFinite(a) && a > 0 && a < ADP_SENTINEL) adp.set(id, a)

    const p = Number(stats[ptsField])
    if (Number.isFinite(p) && p > 0) points.set(id, p)
  }

  if (adp.size === 0 && points.size === 0) return null

  const label = FORMAT_LABEL[scoring]
  return {
    adpOf: (playerId) => adp.get(playerId),
    pointsOf: (playerId) => points.get(playerId),
    positionOf: (playerId) => position.get(playerId),
    basis: `Sleeper ${label} ADP`,
    formatLabel: label,
  }
}

/**
 * The projections URL for a season.
 *
 * Positions are requested explicitly because the endpoint returns
 * nothing without them. Kickers and defenses are included: a league
 * that starts them has them on its board, and omitting them would
 * silently drop those picks from every read.
 */
export function projectionsUrl(season: number): string {
  const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']
    .map((p) => `position[]=${p}`)
    .join('&')
  return (
    `https://api.sleeper.app/projections/nfl/${season}` +
    `?season_type=regular&${positions}&order_by=ppr`
  )
}
