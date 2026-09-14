import { describe, it, expect } from 'vitest'
import {
  teamsStillPlaying,
  buildRemainingIndex,
  projectSides,
  WEEKS_PER_SEASON,
} from '../liveRemaining'
import type { LeagueDataPointsMatchup } from '@/editorial/types'

const schedule = [
  { week: 1, home: 'KC', away: 'DEN', status: 'in_game' },
  { week: 1, home: 'SEA', away: 'ARI', status: 'complete' },
  { week: 1, home: 'DET', away: 'NO', status: 'complete' },
  { week: 2, home: 'KC', away: 'LV', status: 'pre_game' },
]

const proj = [
  { player_id: '1', player: { team: 'KC', position: 'QB' }, stats: { pts_half_ppr: 340 } },
  { player_id: '2', player: { team: 'DEN', position: 'QB' }, stats: { pts_half_ppr: 170 } },
  { player_id: '3', player: { team: 'SEA', position: 'WR' }, stats: { pts_half_ppr: 255 } },
  { player_id: '4', player: { team: 'DET', position: 'RB' }, stats: { pts_half_ppr: 170 } },
]

const live = (over: Partial<LeagueDataPointsMatchup> = {}): LeagueDataPointsMatchup => ({
  id: 'm', homeTeamId: 'h', awayTeamId: 'a', status: 'live',
  homePoints: 100, awayPoints: 90,
  ...over,
})

describe('which NFL teams still have football left', () => {
  it('reads the real schedule, one week at a time', () => {
    const left = teamsStillPlaying(schedule, 1)
    expect(left.has('KC')).toBe(true)
    expect(left.has('DEN')).toBe(true)
    // Played and finished on Sunday.
    expect(left.has('SEA')).toBe(false)
    expect(left.has('DET')).toBe(false)
    // Next week's game must not make this week look unfinished.
    expect(left.has('LV')).toBe(false)
  })

  it('is empty for a week the schedule does not cover', () => {
    expect(teamsStillPlaying(schedule, 9).size).toEqual(new Set().size)
  })
})

describe('what a starter is still expected to add', () => {
  const remaining = buildRemainingIndex(proj, teamsStillPlaying(schedule, 1))

  it('gives a per-week share only to players whose game has not happened', () => {
    // 340 over a 17-game season is 20 a week, and KC has not kicked off.
    expect(remaining('1')).toBeCloseTo(340 / WEEKS_PER_SEASON, 5)
    expect(remaining('2')).toBeCloseTo(170 / WEEKS_PER_SEASON, 5)
  })

  it('gives nothing to a player whose game is over', () => {
    // Whatever he scored is already in the team's points.
    expect(remaining('3')).toBe(0)
    expect(remaining('4')).toBe(0)
  })

  it('gives nothing to a player it has never heard of', () => {
    // An unknown id is not a reason to invent points.
    expect(remaining('nope')).toBe(0)
  })
})

describe('projecting both sides of a matchup', () => {
  const remaining = buildRemainingIndex(proj, teamsStillPlaying(schedule, 1))

  it('adds only what each side has left to what it already has', () => {
    const out = projectSides({
      matchups: [live()],
      // Home has the KC quarterback left; away has nobody.
      startersByTeam: { h: ['1', '3'], a: ['3', '4'] },
      remainingFor: remaining,
    })
    expect(out[0].homeProjected).toBeCloseTo(100 + 340 / WEEKS_PER_SEASON, 5)
    expect(out[0].awayProjected).toBe(90)
  })

  it('leaves a matchup alone when neither side has a lineup to read', () => {
    // No starters is not the same as no points left. Fabricating a
    // projection here would make the desk call live games decided.
    const out = projectSides({
      matchups: [live()],
      startersByTeam: {},
      remainingFor: remaining,
    })
    expect(out[0].homeProjected).toBeUndefined()
    expect(out[0].awayProjected).toBeUndefined()
  })

  it('never touches a finished game', () => {
    const out = projectSides({
      matchups: [live({ status: 'final' })],
      startersByTeam: { h: ['1'], a: ['2'] },
      remainingFor: remaining,
    })
    expect(out[0].homeProjected).toBeUndefined()
  })

  it('projects a side with nothing left as exactly what it scored', () => {
    // This is what lets the desk call a game decided: the trailer's
    // remaining is zero, so any lead at all is the whole story.
    const out = projectSides({
      matchups: [live()],
      startersByTeam: { h: ['3'], a: ['4'] },
      remainingFor: remaining,
    })
    expect(out[0].homeProjected).toBe(100)
    expect(out[0].awayProjected).toBe(90)
  })
})
