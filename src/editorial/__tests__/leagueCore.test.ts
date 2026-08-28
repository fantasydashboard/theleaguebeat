import { describe, it, expect } from 'vitest'
import { sportOf, asLeagueCore } from '@/editorial/leagueCore'
import type { LeagueDataH2HCategory, LeagueDataH2HPoints } from '@/editorial/types'

const cats = (over: Partial<LeagueDataH2HCategory> = {}): LeagueDataH2HCategory =>
  ({
    format: 'h2h-category',
    leagueId: 'lg', leagueName: 'Diamond Cuts',
    currentWeek: 8, currentSeason: 2026, playoffCutoff: 6,
    teams: [], categories: [], standings: [], categoryRanks: [],
    seasonRankHistory: [],
    ...over,
  }) as LeagueDataH2HCategory

const points = (over: Partial<LeagueDataH2HPoints> = {}): LeagueDataH2HPoints =>
  ({
    format: 'h2h-points',
    leagueId: 'lg', leagueName: 'Gridiron',
    currentWeek: 3, currentSeason: 2026,
    teams: [],
    ...over,
  }) as LeagueDataH2HPoints

describe('sportOf', () => {
  it('returns the declared sport', () => {
    expect(sportOf(points({ sport: 'nfl' }))).toBe('nfl')
    expect(sportOf(cats({ sport: 'mlb' }))).toBe('mlb')
  })

  /* league_issues rows written before `sport` existed have no field.
   * They are all baseball, so mlb is the honest default — and it lives
   * in exactly one place so it can be deleted when those rows age out. */
  it('defaults to mlb for a snapshot with no sport', () => {
    expect(sportOf(cats())).toBe('mlb')
    expect(sportOf(points())).toBe('mlb')
  })
})

describe('asLeagueCore', () => {
  const standing = { rank: 1, teamId: 'a', catWins: 0, catLosses: 0, catTies: 0,
    winPct: 1, streak: { type: 'W' as const, length: 1 }, lastSix: [],
    ownsCount: 0, bleedingCount: 0 }

  it('projects a category league', () => {
    const core = asLeagueCore(cats({ standings: [standing], seasonRankHistory: [{ week: 1, ranks: { a: 1 } }] }))
    expect(core).not.toBeNull()
    expect(core!.standings).toHaveLength(1)
    expect(core!.sport).toBe('mlb')
  })

  it('projects a points league', () => {
    const core = asLeagueCore(points({
      sport: 'nfl',
      standings: [standing],
      seasonRankHistory: [{ week: 1, ranks: { a: 1 } }],
    }))
    expect(core).not.toBeNull()
    expect(core!.sport).toBe('nfl')
  })

  /* The whole point of the seam: a points league that has not yet built
   * standings must be rejected rather than crash a detector downstream. */
  it('returns null when standings are missing', () => {
    expect(asLeagueCore(points({ seasonRankHistory: [] }))).toBeNull()
  })

  it('returns null when standings are empty', () => {
    expect(asLeagueCore(points({ standings: [], seasonRankHistory: [] }))).toBeNull()
  })

  it('tolerates missing rank history by substituting an empty array', () => {
    const core = asLeagueCore(points({ standings: [standing] }))
    expect(core).not.toBeNull()
    expect(core!.seasonRankHistory).toEqual([])
  })
})
