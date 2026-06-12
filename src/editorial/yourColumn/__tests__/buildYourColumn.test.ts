import { describe, it, expect } from 'vitest'
import { buildYourColumn } from '@/editorial/yourColumn/buildYourColumn'
import type { LeagueDataH2HPoints, CategoryLeagueDataWeeklyRanks } from '@/editorial/types'

const team = (id: string) => ({ id, name: id, ownerName: '', ownerInitials: id.slice(0, 2), avatarUrl: undefined, avatarColor: 'x', isMyTeam: false })
function histFor(climber: string, ranks: number[], ids: string[]): CategoryLeagueDataWeeklyRanks[] {
  return ranks.map((cr, wi) => { const r: Record<string, number> = { [climber]: cr }; let n = 1; for (const id of ids) { if (id === climber) continue; while (n === cr) n++; r[id] = n; n++ } return { week: wi + 1, ranks: r } })
}
const T4 = ['t1', 't2', 't3', 't4']
const data = {
  format: 'h2h-points', leagueId: 'L', leagueName: 'BB', currentWeek: 12, currentSeason: 2026,
  teams: T4.map(team),
  standings: T4.map((id, i) => ({ rank: i + 1, teamId: id, catWins: 8 - i, catLosses: 3, catTies: 0, winPct: 0.7, streak: { type: 'W' as const, length: 2 }, lastSix: [], ownsCount: 0, bleedingCount: 0 })),
  seasonRankHistory: histFor('t1', [4, 3, 2, 1, 1, 1], T4),
  currentWeekMatchups: [{ id: 'm', homeTeamId: 't1', awayTeamId: 't2', status: 'live', homePoints: 96.7, awayPoints: 70.5 }],
  h2hRecords: [
    { teamId: 't1', opponentId: 't2', wins: 7, losses: 5, ties: 0, meetings: 12 },
    { teamId: 't1', opponentId: 't3', wins: 2, losses: 1, ties: 0, meetings: 3 },
  ],
} as unknown as LeagueDataH2HPoints

describe('buildYourColumn', () => {
  const col = buildYourColumn(data, 't1')

  it('builds a third-person hero (no "you")', () => {
    expect(col.hero.headline).toMatch(/t1/)
    expect(col.hero.headline.toLowerCase()).not.toMatch(/\byou\b/)
  })
  it('finds the team matchup', () => {
    expect(col.matchup?.headline).toMatch(/t1/)
    expect(col.matchup?.headline).toMatch(/96\.7/)
  })
  it('picks the most-played opponent as the rival', () => {
    expect(col.rival?.headline).toMatch(/t2/)        // 12 meetings beats t3's 3
    expect(col.rival?.headline).toMatch(/7-5/)
  })
  it('classifies the arc chronologically', () => {
    expect(col.arc?.headline).toMatch(/t1/)
    expect(JSON.stringify(col.arc)).toMatch(/#4 → #1/)
  })
  it('uses personal labels but no em dashes', () => {
    expect(col.rival?.label).toBe('Your Rival')
    expect(JSON.stringify(col)).not.toMatch(/—/)
  })

  it('shows ties in the rival record when present', () => {
    const withTies = {
      ...data,
      h2hRecords: [{ teamId: 't1', opponentId: 't2', wins: 3, losses: 3, ties: 2, meetings: 8 }],
    } as unknown as LeagueDataH2HPoints
    expect(buildYourColumn(withTies, 't1').rival?.headline).toMatch(/3-3-2/)
  })

  it('omits the arc for a team that never moved (omit, never invent)', () => {
    const flat = {
      ...data,
      seasonRankHistory: [3, 3, 3, 3].map((r, i) => ({ week: i + 1, ranks: { t1: 3, t2: 1, t3: 2, t4: 4 } })),
    } as unknown as LeagueDataH2HPoints
    expect(buildYourColumn(flat, 't1').arc).toBeUndefined()
  })
})
