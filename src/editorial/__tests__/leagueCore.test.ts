import { describe, it, expect } from 'vitest'
import { sportOf, asLeagueCore } from '@/editorial/leagueCore'
import type {
  CategoryLeagueDataDivision,
  CategoryLeagueDataTeam,
  LeagueDataH2HCategory,
  LeagueDataH2HPoints,
} from '@/editorial/types'
import type { LeagueCore } from '@/editorial/leagueCore'

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

  // Every field below holds a value distinct from every other field's
  // value (including type/shape, for the array fields) so that a
  // mapping bug in asLeagueCore — a swap, a drop, a stray extra field —
  // fails the toEqual below instead of passing silently.
  const teamA: CategoryLeagueDataTeam = {
    id: 'team-id', name: 'Team Name', ownerName: 'Owner Name',
    ownerInitials: 'ON', avatarColor: '10 20 30', isMyTeam: false,
  }
  const divisionA: CategoryLeagueDataDivision = { id: 'div-id', name: 'Division Name' }
  const rankHistory = [{ week: 1, ranks: { a: 1 } }]

  it('projects a category league', () => {
    const core = asLeagueCore(cats({
      leagueId: 'lg-id',
      leagueName: 'lg-name',
      currentWeek: 8,
      currentSeason: 2026,
      regularSeasonEndWeek: 20,
      teams: [teamA],
      divisions: [divisionA],
      standings: [standing],
      seasonRankHistory: rankHistory,
    }))
    const expected: LeagueCore = {
      leagueId: 'lg-id',
      leagueName: 'lg-name',
      currentWeek: 8,
      currentSeason: 2026,
      regularSeasonEndWeek: 20,
      sport: 'mlb',
      teams: [teamA],
      standings: [standing],
      seasonRankHistory: rankHistory,
      divisions: [divisionA],
    }
    expect(core).toEqual(expected)
  })

  it('projects a points league', () => {
    const core = asLeagueCore(points({
      sport: 'nfl',
      leagueId: 'lg-id-2',
      leagueName: 'lg-name-2',
      currentWeek: 3,
      currentSeason: 2027,
      regularSeasonEndWeek: 14,
      teams: [teamA],
      divisions: [divisionA],
      standings: [standing],
      seasonRankHistory: rankHistory,
    }))
    const expected: LeagueCore = {
      leagueId: 'lg-id-2',
      leagueName: 'lg-name-2',
      currentWeek: 3,
      currentSeason: 2027,
      regularSeasonEndWeek: 14,
      sport: 'nfl',
      teams: [teamA],
      standings: [standing],
      seasonRankHistory: rankHistory,
      divisions: [divisionA],
    }
    expect(core).toEqual(expected)
  })

  /* The whole point of the seam: a points league that has not yet built
   * standings must be rejected rather than crash a detector downstream. */
  it('returns null when standings are missing', () => {
    expect(asLeagueCore(points({ seasonRankHistory: [] }))).toBeNull()
  })

  it('returns null when standings are empty (points)', () => {
    expect(asLeagueCore(points({ standings: [], seasonRankHistory: [] }))).toBeNull()
  })

  // The category variant hits the identical short-circuit as the points
  // variant above — pin both sides of the union so a future change that
  // special-cases one format can't silently break the other.
  it('returns null when standings are empty (category)', () => {
    expect(asLeagueCore(cats({ standings: [] }))).toBeNull()
  })

  it('tolerates missing rank history by substituting an empty array', () => {
    const core = asLeagueCore(points({ standings: [standing] }))
    expect(core).not.toBeNull()
    expect(core!.seasonRankHistory).toEqual([])
  })
})
