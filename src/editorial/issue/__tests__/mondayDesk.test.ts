import { describe, it, expect } from 'vitest'
import { buildMondayDesk } from '../buildMondayDesk'
import type { LeagueDataPointsMatchup } from '@/editorial/types'

type Over = Partial<LeagueDataPointsMatchup>
const m = (id: string, home: string, away: string, over: Over = {}): LeagueDataPointsMatchup => ({
  id, homeTeamId: home, awayTeamId: away, status: 'live',
  homePoints: 0, awayPoints: 0,
  ...over,
})

const names = (id: string) => `Team ${id}`
const priors = (v: Record<string, number>) => (id: string) => v[id]

/** A split Monday: one game done, one alive. */
const split = [
  m('done', 'a', 'b', { status: 'final', homePoints: 141.2, awayPoints: 98.4 }),
  m('alive', 'c', 'd', {
    homePoints: 92.1, awayPoints: 88.4,
    homeProjected: 96.0, awayProjected: 101.3,
    homeWinProb: 0.44, awayWinProb: 0.56,
  }),
]

describe('the desk gate', () => {
  it('shows only when the week is genuinely split', () => {
    expect(buildMondayDesk({ matchups: split, teamName: names })).not.toBeNull()
    // Early Sunday: everything alive, nothing decided — the matchups
    // page is the live surface, not the desk.
    expect(
      buildMondayDesk({ matchups: [split[1]], teamName: names }),
    ).toBeNull()
    // Tuesday: everything final — the weekly issue owns it now.
    expect(
      buildMondayDesk({ matchups: [split[0]], teamName: names }),
    ).toBeNull()
    expect(buildMondayDesk({ matchups: [], teamName: names })).toBeNull()
  })

  it('treats a lead bigger than the trailer has left as decided', () => {
    // c leads by 30 and d projects 8 more. Status says live; the
    // scoreboard says over.
    const desk = buildMondayDesk({
      matchups: [
        m('cooked', 'c', 'd', {
          homePoints: 120, awayPoints: 90,
          homeProjected: 121, awayProjected: 98,
        }),
        split[1],
      ],
      teamName: names,
    })!
    expect(desk.decided.map((r) => r.matchupId)).toContain('cooked')
    expect(desk.alive.map((r) => r.matchupId)).toEqual(['alive'])
  })
})

describe('the still-alive rows', () => {
  it('puts the leader first so crests and scores agree', () => {
    const desk = buildMondayDesk({ matchups: split, teamName: names })!
    const row = desk.alive[0]
    expect(row.left.name).toBe('Team c')
    expect(row.left.points).toBe(92.1)
    expect(row.left.leading).toBe(true)
    expect(row.right.name).toBe('Team d')
    expect(row.right.points).toBe(88.4)
  })

  it('states the need off the platform projection', () => {
    // c leads with 92.1; d needs c's projected final (96.0) minus
    // d's own 88.4 = 7.6.
    const desk = buildMondayDesk({ matchups: split, teamName: names })!
    expect(desk.alive[0].sub).toBe('Team d need 7.6')
  })

  it('names who a side is waiting on, and what the leader has coming', () => {
    const desk = buildMondayDesk({
      matchups: split,
      teamName: names,
      stillToPlay: (id) =>
        id === 'd' ? [{ name: 'Rashee Rice', points: 10.9 }, { name: 'Bo Nix', points: 17.4 }] : [],
    })!
    // Biggest contributor first, and the flat-target phrasing because
    // the leader has nobody left.
    expect(desk.alive[0].sub).toBe('Team d need 7.6 from Bo Nix and Rashee Rice')

    const race = buildMondayDesk({
      matchups: split,
      teamName: names,
      stillToPlay: (id) =>
        id === 'd'
          ? [{ name: 'Bo Nix', points: 17.4 }]
          : [{ name: 'Patrick Mahomes', points: 16.9 }],
    })!
    // Both sides live: saying only "need 7.6" would ignore the points
    // the leader is about to add.
    expect(race.alive[0].sub).toContain('with Patrick Mahomes still to play')
  })

  it('caps the names and counts the rest', () => {
    const desk = buildMondayDesk({
      matchups: split,
      teamName: names,
      stillToPlay: (id) =>
        id === 'd'
          ? [
              { name: 'Bo Nix', points: 17.4 },
              { name: 'Rashee Rice', points: 10.9 },
              { name: 'Jaylen Waddle', points: 10.7 },
              { name: 'Kenneth Walker', points: 13.3 },
            ]
          : [],
    })!
    expect(desk.alive[0].sub).toBe('Team d need 7.6 from Bo Nix and Kenneth Walker and 2 more')
  })
})

describe('upset watch', () => {
  const watchGame = m('watch', 'dog', 'fav', {
    homePoints: 101.2, awayPoints: 92.3,
    homeProjected: 104, awayProjected: 106,
    homeWinProb: 0.55, awayWinProb: 0.45,
  })

  it('flags a pregame dog currently leading, with the receipt', () => {
    const desk = buildMondayDesk({
      matchups: [split[0], watchGame],
      teamName: names,
      priorPointsPerWeek: priors({ dog: 100, fav: 115, a: 110, b: 105 }),
      priorWeeks: 4,
      priorRank: (id) => ({ dog: 8, fav: 2, a: 3, b: 5 }[id]),
    })!
    const row = desk.alive.find((r) => r.matchupId === 'watch')!
    expect(row.watch).toBe('upset')
    expect(row.sub).toContain('No. 8')
    expect(row.sub).toContain('No. 2')
    expect(row.sub).toContain('34%')
    // The headline promotes the live upset over the closest game.
    expect(desk.headline).toBe('An upset is live.')
    expect(desk.support).toContain('Team dog')
  })

  it('escalates to heist watch under 25%', () => {
    const desk = buildMondayDesk({
      matchups: [split[0], watchGame],
      teamName: names,
      priorPointsPerWeek: priors({ dog: 100, fav: 125 }),
      priorWeeks: 4,
    })!
    expect(desk.alive.find((r) => r.matchupId === 'watch')!.watch).toBe('heist')
    expect(desk.headline).toBe('A heist is live.')
  })

  it('sorts watch rows first, then closest games', () => {
    const desk = buildMondayDesk({
      matchups: [split[0], split[1], watchGame],
      teamName: names,
      priorPointsPerWeek: priors({ dog: 100, fav: 115 }),
      priorWeeks: 4,
    })!
    expect(desk.alive[0].matchupId).toBe('watch')
  })

  it('never flags without enough prior weeks, and never flags the favorite', () => {
    // One week of history is not an expectation.
    const thin = buildMondayDesk({
      matchups: [split[0], watchGame],
      teamName: names,
      priorPointsPerWeek: priors({ dog: 100, fav: 125 }),
      priorWeeks: 1,
    })!
    expect(thin.alive.find((r) => r.matchupId === 'watch')!.watch).toBeUndefined()
    expect(thin.headline).not.toMatch(/upset|heist/i)

    // The favorite leading is the board working as intended.
    const favUp = buildMondayDesk({
      matchups: [split[0], m('calm', 'fav', 'dog', {
        homePoints: 101, awayPoints: 92,
        homeProjected: 106, awayProjected: 104,
      })],
      teamName: names,
      priorPointsPerWeek: priors({ dog: 100, fav: 125 }),
      priorWeeks: 4,
    })!
    expect(favUp.alive.find((r) => r.matchupId === 'calm')!.watch).toBeUndefined()
  })
})

describe('the done-and-dusted rows', () => {
  const recordBefore = { a: { wins: 2, losses: 1, ties: 0 }, b: { wins: 1, losses: 2, ties: 0 } }

  it('shows what each record becomes once the game counts', () => {
    const desk = buildMondayDesk({
      matchups: split,
      teamName: names,
      recordOf: (id) => recordBefore[id as 'a' | 'b'],
    })!
    const row = desk.decided[0]
    expect(row.left.name).toBe('Team a')
    expect(row.left.record).toBe('3-1')
    expect(row.right.record).toBe('1-3')
  })

  it('leaves records off games still being played', () => {
    // An unfinished game has no result to add to anybody's record.
    const desk = buildMondayDesk({
      matchups: split,
      teamName: names,
      recordOf: (id) => recordBefore[id as 'a' | 'b'],
    })!
    expect(desk.alive[0].left.record).toBeUndefined()
    expect(desk.alive[0].right.record).toBeUndefined()
  })

  it('explains a locked game with the arithmetic that locked it', () => {
    const desk = buildMondayDesk({
      matchups: [
        m('cooked', 'c', 'd', {
          homePoints: 120, awayPoints: 90,
          homeProjected: 121, awayProjected: 98,
        }),
        split[1],
      ],
      teamName: names,
    })!
    const locked = desk.decided.find((r) => r.matchupId === 'cooked')!
    expect(locked.sub).toBe('Team d need 30 with 8 left to play')
    // A final needs no such explanation.
    expect(desk.decided.find((r) => r.matchupId === 'done')).toBeUndefined()
  })
})
