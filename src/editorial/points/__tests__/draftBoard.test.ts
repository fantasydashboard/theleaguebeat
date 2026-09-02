import { describe, it, expect } from 'vitest'
import { buildDraftBoard, draftColumnOrder, draftPositionCounts } from '../draftBoard'
import { buildSleeperPointsData } from '@/editorial/adapters/sleeperAdapter'
import { sleeperFootballFixture } from '@/fixtures/sleeperFootball'
import type { CategoryLeagueDataDraftPick } from '@/editorial/types'

function pick(
  pickOverall: number,
  round: number,
  teamId: string,
  extra: Partial<CategoryLeagueDataDraftPick> = {},
): CategoryLeagueDataDraftPick {
  return {
    pickOverall,
    round,
    playerId: `p${pickOverall}`,
    playerName: `Player ${pickOverall}`,
    position: 'RB',
    mlbTeam: 'PHI',
    draftedByTeamId: teamId,
    ...extra,
  }
}

describe('draft board layout', () => {
  it('orders columns by who picked first', () => {
    const picks = [pick(3, 1, 'c'), pick(1, 1, 'a'), pick(2, 1, 'b')]
    expect(draftColumnOrder(picks)).toEqual(['a', 'b', 'c'])
  })

  it('places a snake round in the right columns, not reversed', () => {
    // Round 2 runs right-to-left. Each pick must still land under its
    // own team, which is why placement reads draftedByTeamId rather
    // than inferring a column from position in the round.
    const picks = [
      pick(1, 1, 'a'), pick(2, 1, 'b'), pick(3, 1, 'c'),
      pick(4, 2, 'c'), pick(5, 2, 'b'), pick(6, 2, 'a'),
    ]
    const board = buildDraftBoard(picks)
    expect(board.columns).toEqual(['a', 'b', 'c'])
    expect(board.rows.map((r) => r.round)).toEqual([1, 2])
    // Column 0 is team 'a' in BOTH rounds.
    expect(board.rows[0].cells[0][0].pickOverall).toBe(1)
    expect(board.rows[1].cells[0][0].pickOverall).toBe(6)
    expect(board.rows[1].cells[2][0].pickOverall).toBe(4)
  })

  it('keeps both picks when a team holds two in one round', () => {
    // Routine after a trade, and the captured suite contains dynasty
    // leagues where this is common. A one-pick-per-cell grid would
    // silently drop the second.
    const picks = [
      pick(1, 1, 'a'), pick(2, 1, 'b'),
      pick(3, 2, 'b'), pick(4, 2, 'b'),
    ]
    const board = buildDraftBoard(picks)
    const bIndex = board.columns.indexOf('b')
    const round2 = board.rows.find((r) => r.round === 2)!
    expect(round2.cells[bIndex].map((p) => p.pickOverall)).toEqual([3, 4])
    // And the team that traded the pick away has an empty cell, not a
    // borrowed one.
    const aIndex = board.columns.indexOf('a')
    expect(round2.cells[aIndex]).toEqual([])
  })

  it('handles an empty draft without inventing a grid', () => {
    expect(buildDraftBoard([])).toEqual({ columns: [], rows: [] })
  })

  it('counts positions without averaging a value it does not have', () => {
    const counts = draftPositionCounts([
      pick(1, 1, 'a', { position: 'RB' }),
      pick(2, 1, 'b', { position: 'WR' }),
      pick(3, 1, 'c', { position: 'RB' }),
      pick(4, 1, 'd', { position: '' }),
    ])
    expect(counts).toEqual([
      { position: 'RB', count: 2 },
      { position: 'WR', count: 1 },
    ])
  })
})

describe('draft board on the real captured draft', () => {
  const data = buildSleeperPointsData(
    sleeperFootballFixture as unknown as Parameters<typeof buildSleeperPointsData>[0],
  )
  const picks = [...(data.draft?.picks ?? [])]

  it('lays out every pick exactly once', () => {
    const board = buildDraftBoard(picks)
    const placed = board.rows.flatMap((r) => r.cells.flat())
    expect(placed.length).toBe(picks.length)
    expect(new Set(placed.map((p) => p.pickOverall)).size).toBe(picks.length)
  })

  it('has one column per team and a row per round', () => {
    const board = buildDraftBoard(picks)
    expect(board.columns.length).toBe(data.teams.length)
    expect(board.rows.length).toBe(Math.max(...picks.map((p) => p.round)))
    for (const row of board.rows) {
      expect(row.cells.length).toBe(board.columns.length)
    }
  })
})
