import { describe, it, expect } from 'vitest'
import { buildMondayDeck } from '../buildMondayDeck'
import type { MondayDesk, MondayDeskRow } from '../buildMondayDesk'

const side = (teamId: string, name: string, points: number, rank?: number, record = '2-1') =>
  ({ teamId, name, points, rank, record } as MondayDeskRow['left'])

const row = (over: Partial<MondayDeskRow> & { matchupId: string }): MondayDeskRow => ({
  left: side('a', 'Alpha', 110, 2),
  right: side('b', 'Bravo', 95, 7),
  sub: 'Bravo need 15 from somebody',
  ...over,
})

const desk = (over: Partial<MondayDesk> = {}): MondayDesk => ({
  headline: 'x', support: 'y', alive: [], decided: [], ...over,
})

const base = { week: 4, leagueName: 'League of Record' }

describe('the order is the argument', () => {
  it('leads with the upset, however far down the desk it sat', () => {
    const d = desk({
      alive: [
        row({ matchupId: 'dull' }),
        row({
          matchupId: 'upset',
          left: side('c', 'Charlie', 80, 11),
          right: side('d', 'Delta', 99, 2),
          upsetAlert: 'upset',
        }),
      ],
    })
    const deck = buildMondayDeck({ ...base, desk: d })!
    // cold open, then the upset, then the ordinary game.
    expect(deck.slides[1].kind).toBe('statement')
    expect((deck.slides[1] as any).eyebrow).toBe('Upset alert')
    expect((deck.slides[2] as any).eyebrow).toBe('Still alive')
  })

  it('puts an upset in progress above one merely available', () => {
    const d = desk({
      alive: [
        row({ matchupId: 'available', upsetAlert: 'upset' }),
        row({ matchupId: 'happening', watch: 'heist' }),
      ],
    })
    const deck = buildMondayDeck({ ...base, desk: d })!
    expect((deck.slides[1] as any).headline).toContain('are beating')
    expect((deck.slides[2] as any).headline).toContain('can still take down')
  })

  it('says which way round the upset is', () => {
    // An upset HAPPENING names the underdog as the one in front. One
    // only AVAILABLE names them as the one who could come back. Those
    // are different nights and must not share a sentence.
    const happening = buildMondayDeck({
      ...base,
      desk: desk({ alive: [row({ matchupId: 'm', watch: 'upset' })] }),
    })!
    expect((happening.slides[1] as any).headline)
      .toBe('No. 2 Alpha are beating No. 7 Bravo.')

    const available = buildMondayDeck({
      ...base,
      desk: desk({ alive: [row({ matchupId: 'm', upsetAlert: 'upset' })] }),
    })!
    expect((available.slides[1] as any).headline)
      .toBe('No. 7 Bravo can still take down No. 2 Alpha.')
  })

  it('ends on the decided games, never opens on them', () => {
    const d = desk({
      alive: [row({ matchupId: 'live' })],
      decided: [row({ matchupId: 'over', sub: 'Nothing left' })],
    })
    const deck = buildMondayDeck({ ...base, desk: d })!
    const kinds = deck.slides.map((s) => s.kind)
    expect(kinds[0]).toBe('cold-open')
    expect(kinds[kinds.length - 1]).toBe('sign-off')
    const doneAt = deck.slides.findIndex((s) => (s as any).eyebrow === 'Done and dusted')
    const liveAt = deck.slides.findIndex((s) => (s as any).eyebrow === 'Still alive')
    expect(doneAt).toBeGreaterThan(liveAt)
  })
})

describe('storylines', () => {
  it('carries the all-time series and what is at stake', () => {
    const deck = buildMondayDeck({
      ...base,
      desk: desk({ alive: [row({ matchupId: 'm' })] }),
      seriesBetween: () => 'Alpha lead the all-time series 4-2',
      stakeFor: (id) => (id === 'b' ? 'A win puts Bravo on the all-time record' : null),
    })!
    const support = (deck.slides[1] as any).support
    expect(support).toContain('Alpha lead the all-time series 4-2')
    expect(support).toContain('all-time record')
  })

  it('never prints the same stake twice', () => {
    const deck = buildMondayDeck({
      ...base,
      desk: desk({ alive: [row({ matchupId: 'm' })] }),
      stakeFor: () => 'Both are chasing the same record',
    })!
    const support: string = (deck.slides[1] as any).support
    expect(support.match(/chasing the same record/g)!.length).toBe(1)
  })

  it('says nothing rather than something empty', () => {
    const deck = buildMondayDeck({ ...base, desk: desk({ alive: [row({ matchupId: 'm' })] }) })!
    expect((deck.slides[1] as any).support).toBeUndefined()
  })
})

describe('what it refuses to do', () => {
  it('returns null on an empty week', () => {
    expect(buildMondayDeck({ ...base, desk: desk() })).toBeNull()
  })
})
