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
  it('states the need off the platform projection, with the live odds', () => {
    const desk = buildMondayDesk({ matchups: split, teamName: names })!
    const row = desk.alive[0]
    // d leads 92.1–88.4? No: home c has 92.1, away d 88.4 — c leads.
    // d needs c's projected final (96.0) minus d's 88.4 = 7.6.
    expect(row.title).toBe('Team d need 7.6')
    expect(row.sub).toContain('Team c lead by 3.7')
    expect(row.sub).toContain('56% to win')
    expect(row.score).toBe('92.1 – 88.4')
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
