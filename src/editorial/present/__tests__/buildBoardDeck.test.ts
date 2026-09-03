import { describe, it, expect } from 'vitest'
import { buildBoardDeck } from '../buildBoardDeck'
import { deckStepCount, type TeamCardSlide } from '../types'
import { tierFor, type TeamStrength } from '@/editorial/points/rosterStrength'

const strength = (spec: [string, number][]): TeamStrength[] => {
  const mean = spec.reduce((t, [, v]) => t + v, 0) / spec.length
  return spec
    .map(([teamId, pointsPerWeek]) => ({
      teamId,
      projectedPoints: pointsPerWeek * 17,
      pointsPerWeek,
      vsLeaguePerWeek: Math.round((pointsPerWeek - mean) * 10) / 10,
      slotsFilled: 9,
      bestStarterId: `${teamId}-star`,
      bestStarterPoints: 300,
      rank: 0,
    }))
    .sort((a, b) => b.pointsPerWeek - a.pointsPerWeek)
    .map((t, i) => ({ ...t, rank: i + 1 }))
}

const base = {
  leagueName: 'League of Record',
  season: 2026,
  teamName: (id: string) => `Team ${id}`,
}

const cards = (deck: { slides: { kind: string }[] } | null) =>
  (deck?.slides.filter((s) => s.kind === 'team-card') ?? []) as TeamCardSlide[]

describe('buildBoardDeck', () => {
  const five = strength([
    ['a', 112],
    ['b', 108],
    ['c', 104],
    ['d', 100],
    ['e', 96],
  ])

  it('gives every team a slide of its own', () => {
    // The whole change from a list: ten rows read off a screen give
    // each team two seconds; a card each turns a ranking into ten
    // moments, which is the reason to present rather than send a link.
    const deck = buildBoardDeck({ ...base, strength: five })
    expect(cards(deck)).toHaveLength(five.length)
  })

  it('counts down, so the best team is the last card', () => {
    const out = cards(buildBoardDeck({ ...base, strength: five }))
    expect(out.map((c) => c.rank)).toEqual([5, 4, 3, 2, 1])
  })

  it('carries the rank and field size, so a card can say "3rd of 10"', () => {
    const out = cards(buildBoardDeck({ ...base, strength: five }))
    for (const c of out) expect(c.fieldSize).toBe(5)
  })

  it('omits movement when a team has not moved', () => {
    // Rendering "+0" would fill the space with nothing. On the real
    // preseason league every team sat at its draft-night rank, so this
    // is the common case, not an edge one.
    const deck = buildBoardDeck({ ...base, strength: five, draftRank: (id) => five.find((t) => t.teamId === id)!.rank })
    for (const c of cards(deck)) expect(c.movement).toBeUndefined()
  })

  it('signs movement so a climb is positive', () => {
    // 'e' drafted 1st and now sits 5th: four places lost.
    const deck = buildBoardDeck({
      ...base,
      strength: five,
      draftRank: (id) => (id === 'e' ? 1 : id === 'a' ? 5 : undefined),
    })
    const out = cards(deck)
    expect(out.find((c) => c.teamName === 'Team e')!.movement).toEqual({
      places: -4,
      label: 'since draft night',
    })
    expect(out.find((c) => c.teamName === 'Team a')!.movement).toEqual({
      places: 4,
      label: 'since draft night',
    })
  })

  it('names the best STARTER, not the best rostered player', () => {
    const deck = buildBoardDeck({
      ...base,
      strength: five,
      playerName: (id) => (id === 'a-star' ? 'Josh Allen' : undefined),
    })
    const top = cards(deck).find((c) => c.rank === 1)!
    expect(top.notes?.some((n) => n.includes('Josh Allen'))).toBe(true)
  })

  it('says when a starting slot has nobody in it', () => {
    // The projection counts an unfillable slot as zero, so a team with
    // a hole looks merely bad unless the slide explains why.
    const thin = five.map((t) => (t.rank === 5 ? { ...t, slotsFilled: 7 } : t))
    const deck = buildBoardDeck({ ...base, strength: thin, startingSlotCount: 9 })
    const worst = cards(deck).find((c) => c.rank === 5)!
    expect(worst.notes?.some((n) => /2 starting slots/.test(n))).toBe(true)
  })

  it('does not invent holes when every slot is filled', () => {
    const deck = buildBoardDeck({ ...base, strength: five, startingSlotCount: 9 })
    for (const c of cards(deck)) {
      expect(c.notes?.some((n) => /starting slot/.test(n))).toBeFalsy()
    }
  })

  it('refuses to build for a league too small to rank', () => {
    expect(buildBoardDeck({ ...base, strength: strength([['a', 100], ['b', 90]]) })).toBeNull()
  })

  it('counts each card as one step, so the progress bar is even', () => {
    const deck = buildBoardDeck({ ...base, strength: five })!
    expect(deckStepCount(deck)).toBe(deck.slides.length)
  })
})

describe('tierFor', () => {
  it('splits the field into thirds', () => {
    expect(tierFor(1, 10)).toBe('Contender')
    expect(tierFor(3, 10)).toBe('Contender')
    expect(tierFor(5, 10)).toBe('Bubble')
    expect(tierFor(8, 10)).toBe('Rebuilder')
    expect(tierFor(10, 10)).toBe('Rebuilder')
  })

  it('always leaves somebody in each tier, however small the league', () => {
    for (const size of [4, 6, 8, 10, 12, 14]) {
      const tiers = Array.from({ length: size }, (_, i) => tierFor(i + 1, size))
      expect(tiers).toContain('Contender')
      expect(tiers).toContain('Rebuilder')
    }
  })
})
