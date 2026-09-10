import { describe, it, expect } from 'vitest'
import { espnRosterPositions } from '../espnLineupSlots'
import { startingSlots } from '@/editorial/points/rosterStrength'

describe('espnRosterPositions', () => {
  it('translates a standard ESPN football roster', () => {
    // QB, 2 RB, 2 WR, TE, FLEX, D/ST, K, 7 bench.
    const out = espnRosterPositions({
      '0': 1, '2': 2, '4': 2, '6': 1, '23': 1, '16': 1, '17': 1, '20': 7,
    })!
    expect(out.filter((s) => s !== 'BN')).toEqual(['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX'])
  })

  it('drops slots the projection baseline cannot value, but keeps the count', () => {
    // Sleeper projections cover QB/RB/WR/TE. A kicker slot filled by a
    // player worth `undefined` would score every team an identical
    // silent zero — worse than not measuring it, because it looks
    // measured. They become bench so the roster size still adds up.
    const out = espnRosterPositions({ '0': 1, '16': 1, '17': 1, '20': 5 })!
    expect(startingSlots(out)).toEqual(['QB'])
    expect(out).toHaveLength(1 + 1 + 1 + 5)
  })

  it('speaks the vocabulary the strength ranker already understands', () => {
    // The whole point of translating rather than teaching the points
    // modules a second dialect: every token must survive startingSlots.
    const out = espnRosterPositions({ '0': 1, '2': 2, '4': 2, '6': 1, '23': 2, '7': 1, '20': 6 })!
    expect(startingSlots(out)).toEqual(
      ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'FLEX', 'SUPER_FLEX'],
    )
  })

  it('maps ESPN’s two-position slots onto FLEX', () => {
    // 3 is RB/WR and 5 is WR/TE. Both are flex slots by another name.
    expect(startingSlots(espnRosterPositions({ '3': 1, '20': 1 })!)).toEqual(['FLEX'])
    expect(startingSlots(espnRosterPositions({ '5': 1, '20': 1 })!)).toEqual(['FLEX'])
  })

  it('returns undefined rather than an empty roster', () => {
    // The caller has to tell "ESPN told us nothing" from "a league with
    // no starters", because the first is a fetch problem and the second
    // cannot happen.
    expect(espnRosterPositions(undefined)).toBeUndefined()
    expect(espnRosterPositions(null)).toBeUndefined()
    expect(espnRosterPositions({})).toBeUndefined()
    expect(espnRosterPositions({ '20': 9 })).toBeUndefined()   // bench only
    expect(espnRosterPositions({ '999': 3 })).toBeUndefined()  // unknown slot
  })

  it('ignores junk counts instead of inventing slots', () => {
    expect(espnRosterPositions({ '0': 1, '2': 0, '4': -1, '6': NaN, '20': 3 })!
      .filter((s) => s !== 'BN')).toEqual(['QB'])
  })
})
