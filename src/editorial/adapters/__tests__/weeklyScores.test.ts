import { describe, it, expect } from 'vitest'
import { buildWeeklyScoresFromMatchups } from '../pointsStandings'
import { computePointsPowerScores } from '@/editorial/points/powerScore'
import type { LeagueDataPointsMatchup, LeagueDataH2HPoints } from '@/editorial/types'

const game = (
  homeTeamId: string,
  homePoints: number,
  awayTeamId: string,
  awayPoints: number,
  status: 'final' | 'live' = 'final',
): LeagueDataPointsMatchup =>
  ({ homeTeamId, homePoints, awayTeamId, awayPoints, status }) as LeagueDataPointsMatchup

describe('buildWeeklyScoresFromMatchups', () => {
  it('emits both sides of every game as its own score', () => {
    // A team's OWN score, not a matchup result — that is what a points
    // league is measured on, and reading it per-team is what survives
    // byes and median-match leagues without pairing logic.
    const out = buildWeeklyScoresFromMatchups(
      new Map([[1, [game('a', 120, 'b', 100)]]]),
    )
    expect(out).toEqual([
      { teamId: 'a', week: 1, points: 120 },
      { teamId: 'b', week: 1, points: 100 },
    ])
  })

  it('skips a 0-0 game as unplayed, not as two disasters', () => {
    // Emitting these would put fiction on the contract for every other
    // consumer to re-filter.
    const out = buildWeeklyScoresFromMatchups(
      new Map([[1, [game('a', 0, 'b', 0), game('c', 110, 'd', 95)]]]),
    )
    expect(out.map((s) => s.teamId)).toEqual(['c', 'd'])
  })

  it('ignores games that are not final', () => {
    const out = buildWeeklyScoresFromMatchups(
      new Map([[1, [game('a', 60, 'b', 55, 'live')]]]),
    )
    expect(out).toEqual([])
  })

  it('keeps a real zero when the opponent scored', () => {
    // 0 against 110 is a genuine (awful) week, not an unplayed one.
    // Power scoring drops it as an absence, which is its call to make.
    const out = buildWeeklyScoresFromMatchups(
      new Map([[1, [game('a', 0, 'b', 110)]]]),
    )
    expect(out).toHaveLength(2)
    expect(out.find((s) => s.teamId === 'a')!.points).toBe(0)
  })

  it('orders by week', () => {
    const out = buildWeeklyScoresFromMatchups(
      new Map([
        [3, [game('a', 100, 'b', 90)]],
        [1, [game('a', 80, 'b', 70)]],
      ]),
    )
    expect(out.map((s) => s.week)).toEqual([1, 1, 3, 3])
  })

  it('feeds all-play power, which is the whole point', () => {
    // The board deck was Sleeper-only purely because ESPN and Yahoo
    // never built this array. This asserts the output is actually
    // consumable by the scorer, not merely shaped like it.
    const weeks = new Map<number, LeagueDataPointsMatchup[]>()
    for (let w = 1; w <= 4; w++) {
      weeks.set(w, [
        game('strong', 130, 'weak', 80),
        game('mid', 105, 'other', 100),
      ])
    }
    const weeklyScores = buildWeeklyScoresFromMatchups(weeks)
    const power = computePointsPowerScores({
      format: 'h2h-points',
      teams: [
        { id: 'strong' }, { id: 'weak' }, { id: 'mid' }, { id: 'other' },
      ],
      weeklyScores,
    } as unknown as LeagueDataH2HPoints)

    expect(power.length).toBe(4)
    const ranked = [...power].sort((a, b) => b.score - a.score)
    expect(ranked[0].teamId).toBe('strong')
    expect(ranked[ranked.length - 1].teamId).toBe('weak')
    expect(ranked[0].weeksPlayed).toBe(4)
    // Strong beat all three others every week: 12 all-play wins.
    expect(ranked[0].allPlayWins).toBe(12)
  })
})
