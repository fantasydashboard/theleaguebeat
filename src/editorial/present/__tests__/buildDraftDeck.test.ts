import { describe, it, expect } from 'vitest'
import { buildDraftDeck } from '../buildDraftDeck'
import { deckStepCount } from '../types'
import { voiceViolations } from '@/editorial/football/voice'
import { buildSleeperPointsData } from '@/editorial/adapters/sleeperAdapter'
import { sleeperFootballFixture } from '@/fixtures/sleeperFootball'

const data = buildSleeperPointsData(
  sleeperFootballFixture as unknown as Parameters<typeof buildSleeperPointsData>[0],
)
const nameOf = (id: string) => data.teams.find((t) => t.id === id)?.name ?? `Team ${id}`

describe('the draft deck', () => {
  const deck = buildDraftDeck({
    leagueName: data.leagueName,
    season: data.currentSeason,
    picks: [...(data.draft?.picks ?? [])],
    teamName: nameOf,
  })!

  it('builds from a real draft', () => {
    expect(deck).not.toBeNull()
    expect(deck.id).toBe('draft')
    expect(deck.slides.length).toBeGreaterThan(3)
  })

  it('opens cold and closes on a sign-off', () => {
    expect(deck.slides[0].kind).toBe('cold-open')
    expect(deck.slides[deck.slides.length - 1].kind).toBe('sign-off')
  })

  it('returns null for a league with no draft, rather than an empty deck', () => {
    // The picker uses null to decide not to OFFER the deck. An empty
    // deck would be a presenter standing in front of nothing.
    expect(buildDraftDeck({ leagueName: 'X', season: 2026, picks: [], teamName: nameOf })).toBeNull()
  })

  it('never renders a slide with nothing on it', () => {
    for (const s of deck.slides) {
      if (s.kind === 'list') {
        expect(s.rows.length, 'a list slide with no rows').toBeGreaterThan(0)
        for (const r of s.rows) expect(r.label.trim().length).toBeGreaterThan(0)
      }
      if (s.kind === 'statement') expect(s.headline.trim().length).toBeGreaterThan(0)
    }
  })

  it('counts a revealed row as its own step', () => {
    // Otherwise the progress bar lurches through list slides.
    const revealRows = deck.slides
      .filter((s) => s.kind === 'list' && s.revealOneByOne)
      .reduce((n, s) => n + (s as { rows: unknown[] }).rows.length, 0)
    const plainSlides = deck.slides.filter(
      (s) => !(s.kind === 'list' && s.revealOneByOne),
    ).length
    expect(deckStepCount(deck)).toBe(plainSlides + revealRows)
  })

  it('names only real teams', () => {
    const text = JSON.stringify(deck)
    expect(text).not.toMatch(/undefined|NaN|\[object/)
  })

  it('clears the football voice checker on every headline', () => {
    for (const s of deck.slides) {
      const line =
        s.kind === 'statement' ? s.headline
        : s.kind === 'list' ? s.headline
        : s.kind === 'sign-off' ? s.headline
        : null
      if (!line) continue
      expect(voiceViolations(line), `voice: "${line}"`).toEqual([])
    }
  })
})
