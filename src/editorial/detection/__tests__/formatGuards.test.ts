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
 * rather than throw. */
const footballLeague = {
  format: 'h2h-points',
  sport: 'nfl',
  leagueId: 'lg', leagueName: 'Gridiron',
  currentWeek: 3, currentSeason: 2026,
  regularSeasonEndWeek: 14,
  teams: [
    { id: 'a', name: 'A', ownerName: 'x', ownerInitials: 'A', avatarColor: 'c', isMyTeam: false },
    { id: 'b', name: 'B', ownerName: 'y', ownerInitials: 'B', avatarColor: 'c', isMyTeam: false },
  ],
  standings: [
    { rank: 1, teamId: 'a', catWins: 2, catLosses: 1, catTies: 0, winPct: 0.667,
      streak: { type: 'W' as const, length: 2 }, lastSix: ['W', 'L', 'W'],
      ownsCount: 0, bleedingCount: 0 },
    { rank: 2, teamId: 'b', catWins: 1, catLosses: 2, catTies: 0, winPct: 0.333,
      streak: { type: 'L' as const, length: 1 }, lastSix: ['L', 'W', 'L'],
      ownsCount: 0, bleedingCount: 0 },
  ],
  seasonRankHistory: [
    { week: 1, ranks: { a: 2, b: 1 } },
    { week: 2, ranks: { a: 1, b: 2 } },
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
