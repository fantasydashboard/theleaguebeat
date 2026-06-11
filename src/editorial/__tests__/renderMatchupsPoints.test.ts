import { describe, it, expect } from 'vitest'
import { renderPointsMatchupsPage } from '@/editorial/render-matchups-points'
import type { CategoryLeagueDataTeam, LeagueDataH2HPoints, LeagueDataPointsMatchup } from '@/editorial/types'

const team = (id: string): CategoryLeagueDataTeam => ({
  id, name: id, ownerName: '', ownerInitials: id.slice(0, 2), avatarUrl: undefined, avatarColor: 'x', isMyTeam: false,
})

const live = (
  id: string, h: string, a: string, hc: number, ac: number, hp?: number, ap?: number,
): LeagueDataPointsMatchup => ({
  id, homeTeamId: h, awayTeamId: a, status: 'live', homePoints: hc, awayPoints: ac, homeProjected: hp, awayProjected: ap,
})

const base = (matchups: LeagueDataPointsMatchup[], avg = 80): LeagueDataH2HPoints => ({
  format: 'h2h-points', leagueId: 'L', leagueName: 'T', currentWeek: 12, currentSeason: 2026,
  teams: ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8'].map(team),
  currentWeekMatchups: matchups, weeklyPointsAverage: avg,
} as LeagueDataH2HPoints)

describe('renderPointsMatchupsPage', () => {
  it('renders distinct lines across an early-week slate (no templated repetition)', () => {
    const data = base([
      live('m1', 't1', 't2', 15, 14, 100, 100),
      live('m2', 't3', 't4', 20, 5, 100, 100),
      live('m3', 't5', 't6', 22, 3, 100, 100),
      live('m4', 't7', 't8', 18, 4, 100, 100),
    ])
    const r = renderPointsMatchupsPage(data)
    const lines = ['m1', 'm2', 'm3', 'm4'].map((id) => r.matchupCopy[id].status)
    expect(new Set(lines).size).toBe(4)
  })

  it('reframes an empty-lineup matchup instead of narrating a blowout', () => {
    // trailer projected ~nothing (empty lineup) << 25% of league avg
    const r = renderPointsMatchupsPage(base([live('m', 't1', 't2', 84, 2.5, 84, 2.5)]))
    expect(r.matchupCopy.m.status).toMatch(/hasn't set a lineup|nobody going|isn't fielding/)
    expect(r.matchupCopy.m.eyebrow).toContain('yet to play')
  })

  it('reframes asymmetric completion (one side has barely played)', () => {
    // trailer 2.5/90 (played little), leader 84/88 (nearly done), both real projections
    const r = renderPointsMatchupsPage(base([live('m', 't1', 't2', 84, 2.5, 88, 90)]))
    expect(r.matchupCopy.m.status).toMatch(/hasn't taken the field|barely played|yet to play/)
  })

  it('varies the no-projection fallback (ESPN) across a slate', () => {
    const noproj = (id: string, h: string, a: string, hc: number, ac: number) => live(id, h, a, hc, ac)
    const data = base([
      noproj('m1', 't1', 't2', 6.5, 47),
      noproj('m2', 't3', 't4', 32.5, 13.5),
      noproj('m3', 't5', 't6', 4.5, 6),
      noproj('m4', 't7', 't8', 28, 11),
    ])
    const r = renderPointsMatchupsPage(data)
    const lines = ['m1', 'm2', 'm3', 'm4'].map((id) => r.matchupCopy[id].status)
    expect(new Set(lines).size).toBe(4)
  })

  it('never emits an em dash in reader-facing copy', () => {
    const r = renderPointsMatchupsPage(base([live('m', 't1', 't2', 30, 28, 100, 98)]))
    expect(JSON.stringify(r)).not.toMatch(/—/)
  })
})
