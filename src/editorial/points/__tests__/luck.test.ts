import { describe, it, expect } from 'vitest'
import { MIN_WEEKS_FOR_LUCK, describeLuck, readLuck, type LuckInput } from '../luck'

const team = (teamId: string, power: number, wins: number, losses: number): LuckInput => ({
  teamId,
  power,
  wins,
  losses,
  ties: 0,
})

/** Ten teams, so the tolerance is a meaningful slice of the field. */
const league = (spec: [string, number, number, number][]) =>
  spec.map(([id, p, w, l]) => team(id, p, w, l))

describe('readLuck', () => {
  it('flags a team whose record runs ahead of its power', () => {
    // `lucky` is the worst team in the league and top of the standings.
    const teams = league([
      ['lucky', 20, 9, 1],
      ['a', 90, 6, 4], ['b', 85, 6, 4], ['c', 80, 5, 5], ['d', 75, 5, 5],
      ['e', 70, 5, 5], ['f', 65, 4, 6], ['g', 60, 4, 6], ['h', 55, 3, 7],
      ['i', 50, 3, 7],
    ])
    const out = readLuck(teams, 10)
    expect(out.find((l) => l.teamId === 'lucky')!.verdict).toBe('riding-luck')
  })

  it('flags a team better than its record says', () => {
    // `unlucky` is the best team in the league and bottom of the standings.
    const teams = league([
      ['unlucky', 99, 1, 9],
      ['a', 60, 8, 2], ['b', 58, 7, 3], ['c', 56, 7, 3], ['d', 54, 6, 4],
      ['e', 52, 6, 4], ['f', 50, 5, 5], ['g', 48, 5, 5], ['h', 46, 4, 6],
      ['i', 44, 4, 6],
    ])
    const out = readLuck(teams, 10)
    expect(out.find((l) => l.teamId === 'unlucky')!.verdict).toBe('better-than-record')
  })

  it('withholds every verdict before the season can support one', () => {
    // THE guard. At one week a record is a coin toss, and reading it as
    // fate brands most of the league on the evidence of one Sunday.
    const teams = league([
      ['lucky', 20, 1, 0],
      ['a', 90, 0, 1], ['b', 85, 0, 1], ['c', 80, 0, 1], ['d', 75, 1, 0],
      ['e', 70, 1, 0], ['f', 65, 0, 1], ['g', 60, 1, 0], ['h', 55, 0, 1],
      ['i', 50, 1, 0],
    ])
    const out = readLuck(teams, MIN_WEEKS_FOR_LUCK - 1)
    expect(out.every((l) => l.verdict === 'fair')).toBe(true)
    // The ranks are still real and still reported — only the judgement
    // is withheld.
    expect(out.find((l) => l.teamId === 'lucky')!.powerRank).toBe(10)
  })

  it('does not call a small wobble fate', () => {
    // A team one place off between the two rankings is noise, not luck.
    const teams = league([
      ['a', 90, 6, 4], ['b', 88, 7, 3], ['c', 80, 5, 5], ['d', 75, 5, 5],
      ['e', 70, 5, 5], ['f', 65, 4, 6], ['g', 60, 4, 6], ['h', 55, 3, 7],
      ['i', 50, 3, 7], ['j', 45, 2, 8],
    ])
    const out = readLuck(teams, 10)
    expect(out.find((l) => l.teamId === 'a')!.verdict).toBe('fair')
    expect(out.find((l) => l.teamId === 'b')!.verdict).toBe('fair')
  })

  it('scales its tolerance with league size', () => {
    // A two-place gap is a quarter of a four-team league and an eighth
    // of a sixteen-team one, so it cannot mean the same thing in both.
    // `x` is third on power and first on record — delta 2 either way,
    // and only the scaled tolerance calls it luck in the small league.
    const small = readLuck(league([
      ['a', 100, 1, 3], ['b', 90, 2, 2], ['x', 80, 3, 1], ['c', 70, 2, 2],
    ]), 10)
    expect(small.find((l) => l.teamId === 'x')!.delta).toBe(2)
    expect(small.find((l) => l.teamId === 'x')!.verdict).toBe('riding-luck')

    // Same delta of 2 in a twelve-team league, where the tolerance is
    // 3, is ordinary noise.
    const big = readLuck(league([
      ['a', 120, 5, 5], ['b', 118, 5, 5], ['y', 116, 8, 2], ['c', 114, 8, 2],
      ['d', 112, 7, 3], ['e', 110, 6, 4], ['f', 108, 6, 4], ['g', 106, 5, 5],
      ['h', 104, 4, 6], ['i', 102, 4, 6], ['j', 100, 3, 7], ['k', 98, 2, 8],
    ]), 10)
    const y = big.find((l) => l.teamId === 'y')!
    expect(Math.abs(y.delta)).toBeLessThan(3)
    expect(y.verdict).toBe('fair')
  })

  it('returns nothing for an empty league', () => {
    expect(readLuck([], 10)).toEqual([])
  })
})

describe('describeLuck', () => {
  it('says nothing when there is nothing to say', () => {
    expect(
      describeLuck(
        { teamId: 't', powerRank: 3, recordRank: 3, delta: 0, verdict: 'fair' },
        'Team',
      ),
    ).toBeNull()
  })

  it('names both ranks, so the claim shows its working', () => {
    const line = describeLuck(
      { teamId: 't', powerRank: 9, recordRank: 2, delta: 7, verdict: 'riding-luck' },
      'Mighty Mallards',
    )!
    expect(line).toContain('Mighty Mallards')
    expect(line).toContain('2nd')
    expect(line).toContain('9th')
  })
})
