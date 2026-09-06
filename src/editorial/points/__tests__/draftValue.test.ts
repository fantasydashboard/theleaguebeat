import { describe, it, expect } from 'vitest'
import {
  findAdpDivergences,
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

describe('list ordering', () => {
  const p = (n: number, name: string): ValuedPick => ({
    pickOverall: n, round: Math.ceil(n / 10), playerId: name,
    playerName: name, position: 'RB', teamId: 't1',
  })

  it('puts the biggest gap first, not the most significant one', () => {
    // THE distinguishing case, and the reason the ordering changed.
    // Rank mapping sends the k-th best ADP to the k-th used slot, so
    // these four picks resolve to: `early` expected at 10 and taken at
    // 30 (2 rounds, from round 1), `big` expected at 40 and taken at
    // 100 (6 rounds, from round 4). Weighting by significance ranks
    // `early` first (2.0 vs 1.5) and prints "2 rds" above "6 rds" —
    // which reads as a broken sort and makes a reader distrust every
    // other figure on the slide.
    const out = findAdpDivergences(
      [p(30, 'early'), p(10, 'fillerA'), p(40, 'fillerB'), p(100, 'big')],
      (pk) => ({ early: 1, fillerA: 2, big: 3, fillerB: 4 })[pk.playerName],
      10,
    )
    expect(out.fell.map((d) => d.pick.playerName)).toEqual(['big', 'early'])
    expect(out.fell.map((d) => d.roundsDelta)).toEqual([6, 2])
  })

  it('breaks a tie on significance, so the premium slide leads', () => {
    // Both slid exactly 3 rounds — `fromEarly` from round 2, `fromLate`
    // from round 4. The earlier one is the better story, and this is
    // the one place that judgement costs the reader nothing, since the
    // visible round figures are equal either way.
    const out = findAdpDivergences(
      [p(50, 'fromEarly'), p(70, 'fromLate'), p(20, 'fillerA'), p(40, 'fillerB')],
      (pk) => ({ fromEarly: 1, fromLate: 2, fillerA: 3, fillerB: 4 })[pk.playerName],
      10,
    )
    expect(out.fell.map((d) => d.roundsDelta)).toEqual([3, 3])
    expect(out.fell.map((d) => d.pick.playerName)).toEqual(['fromEarly', 'fromLate'])
  })

  it('orders the search_rank fallback the same way', () => {
    // Both baselines feed the same slides; an ordering that differed
    // between them would make the deck inconsistent for no reason the
    // reader could see.
    const picks: ValuedPick[] = [
      p(1, 'a'), p(2, 'b'), p(3, 'c'), p(4, 'd'), p(5, 'e'), p(61, 'f'),
    ]
    const rank: Record<string, number> = { f: 1, a: 2, b: 3, c: 4, d: 5, e: 6 }
    const out = findDraftDivergences(picks, (id) => rank[id], 10)
    const mags = out.fell.map((d) => Math.abs(d.roundsDelta))
    expect(mags).toEqual([...mags].sort((x, y) => y - x))
  })
})

describe('significance weighting', () => {
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

describe('what counts as evidence, versus what earns a slide', () => {
  // A ten-team draft where most picks land near their ADP and a few
  // move a long way — the ordinary shape of any real draft.
  const teams = ['t1', 't2']
  const picks: ValuedPick[] = Array.from({ length: 40 }, (_, i) => ({
    pickOverall: i + 1,
    round: Math.ceil((i + 1) / 10),
    playerId: `p${i}`,
    playerName: `P${i}`,
    position: 'RB',
    teamId: teams[i % 2],
  }))
  // ADP near pick order, perturbed deterministically. A pure two-player
  // SWAP is no good here: it leaves every other pick at delta exactly
  // zero, so the fixture has no small-but-nonzero divergence and cannot
  // tell a working slide threshold from a missing one. Displacing
  // players shifts everyone between them by a slot, which is the
  // ordinary texture of a real board.
  const adp = new Map(picks.map((p, i) => [p.playerId, i + 1]))
  adp.set('p34', 2.5)   // t1: ADP wanted him early, league took him last
  adp.set('p3', 38.5)   // t2: league took him far ahead of ADP

  const div = findAdpDivergences(picks, (p) => adp.get(p.playerId), 10)

  it('keeps every comparable pick in `all`, not just the ones worth showing', () => {
    // `fell` and `reached` answer "what is worth a slide". `all`
    // answers "what is the evidence" — a different question, and the
    // one grading has to use.
    expect(div.all).toHaveLength(picks.length)
    expect(div.fell.length + div.reached.length).toBeLessThan(div.all.length)

    // Every pick that DOES earn a slide cleared the threshold. Without
    // this the lists fill with the ordinary texture of a draft — ADP
    // itself moves a round week to week — and the steal of the draft
    // ends up being somebody taken four slots off his ADP.
    for (const d of [...div.fell, ...div.reached]) {
      expect(Math.abs(d.roundsDelta), `${d.pick.playerName} is inside a round`)
        .toBeGreaterThanOrEqual(1)
    }
    // And the fixture actually has near-ADP picks to exclude.
    expect(div.all.filter((d) => Math.abs(d.roundsDelta) < 1).length).toBeGreaterThan(0)
  })

  it('sums to zero over every comparable pick', () => {
    // THE property that justifies rank mapping. Scaling ADP by league
    // size produced a systematic +1.01 round bias on a real draft —
    // 58 fallers against 14 reaches — because it ignored a large
    // intercept. Mapping the k-th best ADP onto the k-th used slot
    // cannot: the slots are the draft's own.
    const total = div.all.reduce((t, d) => t + d.roundsDelta, 0)
    expect(Math.abs(total)).toBeLessThan(1e-9)

    // Deliberately NOT asserted: that the filtered subset fails to sum
    // to zero. On a real draft it summed to +4.1 rounds, but that is a
    // property of how magnitudes happen to be distributed, not a
    // theorem — a clean two-player swap filters to an exactly balanced
    // pair. Only the full set is guaranteed.
  })

  it('grades over every comparable pick, so the per-pick figure is per PICK', () => {
    // Grading off the filtered lists measured each team over only the
    // picks that moved a round or more — three to seven of fourteen on
    // a real draft — while the card called it "rounds per pick". It
    // roughly doubled every figure.
    const graded = gradeTeamDrafts(div.all)
    for (const g of graded) {
      expect(g.picksCompared).toBe(picks.length / teams.length)
    }

    const filtered = gradeTeamDrafts([...div.fell, ...div.reached])
    const biggest = (rows: typeof graded) => Math.max(...rows.map((r) => Math.abs(r.vsLeague)))
    expect(biggest(filtered)).toBeGreaterThan(biggest(graded))
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
