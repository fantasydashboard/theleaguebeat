import { describe, it, expect } from 'vitest'
import {
  buildSleeperPointsData,
  sleeperPoints,
} from '@/editorial/adapters/sleeperAdapter'
import { sleeperFootballFixture } from '@/fixtures/sleeperFootball'

const raw = sleeperFootballFixture as unknown as Parameters<typeof buildSleeperPointsData>[0]
const data = buildSleeperPointsData(raw)

describe('buildSleeperPointsData', () => {
  it('declares itself a football points league', () => {
    expect(data.format).toBe('h2h-points')
    expect(data.sport).toBe('nfl')
  })

  it('carries league identity', () => {
    expect(data.leagueName).toBe(raw.league.name)
    expect(data.currentSeason).toBe(Number(raw.league.season))
  })

  it('derives the regular season end week from playoff_week_start', () => {
    expect(data.regularSeasonEndWeek).toBe(raw.league.settings.playoff_week_start - 1)
  })

  it('builds one team per roster', () => {
    expect(data.teams).toHaveLength(raw.rosters.length)
  })

  it('gives every team a non-empty name', () => {
    for (const t of data.teams) expect(t.name.trim().length).toBeGreaterThan(0)
  })

  it('builds standings ranked 1..N with no gaps or duplicates', () => {
    const ranks = (data.standings ?? []).map((s) => s.rank).sort((a, b) => a - b)
    expect(ranks).toEqual(Array.from({ length: data.teams.length }, (_, i) => i + 1))
  })

  it('every standing references a real team', () => {
    const ids = new Set(data.teams.map((t) => t.id))
    for (const s of data.standings ?? []) expect(ids.has(s.teamId)).toBe(true)
  })

  it('computes a positive weekly points average', () => {
    expect(data.weeklyPointsAverage).toBeGreaterThan(0)
  })

  it('never invents matchups for weeks Sleeper did not return', () => {
    const captured = Object.keys(raw.matchupsByWeek).length
    if (captured === 0) expect(data.currentWeekMatchups ?? []).toEqual([])
  })

  it('pairs matchups into two-sided games', () => {
    for (const m of data.currentWeekMatchups ?? []) {
      expect(m.homeTeamId).not.toBe(m.awayTeamId)
      expect(typeof m.homePoints).toBe('number')
      expect(typeof m.awayPoints).toBe('number')
    }
  })

  it('produces a LeagueCore-compatible league', async () => {
    const { asLeagueCore } = await import('@/editorial/leagueCore')
    expect(asLeagueCore(data)).not.toBeNull()
  })
})

describe('sleeperPoints (split-integer fpts encoding)', () => {
  it('combines the integer part and hundredths correctly, not by addition', () => {
    // fpts: 1807, fpts_decimal: 6 → 1807.06, NOT 1807 + 6 = 1813.
    expect(sleeperPoints(1807, 6)).toBeCloseTo(1807.06, 5)
    expect(sleeperPoints(1807, 6)).not.toBe(1813)
  })

  it('defaults missing parts to zero rather than throwing', () => {
    expect(sleeperPoints(undefined, undefined)).toBe(0)
    expect(sleeperPoints(100, undefined)).toBe(100)
  })
})

describe('buildSleeperPointsData — week 17 null matchup_id handling', () => {
  it('produces exactly two matchups for the captured week 17, not three', () => {
    // Real captured data: 6 of 10 week-17 entries carry matchup_id: null
    // (teams outside the playoff bracket). Naive grouping either lumps
    // them into one phantom game or — worse — could pair up two of them
    // as if they played each other. Only the two real playoff pairs
    // (matchup_id 1 and 2) should survive.
    const week17 = raw.matchupsByWeek['17']
    expect(week17.filter((m) => m.matchup_id == null)).toHaveLength(6)

    // league.settings.leg === 17 for the captured league, so this is
    // exactly the current week the adapter resolves.
    expect(data.currentWeek).toBe(17)
    expect(data.currentWeekMatchups).toHaveLength(2)
  })
})

describe('buildSleeperPointsData — orphaned rosters', () => {
  it('gives the two owner_id: null rosters non-empty, distinct fallback names', () => {
    const orphaned = raw.rosters.filter((r) => r.owner_id == null)
    expect(orphaned).toHaveLength(2)

    const names = orphaned.map((r) => {
      const team = data.teams.find((t) => t.id === String(r.roster_id))
      expect(team).toBeDefined()
      return team!.name
    })
    for (const name of names) expect(name.trim().length).toBeGreaterThan(0)
    expect(new Set(names).size).toBe(names.length)
  })
})

describe('buildSleeperPointsData — playoff_week_start: 0 edge case', () => {
  it('leaves regularSeasonEndWeek undefined rather than -1', () => {
    const rawUnset = {
      league: sleeperFootballFixture.unsetPlayoffWeekLeague,
      rosters: sleeperFootballFixture.rosters,
      users: sleeperFootballFixture.users,
      matchupsByWeek: {},
    } as unknown as Parameters<typeof buildSleeperPointsData>[0]

    expect(rawUnset.league.settings.playoff_week_start).toBe(0)

    const unsetData = buildSleeperPointsData(rawUnset)
    expect(unsetData.regularSeasonEndWeek).toBeUndefined()
    expect(unsetData.regularSeasonEndWeek).not.toBe(-1)
  })
})
