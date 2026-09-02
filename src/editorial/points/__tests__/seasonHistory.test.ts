import { describe, it, expect } from 'vitest'
import { buildPointsSeasonHistory, findFinal, type SleeperSeasonInput } from '../seasonHistory'
import { buildSleeperPointsData } from '@/editorial/adapters/sleeperAdapter'
import { sleeperFootballFixture } from '@/fixtures/sleeperFootball'

const roster = (id: string, wins: number, losses: number, name: string) => ({
  rosterId: id, wins, losses, ties: 0, name,
})

describe('finding the final', () => {
  it('prefers the match that decides first place', () => {
    const final = findFinal([
      { r: 1, m: 1, w: 3, l: 6 },
      { r: 3, m: 6, w: 4, l: 1, p: 1 },
      { r: 3, m: 7, w: 2, l: 5, p: 3 },
    ])
    expect(final?.w).toBe(4)
  })

  it('falls back to the last match of the deepest round when p is absent', () => {
    // Older brackets omit `p`. The championship is the last thing
    // decided, so the deepest round's final match is it.
    const final = findFinal([
      { r: 1, m: 1, w: 3, l: 6 },
      { r: 2, m: 4, w: 8, l: 3 },
      { r: 2, m: 5, w: 4, l: 1 },
    ])
    expect(final?.w).toBe(4)
  })

  it('returns nothing for an empty bracket', () => {
    expect(findFinal([])).toBeUndefined()
  })
})

describe('season history', () => {
  it('reads the champion from the bracket, not from the record', () => {
    // The whole point. Roster 1 has the best record; roster 4 won the
    // final. In the real captured league the champion had the best
    // record in NONE of the seasons where both are known.
    const seasons: SleeperSeasonInput[] = [{
      season: 2024,
      bracket: [{ r: 3, m: 6, w: 4, l: 1, p: 1 }],
      rosters: [
        roster('1', 11, 3, 'Best Record'),
        roster('4', 7, 7, 'Actual Champion'),
        roster('9', 2, 12, 'The Basement'),
      ],
    }]
    const [h] = buildPointsSeasonHistory(seasons)
    expect(h.championTeamId).toBe('4')
    expect(h.championName).toBe('Actual Champion')
    expect(h.championRecord).toBe('7-7')
    expect(h.runnerUpTeamId).toBe('1')
    expect(h.runnerUpName).toBe('Best Record')
    // Basement IS a record-based fact and means what it says.
    expect(h.basementTeamId).toBe('9')
  })

  it('falls back to the recorded winner when the bracket is empty', () => {
    const [h] = buildPointsSeasonHistory([{
      season: 2022,
      metadataWinnerRosterId: '1',
      bracket: [],
      rosters: [roster('1', 9, 5, 'Someone'), roster('2', 3, 11, 'Nobody')],
    }])
    expect(h.championTeamId).toBe('1')
    expect(h.runnerUpTeamId).toBe('')
  })

  it('omits a season whose champion cannot be established', () => {
    // A Hall of Champions naming the wrong manager is worse than one a
    // season short.
    expect(buildPointsSeasonHistory([{
      season: 2019,
      bracket: [],
      rosters: [roster('1', 9, 5, 'Someone')],
    }])).toEqual([])
  })

  it('orders most recent first', () => {
    const mk = (season: number): SleeperSeasonInput => ({
      season,
      bracket: [{ r: 3, m: 6, w: 1, l: 2, p: 1 }],
      rosters: [roster('1', 9, 5, 'A'), roster('2', 5, 9, 'B')],
    })
    expect(buildPointsSeasonHistory([mk(2022), mk(2024), mk(2023)]).map((h) => h.year))
      .toEqual([2024, 2023, 2022])
  })
})

describe('season history on the real captured league', () => {
  const data = buildSleeperPointsData(
    sleeperFootballFixture as unknown as Parameters<typeof buildSleeperPointsData>[0],
  )

  it('recovers every completed season including the one with no winner metadata', () => {
    const years = (data.seasonHistory ?? []).map((h) => h.year)
    // 2021 has no `latest_league_winner_roster_id` at all — only the
    // bracket recovers it. Its presence here is the proof.
    expect(years).toContain(2021)
    expect(years.length).toBeGreaterThanOrEqual(4)
    // Descending, no duplicates.
    expect([...years].sort((a, b) => b - a)).toEqual(years)
    expect(new Set(years).size).toBe(years.length)
  })

  it('names a real champion for every season it reports', () => {
    for (const h of data.seasonHistory ?? []) {
      expect(h.championTeamId, `${h.year} has no champion`).toBeTruthy()
      expect(h.championName?.trim().length, `${h.year} champion unnamed`).toBeGreaterThan(0)
      expect(h.championRecord).toMatch(/^\d+-\d+(-\d+)?$/)
      expect(h.championTeamId).not.toBe(h.basementTeamId)
    }
  })

  it('agrees with the league metadata wherever metadata exists', () => {
    // Cross-check: two independent sources, same answer. If these ever
    // disagree, the bracket reading is wrong.
    const raw = sleeperFootballFixture as unknown as {
      history: { league: { season: string; metadata?: Record<string, string> } }[]
    }
    for (const h of raw.history) {
      const recorded = h.league.metadata?.latest_league_winner_roster_id
      if (!recorded) continue
      const built = (data.seasonHistory ?? []).find((x) => x.year === Number(h.league.season))
      expect(built?.championTeamId, `${h.league.season} disagrees with metadata`).toBe(recorded)
    }
  })
})
