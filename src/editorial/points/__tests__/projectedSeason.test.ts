import { describe, it, expect } from 'vitest'
import {
  DEFAULT_SCORE_SPREAD,
  projectSeason,
  scheduleWeight,
  weeklyScoreSpread,
  type ScheduledGame,
} from '../projectedSeason'

/** A round robin: every team plays every other exactly once. */
function roundRobin(teamIds: string[]): ScheduledGame[] {
  const games: ScheduledGame[] = []
  let week = 1
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      games.push({ week: week++, homeTeamId: teamIds[i], awayTeamId: teamIds[j] })
    }
  }
  return games
}

describe('weeklyScoreSpread', () => {
  it('measures the spread of real scores', () => {
    const scores = [100, 110, 90, 120, 80, 100, 110, 90, 105, 95, 115, 85]
    const sd = weeklyScoreSpread(scores)!
    expect(sd).toBeGreaterThan(11)
    expect(sd).toBeLessThan(13)
  })

  it('ignores unplayed weeks rather than counting them as zeros', () => {
    // A zero is a week that has not happened. Averaged in, it would
    // manufacture enormous variance and flatten every projection to a
    // coin flip.
    const played = [100, 110, 90, 120, 80, 100, 110, 90, 105, 95]
    const withGaps = [...played, 0, 0, 0, 0]
    expect(weeklyScoreSpread(withGaps)).toBeCloseTo(weeklyScoreSpread(played)!, 6)
  })

  it('declines to measure a spread from too little history', () => {
    // Two scores produce a standard deviation that means nothing. The
    // caller needs to know it was not measured, not receive a number
    // that looks like it was.
    expect(weeklyScoreSpread([100, 120])).toBeUndefined()
    expect(weeklyScoreSpread([])).toBeUndefined()
  })
})

describe('projectSeason', () => {
  const teams = (spec: Record<string, number>) =>
    Object.entries(spec).map(([teamId, pointsPerWeek]) => ({ teamId, pointsPerWeek }))

  it('gives evenly matched teams half their games', () => {
    const ids = ['a', 'b', 'c', 'd']
    const out = projectSeason(
      teams({ a: 100, b: 100, c: 100, d: 100 }),
      roundRobin(ids),
    )
    for (const r of out) {
      expect(r.gamesScheduled).toBe(3)
      expect(r.expectedWins).toBeCloseTo(1.5, 5)
    }
  })

  it('does not hand the best roster every game', () => {
    // THE reason weeks are modelled with variance. Asking "is my
    // average higher" makes every matchup a certainty and projects the
    // top team to run the table, which is not a thing that happens.
    const ids = ['best', 'b', 'c', 'd']
    const out = projectSeason(
      teams({ best: 130, b: 100, c: 100, d: 100 }),
      roundRobin(ids),
    )
    const best = out.find((r) => r.teamId === 'best')!
    expect(best.expectedWins).toBeGreaterThan(1.5)
    expect(best.expectedWins).toBeLessThan(best.gamesScheduled)
  })

  it('compresses toward .500 as scoring gets noisier', () => {
    const ids = ['best', 'b', 'c', 'd']
    const sched = roundRobin(ids)
    const spec = teams({ best: 130, b: 100, c: 100, d: 100 })
    const tight = projectSeason(spec, sched, 5).find((r) => r.teamId === 'best')!
    const noisy = projectSeason(spec, sched, 60).find((r) => r.teamId === 'best')!
    expect(tight.expectedWins).toBeGreaterThan(noisy.expectedWins)
    expect(noisy.expectedWins).toBeGreaterThan(1.5)
  })

  it('separates roster rank from season rank, and names the gap', () => {
    // `soft` is only the third-best roster but plays the worst team
    // twice; `brutal` is second-best and draws the champion twice.
    // That difference is schedule luck, and preseason is the one
    // moment it can be named before it happens.
    const out = projectSeason(
      teams({ champ: 120, brutal: 110, soft: 105, worst: 80 }),
      [
        { week: 1, homeTeamId: 'brutal', awayTeamId: 'champ' },
        { week: 2, homeTeamId: 'brutal', awayTeamId: 'champ' },
        { week: 3, homeTeamId: 'soft', awayTeamId: 'worst' },
        { week: 4, homeTeamId: 'soft', awayTeamId: 'worst' },
      ],
      20,
    )
    const soft = out.find((r) => r.teamId === 'soft')!
    const brutal = out.find((r) => r.teamId === 'brutal')!

    // Roster order is unchanged: brutal is the better team.
    expect(brutal.powerRank).toBeLessThan(soft.powerRank)
    expect(soft.opponentPointsPerWeek).toBeLessThan(brutal.opponentPointsPerWeek)

    // The draw is worth places, and the swing says how many.
    expect(soft.seasonRank).toBeLessThan(brutal.seasonRank)
    expect(soft.expectedWins).toBeGreaterThan(brutal.expectedWins)
    expect(soft.scheduleSwing).toBeGreaterThan(0)
    expect(brutal.scheduleSwing).toBeLessThan(0)
  })

  it('ignores games involving teams it does not know', () => {
    const out = projectSeason(teams({ a: 100, b: 100 }), [
      { week: 1, homeTeamId: 'a', awayTeamId: 'b' },
      { week: 2, homeTeamId: 'a', awayTeamId: 'ghost' },
      { week: 3, homeTeamId: 'a', awayTeamId: 'a' },
    ])
    expect(out.find((r) => r.teamId === 'a')!.gamesScheduled).toBe(1)
  })

  it('survives a zero spread rather than returning NaN wins', () => {
    const out = projectSeason(teams({ a: 110, b: 100 }), roundRobin(['a', 'b']), 0)
    for (const r of out) expect(Number.isFinite(r.expectedWins)).toBe(true)
  })

  it('returns nothing without teams', () => {
    expect(projectSeason([], roundRobin(['a', 'b']))).toEqual([])
  })

  it('exposes a default spread drawn from a real league', () => {
    expect(DEFAULT_SCORE_SPREAD).toBeGreaterThan(15)
    expect(DEFAULT_SCORE_SPREAD).toBeLessThan(35)
  })
})

describe('scheduleWeight', () => {
  it('reports both spreads so the comparison can be stated', () => {
    const out = projectSeason(
      [
        { teamId: 'a', pointsPerWeek: 110 },
        { teamId: 'b', pointsPerWeek: 100 },
        { teamId: 'c', pointsPerWeek: 90 },
        { teamId: 'd', pointsPerWeek: 95 },
      ],
      roundRobin(['a', 'b', 'c', 'd']),
    )
    const w = scheduleWeight(out)
    expect(w.rosterSpread).toBeCloseTo(20, 5)
    expect(w.scheduleSpread).toBeGreaterThan(0)
    // A round robin is the case where the schedule cannot matter:
    // everyone faces the same field.
    expect(w.scheduleSpread).toBeLessThan(w.rosterSpread)
  })

  it('is safe on an empty projection', () => {
    expect(scheduleWeight([])).toEqual({
      scheduleSpread: 0,
      rosterSpread: 0,
      movesAnyone: false,
    })
  })
})
