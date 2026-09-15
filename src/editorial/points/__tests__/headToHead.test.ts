import { describe, it, expect } from 'vitest'
import { foldSeason, seriesFor, describeSeries, pairKey, type HeadToHead } from '../headToHead'

const wk = (rows: [number, number, number][]) =>
  rows.map(([roster_id, matchup_id, points]) => ({ roster_id, matchup_id, points }))

describe('folding a season into the tally', () => {
  it('counts a meeting for the owner, not the roster slot', () => {
    // Roster ids are reassigned between seasons. A series keyed on
    // them merges two managers or splits one in half.
    const series: HeadToHead['series'] = {}
    foldSeason(series, [wk([[1, 1, 120], [2, 1, 100]])], { 1: 'ownerA', 2: 'ownerB' })
    // Same two managers, different roster ids the following year.
    foldSeason(series, [wk([[7, 3, 90], [4, 3, 130]])], { 7: 'ownerA', 4: 'ownerB' })
    expect(series[pairKey('ownerA', 'ownerB')]).toEqual({ ownerA: 1, ownerB: 1 })
  })

  it('skips byes, ties and orphaned rosters', () => {
    const series: HeadToHead['series'] = {}
    foldSeason(
      series,
      [
        wk([[1, 1, 110], [2, 1, 110]]),                 // tie
        [{ roster_id: 1, matchup_id: null, points: 99 }], // bye
        wk([[1, 2, 120], [3, 2, 80]]),                  // roster 3 has no owner
      ],
      { 1: 'ownerA', 2: 'ownerB' },
    )
    expect(series).toEqual({})
  })

  it('never counts a manager against themselves', () => {
    const series: HeadToHead['series'] = {}
    foldSeason(series, [wk([[1, 1, 120], [2, 1, 100]])], { 1: 'same', 2: 'same' })
    expect(series).toEqual({})
  })
})

describe('reading a series back', () => {
  const h2h: HeadToHead = {
    series: {
      [pairKey('gridiron', 'throws')]: { gridiron: 4, throws: 2 },
      [pairKey('a', 'b')]: { a: 3, b: 3 },
      [pairKey('sweep', 'swept')]: { sweep: 3 },
    },
  }

  it('gives the record from the asker’s side', () => {
    expect(seriesFor(h2h, 'gridiron', 'throws')).toEqual({ played: 6, wins: 4, losses: 2 })
    expect(seriesFor(h2h, 'throws', 'gridiron')).toEqual({ played: 6, wins: 2, losses: 4 })
  })

  it('returns null for a pair that has never met', () => {
    // Not 0-0: "they have never played" and "they are level" are
    // different sentences and must not collapse into one.
    expect(seriesFor(h2h, 'gridiron', 'nobody')).toBeNull()
    expect(seriesFor(undefined, 'a', 'b')).toBeNull()
    expect(seriesFor(h2h, 'a', 'a')).toBeNull()
  })

  it('says nothing about a first meeting', () => {
    // "1-0 in the series" after one game is a statistic pretending to
    // be history.
    const first: HeadToHead = { series: { [pairKey('x', 'y')]: { x: 1 } } }
    expect(describeSeries(seriesFor(first, 'x', 'y'), 'X')).toBeNull()
  })

  it('writes the clause the way somebody would say it', () => {
    expect(describeSeries(seriesFor(h2h, 'gridiron', 'throws'), 'Gridiron Man'))
      .toBe("Gridiron Man's fourth win in 6 meetings")
    expect(describeSeries(seriesFor(h2h, 'a', 'b'), 'A')).toBe('They are level at 3 apiece')
    expect(describeSeries(seriesFor(h2h, 'sweep', 'swept'), 'Sweep')).toBe('Sweep have won all 3')
    // The rarer, better line: winning a series you are behind in.
    expect(describeSeries(seriesFor(h2h, 'throws', 'gridiron'), 'Game of Throws'))
      .toBe("Only Game of Throws's second win in 6")
  })
})
