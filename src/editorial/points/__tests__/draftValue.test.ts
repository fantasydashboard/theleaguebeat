import { describe, it, expect } from 'vitest'
import { findDraftDivergences, type ValuedPick } from '@/editorial/points/draftValue'

const pick = (n: number, pos: string, id: string): ValuedPick => ({
  pickOverall: n, round: Math.ceil(n / 10), playerId: id,
  playerName: `P${id}`, position: pos, teamId: 't1',
})

describe('draft divergences', () => {
  it('ignores a position with too few players to compare', () => {
    const picks = [pick(1,'K','a'), pick(2,'K','b')]
    const out = findDraftDivergences(picks, () => 1)
    expect(out.fell).toEqual([])
    expect(out.positionsCompared).toEqual([])
  })

  it('does not compare across positions, so a falling QB is not a steal', () => {
    // The exact failure mode of the naive approach: QBs go late in a
    // 1-QB league. Ordered correctly WITHIN quarterbacks, nothing is
    // out of order, so nothing is flagged.
    const picks = [1,2,3,4,5].map((i) => pick(100 + i, 'QB', `q${i}`))
    const rank = { q1: 10, q2: 20, q3: 30, q4: 40, q5: 50 } as Record<string, number>
    const out = findDraftDivergences(picks, (id) => rank[id])
    expect(out.fell).toEqual([])
    expect(out.reached).toEqual([])
  })

  it('flags a player taken far later than consensus at his position', () => {
    // rb1 is consensus RB1 but the league took him last of six.
    const picks = [pick(10,'RB','rb2'), pick(20,'RB','rb3'), pick(30,'RB','rb4'),
                   pick(40,'RB','rb5'), pick(50,'RB','rb6'), pick(60,'RB','rb1')]
    const rank = { rb1: 1, rb2: 2, rb3: 3, rb4: 4, rb5: 5, rb6: 6 } as Record<string, number>
    const out = findDraftDivergences(picks, (id) => rank[id])
    expect(out.fell[0].pick.playerId).toBe('rb1')
    expect(out.fell[0].delta).toBe(5)  // took him 6th, consensus 1st
    // Everyone else shifts up by exactly one, which is below the
    // threshold — one player falling should not manufacture five
    // "reaches" out of the normal texture of a draft.
    expect(out.reached).toEqual([])
  })

  it('excludes players with no consensus rank rather than assuming one', () => {
    const picks = [1,2,3,4,5,6].map((i) => pick(i * 10, 'WR', `w${i}`))
    const rank = { w1: 1, w2: 2, w3: 3, w4: 4, w5: 5 } as Record<string, number>
    const out = findDraftDivergences(picks, (id) => rank[id])
    const ids = [...out.fell, ...out.reached].map((d) => d.pick.playerId)
    expect(ids).not.toContain('w6')
  })

  it('is deterministic when consensus ranks tie', () => {
    // search_rank has real duplicates; the same draft must not produce
    // different steals on different runs.
    const picks = [1,2,3,4,5,6].map((i) => pick(i * 10, 'RB', `r${i}`))
    const rank = { r1: 5, r2: 5, r3: 5, r4: 1, r5: 5, r6: 5 } as Record<string, number>
    const a = JSON.stringify(findDraftDivergences(picks, (id) => rank[id]))
    const b = JSON.stringify(findDraftDivergences([...picks].reverse(), (id) => rank[id]))
    expect(a).toBe(b)
  })
})
