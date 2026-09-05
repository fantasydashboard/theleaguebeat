import { describe, it, expect } from 'vitest'
import { buildLiveDeck } from '../buildLiveDeck'
import { deckFromIssue } from '../toSlides'
import type { LeagueDataPointsMatchup } from '@/editorial/types'

const game = (
  over: Partial<LeagueDataPointsMatchup> & { id: string },
): LeagueDataPointsMatchup => ({
  homeTeamId: 'h',
  awayTeamId: 'a',
  status: 'live',
  homePoints: 0,
  awayPoints: 0,
  ...over,
})

const base = {
  leagueName: 'League of Record',
  season: 2026,
  week: 3,
  teamName: (id: string) => `Team ${id}`,
}

describe('buildLiveDeck', () => {
  it('states the points still needed, from the opponent’s projected final', () => {
    // THE number the deck exists for. Team b has 80 and Team a projects
    // to finish on 120, so b needs 40 — not 20 (the current margin) and
    // not 30 (a's own remaining).
    const deck = buildLiveDeck({
      ...base,
      matchups: [
        game({
          id: '1',
          homeTeamId: 'a', awayTeamId: 'b',
          homePoints: 100, awayPoints: 80,
          homeProjected: 120, awayProjected: 95,
          awayWinProb: 0.31,
        }),
      ],
    })!
    expect(deck.sections[0].rows![0].label).toBe('Team b need 40')
    expect(deck.sections[0].rows![0].sub).toContain('Team a lead 20')
    expect(deck.sections[0].rows![0].sub).toContain('31% to win')
  })

  it('says nothing about points needed when the platform gave no projection', () => {
    // Inventing a requirement from the margin alone would be a number
    // the league can check and find wrong.
    const deck = buildLiveDeck({
      ...base,
      matchups: [
        game({ id: '1', homeTeamId: 'a', awayTeamId: 'b', homePoints: 100, awayPoints: 80 }),
      ],
    })!
    expect(deck.sections[0].rows![0].label).toBe('Team b trail')
    expect(JSON.stringify(deck)).not.toMatch(/need \d/)
  })

  it('never asks for a negative number when the trailer is already past the projection', () => {
    // A blown projection is common late on Monday, and "needs -6" is
    // gibberish on a screen.
    const deck = buildLiveDeck({
      ...base,
      matchups: [
        game({
          id: '1', homeTeamId: 'a', awayTeamId: 'b',
          homePoints: 100, awayPoints: 96, homeProjected: 90, awayProjected: 96,
        }),
      ],
    })!
    expect(deck.sections[0].rows![0].label).toBe('Team b need 0')
  })

  it('opens on the closest game, not on a blowout that ended Sunday afternoon', () => {
    const deck = buildLiveDeck({
      ...base,
      matchups: [
        game({ id: 'blowout', homeTeamId: 'a', awayTeamId: 'b', homePoints: 140, awayPoints: 70 }),
        game({ id: 'tight', homeTeamId: 'c', awayTeamId: 'd', homePoints: 101, awayPoints: 99 }),
      ],
    })!
    expect(deck.sections[0].rows![0].sub).toContain('Team c lead 2')
  })

  it('switches to past tense once the games are done', () => {
    const deck = buildLiveDeck({
      ...base,
      matchups: [
        game({
          id: '1', status: 'final',
          homeTeamId: 'a', awayTeamId: 'b', homePoints: 120, awayPoints: 99,
        }),
      ],
    })!
    expect(deck.sections[0].headline).toBe('Week 3, settled.')
    expect(deck.sections[0].rows![0].label).toBe('Team a beat Team b')
    expect(deck.basis).toBe('final scores')
  })

  it('refuses to build a deck out of games nobody has played', () => {
    // A fixture list is not a presentation, and the issue already
    // carries the schedule.
    expect(
      buildLiveDeck({
        ...base,
        matchups: [game({ id: '1', status: 'upcoming', homeProjected: 110, awayProjected: 108 })],
      }),
    ).toBeNull()
    expect(buildLiveDeck({ ...base, matchups: [] })).toBeNull()
  })

  it('renders through deckFromIssue like any other issue', () => {
    // The whole reason a live deck is shaped as an Issue: present mode
    // needs no special case for it.
    const issue = buildLiveDeck({
      ...base,
      matchups: [
        game({
          id: '1', homeTeamId: 'a', awayTeamId: 'b',
          homePoints: 100, awayPoints: 80, homeProjected: 120,
        }),
        game({ id: '2', homeTeamId: 'c', awayTeamId: 'd', homePoints: 90, awayPoints: 88 }),
      ],
    })!
    const vertical = deckFromIssue(issue, { only: 'this-week', format: 'vertical' })!
    const spots = vertical.slides.filter((s) => s.kind === 'spotlight')
    expect(spots).toHaveLength(2)
    expect(deckFromIssue(issue, { only: 'this-week' })!.title).toBe('In flight')
  })
})
