/**
 * Draft board layout for points leagues.
 *
 * Pure, so the awkward cases can be tested directly rather than through
 * a view. The awkward cases are the point: a draft board looks like a
 * simple grid and is not one.
 *
 * Placement reads each pick's own `draftedByTeamId` rather than
 * inferring a column from snake order. Snake order is an assumption
 * that breaks on traded picks, forfeited picks, auction drafts and
 * keeper leagues where a team's slot is not where its pick lands.
 */
import type { CategoryLeagueDataDraftPick } from '../types'

export interface DraftBoardRow {
  round: number
  /** One entry per column, in `columns` order. A cell holds every pick
   *  that team made in that round — usually one, but a team can hold
   *  two after a trade, and dropping the second would lose real data. */
  cells: CategoryLeagueDataDraftPick[][]
}

export interface DraftBoard {
  /** Team ids, left to right, in the order they first picked. */
  columns: string[]
  rows: DraftBoardRow[]
}

/**
 * Column order is the order teams made their first pick, derived from
 * the picks rather than assumed, so it holds for snake, linear and
 * auction drafts alike.
 */
export function draftColumnOrder(picks: CategoryLeagueDataDraftPick[]): string[] {
  const order: string[] = []
  const seen = new Set<string>()
  for (const p of [...picks].sort((a, b) => a.pickOverall - b.pickOverall)) {
    if (seen.has(p.draftedByTeamId)) continue
    seen.add(p.draftedByTeamId)
    order.push(p.draftedByTeamId)
  }
  return order
}

export function buildDraftBoard(picks: CategoryLeagueDataDraftPick[]): DraftBoard {
  const columns = draftColumnOrder(picks)
  if (columns.length === 0) return { columns: [], rows: [] }

  const index = new Map(columns.map((id, i) => [id, i]))
  const byRound = new Map<number, CategoryLeagueDataDraftPick[][]>()

  for (const p of picks) {
    const ci = index.get(p.draftedByTeamId)
    if (ci === undefined) continue
    let row = byRound.get(p.round)
    if (!row) {
      row = Array.from({ length: columns.length }, () => [])
      byRound.set(p.round, row)
    }
    row[ci].push(p)
  }

  const rows = [...byRound.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([round, cells]) => ({
      round,
      cells: cells.map((list) => [...list].sort((a, b) => a.pickOverall - b.pickOverall)),
    }))

  return { columns, rows }
}

/** Per-position pick counts. Deliberately counts only: the category
 *  page pairs these with an average value score, which football picks
 *  have no basis for, and a fabricated average would read as a real
 *  judgement. */
export function draftPositionCounts(
  picks: CategoryLeagueDataDraftPick[],
): { position: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const p of picks) {
    if (!p.position) continue
    counts.set(p.position, (counts.get(p.position) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([position, count]) => ({ position, count }))
    .sort((a, b) => b.count - a.count || a.position.localeCompare(b.position))
}
