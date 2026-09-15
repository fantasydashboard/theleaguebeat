/**
 * Who beats whom, across the whole history of a league.
 *
 * WHY IT IS WORTH THE FETCHES. "Gridiron Man beat Game of Throws" is
 * a result. "Gridiron Man beat Game of Throws for the fourth time in
 * six meetings" is a rivalry, and it is the difference between a
 * scoreboard and a paper. Nothing else on the contract can supply it:
 * careers aggregate a manager against the field, never against one
 * opponent.
 *
 * KEYED ON OWNER, NEVER ON TEAM NAME OR ROSTER ID. Names move — this
 * league has had one manager run two franchises — and roster ids are
 * reassigned between seasons, so a series keyed on either silently
 * merges two managers or splits one in half. The owner id is the only
 * thing Sleeper keeps stable across seasons.
 *
 * REGULAR SEASON ONLY. A playoff meeting is a different kind of game
 * and leagues argue about whether it counts; including it would make
 * the number unverifiable against anybody's memory.
 *
 * THE COST, STATED PLAINLY. One request per week per season — about
 * 140 for a ten-year league. That is why this is fetched lazily,
 * after the page has painted, and why completed seasons are cached:
 * the 2019 results are never going to change.
 */

export interface HeadToHead {
  /** `owner|owner` (sorted) → wins by owner id. */
  series: Record<string, Record<string, number>>
}

/** Stable key for a pair, order-independent. */
export const pairKey = (a: string, b: string) => [a, b].sort().join('|')

export interface SeriesRecord {
  /** Meetings that produced a winner. Ties are counted separately. */
  played: number
  wins: number
  losses: number
}

/**
 * One manager's record against another, or null when they have never
 * met. Null rather than 0-0 on purpose: "they have never played" and
 * "they are level" are different sentences.
 */
export function seriesFor(
  h2h: HeadToHead | undefined,
  ownerA: string | undefined,
  ownerB: string | undefined,
): SeriesRecord | null {
  if (!h2h || !ownerA || !ownerB || ownerA === ownerB) return null
  const row = h2h.series[pairKey(ownerA, ownerB)]
  if (!row) return null
  const wins = row[ownerA] ?? 0
  const losses = row[ownerB] ?? 0
  if (wins + losses === 0) return null
  return { played: wins + losses, wins, losses }
}

/**
 * How to say a series in one clause.
 *
 * Says nothing at all about a first meeting — "1-0 in the series"
 * after a single game is a statistic pretending to be history.
 */
export function describeSeries(s: SeriesRecord | null, winnerName: string): string | null {
  if (!s || s.played < 2) return null
  if (s.wins === s.losses) return `They are level at ${s.wins} apiece`
  if (s.losses === 0) return `${winnerName} have won all ${s.played}`
  return s.wins > s.losses
    ? `${winnerName}'s ${ordinalWord(s.wins)} win in ${s.played} meetings`
    : `Only ${winnerName}'s ${ordinalWord(s.wins)} win in ${s.played}`
}

const WORDS = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth']
const ordinalWord = (n: number) => WORDS[n] ?? `${n}th`

interface RawMatchup {
  roster_id?: unknown
  matchup_id?: unknown
  points?: unknown
}

/**
 * Fold one season's weeks into the tally.
 *
 * `ownerOfRoster` maps that season's roster ids to owners — it must be
 * that season's mapping, because roster ids are reassigned.
 */
export function foldSeason(
  series: HeadToHead['series'],
  weeks: readonly (readonly RawMatchup[])[],
  ownerOfRoster: Record<number, string | undefined>,
): void {
  for (const week of weeks) {
    const groups = new Map<unknown, RawMatchup[]>()
    for (const m of week ?? []) {
      // A bye has no matchup id; grouping it invents a phantom game.
      if (m?.matchup_id == null) continue
      const list = groups.get(m.matchup_id) ?? []
      list.push(m)
      groups.set(m.matchup_id, list)
    }
    for (const pair of groups.values()) {
      if (pair.length !== 2) continue
      const [a, b] = pair
      const oa = ownerOfRoster[Number(a.roster_id)]
      const ob = ownerOfRoster[Number(b.roster_id)]
      if (!oa || !ob || oa === ob) continue
      const pa = Number(a.points)
      const pb = Number(b.points)
      if (!Number.isFinite(pa) || !Number.isFinite(pb) || pa === pb) continue
      const key = pairKey(oa, ob)
      const row = series[key] ?? {}
      const winner = pa > pb ? oa : ob
      row[winner] = (row[winner] ?? 0) + 1
      series[key] = row
    }
  }
}
