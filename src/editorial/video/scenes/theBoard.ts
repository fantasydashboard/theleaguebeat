/**
 * The Board — the fixed payoff scene. Full standings with movement.
 *
 * Two data honesties are enforced here:
 *
 *   1. `record` is the CATEGORY record (catWins–catLosses[–catTies]).
 *      CategoryLeagueDataStanding carries no matchup W–L, so we never
 *      present one.
 *   2. `delta` compares against the most recent seasonRankHistory
 *      entry, NOT currentWeek - 1. ESPN only records weeks where every
 *      matchup was decided, so week numbers skip. Missing history means
 *      a null delta, rendered as a dash — never a fabricated zero.
 */

import type { CategoryLeagueData } from '../../types'
import type { BoardRow, ReelScene } from '../types'

const EN_DASH = '–'

function formatRecord(w: number, l: number, t: number): string {
  return t > 0 ? `${w}${EN_DASH}${l}${EN_DASH}${t}` : `${w}${EN_DASH}${l}`
}

/** Spoken form of the category record, built straight from the raw
 *  numbers — never reverse-engineered from the display string, whose
 *  en dashes would otherwise leak into narration verbatim. */
function spokenRecord(w: number, l: number, t: number): string {
  if (t === 0) return `${w} and ${l}`
  return `${w} and ${l} with ${t} tie${t === 1 ? '' : 's'}`
}

/** Most recent history entry strictly before the current week. */
function previousRanks(data: CategoryLeagueData): Record<string, number> | null {
  const past = data.seasonRankHistory
    .filter((h) => h.week < data.currentWeek)
    .sort((h1, h2) => h2.week - h1.week)
  return past[0]?.ranks ?? null
}

export function buildBoard(
  data: CategoryLeagueData,
  highlightTeamIds: string[] = [],
): ReelScene | null {
  if (data.standings.length === 0) return null

  const prev = previousRanks(data)
  const highlight = new Set(highlightTeamIds)

  const sortedStandings = [...data.standings].sort((s1, s2) => s1.rank - s2.rank)

  const rows: BoardRow[] = sortedStandings.map((s) => {
    const team = data.teams.find((t) => t.id === s.teamId)
    const was = prev?.[s.teamId]
    return {
      rank: s.rank,
      teamName: team?.name ?? 'Unknown',
      record: formatRecord(s.catWins, s.catLosses, s.catTies),
      delta: was == null ? null : was - s.rank,
      highlight: highlight.has(s.teamId),
    }
  })

  const leader = rows[0]
  const leaderStanding = sortedStandings[0]
  const cutoff = data.playoffCutoff

  return {
    template: 'the-board',
    props: {
      rows,
      note: cutoff > 0 && rows.length > cutoff
        ? `TOP ${cutoff} MAKE THE PLAYOFFS`
        : '',
    },
    vo: `Here's the board after week ${data.currentWeek}. ${leader.teamName} on top at ${spokenRecord(leaderStanding.catWins, leaderStanding.catLosses, leaderStanding.catTies)}.`,
    minDurationMs: 9000,
  }
}
