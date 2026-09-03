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

describe('logos and position-relative order', () => {
  const deck = buildDraftDeck({
    leagueName: data.leagueName,
    season: data.currentSeason,
    picks: [...(data.draft?.picks ?? [])],
    teamName: nameOf,
    team: (id) => {
      const t = data.teams.find((x) => x.id === id)
      return t && { name: t.name, avatarUrl: t.avatarUrl, avatarColor: t.avatarColor, ownerInitials: t.ownerInitials }
    },
  })!

  it('carries a drawable team on rows that name one', () => {
    const rows = deck.slides.flatMap((s) => (s.kind === 'list' ? s.rows : []))
    const withTeam = rows.filter((r) => r.teamId)
    expect(withTeam.length).toBeGreaterThan(0)
    for (const r of withTeam) {
      // Either a real logo, or the colour+initials fallback. Never a
      // row that claims a team and gives the renderer nothing to draw.
      expect(Boolean(r.logoUrl || (r.logoColor && r.logoInitials))).toBe(true)
    }
  })


})

describe('steals and reaches', () => {
  const picks = [...(data.draft?.picks ?? [])]
  const base = {
    leagueName: data.leagueName,
    season: data.currentSeason,
    picks,
    teamName: nameOf,
  }

  it('omits the value slides entirely with no consensus source', () => {
    // No source of consensus means no opinion, not a guessed one.
    const deck = buildDraftDeck(base)!
    const eyebrows = deck.slides.map((s) => ('eyebrow' in s ? s.eyebrow : ''))
    expect(eyebrows).not.toContain('The steal')
    expect(eyebrows).not.toContain('Went early')
  })

  it('adds them when consensus is available', () => {
    // Synthetic consensus: reverse of draft order, so the last pick at
    // each position is the one that "fell" furthest.
    const order = new Map(picks.map((p, i) => [p.playerId, picks.length - i]))
    const deck = buildDraftDeck({ ...base, consensusRank: (id) => order.get(id) })!
    const eyebrows = deck.slides.map((s) => ('eyebrow' in s ? s.eyebrow : ''))
    expect(eyebrows).toContain('The steal')
  })

  it('never claims a pick was good, only where it went', () => {
    const order = new Map(picks.map((p, i) => [p.playerId, picks.length - i]))
    const deck = buildDraftDeck({ ...base, consensusRank: (id) => order.get(id) })!
    const text = JSON.stringify(deck).toLowerCase()
    // Divergence from consensus is a fact. "Best pick", a letter grade
    // or a bust call would be a verdict this has no basis for.
    for (const banned of ['best pick', 'worst pick', 'bust', 'grade a', 'a+ draft']) {
      expect(text, `deck claimed: ${banned}`).not.toContain(banned)
    }
  })
})

describe('draft grades', () => {
  const picks = [...(data.draft?.picks ?? [])]
  // Synthetic consensus: reverse draft order, so late picks look like
  // steals and every team accumulates some divergence.
  const order = new Map(picks.map((p, i) => [p.playerId, picks.length - i]))
  const deck = buildDraftDeck({
    leagueName: data.leagueName,
    season: data.currentSeason,
    picks,
    teamName: nameOf,
    consensusRank: (id) => order.get(id),
  })!
  const grades = deck.slides.find(
    (s) => s.kind === 'list' && s.eyebrow === 'Draft grades',
  ) as { rows: { lead?: string; label: string; value?: string }[] } | undefined

  it('grades every team it could compare', () => {
    expect(grades).toBeDefined()
    expect(grades!.rows.length).toBeGreaterThanOrEqual(4)
  })

  it('never shows a letter without the rounds figure beside it', () => {
    // The letter is league-relative and means little alone; the rounds
    // number is the honest quantity.
    for (const r of grades!.rows) {
      expect(r.lead).toMatch(/^[ABCD][+-]?$/)
      expect(r.value, `no rounds beside ${r.lead}`).toMatch(/^[+-]?[\d.]+ rds$/)
    }
  })

  it('orders best-to-worst', () => {
    const nums = grades!.rows.map((r) => parseFloat((r.value ?? '0').replace(' rds', '')))
    for (let i = 1; i < nums.length; i++) expect(nums[i - 1]).toBeGreaterThanOrEqual(nums[i])
  })

  it('describes divergence in rounds, not slots', () => {
    const text = JSON.stringify(deck)
    expect(text).toMatch(/rounds? (early|late)|1 rd/)
    expect(text, 'still using raw slot counts').not.toMatch(/\d+ spots? (earlier|later)/)
  })
})
