import { describe, it, expect } from 'vitest'
import { detect as detectStandings } from '@/editorial/detection/standings'
import { detect as detectMatchups } from '@/editorial/detection/matchups'
import { detect as detectDivisions } from '@/editorial/detection/divisions'
import type { LeagueDataH2HPoints } from '@/editorial/types'
import type { IssueContext } from '@/editorial/detection/types'

const context: IssueContext = {
  currentWeek: 3,
  seasonStage: 'opening',
  issueDate: new Date('2026-09-20T12:00:00Z'),
}

/* A points league with enough shape to crash a category detector that
 * assumed catLines/categoryRanks. Each guarded detector must return []
 * rather than throw.
 *
 * Deliberately POPULATED with matchupsCurrentWeek, categories, and a
 * divisions setup a real removed-guard mutant would actually act on
 * (Fix 5e): the original fixture pinned only the standings guard,
 * because matchups.ts and divisions.ts both return [] on their OWN
 * preconditions (`matchupsCurrentWeek` empty; no usable divisions)
 * regardless of the format guard. Deleting the format guard from
 * matchups.ts or divisions.ts against the old fixture still produced
 * [], so the test couldn't tell a removed guard from an intact one. */
const footballLeague = {
  format: 'h2h-points',
  sport: 'nfl',
  leagueId: 'lg', leagueName: 'Gridiron',
  currentWeek: 3, currentSeason: 2026,
  regularSeasonEndWeek: 14,
  teams: [
    { id: 'a', name: 'A', ownerName: 'x', ownerInitials: 'A', avatarColor: 'c', isMyTeam: false, divisionId: 'd1' },
    { id: 'b', name: 'B', ownerName: 'y', ownerInitials: 'B', avatarColor: 'c', isMyTeam: false, divisionId: 'd1' },
  ],
  standings: [
    { rank: 1, teamId: 'a', catWins: 2, catLosses: 1, catTies: 0, winPct: 0.667,
      streak: { type: 'W' as const, length: 3 }, lastSix: ['W', 'W', 'W'],
      ownsCount: 0, bleedingCount: 0 },
    { rank: 2, teamId: 'b', catWins: 1, catLosses: 2, catTies: 0, winPct: 0.333,
      streak: { type: 'W' as const, length: 3 }, lastSix: ['W', 'W', 'W'],
      ownsCount: 0, bleedingCount: 0 },
  ],
  seasonRankHistory: [
    { week: 1, ranks: { a: 2, b: 1 } },
    { week: 2, ranks: { a: 1, b: 2 } },
  ],
  // Would satisfy detectCatSweep (a sweeps b 2-0) if matchups.ts's
  // format guard were removed.
  categories: [
    { id: 'R', label: 'R', name: 'Runs', side: 'hit' },
    { id: 'HR', label: 'HR', name: 'Home Runs', side: 'hit' },
  ],
  matchupsCurrentWeek: [
    { id: 'm1', homeTeamId: 'a', awayTeamId: 'b', status: 'final',
      homeCatWins: 2, awayCatWins: 0, ties: 0, contestedCount: 0 },
  ],
  // Would satisfy detectDivisionRivalStreak (both teams in the same
  // division, matching 3-game winning streaks) if divisions.ts's
  // format guard were removed.
  divisions: [
    { id: 'd1', name: 'North' },
    { id: 'd2', name: 'South' },
  ],
} as unknown as LeagueDataH2HPoints

describe('category-only detectors on a points league', () => {
  it('standings detector emits nothing', () => {
    expect(detectStandings(footballLeague, context)).toEqual([])
  })

  it('matchups detector emits nothing', () => {
    expect(detectMatchups(footballLeague, context)).toEqual([])
  })

  it('divisions detector emits nothing', () => {
    expect(detectDivisions(footballLeague, context)).toEqual([])
  })

  it('none of them throw', () => {
    expect(() => {
      detectStandings(footballLeague, context)
      detectMatchups(footballLeague, context)
      detectDivisions(footballLeague, context)
    }).not.toThrow()
  })
})
