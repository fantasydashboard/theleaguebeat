import { describe, it, expect } from 'vitest'
import { detectPointsStories } from '@/editorial/detection/points'
import type { LeagueDataH2HPoints, LeagueDataPointsMatchup } from '@/editorial/types'
import type { IssueContext } from '@/editorial/detection/types'

const context: IssueContext = {
  currentWeek: 5, seasonStage: 'settling',
  issueDate: new Date('2026-10-07T12:00:00Z'),
}

const team = (id: string, name: string) =>
  ({ id, name, ownerName: 'o', ownerInitials: id.toUpperCase(), avatarColor: 'c', isMyTeam: false })

const game = (
  id: string, home: string, away: string, hp: number, ap: number,
  status: LeagueDataPointsMatchup['status'] = 'final',
): LeagueDataPointsMatchup =>
  ({ id, homeTeamId: home, awayTeamId: away, status, homePoints: hp, awayPoints: ap })

/** avg 100 makes the multiples easy to read: blowout ≥40, photo ≤3,
 *  shootout ≥125 each, rock fight ≤75 each. */
const league = (games: LeagueDataPointsMatchup[], avg = 100): LeagueDataH2HPoints =>
  ({
    format: 'h2h-points', sport: 'nfl',
    leagueId: 'lg', leagueName: 'Gridiron',
    currentWeek: 5, currentSeason: 2026, regularSeasonEndWeek: 14,
    teams: [team('a', 'Alpha'), team('b', 'Bravo'), team('c', 'Charlie'), team('d', 'Delta')],
    standings: [], seasonRankHistory: [],
    weeklyPointsAverage: avg,
    currentWeekMatchups: games,
  }) as unknown as LeagueDataH2HPoints

const types = (d: LeagueDataH2HPoints) => detectPointsStories(d, context).map((s) => s.type)

describe('detectPointsStories', () => {
  it('emits nothing for a category league', () => {
    const cats = { format: 'h2h-category' } as never
    expect(detectPointsStories(cats, context)).toEqual([])
  })

  it('detects a blowout at 40% of the weekly average', () => {
    expect(types(league([game('m1', 'a', 'b', 145, 100)]))).toContain('points-blowout')
  })

  it('does not call a 30-point win a blowout when the average is 100', () => {
    expect(types(league([game('m1', 'a', 'b', 130, 100)]))).not.toContain('points-blowout')
  })

  /* The same 45-point margin in a high-scoring league is not a blowout —
   * this is the test that proves thresholds are relative, not absolute. */
  it('scales with the league: 45 points is not a blowout at a 200 average', () => {
    expect(types(league([game('m1', 'a', 'b', 245, 200)], 200))).not.toContain('points-blowout')
  })

  it('detects a photo finish inside 3% of the average', () => {
    expect(types(league([game('m1', 'a', 'b', 101, 99)]))).toContain('points-photo-finish')
  })

  it('detects a shootout when both sides clear 125% of the average', () => {
    expect(types(league([game('m1', 'a', 'b', 140, 132)]))).toContain('points-shootout')
  })

  it('detects a rock fight when both sides are under 75%', () => {
    expect(types(league([game('m1', 'a', 'b', 70, 66)]))).toContain('points-rock-fight')
  })

  it('names the week high and low across all games', () => {
    const out = types(league([
      game('m1', 'a', 'b', 150, 90),
      game('m2', 'c', 'd', 88, 60),
    ]))
    expect(out).toContain('points-high-score')
    expect(out).toContain('points-low-score')
  })

  it('ignores matchups that are not final', () => {
    expect(types(league([game('m1', 'a', 'b', 145, 100, 'live')]))).toEqual([])
  })

  /* Never fabricate a baseline: with no average and only one game there
   * is nothing to compute a relative threshold against. */
  it('emits no margin stories when the weekly average is unknown and history is too thin', () => {
    const noAvg = { ...league([game('m1', 'a', 'b', 145, 100)]), weeklyPointsAverage: undefined }
    expect(types(noAvg as LeagueDataH2HPoints)).not.toContain('points-blowout')
  })

  it('handles a zero-zero week without dividing by zero', () => {
    const out = types(league([game('m1', 'a', 'b', 0, 0)], 0))
    expect(Array.isArray(out)).toBe(true)
    expect(out).not.toContain('points-blowout')
  })

  it('handles a tie without calling it a blowout', () => {
    const out = types(league([game('m1', 'a', 'b', 100, 100)]))
    expect(out).not.toContain('points-blowout')
    expect(out).toContain('points-photo-finish')
  })

  it('gives every story a stable signature', () => {
    const out = detectPointsStories(league([game('m1', 'a', 'b', 145, 100)]), context)
    for (const s of out) expect(s.signature.length).toBeGreaterThan(0)
    const again = detectPointsStories(league([game('m1', 'a', 'b', 145, 100)]), context)
    expect(out.map((s) => s.signature)).toEqual(again.map((s) => s.signature))
  })
})
