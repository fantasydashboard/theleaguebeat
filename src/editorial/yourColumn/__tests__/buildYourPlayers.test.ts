import { describe, it, expect } from 'vitest'
import { buildYourPlayers } from '@/editorial/yourColumn/buildYourPlayers'
import type { PlayerNight } from '@/editorial/players/types'

const hit = (mlbId: number, name: string, h: Partial<PlayerNight['hitting']>, owned: string[], date = '2026-06-11'): PlayerNight =>
  ({ mlbId, name, gameDate: date, ownedByTeamIds: owned, hitting: { atBats: 0, hits: 0, runs: 0, rbi: 0, homeRuns: 0, doubles: 0, triples: 0, walks: 0, strikeouts: 0, stolenBases: 0, hitByPitch: 0, ...h } } as PlayerNight)
const pit = (mlbId: number, name: string, p: Partial<PlayerNight['pitching']>, owned: string[], date = '2026-06-11'): PlayerNight =>
  ({ mlbId, name, gameDate: date, ownedByTeamIds: owned, pitching: { inningsPitched: 0, hits: 0, runs: 0, earnedRuns: 0, walks: 0, strikeouts: 0, homeRunsAllowed: 0, ...p } } as PlayerNight)

describe('buildYourPlayers', () => {
  it('picks up to 2 standouts + 1 dud for the team, skipping quiet and other teams', () => {
    const nights = [
      hit(1, 'Judge', { atBats: 4, hits: 3, runs: 2, rbi: 5, homeRuns: 2 }, ['t1']),     // standout
      pit(2, 'Cole', { inningsPitched: 7, earnedRuns: 0, strikeouts: 11 }, ['t1']),       // standout
      hit(3, 'Soto', { atBats: 4, hits: 0, strikeouts: 4 }, ['t1']),                      // dud
      hit(4, 'Quiet', { atBats: 4, hits: 1, strikeouts: 1 }, ['t1']),                     // neither
      hit(5, 'NotMine', { atBats: 4, hits: 4, homeRuns: 3 }, ['t2']),                     // other team
    ]
    const block = buildYourPlayers(nights, 't1')!
    expect(block.players.map((p) => p.name)).toEqual(['Judge', 'Cole', 'Soto'])
    expect(block.players[0].tone).toBe('up')
    expect(block.players[2].tone).toBe('down')
    expect(block.players[2].line).toMatch(/4 K/)   // hitter dud shows the Ks
    expect(block.label).toBe('Your Players')
    expect(block.eyebrow).toBe('YESTERDAY')
  })

  it('uses only the most recent game date', () => {
    const nights = [
      hit(1, 'Old', { atBats: 4, hits: 4, homeRuns: 2 }, ['t1'], '2026-06-10'),
      hit(2, 'New', { atBats: 4, hits: 3, rbi: 4 }, ['t1'], '2026-06-11'),
    ]
    expect(buildYourPlayers(nights, 't1')!.players.map((p) => p.name)).toEqual(['New'])
  })

  it('omits the block when nothing clears the bars', () => {
    const nights = [hit(1, 'Meh', { atBats: 4, hits: 1, strikeouts: 1 }, ['t1'])]
    expect(buildYourPlayers(nights, 't1')).toBeUndefined()
    expect(buildYourPlayers([], 't1')).toBeUndefined()
  })

  it('scores a two-way player on the pitching line', () => {
    const ohtani = { mlbId: 9, name: 'Ohtani', gameDate: '2026-06-11', ownedByTeamIds: ['t1'],
      hitting: { atBats: 4, hits: 0, runs: 0, rbi: 0, homeRuns: 0, doubles: 0, triples: 0, walks: 0, strikeouts: 3, stolenBases: 0, hitByPitch: 0 },
      pitching: { inningsPitched: 7, hits: 2, runs: 0, earnedRuns: 0, walks: 1, strikeouts: 10, homeRunsAllowed: 0 } } as PlayerNight
    const block = buildYourPlayers([ohtani], 't1')!
    expect(block.players[0]).toMatchObject({ name: 'Ohtani', tone: 'up' })
    expect(block.players[0].line).toMatch(/IP/)
  })
})
