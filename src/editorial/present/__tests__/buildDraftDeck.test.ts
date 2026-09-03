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
    teamName: string
    statValue: string
    statLabel: string
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
    // figure is the honest quantity. It now leads the card rather than
    // sitting in a chip, which is a stronger version of the same rule.
    for (const c of cards) {
      if (!c.tier) continue
      expect(c.tier).toMatch(/^[ABCD][+-]?$/)
      expect(c.statLabel, `no rounds beside ${c.tier}`).toContain('rounds per pick')
      expect(c.statValue, `no rounds figure beside ${c.tier}`).toMatch(/^[+-]?[\d.]+$/)
    }
  })

  it('orders by draft grade, not by projected roster', () => {
    // Sorting on points per week is what the power-rankings deck does,
    // so the draft deck ranking that way made one of them redundant —
    // and put worse drafts above better ones, since roster strength is
    // not a measure of drafting.
    const figures = cards.map((c) => parseFloat(c.statValue))
    for (let i = 1; i < figures.length; i++) {
      expect(figures[i - 1]).toBeLessThanOrEqual(figures[i])
    }
  })

  it('crowns the team the countdown built to', () => {
    // Ranking the cards by draft grade and crowning the best ROSTER
    // would have the deck contradict itself on its final slide.
    const last = cards[cards.length - 1]
    const verdict = deck.slides.find(
      (s) => 'eyebrow' in s && s.eyebrow === 'The verdict',
    ) as { headline: string } | undefined
    expect(verdict).toBeDefined()
    expect(last.rank).toBe(1)
    expect(verdict!.headline).toContain(last.teamName)
  })

  it('crowns the draft winner even when another team has the better roster', () => {
    // The branch that runs when projections resolve — the one the
    // fixture above never reaches, since it passes only consensusRank.
    // A mutation crowning the ROSTER winner survived until this
    // existed.
    //
    // The baseline deliberately makes the WORST-graded team the
    // strongest projected roster, so the two winners cannot coincide
    // and the assertion has something to catch.
    const valueOrder = cards.map((c) => c.teamName)
    const worstGraded = valueOrder[0] // countdown starts at the worst
    const teamIdOf = (name: string) =>
      picks.find((p) => nameOf(p.draftedByTeamId) === name)?.draftedByTeamId ?? ''
    const boostedTeam = teamIdOf(worstGraded)

    const withProjections = buildDraftDeck({
      leagueName: data.leagueName,
      season: data.currentSeason,
      picks,
      teamName: nameOf,
      rosterPositions: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'BN', 'BN'],
      baseline: {
        adpOf: (id) => order.get(id),
        pointsOf: (id) => {
          const pick = picks.find((p) => p.playerId === id)
          if (!pick) return undefined
          return pick.draftedByTeamId === boostedTeam ? 1000 : 1
        },
        positionOf: (id) => picks.find((p) => p.playerId === id)?.position,
        nameOf: (id) => picks.find((p) => p.playerId === id)?.playerName,
        basis: 'test ADP',
        formatLabel: 'test',
      },
    })!

    const projCards = withProjections.slides.filter(
      (sl) => sl.kind === 'team-card',
    ) as unknown as { rank: number; teamName: string }[]
    const verdict = withProjections.slides.find(
      (sl) => 'eyebrow' in sl && sl.eyebrow === 'The verdict',
    ) as { headline: string; support?: string } | undefined

    const topDraft = projCards[projCards.length - 1].teamName
    expect(verdict!.headline).toContain(topDraft)
    // ...and the boosted roster is mentioned as the twist, not crowned.
    expect(verdict!.headline).not.toContain(worstGraded)
    expect(verdict!.support).toContain(worstGraded)
  })

  it('leads with the figure it sorts on', () => {
    // A big number that does not explain the order reads as a broken
    // sort — the same defect this deck already fixed once in its lists.
    for (const c of cards) {
      expect(c.statLabel).toContain('rounds per pick')
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
