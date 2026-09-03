/**
 * Which ESPN game a connected league belongs to.
 *
 * ESPN's API is sport-segmented — `flb` for baseball, `ffl` for
 * football — so the adapter cannot fetch anything without knowing
 * which. It was hardcoded to baseball, which meant an ESPN football
 * league could not load its data, its decks, or its page: the request
 * went to the baseball segment with a football league id and came back
 * empty.
 *
 * The sport is on the `leagues` row and every view already resolves
 * that row, so this reads it there rather than adding a lookup to the
 * adapter. `collectUserIdentity` is duplicated across those views;
 * this deliberately is not, because a per-view copy of a mapping is
 * how the two products' league logic drifted in the first place.
 *
 * Defaults to baseball on an unknown or missing row, matching the
 * behaviour every caller had before this existed. A wrong default is
 * survivable for baseball, which is what the adapter has always
 * assumed; it is not survivable in the other direction.
 */
import type { EspnSport } from '@/editorial/adapters/espnAdapter'

/** Minimal shape — just what the decision needs. */
interface LeagueRowLike {
  id: string
  sport?: string | null
}

export function espnSportFor(
  leagueRowId: string | undefined,
  leagues: readonly LeagueRowLike[],
): EspnSport {
  if (!leagueRowId) return 'baseball'
  const row = leagues.find((l) => l.id === leagueRowId)
  return row?.sport === 'football' ? 'football' : 'baseball'
}
