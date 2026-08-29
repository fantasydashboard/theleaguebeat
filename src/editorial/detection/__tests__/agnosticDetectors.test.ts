import { describe, it, expect } from 'vitest'
import { detect as detectStreaks } from '@/editorial/detection/streaks'
import { detect as detectCadence } from '@/editorial/detection/cadence'
import { detect as detectSeasonStage } from '@/editorial/detection/seasonStage'
import type { LeagueDataH2HPoints, LeagueDataH2HCategory } from '@/editorial/types'
import type { IssueContext } from '@/editorial/detection/types'

const context: IssueContext = {
  currentWeek: 5,
  seasonStage: 'settling',
  issueDate: new Date('2026-10-05T12:00:00Z'),
}

const teams = [
  { id: 'a', name: 'Gridiron A', ownerName: 'x', ownerInitials: 'A', avatarColor: 'c', isMyTeam: false },
  { id: 'b', name: 'Gridiron B', ownerName: 'y', ownerInitials: 'B', avatarColor: 'c', isMyTeam: false },
]

/* A three-game win streak — a streak-built story should fire
 * regardless of whether the wins came from categories or points.
 * (Deviation from the brief's draft: the original fixture used
 * `length: 4`, which is not a milestone in detectStreakBuilt --
 * only 3, or 5+, trigger it -- so neither format ever produced a
 * story and the assertions below failed independent of format
 * support. Using the real milestone length of 3 is what actually
 * exercises the behavior this test is meant to verify.) */
const standings = [
  { rank: 1, teamId: 'a', catWins: 3, catLosses: 0, catTies: 0, winPct: 1,
    streak: { type: 'W' as const, length: 3 }, lastSix: ['L', 'W', 'W', 'W'],
    ownsCount: 0, bleedingCount: 0 },
  { rank: 2, teamId: 'b', catWins: 0, catLosses: 3, catTies: 0, winPct: 0,
    streak: { type: 'L' as const, length: 3 }, lastSix: ['W', 'L', 'L', 'L'],
    ownsCount: 0, bleedingCount: 0 },
]

const seasonRankHistory = [
  { week: 1, ranks: { a: 2, b: 1 } },
  { week: 2, ranks: { a: 1, b: 2 } },
  { week: 3, ranks: { a: 1, b: 2 } },
  { week: 4, ranks: { a: 1, b: 2 } },
]

const football = {
  format: 'h2h-points', sport: 'nfl',
  leagueId: 'lg', leagueName: 'Gridiron', currentWeek: 5, currentSeason: 2026,
  regularSeasonEndWeek: 14, teams, standings, seasonRankHistory,
} as unknown as LeagueDataH2HPoints

const baseball = {
  format: 'h2h-category', sport: 'mlb',
  leagueId: 'lg', leagueName: 'Diamond Cuts', currentWeek: 5, currentSeason: 2026,
  teams, standings, seasonRankHistory, categories: [], categoryRanks: [],
} as unknown as LeagueDataH2HCategory

describe('format-agnostic detectors', () => {
  it('streaks fire for a points league', () => {
    const out = detectStreaks(football, context)
    expect(out.length).toBeGreaterThan(0)
  })

  it('streaks still fire for a category league', () => {
    const out = detectStreaks(baseball, context)
    expect(out.length).toBeGreaterThan(0)
  })

  it('streaks produce the same story types for both formats on identical standings', () => {
    const f = detectStreaks(football, context).map((s) => s.type).sort()
    const b = detectStreaks(baseball, context).map((s) => s.type).sort()
    expect(f).toEqual(b)
  })

  it('cadence does not throw on a points league', () => {
    expect(() => detectCadence(football, context)).not.toThrow()
  })

  it('a points league with no standings yields nothing rather than throwing', () => {
    const bare = { ...football, standings: undefined } as unknown as LeagueDataH2HPoints
    expect(detectStreaks(bare, context)).toEqual([])
  })

  /* Regression pin for Fix round 1: cadence.ts must NOT route through
   * asLeagueCore(). asLeagueCore() returns null when standings are
   * absent, which would silently kill cadence stories for a league
   * that has never built standings at all -- e.g. a real Sleeper
   * football league sitting in `pre_draft`. Cadence only reads
   * currentWeek/currentSeason/leagueId plus context.issueDate, none
   * of which need standings, so it must keep firing here. */
  it('cadence still fires for a points league with no standings at all (pre-draft)', () => {
    const preDraft = {
      format: 'h2h-points',
      sport: 'nfl',
      leagueId: 'lg-predraft',
      leagueName: 'Pre-Draft League',
      currentWeek: 0,
      currentSeason: 2026,
      teams,
      // No `standings` key at all -- not undefined, absent -- matching
      // a real pre-draft Sleeper league where standings have never
      // been built.
    } as unknown as LeagueDataH2HPoints

    const out = detectCadence(preDraft, context)
    // context.issueDate (2026-10-05) is a Monday, so monday-recap
    // should fire regardless of the missing standings.
    expect(out.some((s) => s.type === 'monday-recap')).toBe(true)
  })

  /* Regression pin for Fix 2 (final whole-branch review): seasonStage.ts
   * has the IDENTICAL defect that was caught and fixed in cadence.ts
   * (b8c7841) -- routing through asLeagueCore() invents a standings
   * precondition none of its thirteen detectors actually has (none of
   * them reads standings, teams, or rank history; only currentWeek /
   * currentSeason / regularSeasonEndWeek / sport). A week-1 category
   * league with empty standings used to emit 'opening-week' and, with
   * the asLeagueCore projection in place, silently emits nothing. */
  it('season-stage still fires for a category league at week 1 with empty standings', () => {
    const openingNoStandings = {
      format: 'h2h-category',
      sport: 'mlb',
      leagueId: 'lg-opening',
      leagueName: 'Diamond Cuts',
      currentWeek: 1,
      currentSeason: 2026,
      teams,
      standings: [],
      seasonRankHistory: [],
      categories: [],
      categoryRanks: [],
    } as unknown as LeagueDataH2HCategory

    const openingContext: IssueContext = {
      currentWeek: 1,
      seasonStage: 'opening',
      issueDate: new Date('2026-04-02T12:00:00Z'),
    }

    const out = detectSeasonStage(openingNoStandings, openingContext)
    expect(out.some((s) => s.type === 'opening-week')).toBe(true)
  })
})
