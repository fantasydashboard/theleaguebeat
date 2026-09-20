import { describe, it, expect } from 'vitest'
import { detectUpsets, upsetThresholds, MIN_UPSET_GAP } from '../upsets'
import type { IssueResult } from '../../issue/types'

const final = (
  id: string, home: string, away: string, hp: number, ap: number,
): IssueResult => ({
  id, homeTeamId: home, awayTeamId: away, status: 'final',
  homeScore: hp, awayScore: ap,
})

/** The real League of Record board going into week 1. */
const LOR: Record<string, number> = {
  amanra: 1, mallards: 2, scuttle: 3, gridiron: 4, chancla: 5,
  juggs: 6, pigskin: 7, overdrive: 8, enforcers: 9, throws: 10,
}
const base = { priorRank: (id: string) => LOR[id], fieldSize: 10 }

describe('the gap that counts as an upset', () => {
  it('scales with the field, so four spots means the same everywhere', () => {
    // Four of ten and five of twelve are the same distance through
    // the room; a flat number would drift as leagues grow.
    expect(upsetThresholds(10)).toEqual({ upset: 4, heist: 7 })
    expect(upsetThresholds(12)).toEqual({ upset: 5, heist: 8 })
    expect(upsetThresholds(14)).toEqual({ upset: 6, heist: 9 })
  })

  it('never lets a tiny league call neighbours an upset', () => {
    // 40% of a four-team field is two spots, which is most of the
    // room. The floor stops that.
    expect(upsetThresholds(4).upset).toBe(MIN_UPSET_GAP)
  })
})

describe('detecting the week’s upsets', () => {
  it('calls the real week 1 upset and nothing else', () => {
    // Measured against the actual board and the actual results.
    // OverDrive were eighth and beat the second-ranked Mallards by
    // 31.7; nothing else in the week came from four spots down.
    const out = detectUpsets({
      ...base,
      results: [
        final('1', 'scuttle', 'chancla', 151.1, 133.6),   // 3 over 5
        final('2', 'enforcers', 'juggs', 151.9, 133.1),   // 9 over 6, gap 3
        final('3', 'overdrive', 'mallards', 144.0, 112.3), // 8 over 2, gap 6
        final('4', 'amanra', 'pigskin', 107.6, 65.2),     // favourite
      ],
    })
    expect(out).toHaveLength(1)
    expect(out[0].winnerId).toBe('overdrive')
    expect(out[0].gap).toBe(6)
    expect(out[0].winnerRank).toBe(8)
    expect(out[0].loserRank).toBe(2)
    expect(out[0].margin).toBeCloseTo(31.7, 5)
    expect(out[0].heist).toBe(false)
  })

  it('says nothing when a good team beats a slightly worse one', () => {
    // The whole reason a gap rule works: adjacent teams are excluded
    // by the threshold, which was the objection to using ranks at all.
    const out = detectUpsets({
      ...base,
      results: [final('1', 'mallards', 'amanra', 120, 118)],
    })
    expect(out).toEqual([])
  })

  it('escalates a climb from the bottom of the room to a heist', () => {
    const out = detectUpsets({
      ...base,
      results: [final('1', 'throws', 'amanra', 130, 118)],  // 10 over 1
    })
    expect(out[0].gap).toBe(9)
    expect(out[0].heist).toBe(true)
  })

  it('ignores ties, unfinished games, and teams the board cannot place', () => {
    const out = detectUpsets({
      ...base,
      results: [
        final('1', 'overdrive', 'mallards', 110, 110),
        { ...final('2', 'throws', 'amanra', 130, 118), status: 'live' },
        final('3', 'newcomer', 'amanra', 140, 100),
      ],
    })
    expect(out).toEqual([])
  })

  it('orders the biggest climb first', () => {
    const out = detectUpsets({
      ...base,
      results: [
        final('1', 'overdrive', 'mallards', 144, 112),   // gap 6
        final('2', 'throws', 'amanra', 130, 118),        // gap 9
      ],
    })
    expect(out.map((u) => u.winnerId)).toEqual(['throws', 'overdrive'])
  })

  it('does not need a margin to call an upset', () => {
    // Beating a much better team by a point is still beating them.
    // The margin belongs in the sentence, not the gate.
    const out = detectUpsets({
      ...base,
      results: [final('1', 'overdrive', 'mallards', 100.4, 100.1)],
    })
    expect(out).toHaveLength(1)
  })
})
