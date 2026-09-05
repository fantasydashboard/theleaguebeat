import { describe, it, expect } from 'vitest'
import { loadIssue, hasCompletedWeek } from '../loadIssue'
import type { LeagueDataH2HPoints } from '@/editorial/types'

const league = (over: Partial<LeagueDataH2HPoints> = {}): LeagueDataH2HPoints => ({
  format: 'h2h-points',
  leagueId: 'l', leagueName: 'League of Record',
  currentWeek: 3, currentSeason: 2026,
  teams: ['a', 'b', 'c', 'd'].map((id) => ({ id, name: `Team ${id}` })) as never,
  weeklyScores: [
    { teamId: 'a', week: 1, points: 150 }, { teamId: 'b', week: 1, points: 120 },
    { teamId: 'c', week: 1, points: 110 }, { teamId: 'd', week: 1, points: 90 },
    { teamId: 'a', week: 2, points: 100 }, { teamId: 'b', week: 2, points: 140 },
    { teamId: 'c', week: 2, points: 80 }, { teamId: 'd', week: 2, points: 130 },
  ],
  previousWeekMatchups: [
    { id: 'm1', homeTeamId: 'a', awayTeamId: 'b', status: 'final', homePoints: 100, awayPoints: 140 },
    { id: 'm2', homeTeamId: 'c', awayTeamId: 'd', status: 'final', homePoints: 80, awayPoints: 130 },
  ],
  ...over,
})

const args = {
  leagueName: 'League of Record',
  platform: 'sleeper',
  platformLeagueId: '123',
  teamName: (id: string) => `Team ${id}`,
}

describe('loadIssue', () => {
  it('splits on evidence, not on the calendar', () => {
    // A league that drafts late or plays a short season would be
    // mislabelled by any date rule. What decides is whether a week has
    // actually finished.
    expect(hasCompletedWeek(league())).toBe(true)
    expect(hasCompletedWeek(league({ weeklyScores: [] }))).toBe(false)
    expect(hasCompletedWeek(league({ weeklyScores: undefined }))).toBe(false)
  })

  it('dates the issue by the week that FINISHED, not the one in progress', async () => {
    // `currentWeek` is 3 and in flight. Publishing "Week 3" on Tuesday
    // about week 2's results is how an issue misdates itself.
    const issue = (await loadIssue({ ...args, data: league() }))!
    expect(issue.week).toBe(2)
    expect(issue.basis).toContain('2 weeks played')
  })

  it('builds the weekly issue from what is already on the contract', async () => {
    // No projections fetch in season — everything the issue needs has
    // arrived with the league.
    const issue = (await loadIssue({ ...args, data: league() }))!
    const ids = issue.sections.map((s) => s.id)
    expect(ids).toContain('results')
    expect(ids).toContain('power-rankings')
  })

  it('reaches for the preseason issue only before a week has closed', async () => {
    // With no completed week and no draft to read, it returns null
    // rather than attempting the weekly issue against nothing.
    const empty = await loadIssue({
      ...args,
      data: league({ weeklyScores: [], previousWeekMatchups: [] }),
    })
    expect(empty).toBeNull()
  })
})
