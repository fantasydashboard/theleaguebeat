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
 * been in it.
 *
 * WHY AN ID LOOKUP IS NOT ENOUGH. Those cross-references are stale
 * where it matters most. Measured against the 2026 projections, only
 * 73 of the top 250 projected players — 29% — carry an `espn_id`, and
 * the gaps are the players a draft is actually about: Bijan Robinson,
 * Jahmyr Gibbs, Puka Nacua, Jayden Daniels, Drake Maye. Recent draft
 * classes simply have not been backfilled.
 *
 * An ESPN league bridged on ids alone therefore lost roughly seven
 * picks in ten, and WHICH seven varied by team — so one roster
 * projected 75.9 points a week and another 17.9, in a league where
 * nobody is below 100. That is worse than failing outright, because a
 * plausible number is not obviously wrong.
 *
 * So there is a second key: normalised name plus position, used only
 * when it resolves to exactly ONE player. That covers 249 of the same
 * top 250. Ambiguity is 0.6% of keys and is almost entirely retired
 * players and blob junk; those keys are dropped rather than guessed.
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
  /** Sleeper player_id for a name, when exactly one player answers to
   *  it. A position narrows the search; without one the name must be
   *  unique league-wide. Ambiguity always resolves to undefined. */
  byName: (name: string, position?: string) => string | undefined
  /** How many players the bridge covers — for logging a thin map
   *  rather than silently producing a half-graded deck. */
  size: number
}

/** The blob's shape for the name index. */
interface NamedPlayer {
  first_name?: unknown
  last_name?: unknown
  full_name?: unknown
  position?: unknown
}

const SUFFIX = /\b(?:jr|sr|ii|iii|iv|v)\b/g

/**
 * One spelling for two sources.
 *
 * ESPN writes "Marvin Harrison Jr.", Sleeper "Marvin Harrison"; accents,
 * apostrophes and hyphens differ freely between them. Lowercase, strip
 * accents and punctuation, drop generational suffixes, collapse spaces.
 */
export function normalizeName(name: string): string {
  return (name || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[.'’]/g, ' ')
    .replace(/-/g, ' ')
    .replace(SUFFIX, ' ')
    .replace(/\s+/g, ' ')
    .trim()
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
  // `null` marks a key more than one player answers to. Kept in the map
  // rather than deleted so a later duplicate cannot resurrect it.
  const names = new Map<string, string | null>()
  // Name without position, for picks that arrive with ESPN's 'Unknown'.
  const bare = new Map<string, string | null>()

  if (blob && typeof blob === 'object') {
    const field = platform === 'espn' ? 'espn_id' : 'yahoo_id'
    for (const value of Object.values(blob as Record<string, RawPlayer>)) {
      if (!value || typeof value !== 'object') continue
      const sleeperId = value.player_id
      if (typeof sleeperId !== 'string' || !sleeperId) continue

      const foreign = (value as Record<string, unknown>)[field]
      if (foreign !== null && foreign !== undefined && foreign !== '') {
        map.set(String(foreign), sleeperId)
      }

      const n = value as NamedPlayer
      const pos = typeof n.position === 'string' ? n.position.toUpperCase() : ''
      if (!pos) continue
      const full = typeof n.full_name === 'string' && n.full_name
        ? n.full_name
        : `${typeof n.first_name === 'string' ? n.first_name : ''} ` +
          `${typeof n.last_name === 'string' ? n.last_name : ''}`
      const nm = normalizeName(full)
      if (!nm) continue
      const key = `${nm}|${pos}`
      names.set(key, names.has(key) ? null : sleeperId)
      bare.set(nm, bare.has(nm) ? null : sleeperId)
    }
  }

  return {
    toSleeperId: (foreignId) => map.get(String(foreignId)),
    byName: (name, position) => {
      const nm = normalizeName(name)
      if (!nm) return undefined
      // ESPN writes 'Unknown' when its own player lookup missed, which
      // would otherwise fail both keys. Falling back to the bare name
      // is safe because it still refuses anything ambiguous.
      const pos = (position || '').toUpperCase()
      if (pos && pos !== 'UNKNOWN') return names.get(`${nm}|${pos}`) ?? undefined
      return bare.get(nm) ?? undefined
    },
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
export function bridgePicks<
  T extends { playerId: string; playerName?: string; position?: string },
>(
  picks: readonly T[],
  bridge: PlayerIdBridge,
): { picks: T[]; bridged: number; byId: number; byName: number } {
  let byId = 0
  let byName = 0
  const out = picks.map((p) => {
    // The id first: exact, and immune to two players sharing a name.
    const exact = bridge.toSleeperId(p.playerId)
    if (exact) {
      byId += 1
      return { ...p, playerId: exact }
    }
    // Then the name, but only where it is unambiguous.
    const named = p.playerName ? bridge.byName(p.playerName, p.position) : undefined
    if (named) {
      byName += 1
      return { ...p, playerId: named }
    }
    return p
  })
  return { picks: out, bridged: byId + byName, byId, byName }
}
