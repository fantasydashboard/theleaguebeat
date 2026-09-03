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
    // The value read lives on the team cards now — the league-wide
    // fell/reached lists were the same picks in the order that serves
    // them worst, ten steps before the room saw whose picks they were.
    const cards = deck.slides.filter((s) => s.kind === 'team-card')
    expect(cards.length).toBeGreaterThanOrEqual(4)
    const notes = cards.flatMap((c) => (c as { notes?: string[] }).notes ?? []).join(' ')
    expect(notes).toMatch(/Best value:|Went early on/)
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
  const order = new Map(picks.map((p, i) => [p.playerId, picks.length - i]))
  const deck = buildDraftDeck({
    leagueName: data.leagueName,
    season: data.currentSeason,
    picks,
    teamName: nameOf,
    consensusRank: (id) => order.get(id),
  })!
  const cards = deck.slides.filter(
    (s) => s.kind === 'team-card',
  ) as unknown as {
    rank: number
    fieldSize: number
    tier?: string
    statValue: string
    chips?: { value: string; label: string }[]
    notes?: string[]
  }[]

  it('gives every graded team a slide of its own', () => {
    expect(cards.length).toBeGreaterThanOrEqual(4)
  })

  it('counts down, so the best draft is the last card', () => {
    // Best-first puts the one result the room waits for on screen at
    // step one, then descends into teams nobody asked about.
    expect(cards.map((c) => c.rank)).toEqual(
      [...cards.map((c) => c.rank)].sort((a, b) => b - a),
    )
    expect(cards[cards.length - 1].rank).toBe(1)
  })

  it('never shows a letter without the rounds figure beside it', () => {
    // The letter is league-relative and means little alone; the rounds
    // figure is the honest quantity.
    for (const c of cards) {
      if (!c.tier) continue
      expect(c.tier).toMatch(/^[ABCD][+-]?$/)
      const labels = (c.chips ?? []).map((ch) => ch.label).join(' ')
      expect(labels, `no rounds beside ${c.tier}`).toContain('rounds / pick')
    }
  })

  it('shows each team its own picks, not the league-wide list', () => {
    // The point of a card per team: the room is looking at one manager
    // and wants that manager's draft, not a leaderboard they already saw.
    const withNotes = cards.filter((c) => (c.notes ?? []).length > 0)
    expect(withNotes.length).toBeGreaterThan(0)
    for (const c of withNotes) {
      expect(c.notes!.join(' ')).toMatch(/Best value:|Went early on/)
    }
  })

  it('replaces both ten-row countdowns rather than adding to them', () => {
    // Turning each into cards would have meant twenty team slides in
    // one deck. Each team is presented once, carrying both grades.
    const lists = deck.slides.filter(
      (s) => s.kind === 'list' && 'eyebrow' in s && /grade|projected roster/i.test(s.eyebrow),
    )
    expect(lists).toHaveLength(0)
  })

  it('describes divergence in rounds, not slots', () => {
    const text = JSON.stringify(deck)
    expect(text).toMatch(/\d+(\.\d)? rds?\b/)
    expect(text, 'still using raw slot counts').not.toMatch(/\d+ spots? (earlier|later)/)
  })
})

describe('draft slots and ordering', () => {
  const picks = [...(data.draft?.picks ?? [])]
  const order = new Map(picks.map((p, i) => [p.playerId, picks.length - i]))
  const deck = buildDraftDeck({
    leagueName: data.leagueName, season: data.currentSeason, picks,
    teamName: nameOf, consensusRank: (id) => order.get(id),
  })!

  it('labels picks as round-and-slot, not overall number', () => {
    // "#120" tells nobody anything; "12.10" is how a board is read.
    const text = JSON.stringify(deck)
    // At least one real slot somewhere in the deck...
    expect(text).toMatch(/\d{1,2}\.\d{2}/)
    // ...and never a raw overall pick reference.
    expect(text, 'raw pick number in the deck').not.toMatch(/#\d{2,3}\b/)
    // A slot is "14.02"; a raw pick is "139". The lookahead is what
    // separates them — without it this rejected the correct format.
    expect(text, 'raw pick number in the deck').not.toMatch(/\bat \d{2,3}(?!\.\d\d)/)
  })

  it('shows where each player was expected, not just how far he moved', () => {
    // "7 rds late" says how far he slid; "expected 9.04" says from
    // where. A quarterback sliding from round nine and a receiver
    // sliding from round two are different stories, and the row needs
    // both numbers for the room to tell them apart.
    for (const eyebrow of ['Fell furthest', 'Went early']) {
      const slide = deck.slides.find((s) => s.kind === 'list' && s.eyebrow === eyebrow)
      if (!slide) continue
      const rows = (slide as { rows: { sub?: string }[] }).rows
      for (const r of rows) {
        expect(r.sub, 'no expected slot to explain the order').toMatch(/expected \d{1,2}\.\d{2}/)
      }
    }
  })

  it('states the basis on every list of figures', () => {
    for (const s of deck.slides) {
      if (s.kind !== 'list') continue
      expect(s.support, `${s.eyebrow} has no stated basis`).toBeTruthy()
    }
  })
})
