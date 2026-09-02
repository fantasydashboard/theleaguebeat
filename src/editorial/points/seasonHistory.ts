/**
 * Multi-season history for points leagues.
 *
 * THE RULE HERE: a champion is read from the playoff bracket, never
 * inferred. The temptation is to call the best regular-season record
 * the champion — it is right often enough to look plausible. In the
 * captured league it is wrong in every single season where both are
 * known:
 *
 *   2024  champion roster 4, best record roster 1
 *   2023  champion roster 2, best record roster 6
 *   2022  champion roster 1, best record roster 2
 *
 * The bracket's final match carries `w` (champion) and `l` (runner-up)
 * and is authoritative. `metadata.latest_league_winner_roster_id` agrees
 * where it exists and is used as a cross-check, but it is absent on
 * older seasons, so the bracket leads.
 *
 * Seasons whose champion cannot be established are omitted rather than
 * guessed. A Hall of Champions naming the wrong manager is worse than
 * one that is a season short.
 */
import type { CategoryLeagueDataSeasonHistory } from '../types'

/** One match in a Sleeper playoff bracket. `p: 1` marks the placement
 *  match for first place — the final. */
export interface SleeperBracketMatch {
  r?: number
  m?: number
  /** Winner roster id. Null while the match is unplayed. */
  w?: number | null
  /** Loser roster id. */
  l?: number | null
  /** Placement this match decides. 1 is the championship. */
  p?: number | null
}

export interface SleeperSeasonInput {
  season: number
  /** `metadata.latest_league_winner_roster_id`, when the league has it. */
  metadataWinnerRosterId?: string | null
  bracket: SleeperBracketMatch[]
  rosters: {
    rosterId: string
    wins: number
    losses: number
    ties: number
    /** Display name resolved by the caller — past seasons have their own
     *  user list, and a manager can leave the league entirely. */
    name?: string
  }[]
}

/**
 * The final is the match deciding first place. Sleeper marks it with
 * `p: 1`. Older brackets sometimes omit `p`, in which case the final is
 * the last match of the deepest round — brackets are ordered, and the
 * championship is the last thing decided.
 */
export function findFinal(bracket: SleeperBracketMatch[]): SleeperBracketMatch | undefined {
  const placed = bracket.find((m) => m.p === 1)
  if (placed) return placed
  if (bracket.length === 0) return undefined
  const maxRound = Math.max(...bracket.map((m) => m.r ?? 0))
  const deepest = bracket.filter((m) => (m.r ?? 0) === maxRound)
  return deepest[deepest.length - 1]
}

export function buildPointsSeasonHistory(
  seasons: SleeperSeasonInput[],
): CategoryLeagueDataSeasonHistory[] {
  const out: CategoryLeagueDataSeasonHistory[] = []

  for (const s of seasons) {
    const final = findFinal(s.bracket)
    const championId =
      final?.w != null
        ? String(final.w)
        : s.metadataWinnerRosterId
          ? String(s.metadataWinnerRosterId)
          : null

    // No bracket result and no recorded winner — the season happened,
    // but who won it is not in the data. Omit rather than invent.
    if (!championId) continue

    const runnerUpId = final?.l != null ? String(final.l) : ''

    const byId = new Map(s.rosters.map((r) => [r.rosterId, r]))
    const champion = byId.get(championId)

    // Basement is the worst regular-season record, which IS derivable
    // and means what it says — unlike champion, it is not a playoff
    // outcome. Ties broken by fewest wins then most losses.
    const sorted = [...s.rosters].sort(
      (a, b) => a.wins - b.wins || b.losses - a.losses,
    )
    const basement = sorted[0]

    out.push({
      year: s.season,
      championTeamId: championId,
      championRecord: champion
        ? `${champion.wins}-${champion.losses}${champion.ties > 0 ? `-${champion.ties}` : ''}`
        : '',
      runnerUpTeamId: runnerUpId,
      basementTeamId: basement?.rosterId ?? '',
      championName: champion?.name,
      runnerUpName: runnerUpId ? byId.get(runnerUpId)?.name : undefined,
      basementName: basement?.name,
    })
  }

  // Most recent season first.
  return out.sort((a, b) => b.year - a.year)
}
