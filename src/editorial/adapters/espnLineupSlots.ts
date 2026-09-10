/**
 * ESPN's lineup slots → the vocabulary the points engine speaks.
 *
 * ESPN describes a roster as `lineupSlotCounts`: a map of numeric slot
 * id to how many of that slot the league starts. Sleeper describes the
 * same thing as an ordered array of position strings, and every points
 * module — `rankRosterStrength`, `startingSlots`, `bestLineupPoints` —
 * was written against Sleeper's shape. This translates rather than
 * teaching those modules a second dialect.
 *
 * The ids are ESPN's own and are stable across seasons and sports.
 */

/** ESPN slot id → the token `eligibleFor()` understands. */
const SLOT_NAMES: Record<number, string> = {
  0: 'QB',
  1: 'QB',          // TQB — team quarterback, still a QB slot
  2: 'RB',
  3: 'FLEX',        // RB/WR
  4: 'WR',
  5: 'FLEX',        // WR/TE
  6: 'TE',
  7: 'SUPER_FLEX',  // OP — any offensive player, quarterbacks included
  8: 'DT',
  9: 'DE',
  10: 'LB',
  11: 'DL',
  12: 'CB',
  13: 'S',
  14: 'DB',
  15: 'DP',
  16: 'DEF',        // D/ST
  17: 'K',
  18: 'P',
  19: 'HC',
  20: 'BN',
  21: 'IR',
  23: 'FLEX',       // RB/WR/TE
  24: 'ER',
}

/**
 * Slots the projection baseline cannot value.
 *
 * The baseline is built from Sleeper's projections, which cover QB, RB,
 * WR and TE. A kicker or defence slot would be filled by whoever scores
 * `undefined` — which is to say nobody — and every team would carry the
 * same silent zero. Dropping the slot is honest; keeping it would make
 * two teams look identical at a position neither was measured at.
 *
 * They stay in the roster array as bench, so slot COUNTS still line up
 * with what ESPN reports.
 */
const UNVALUED = new Set(['DEF', 'K', 'P', 'HC', 'DT', 'DE', 'LB', 'DL', 'CB', 'S', 'DB', 'DP', 'ER'])

/**
 * Fill order matters: most restrictive first, so a FLEX cannot swallow
 * the only tight end. `rankRosterStrength` sorts by restrictiveness
 * itself, but emitting them in a sane order keeps the array readable
 * and matches what Sleeper returns.
 */
const ORDER = ['QB', 'RB', 'WR', 'TE', 'FLEX', 'SUPER_FLEX']

/**
 * `{ '0': 1, '2': 2, '4': 2, '6': 1, '23': 1, '20': 7 }`
 *   → `['QB','RB','RB','WR','WR','TE','FLEX','BN','BN',...]`
 *
 * Returns undefined when ESPN gave us nothing usable, so callers can
 * tell "no starting slots" from "an empty league".
 */
export function espnRosterPositions(
  lineupSlotCounts: Record<string, number> | null | undefined,
): string[] | undefined {
  if (!lineupSlotCounts) return undefined

  const starters: string[] = []
  let bench = 0

  for (const [rawId, rawCount] of Object.entries(lineupSlotCounts)) {
    const id = Number(rawId)
    const count = Number(rawCount)
    if (!Number.isFinite(id) || !Number.isFinite(count) || count <= 0) continue
    const name = SLOT_NAMES[id]
    if (!name) continue
    if (name === 'BN' || name === 'IR' || UNVALUED.has(name)) {
      bench += count
      continue
    }
    for (let i = 0; i < count; i++) starters.push(name)
  }

  if (starters.length === 0) return undefined
  starters.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b))
  return [...starters, ...Array.from({ length: bench }, () => 'BN')]
}
