import { describe, it, expect } from 'vitest'
import { buildThrone } from '@/editorial/video/scenes/theThrone'
import type {
  CategoryLeagueData,
  CategoryLeagueDataMatchup,
  CategoryLeagueDataTeam,
} from '@/editorial/types'
import type { SelectedStory } from '@/editorial/detection/types'

const team = (id: string, name: string): CategoryLeagueDataTeam => ({
  id, name, ownerName: 'O', ownerInitials: 'O',
  avatarColor: '#22c55e, #0a5229', isMyTeam: false,
})

const story = (teamIds: string[]): SelectedStory =>
  ({
    type: 'new-throne', category: 'standings', weight: 90, freshness: 1,
    scope: 'league', teamIds, seasonStages: ['midseason'],
    context: {}, signature: 'new-throne:a:b:12', score: 90,
  }) as unknown as SelectedStory

const matchup = (over: Partial<CategoryLeagueDataMatchup> = {}): CategoryLeagueDataMatchup => ({
  id: 'm1', homeTeamId: 'a', awayTeamId: 'b', status: 'final',
  homeCatWins: 7, awayCatWins: 3, ties: 0, contestedCount: 0,
  catLines: [
    { catId: 'hr', homeCurrent: 18, awayCurrent: 6, status: 'decided-home' },
    { catId: 'sb', homeCurrent: 4, awayCurrent: 11, status: 'decided-away' },
    { catId: 'era', homeCurrent: 0, awayCurrent: 0, status: 'contested' },
  ],
  ...over,
})

const base = (over: Partial<CategoryLeagueData> = {}): CategoryLeagueData =>
  ({
    format: 'h2h-category',
    leagueId: 'lg1', leagueName: 'Dead Ball Era',
    currentWeek: 12, currentSeason: 2026, playoffCutoff: 6,
    teams: [team('a', 'Thunder Cats'), team('b', 'Bench Mob')],
    categories: [
      { id: 'hr', label: 'HR', name: 'Home Runs', side: 'hit' },
      { id: 'sb', label: 'SB', name: 'Stolen Bases', side: 'hit' },
      { id: 'era', label: 'ERA', name: 'Earned Run Avg', side: 'pit' },
    ],
    standings: [], categoryRanks: [], seasonRankHistory: [],
    matchupsCurrentWeek: [matchup()],
    ...over,
  }) as CategoryLeagueData

describe('buildThrone', () => {
  it('returns null when the story names fewer than two teams', () => {
    expect(buildThrone(base(), story(['a']))).toBeNull()
  })

  it('returns null when no matchup contains both teams', () => {
    expect(buildThrone(base({ matchupsCurrentWeek: [] }), story(['a', 'b']))).toBeNull()
  })

  it('returns null when matchupsCurrentWeek is absent entirely', () => {
    expect(buildThrone(base({ matchupsCurrentWeek: undefined }), story(['a', 'b']))).toBeNull()
  })

  it('returns null when the matchup has no cat lines', () => {
    const data = base({ matchupsCurrentWeek: [matchup({ catLines: undefined })] })
    expect(buildThrone(data, story(['a', 'b']))).toBeNull()
  })

  it('builds one cat line per decided category, dropping undecided ones', () => {
    const scene = buildThrone(base(), story(['a', 'b']))!
    const { catLines } = scene.props as { catLines: { label: string }[] }
    expect(catLines.map((c) => c.label)).toEqual(['HR', 'SB'])
  })

  it('assigns the winner side per category', () => {
    const scene = buildThrone(base(), story(['a', 'b']))!
    const { catLines } = scene.props as { catLines: { label: string; winner: string }[] }
    expect(catLines.find((c) => c.label === 'HR')!.winner).toBe('a')
    expect(catLines.find((c) => c.label === 'SB')!.winner).toBe('b')
  })

  it('clamps share into a visible band', () => {
    const scene = buildThrone(base(), story(['a', 'b']))!
    const { catLines } = scene.props as { catLines: { share: number }[] }
    for (const line of catLines) {
      expect(line.share).toBeGreaterThanOrEqual(0.5)
      expect(line.share).toBeLessThanOrEqual(0.95)
    }
  })

  it('carries the headline score and the story signature', () => {
    const scene = buildThrone(base(), story(['a', 'b']))!
    expect(scene.props).toMatchObject({ headline: '7–3' })
    expect(scene.storySignature).toBe('new-throne:a:b:12')
  })

  it('orients the score from the perspective of the winner', () => {
    const flipped = matchup({ homeCatWins: 3, awayCatWins: 7 })
    const data = base({ matchupsCurrentWeek: [flipped] })
    const scene = buildThrone(data, story(['a', 'b']))!
    expect(scene.props).toMatchObject({
      headline: '7–3',
      teamA: { name: 'Bench Mob' },
      teamB: { name: 'Thunder Cats' },
    })
  })

  it('flips per-category winner attribution too when the away team won overall', () => {
    // Same raw cat lines as the base fixture (HR decided-home, SB
    // decided-away), but the away team (b) now wins the matchup overall.
    // teamA is always the winner, so a category the home team (a, now the
    // loser) took must map to 'b', and one the away team (b, now the
    // winner) took must map to 'a' — the opposite of the un-flipped case.
    // This exercises the two homeWon=false quadrants of the orientation
    // XOR that the un-flipped tests never reach.
    const flipped = matchup({ homeCatWins: 3, awayCatWins: 7 })
    const data = base({ matchupsCurrentWeek: [flipped] })
    const scene = buildThrone(data, story(['a', 'b']))!
    const { catLines } = scene.props as { catLines: { label: string; winner: string }[] }
    expect(catLines.find((c) => c.label === 'HR')!.winner).toBe('b')
    expect(catLines.find((c) => c.label === 'SB')!.winner).toBe('a')
  })

  it('returns null when the matchup is a genuine tie', () => {
    const tied = matchup({ homeCatWins: 5, awayCatWins: 5 })
    const data = base({ matchupsCurrentWeek: [tied] })
    expect(buildThrone(data, story(['a', 'b']))).toBeNull()
  })

  it('keeps the headline and the bar count consistent when every category is decided', () => {
    const catLines = [
      { catId: 'c1', homeCurrent: 10, awayCurrent: 2, status: 'decided-home' as const },
      { catId: 'c2', homeCurrent: 8, awayCurrent: 1, status: 'decided-home' as const },
      { catId: 'c3', homeCurrent: 6, awayCurrent: 3, status: 'decided-home' as const },
      { catId: 'c4', homeCurrent: 9, awayCurrent: 4, status: 'decided-home' as const },
      { catId: 'c5', homeCurrent: 7, awayCurrent: 2, status: 'decided-home' as const },
      { catId: 'c6', homeCurrent: 6, awayCurrent: 5, status: 'decided-home' as const },
      { catId: 'c7', homeCurrent: 5, awayCurrent: 4, status: 'decided-home' as const },
      { catId: 'c8', homeCurrent: 2, awayCurrent: 8, status: 'decided-away' as const },
      { catId: 'c9', homeCurrent: 1, awayCurrent: 7, status: 'decided-away' as const },
      { catId: 'c10', homeCurrent: 4, awayCurrent: 10, status: 'decided-away' as const },
    ]
    const complete = matchup({ homeCatWins: 7, awayCatWins: 3, catLines })
    const data = base({
      categories: catLines.map((c, i) => ({
        id: c.catId, label: `C${i + 1}`, name: `Cat ${i + 1}`, side: 'hit' as const,
      })),
      matchupsCurrentWeek: [complete],
    })
    const scene = buildThrone(data, story(['a', 'b']))!
    const { catLines: builtLines } = scene.props as {
      catLines: { winner: string }[]
    }
    expect(builtLines.length).toBe(10)
    expect(builtLines.filter((c) => c.winner === 'a').length).toBe(7)
    expect(scene.props).toMatchObject({ headline: '7–3' })
  })
})
