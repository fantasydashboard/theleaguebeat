/**
 * Resolving an ESPN or Yahoo player to their Sleeper id.
 *
 * WHY THIS EXISTS. Everything the draft and board decks judge — ADP,
 * projections, positional edges — comes from Sleeper's projections
 * endpoint, keyed by Sleeper `player_id`. An ESPN or Yahoo draft pick
 * carries that platform's own id, so before this existed those leagues
 * silently lost every graded slide: the draft deck fell from sixteen
 * slides to three, and the board could not be built at all.
 *
 * WHAT MAKES IT POSSIBLE. Sleeper's player blob publishes
 * cross-references — `espn_id` on 6,736 players and `yahoo_id` on
 * 6,750, out of a 12,226-row file that includes everyone who has ever
 * been in it. So the bridge is a lookup, not a matching problem: no
 * name normalisation, no accents, no generational suffixes, no special
 * case for defenses. An exact id maps to an exact id or it maps to
 * nothing.
 *
 * THE COST, STATED PLAINLY. This needs the ~15MB player blob, which
 * the Sleeper path deliberately stopped downloading once projections
 * were found to carry names and positions. ESPN and Yahoo leagues pay
 * that download; Sleeper leagues still do not. That is the honest
 * trade and it is why the bridge is built lazily, per platform, rather
 * than folded into the baseline everyone loads.
 */

/** Which foreign id space to bridge from. */
export type BridgePlatform = 'espn' | 'yahoo'

export interface PlayerIdBridge {
  /** Sleeper player_id for a foreign id, or undefined when unmapped. */
  toSleeperId: (foreignId: string) => string | undefined
  /** How many players the bridge covers — for logging a thin map
   *  rather than silently producing a half-graded deck. */
  size: number
}

/** The blob's shape, as far as this relies on it. */
interface RawPlayer {
  player_id?: unknown
  espn_id?: unknown
  yahoo_id?: unknown
}

/**
 * Build the reverse map for one platform.
 *
 * Ids are normalised to strings because the blob stores them
 * inconsistently — Sleeper's own `player_id` is a string, while
 * `espn_id` and `yahoo_id` come back as numbers. Comparing a number to
 * a platform's string id fails silently and produces exactly the empty
 * deck this module exists to prevent.
 */
export function buildPlayerIdBridge(
  blob: unknown,
  platform: BridgePlatform,
): PlayerIdBridge {
  const map = new Map<string, string>()
  if (blob && typeof blob === 'object') {
    const field = platform === 'espn' ? 'espn_id' : 'yahoo_id'
    for (const value of Object.values(blob as Record<string, RawPlayer>)) {
      if (!value || typeof value !== 'object') continue
      const sleeperId = value.player_id
      const foreign = (value as Record<string, unknown>)[field]
      if (typeof sleeperId !== 'string' || !sleeperId) continue
      if (foreign === null || foreign === undefined || foreign === '') continue
      map.set(String(foreign), sleeperId)
    }
  }
  return {
    toSleeperId: (foreignId) => map.get(String(foreignId)),
    size: map.size,
  }
}

/** The blob URL. Large — see the cost note above. */
export const SLEEPER_PLAYERS_URL = 'https://api.sleeper.app/v1/players/nfl'

/**
 * Rewrite picks so downstream code sees Sleeper ids and needs no
 * knowledge of which platform a league came from.
 *
 * Picks that do not bridge keep their original id, which resolves to
 * nothing in the projections lookup and so drops out of the graded
 * slides — the same treatment an unranked Sleeper player already gets.
 * Dropping them here instead would silently shrink the draft.
 */
export function bridgePicks<T extends { playerId: string }>(
  picks: readonly T[],
  bridge: PlayerIdBridge,
): { picks: T[]; bridged: number } {
  let bridged = 0
  const out = picks.map((p) => {
    const sleeperId = bridge.toSleeperId(p.playerId)
    if (!sleeperId) return p
    bridged += 1
    return { ...p, playerId: sleeperId }
  })
  return { picks: out, bridged }
}
