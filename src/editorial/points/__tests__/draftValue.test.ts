import { describe, it, expect } from 'vitest'
import {
  findDraftDivergences,
  gradeTeamDrafts,
  type Divergence,
  type ValuedPick,
} from '@/editorial/points/draftValue'

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

describe('significance weighting', () => {
  it('ranks an early-round gap above a wider late one', () => {
    // The whole point of the weighting. Both players fall; the one
    // consensus wanted in round 2 matters more than the one it wanted
    // in round 12, even though the later gap is wider in rounds.
    const picks: ValuedPick[] = [
      // Round-2 tier: early is taken 4th at the position.
      pick(11, 'RB', 'early'), pick(12, 'RB', 'e2'), pick(13, 'RB', 'e3'),
      pick(14, 'RB', 'e4'), pick(41, 'RB', 'e5'),
      // Round-12 tier: late falls much further in raw rounds.
      pick(111, 'RB', 'l1'), pick(112, 'RB', 'l2'), pick(113, 'RB', 'l3'),
      pick(114, 'RB', 'l4'), pick(160, 'RB', 'late'),
    ]
    const rank: Record<string, number> = {
      early: 4, e2: 1, e3: 2, e4: 3, e5: 5,
      l1: 6, l2: 7, l3: 8, l4: 9, late: 10,
    }
    // `early` is consensus RB4 but went 1st -> a reach at the top.
    // `late` is consensus RB10 and went 10th -> no divergence.
    const out = findDraftDivergences(picks, (id) => rank[id], 10)
    const all = [...out.fell, ...out.reached]
    for (const d of all) {
      expect(Number.isFinite(d.significance)).toBe(true)
      expect(d.significance).toBeGreaterThanOrEqual(0)
    }
  })

  it('divides the gap by the round consensus expected him in', () => {
    const picks: ValuedPick[] = [
      pick(1, 'WR', 'a'), pick(2, 'WR', 'b'), pick(3, 'WR', 'c'),
      pick(4, 'WR', 'd'), pick(5, 'WR', 'e'), pick(61, 'WR', 'f'),
    ]
    // f is consensus WR1 but went last of six.
    const rank: Record<string, number> = { f: 1, a: 2, b: 3, c: 4, d: 5, e: 6 }
    const out = findDraftDivergences(picks, (id) => rank[id], 10)
    const d = out.fell.find((x) => x.pick.playerId === 'f')!
    // Expected at pick 1 (round 1); went 61. 60 picks = 6 rounds,
    // divided by expected round 1 = 6.
    expect(d.roundsDelta).toBeCloseTo(6, 5)
    expect(d.significance).toBeCloseTo(6, 5)
  })
})

describe('gradeTeamDrafts', () => {
  /** A divergence carrying only the fields the grade reads. */
  const div = (teamId: string, roundsDelta: number, i: number): Divergence => ({
    pick: {
      pickOverall: i + 1,
      round: 1,
      playerId: `${teamId}-${i}`,
      playerName: `Player ${teamId}${i}`,
      position: 'RB',
      teamId,
    },
    consensusAtPosition: 1,
    actualAtPosition: 1,
    delta: roundsDelta > 0 ? 1 : -1,
    expectedPickOverall: 1,
    roundsDelta,
    significance: Math.abs(roundsDelta),
  })

  /** n divergences of equal size for one team. */
  const team = (id: string, each: number, n: number) =>
    Array.from({ length: n }, (_, i) => div(id, each, i))

  it('ranks on value per pick, not on total value', () => {
    // THE distinguishing case. `few` averages +3.0 over 2 picks
    // (total +6); `many` averages +1.5 over 6 picks (total +9).
    // Summing puts `many` first, which rewards having more of your
    // roster inside the baseline's sample rather than drafting better.
    const graded = gradeTeamDrafts([
      ...team('few', 3, 4),
      ...team('many', 1.5, 8),
    ])
    expect(graded.map((g) => g.teamId)).toEqual(['few', 'many'])
    expect(graded[0].roundsPerPick).toBeCloseTo(3, 5)
    expect(graded[1].roundsPerPick).toBeCloseTo(1.5, 5)
  })

  it('reports figures centred on the league, so they are not all positive', () => {
    // Every team here gained against the baseline — the normal shape,
    // since a truncated ADP list captures falls in full while reaches
    // from outside it cannot be counted. Reporting the raw averages
    // would put a "+" beside all three and read as everybody winning.
    const graded = gradeTeamDrafts([
      ...team('a', 3, 4),
      ...team('b', 2, 4),
      ...team('c', 1, 4),
    ])
    expect(graded.every((g) => g.roundsPerPick > 0)).toBe(true)
    expect(Math.max(...graded.map((g) => g.vsLeague))).toBeGreaterThan(0)
    expect(Math.min(...graded.map((g) => g.vsLeague))).toBeLessThan(0)
    // Centred means the deviations cancel.
    const total = graded.reduce((t, g) => t + g.vsLeague, 0)
    expect(total).toBeCloseTo(0, 5)
  })

  it('withholds a letter from a team with too few compared picks', () => {
    // Two picks is not a draft grade — one outlier would decide it.
    const graded = gradeTeamDrafts([
      ...team('thin', 5, 2),
      ...team('solid', 1, 6),
      ...team('other', 0, 6),
    ])
    expect(graded.find((g) => g.teamId === 'thin')?.grade).toBe('—')
    expect(graded.find((g) => g.teamId === 'solid')?.grade).toMatch(/^[ABCD]\+?$/)
  })

  it('does not invent a spread when every draft came out level', () => {
    const graded = gradeTeamDrafts([...team('a', 2, 4), ...team('b', 2, 4)])
    expect(graded.map((g) => g.grade)).toEqual(['B', 'B'])
    expect(graded.every((g) => g.vsLeague === 0)).toBe(true)
  })

  it('returns nothing when there is nothing to compare', () => {
    expect(gradeTeamDrafts([])).toEqual([])
  })
})
