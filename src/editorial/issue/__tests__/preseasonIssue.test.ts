import { describe, it, expect } from 'vitest'
import { buildPreseasonIssue } from '../buildPreseasonIssue'
import { deckFromIssue } from '../toSlides'
import { orderSections, type IssueSection } from '../types'
import type { TeamStrength } from '@/editorial/points/rosterStrength'
import type { TeamDraftValue } from '@/editorial/points/draftValue'

const strength = (spec: [string, number][]): TeamStrength[] => {
  const mean = spec.reduce((t, [, v]) => t + v, 0) / spec.length
  return spec
    .map(([teamId, pointsPerWeek]) => ({
      teamId,
      projectedPoints: pointsPerWeek * 17,
      pointsPerWeek,
      vsLeaguePerWeek: Math.round((pointsPerWeek - mean) * 10) / 10,
      slotsFilled: 9,
      bestPosition: { position: 'RB', vsLeague: 8 },
      worstPosition: { position: 'TE', vsLeague: -6 },
      rank: 0,
    }))
    .sort((a, b) => b.pointsPerWeek - a.pointsPerWeek)
    .map((t, i) => ({ ...t, rank: i + 1 }))
}

const graded = (order: string[]): TeamDraftValue[] =>
  order.map((teamId, i) => ({
    teamId,
    roundsPerPick: 2 - i * 0.5,
    vsLeague: 1 - i * 0.5,
    picksCompared: 8,
    rank: i + 1,
    grade: ['A', 'B+', 'B', 'C', 'D'][i] ?? 'C',
  }))

const base = {
  leagueName: 'League of Record',
  season: 2026,
  teamName: (id: string) => `Team ${id}`,
}

const five = strength([['a', 112], ['b', 108], ['c', 104], ['d', 100], ['e', 96]])

describe('buildPreseasonIssue', () => {
  it('leads with a named favourite, not a table', () => {
    // A preseason issue that opens with "here is the board" is not an
    // issue. The lead has to be a claim the room can argue with.
    const issue = buildPreseasonIssue({ ...base, strength: five })!
    expect(issue.sections[0].id).toBe('favourite')
    expect(issue.sections[0].headline).toContain('Team a')
    expect(issue.sections[0].headline).toMatch(/project to win/)
  })

  it('states what it is running on', () => {
    // The board once claimed "preseason" six weeks into a season. An
    // issue that names its own evidence cannot do that.
    const issue = buildPreseasonIssue({ ...base, strength: five, formatLabel: 'half-PPR' })!
    expect(issue.basis).toContain('half-PPR')
    expect(issue.basis).toContain('no games played')
    expect(issue.week).toBe(0)
  })

  it('runs the twist only when the two measures actually disagree', () => {
    // The draft winner having the best roster too is a duller fact,
    // and printing it as a twist would be inventing tension.
    const agrees = buildPreseasonIssue({
      ...base, strength: five, graded: graded(['a', 'b', 'c', 'd', 'e']),
    })!
    expect(agrees.sections.find((s) => s.id === 'draft-vs-roster')).toBeUndefined()

    const differs = buildPreseasonIssue({
      ...base, strength: five, graded: graded(['e', 'b', 'c', 'd', 'a']),
    })!
    const twist = differs.sections.find((s) => s.id === 'draft-vs-roster')!
    expect(twist.headline).toContain('Team e')
    expect(twist.headline).toContain("don't have the best team")
  })

  it('gives every team a card with something specific about them', () => {
    const issue = buildPreseasonIssue({ ...base, strength: five })!
    const field = issue.sections.find((s) => s.id === 'the-field')!
    expect(field.cards).toHaveLength(5)
    for (const c of field.cards!) {
      // The uncomfortable, arithmetic-backed line is the point of the
      // card. An adjective would not survive being wrong.
      expect(c.notes!.join(' ')).toMatch(/points a week/)
    }
  })

  it('refuses to build for a league too small to write about', () => {
    expect(buildPreseasonIssue({ ...base, strength: strength([['a', 100], ['b', 90]]) })).toBeNull()
  })

  it('orders sections by priority, not by emission order', () => {
    const issue = buildPreseasonIssue({ ...base, strength: five })!
    const priorities = issue.sections.map((s) => s.priority)
    expect(priorities).toEqual([...priorities].sort((x, y) => x - y))
  })
})

describe('deckFromIssue', () => {
  const issue = buildPreseasonIssue({
    ...base, strength: five, graded: graded(['e', 'b', 'c', 'd', 'a']),
  })!

  it('presents the issue rather than assembling its own', () => {
    // THE architectural guarantee. Every headline the deck shows must
    // come from a section, or the two can drift into disagreeing about
    // the same week.
    const deck = deckFromIssue(issue)!
    const deckText = JSON.stringify(deck)
    for (const section of issue.sections) {
      if (section.cards?.length) continue // cards carry team names, not the headline
      expect(deckText).toContain(section.headline)
    }
  })

  it('turns a card section into one slide per team, counting down', () => {
    const deck = deckFromIssue(issue)!
    const cards = deck.slides.filter((s) => s.kind === 'team-card') as { rank: number }[]
    expect(cards).toHaveLength(5)
    expect(cards.map((c) => c.rank)).toEqual([5, 4, 3, 2, 1])
  })

  it('opens by naming its own basis', () => {
    const deck = deckFromIssue(issue)!
    const cold = deck.slides[0] as { kind: string; meta?: string; subtitle?: string }
    expect(cold.kind).toBe('cold-open')
    expect(cold.subtitle).toBe('Preseason')
    expect(cold.meta).toContain('no games played')
  })

  it('lets a section opt out of being presented', () => {
    // Opting OUT rather than in: a new section is presentable by
    // default, so the failure mode is a slide too many (noticed) not a
    // slide missing (not noticed).
    const trimmed = {
      ...issue,
      sections: issue.sections.map((s) =>
        s.id === 'schedule' ? { ...s, presentable: false } : s,
      ),
    }
    const deck = deckFromIssue(trimmed)!
    expect(JSON.stringify(deck)).not.toContain('schedule spread')
  })

  it('returns null when nothing is presentable', () => {
    const none = { ...issue, sections: issue.sections.map((s) => ({ ...s, presentable: false })) }
    expect(deckFromIssue(none)).toBeNull()
  })
})

describe('orderSections', () => {
  it('is stable for equal priorities', () => {
    const s = (id: string, priority: number): IssueSection => ({
      id, eyebrow: '', headline: '', priority,
    })
    const out = orderSections([s('a', 10), s('b', 10), s('c', 5)])
    expect(out.map((x) => x.id)).toEqual(['c', 'a', 'b'])
  })
})
