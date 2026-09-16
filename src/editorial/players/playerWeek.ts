/**
 * PlayerWeek — what one player did in one fantasy week.
 *
 * WHY THIS EXISTS BESIDE PlayerNight. `PlayerNight` is baseball: it is
 * keyed on `mlbId`, carries `hitting`/`pitching` stat lines, and is
 * populated from the MLB Stats API. Football has no box score on that
 * shape and no equivalent free feed — but it does not need one. A
 * fantasy week IS the stat line: the number the league scored him.
 *
 * So this is deliberately thin. Points, position, who started him.
 * Everything a "your guys" block can honestly say about a football
 * week comes out of the league's own scoring, which every platform
 * already returns alongside the matchup.
 */

export interface PlayerWeek {
  /** Platform player id. */
  playerId: string
  name: string
  /** QB, RB, WR, TE, K, DEF. */
  position?: string
  /** Real-life team abbreviation, e.g. "BUF". */
  proTeam?: string
  week: number
  /** Fantasy points under the league's own scoring. */
  points: number
  /** The league team rostering him that week. */
  teamId: string
  /** False for bench — a benched 30-burger is its own kind of story. */
  started: boolean
}

/**
 * How a week compares to what the position normally returns.
 *
 * MEASURED AGAINST THE LEAGUE, NOT A TABLE OF THRESHOLDS. "20 points
 * is a good week" is false for a quarterback and remarkable for a
 * kicker, and it drifts every time scoring settings change. The field
 * that week is the only honest yardstick, and it costs nothing —
 * every starter at that position is already in hand.
 *
 * Returns the median for the position, used to judge over/under.
 */
export function positionMedians(weeks: readonly PlayerWeek[]): Map<string, number> {
  const byPos = new Map<string, number[]>()
  for (const w of weeks) {
    // Bench points are not a fair sample of what a position returns —
    // a manager benches the ones he expects to score least.
    if (!w.started || !w.position) continue
    const list = byPos.get(w.position) ?? []
    list.push(w.points)
    byPos.set(w.position, list)
  }
  const out = new Map<string, number>()
  for (const [pos, list] of byPos) {
    list.sort((a, b) => a - b)
    const mid = Math.floor(list.length / 2)
    out.set(pos, list.length % 2 ? list[mid] : (list[mid - 1] + list[mid]) / 2)
  }
  return out
}
