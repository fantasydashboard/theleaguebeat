import { describe, it, expect } from 'vitest'
import { completedWeeksFromRecords, sleeperCurrentWeek } from '../sleeperAdapter'

type R = { settings?: { wins?: number; losses?: number; ties?: number } }
const roster = (w: number, l: number, t = 0): R => ({ settings: { wins: w, losses: l, ties: t } })

describe('how many weeks this league has actually finished', () => {
  it('reads the records, which Sleeper only writes when a week closes', () => {
    // Ten teams, one week played: five wins and five losses recorded.
    const after1 = [
      roster(1, 0), roster(1, 0), roster(1, 0), roster(1, 0), roster(1, 0),
      roster(0, 1), roster(0, 1), roster(0, 1), roster(0, 1), roster(0, 1),
    ]
    expect(completedWeeksFromRecords(after1)).toBe(1)
  })

  it('counts a tied week, where nobody banks a win', () => {
    const tied = [roster(0, 0, 1), roster(0, 0, 1)]
    expect(completedWeeksFromRecords(tied)).toBe(1)
  })

  it('is zero before a snap', () => {
    expect(completedWeeksFromRecords([roster(0, 0), roster(0, 0)])).toBe(0)
    expect(completedWeeksFromRecords([])).toBe(0)
  })
})

describe('which week the league is on', () => {
  const after1 = [
    roster(1, 0), roster(1, 0), roster(1, 0), roster(1, 0), roster(1, 0),
    roster(0, 1), roster(0, 1), roster(0, 1), roster(0, 1), roster(0, 1),
  ]

  it('moves on when the records say so, even while Sleeper lags', () => {
    // THE BUG THIS EXISTS FOR. On the Tuesday after week 1, Sleeper
    // had the NFL on week 2 and every result final — 1-0 records,
    // 151 points banked — while `league.settings.leg` still said 1.
    // Trusting leg meant zero closed weeks, so the site served the
    // PRESEASON issue a day after the season started.
    expect(sleeperCurrentWeek(1, after1)).toBe(2)
  })

  it('still trusts leg when leg is the one further along', () => {
    // A bye or a commissioner nudge can push leg ahead of the
    // records. Whichever says the season is further on wins.
    expect(sleeperCurrentWeek(5, after1)).toBe(5)
  })

  it('starts at week one', () => {
    expect(sleeperCurrentWeek(1, [roster(0, 0), roster(0, 0)])).toBe(1)
    expect(sleeperCurrentWeek(undefined, [])).toBe(1)
  })
})
