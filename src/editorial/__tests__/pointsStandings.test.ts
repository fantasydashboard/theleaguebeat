import { describe, it, expect } from 'vitest'
import { buildPointsStandings } from '@/editorial/adapters/pointsStandings'
import type { CategoryLeagueDataTeam, LeagueDataPointsMatchup } from '@/editorial/types'

const team = (id: string): CategoryLeagueDataTeam => ({
  id,
  name: id.toUpperCase(),
  ownerName: '',
  ownerInitials: id.slice(0, 2).toUpperCase(),
  avatarUrl: undefined,
  avatarColor: 'x',
  isMyTeam: false,
})

const fin = (
  id: string,
  h: string,
  a: string,
  hp: number,
  ap: number,
): LeagueDataPointsMatchup => ({
  id,
  homeTeamId: h,
  awayTeamId: a,
  status: 'final',
  homePoints: hp,
  awayPoints: ap,
})

describe('buildPointsStandings', () => {
  // t1 wins every week, t4 loses every week (4 teams, 3 weeks).
  const teams = ['t1', 't2', 't3', 't4'].map(team)
  const byWeek = new Map<number, LeagueDataPointsMatchup[]>([
    [1, [fin('w1a', 't1', 't2', 100, 90), fin('w1b', 't3', 't4', 80, 70)]],
    [2, [fin('w2a', 't1', 't3', 100, 90), fin('w2b', 't2', 't4', 80, 70)]],
    [3, [fin('w3a', 't1', 't4', 100, 90), fin('w3b', 't2', 't3', 80, 70)]],
  ])
  const { standings, seasonRankHistory } = buildPointsStandings(teams, byWeek)
  const byId = Object.fromEntries(standings.map((s) => [s.teamId, s]))

  it('computes a "win" as the higher weekly score', () => {
    expect(byId.t1.catWins).toBe(3)
    expect(byId.t1.catLosses).toBe(0)
    expect(byId.t4.catWins).toBe(0)
    expect(byId.t4.catLosses).toBe(3)
  })

  it('ranks by record (dense, unique 1..N)', () => {
    expect(byId.t1.rank).toBe(1)
    expect(byId.t4.rank).toBe(4)
    expect(new Set(standings.map((s) => s.rank)).size).toBe(4)
  })

  it('derives current streaks from chronological outcomes', () => {
    expect(byId.t1.streak).toEqual({ type: 'W', length: 3 })
    expect(byId.t4.streak).toEqual({ type: 'L', length: 3 })
  })

  it('snapshots one rank-history entry per completed week', () => {
    expect(seasonRankHistory).toHaveLength(3)
    expect(seasonRankHistory[2].ranks.t1).toBe(1)
  })

  it('skips 0-0 matchups so unplayed/bye weeks do not mint false ties', () => {
    const twoTeams = ['x1', 'x2'].map(team)
    const weeks = new Map<number, LeagueDataPointsMatchup[]>([
      [1, [fin('a', 'x1', 'x2', 80, 70)]],
      [2, [fin('b', 'x1', 'x2', 0, 0)]], // artifact — must be ignored
    ])
    const { standings: s } = buildPointsStandings(twoTeams, weeks)
    const x1 = s.find((r) => r.teamId === 'x1')!
    expect([x1.catWins, x1.catLosses, x1.catTies]).toEqual([1, 0, 0])
  })

  it('only scores final matchups', () => {
    const live: LeagueDataPointsMatchup = { ...fin('l', 't1', 't2', 50, 10), status: 'live' }
    const { standings: s } = buildPointsStandings(['t1', 't2'].map(team), new Map([[1, [live]]]))
    expect(s.every((r) => r.catWins === 0 && r.catLosses === 0)).toBe(true)
  })
})
