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
    // c is done; d still has 12.9 coming.
    homeProjected: 92.1, awayProjected: 101.3,
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

  it('keeps a game alive while anybody is still on the field', () => {
    // c leads by 30 and d projects only 8 more. A projection is not a
    // ceiling — players triple their line every week — so this stays
    // in the live list. Retiring it would tell a reader the thing
    // they came to check is settled when it is not.
    const desk = buildMondayDesk({
      matchups: [
        split[0],
        m('longshot', 'c', 'd', {
          homePoints: 120, awayPoints: 90,
          homeProjected: 121, awayProjected: 98,
        }),
      ],
      teamName: names,
    })!
    expect(desk.alive.map((r) => r.matchupId)).toContain('longshot')
    expect(desk.decided.map((r) => r.matchupId)).toEqual(['done'])
  })

  it('retires a game only when the trailer has nobody left', () => {
    const desk = buildMondayDesk({
      matchups: [
        m('over', 'c', 'd', {
          homePoints: 120, awayPoints: 90,
          homeProjected: 124, awayProjected: 90,
        }),
        split[1],
      ],
      teamName: names,
    })!
    expect(desk.decided.map((r) => r.matchupId)).toContain('over')
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

  it('states the deficit, not a number that assumes the leader hits theirs', () => {
    // c is done on 92.1, so what d needs is the 3.7 on the board —
    // no forecast involved.
    const desk = buildMondayDesk({ matchups: split, teamName: names })!
    expect(desk.alive[0].sub).toBe('Team d need 3.7')
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
    expect(desk.alive[0].sub).toBe('Team d need 3.7 from Bo Nix and Rashee Rice')

    const race = buildMondayDesk({
      matchups: split,
      teamName: names,
      stillToPlay: (id) =>
        id === 'd'
          ? [{ name: 'Bo Nix', points: 17.4 }]
          : [{ name: 'Patrick Mahomes', points: 16.9 }],
    })!
    // Both sides live: the exact statement is a head-to-head against
    // the leader's remaining players, not a chase of their projection.
    expect(race.alive[0].sub).toBe(
      'Team d need Bo Nix to outscore Patrick Mahomes by 3.7',
    )
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
    expect(desk.alive[0].sub).toBe('Team d need 3.7 from Bo Nix and Kenneth Walker and 2 more')
  })
})

describe('upset watch', () => {
  // Ten-team board, so the upset gap is four spots and the heist seven.
  const board: Record<string, number> = { dog: 8, fav: 2, a: 3, b: 5 }
  const watchGame = m('watch', 'dog', 'fav', {
    homePoints: 101.2, awayPoints: 92.3,
    homeProjected: 104, awayProjected: 106,
  })
  const ranked = {
    priorRank: (id: string) => board[id],
    fieldSize: 10,
  }

  it('flags a leader climbing far up the board, with the spots named', () => {
    const desk = buildMondayDesk({
      matchups: [split[0], watchGame], teamName: names, ...ranked,
    })!
    const row = desk.alive.find((r) => r.matchupId === 'watch')!
    expect(row.watch).toBe('upset')
    expect(row.sub).toContain('No. 8 lead No. 2')
    expect(desk.headline).toBe('An upset is live.')
  })

  it('escalates a climb from the bottom to a heist', () => {
    const desk = buildMondayDesk({
      matchups: [split[0], watchGame],
      teamName: names,
      priorRank: (id) => ({ dog: 10, fav: 1 }[id]),
      fieldSize: 10,
    })!
    expect(desk.alive.find((r) => r.matchupId === 'watch')!.watch).toBe('heist')
    expect(desk.headline).toBe('A heist is live.')
  })

  it('never flags neighbours, and never flags the better team leading', () => {
    // Two spots apart is not an upset in the making.
    const near = buildMondayDesk({
      matchups: [split[0], m('near', 'dog', 'fav', {
        homePoints: 101, awayPoints: 92, homeProjected: 104, awayProjected: 106,
      })],
      teamName: names,
      priorRank: (id) => ({ dog: 4, fav: 2 }[id]),
      fieldSize: 10,
    })!
    expect(near.alive.find((r) => r.matchupId === 'near')!.watch).toBeUndefined()

    // The board's better team in front is the board working.
    const calm = buildMondayDesk({
      matchups: [split[0], m('calm', 'fav', 'dog', {
        homePoints: 101, awayPoints: 92, homeProjected: 106, awayProjected: 104,
      })],
      teamName: names, ...ranked,
    })!
    expect(calm.alive.find((r) => r.matchupId === 'calm')!.watch).toBeUndefined()
  })

  it('stays quiet when there is no board to measure against', () => {
    const desk = buildMondayDesk({ matchups: [split[0], watchGame], teamName: names })!
    expect(desk.alive.find((r) => r.matchupId === 'watch')!.watch).toBeUndefined()
    expect(desk.headline).not.toMatch(/upset|heist/i)
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

  it('shows the standing record on a game still being played', () => {
    // Every row carries a record: where a decided side ends up, where
    // a live one stands. A blank slot on half the rows reads as
    // missing data rather than a deliberate difference.
    const desk = buildMondayDesk({
      matchups: split,
      teamName: names,
      recordOf: (id) =>
        ({ ...recordBefore, c: { wins: 2, losses: 1, ties: 0 }, d: { wins: 0, losses: 3, ties: 0 } })[
          id as 'a' | 'b' | 'c' | 'd'
        ],
    })!
    // Unchanged by a game that has not landed.
    expect(desk.alive[0].left.record).toBe('2-1')
    expect(desk.alive[0].right.record).toBe('0-3')
  })

  it('says plainly that the trailer had nothing left', () => {
    const desk = buildMondayDesk({
      matchups: [
        m('over', 'c', 'd', {
          homePoints: 120, awayPoints: 90,
          homeProjected: 124, awayProjected: 90,
        }),
        split[1],
      ],
      teamName: names,
    })!
    expect(desk.decided.find((r) => r.matchupId === 'over')!.sub).toBe('Nothing left for Team d')
    // A final says so instead.
    expect(desk.decided.find((r) => r.matchupId === 'done')).toBeUndefined()
  })
})

describe('an upset that already landed', () => {
  // The real week 1: OverDrive were eighth and beat the second-ranked
  // Mallards. That is an upset whether or not the night is over.
  const board: Record<string, number> = { overdrive: 8, mallards: 2, c: 3, d: 4 }
  const landed = [
    m('upset', 'overdrive', 'mallards', {
      status: 'final', homePoints: 144, awayPoints: 112.3,
    }),
    split[1],
  ]

  it('carries the pill into done and dusted, with the climb named', () => {
    const desk = buildMondayDesk({
      matchups: landed,
      teamName: names,
      priorRank: (id) => board[id],
      fieldSize: 10,
    })!
    const row = desk.decided.find((r) => r.matchupId === 'upset')!
    expect(row.watch).toBe('upset')
    expect(row.sub).toContain('No. 8 beat No. 2')
  })

  it('leads the desk when no upset is live', () => {
    const desk = buildMondayDesk({
      matchups: landed,
      teamName: names,
      priorRank: (id) => board[id],
      fieldSize: 10,
    })!
    expect(desk.headline).toBe('Team overdrive took one down.')
  })

  it('still yields the headline to one in progress', () => {
    const desk = buildMondayDesk({
      matchups: [
        landed[0],
        m('live', 'd', 'c', { homePoints: 95, awayPoints: 90, homeProjected: 99, awayProjected: 101 }),
      ],
      teamName: names,
      priorRank: (id) => ({ ...board, d: 6, c: 1 }[id]),
      fieldSize: 10,
    })!
    expect(desk.headline).toBe('An upset is live.')
  })
})

describe('a tied game', () => {
  // Nobody is behind, so nobody "needs" anything — it is a race
  // between whoever each side has left.
  const level = m('level', 'x', 'y', {
    homePoints: 117.1, awayPoints: 117.1,
    homeProjected: 130.4, awayProjected: 130.4,
  })

  it('calls it level and names the head-to-head', () => {
    const desk = buildMondayDesk({
      matchups: [split[0], level],
      teamName: names,
      stillToPlay: (id) =>
        id === 'y' ? [{ name: 'Rashee Rice', points: 13.3 }] : [{ name: 'Kenneth Walker', points: 13.3 }],
    })!
    const row = desk.alive.find((r) => r.matchupId === 'level')!
    expect(row.sub).toBe('Level at 117.1. It comes down to Rashee Rice against Kenneth Walker')
  })

  it('gives neither side the leader’s colour', () => {
    const desk = buildMondayDesk({ matchups: [split[0], level], teamName: names })!
    const row = desk.alive.find((r) => r.matchupId === 'level')!
    expect(row.left.leading).toBe(false)
    expect(row.right.leading).toBe(false)
  })

  it('says so when only one side has anybody left', () => {
    const desk = buildMondayDesk({
      matchups: [split[0], level],
      teamName: names,
      stillToPlay: (id) => (id === 'y' ? [{ name: 'Rashee Rice', points: 13.3 }] : []),
    })!
    expect(desk.alive.find((r) => r.matchupId === 'level')!.sub).toBe(
      'Level at 117.1, and only Team y have anybody left',
    )
  })
})
