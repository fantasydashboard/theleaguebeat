import { describe, it, expect } from 'vitest'
import {
  detectUpsets,
  winProbability,
  UPSET_MAX_PROB,
  HEIST_MAX_PROB,
  MIN_PRIOR_WEEKS,
} from '../upsets'
import type { LeagueDataPointsMatchup } from '@/editorial/types'

const final = (
  id: string, home: string, away: string, hp: number, ap: number,
): LeagueDataPointsMatchup => ({
  id, homeTeamId: home, awayTeamId: away, status: 'final',
  homePoints: hp, awayPoints: ap,
})

/** Prior scoring averages, points per week. */
const means = (m: Record<string, number>) => (id: string) => m[id]

const base = { priorWeeks: 4 }

describe('the win probability the gate runs on', () => {
  it('matches the normal CDF, not the compressed tanh the cards used', () => {
    // The graphics generator shipped an approximation with the wrong
    // constants — √(π/8) where √(2/π) belongs — which pulled every
    // probability toward a coin flip. An upset gate built on that
    // would call 33% games 37% and miss real upsets at the margin.
    expect(winProbability(0)).toBeCloseTo(0.5, 6)
    // Φ(-0.4243) = 0.3357 — a 15-point underdog at σ25 a side.
    expect(winProbability(-15)).toBeCloseTo(0.3357, 2)
    // Φ(-0.7071) = 0.2399 — a 25-point underdog.
    expect(winProbability(-25)).toBeCloseTo(0.2399, 2)
  })
})

describe('the upset gate', () => {
  it('calls an upset when the winner came in under 35%', () => {
    // 100 a week beat 115 a week: a 33.6% shot before kickoff.
    const out = detectUpsets({
      ...base,
      results: [final('1', 'dog', 'fav', 121, 110)],
      priorPointsPerWeek: means({ dog: 100, fav: 115 }),
    })
    expect(out).toHaveLength(1)
    expect(out[0].winnerId).toBe('dog')
    expect(out[0].loserId).toBe('fav')
    expect(out[0].winProb).toBeLessThan(UPSET_MAX_PROB)
    expect(out[0].heist).toBe(false)
  })

  it('says nothing about a 36% shot landing', () => {
    // 100 vs 113 is 35.7% — close games happen. A section that fires
    // on those teaches readers the word upset means nothing.
    const out = detectUpsets({
      ...base,
      results: [final('1', 'dog', 'fav', 121, 110)],
      priorPointsPerWeek: means({ dog: 100, fav: 113 }),
    })
    expect(out).toEqual([])
  })

  it('escalates to a heist under 25%', () => {
    // 100 beat 125: a 24% shot.
    const out = detectUpsets({
      ...base,
      results: [final('1', 'dog', 'fav', 130, 118)],
      priorPointsPerWeek: means({ dog: 100, fav: 125 }),
    })
    expect(out[0].winProb).toBeLessThan(HEIST_MAX_PROB)
    expect(out[0].heist).toBe(true)
  })

  it('never calls the favorite winning an upset', () => {
    const out = detectUpsets({
      ...base,
      results: [final('1', 'fav', 'dog', 130, 90)],
      priorPointsPerWeek: means({ dog: 100, fav: 125 }),
    })
    expect(out).toEqual([])
  })

  it('skips ties, live games, and teams with no prior average', () => {
    const live: LeagueDataPointsMatchup = {
      id: '2', homeTeamId: 'dog', awayTeamId: 'fav',
      status: 'live', homePoints: 80, awayPoints: 40,
    }
    const out = detectUpsets({
      ...base,
      results: [
        final('1', 'dog', 'fav', 110, 110),     // tie
        live,                                    // not finished
        final('3', 'new', 'fav', 140, 100),      // 'new' has no prior
      ],
      priorPointsPerWeek: means({ dog: 100, fav: 125 }),
    })
    expect(out).toEqual([])
  })

  it('stays silent before two prior weeks exist', () => {
    // One week of scores is not an expectation. Week two's issue can
    // call a result surprising; it cannot call it a 24% shot.
    const out = detectUpsets({
      results: [final('1', 'dog', 'fav', 130, 118)],
      priorPointsPerWeek: means({ dog: 100, fav: 125 }),
      priorWeeks: MIN_PRIOR_WEEKS - 1,
    })
    expect(out).toEqual([])
  })

  it('orders multiple upsets most improbable first, ranks attached', () => {
    const out = detectUpsets({
      ...base,
      results: [
        final('1', 'd1', 'f1', 121, 110),   // ~33.6%
        final('2', 'd2', 'f2', 121, 110),   // ~24%
      ],
      priorPointsPerWeek: means({ d1: 100, f1: 115, d2: 100, f2: 125 }),
      priorRank: (id) => ({ d1: 7, f1: 2, d2: 9, f2: 1 }[id]),
    })
    expect(out.map((u) => u.winnerId)).toEqual(['d2', 'd1'])
    expect(out[0].winnerRank).toBe(9)
    expect(out[0].loserRank).toBe(1)
    expect(out[0].margin).toBeCloseTo(11, 5)
  })
})
