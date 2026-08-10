import { describe, it, expect } from 'vitest'
import { buildClimb, ordinal } from '@/editorial/video/scenes/theClimb'
import type { CategoryLeagueData, CategoryLeagueDataTeam } from '@/editorial/types'
import type { SelectedStory } from '@/editorial/detection/types'

const team = (id: string, name: string): CategoryLeagueDataTeam => ({
  id, name, ownerName: 'O', ownerInitials: 'O',
  avatarColor: '#22c55e, #0a5229', isMyTeam: false,
})

const story = (teamIds: string[]): SelectedStory =>
  ({
    type: 'hot-climber', category: 'standings', weight: 70, freshness: 1,
    scope: 'team', teamIds, seasonStages: ['midseason'],
    context: {}, signature: 'hot-climber:a:12', score: 70,
  }) as unknown as SelectedStory

const base = (over: Partial<CategoryLeagueData> = {}): CategoryLeagueData =>
  ({
    format: 'h2h-category',
    leagueId: 'lg1', leagueName: 'Dead Ball Era',
    currentWeek: 12, currentSeason: 2026, playoffCutoff: 6,
    teams: [team('a', 'Rally Caps')],
    categories: [], standings: [], categoryRanks: [],
    seasonRankHistory: [
      { week: 9, ranks: { a: 11 } },
      { week: 10, ranks: { a: 9 } },
      { week: 11, ranks: { a: 6 } },
    ],
    ...over,
  }) as CategoryLeagueData

describe('ordinal', () => {
  it.each([
    [1, '1st'],
    [2, '2nd'],
    [3, '3rd'],
    [4, '4th'],
    [11, '11th'],
    [12, '12th'],
    [13, '13th'],
    [21, '21st'],
    [22, '22nd'],
    [23, '23rd'],
    [101, '101st'],
    [111, '111th'],
  ])('formats %i as %s', (n, expected) => {
    expect(ordinal(n)).toBe(expected)
  })
})

describe('buildClimb', () => {
  it('returns null when the story names no team', () => {
    expect(buildClimb(base(), story([]))).toBeNull()
  })

  it('returns null when the team is unknown', () => {
    expect(buildClimb(base(), story(['ghost']))).toBeNull()
  })

  it('returns null with fewer than three history points', () => {
    const data = base({ seasonRankHistory: [{ week: 11, ranks: { a: 6 } }] })
    expect(buildClimb(data, story(['a']))).toBeNull()
  })

  it('returns null when history exists but never names this team', () => {
    const data = base({
      seasonRankHistory: [
        { week: 9, ranks: { b: 1 } },
        { week: 10, ranks: { b: 1 } },
        { week: 11, ranks: { b: 1 } },
      ],
    })
    expect(buildClimb(data, story(['a']))).toBeNull()
  })

  it('emits ordered points and the from/to ranks', () => {
    const scene = buildClimb(base(), story(['a']))!
    expect(scene.template).toBe('the-climb')
    expect(scene.props).toMatchObject({ fromRank: 11, toRank: 6, spanWeeks: 3 })
    const { points } = scene.props as { points: { week: number }[] }
    expect(points.map((p) => p.week)).toEqual([9, 10, 11])
  })

  it('sorts unordered history before use', () => {
    const data = base({
      seasonRankHistory: [
        { week: 11, ranks: { a: 6 } },
        { week: 9, ranks: { a: 11 } },
        { week: 10, ranks: { a: 9 } },
      ],
    })
    const { points } = buildClimb(data, story(['a']))!.props as { points: { week: number }[] }
    expect(points.map((p) => p.week)).toEqual([9, 10, 11])
  })

  it('describes a climb in the VO', () => {
    expect(buildClimb(base(), story(['a']))!.vo).toContain('Rally Caps')
  })

  it('handles a fall without claiming it is a climb', () => {
    const data = base({
      seasonRankHistory: [
        { week: 9, ranks: { a: 2 } },
        { week: 10, ranks: { a: 5 } },
        { week: 11, ranks: { a: 9 } },
      ],
    })
    const scene = buildClimb(data, story(['a']))!
    expect(scene.props).toMatchObject({ fromRank: 2, toRank: 9 })
    expect(scene.vo).not.toContain('climbed')
  })

  it('uses correct ordinal suffixes in the VO for non-"th" ranks', () => {
    const data = base({
      seasonRankHistory: [
        { week: 9, ranks: { a: 3 } },
        { week: 10, ranks: { a: 2 } },
        { week: 11, ranks: { a: 1 } },
      ],
    })
    const scene = buildClimb(data, story(['a']))!
    expect(scene.vo).toContain('from 3rd to 1st')
  })

  it('describes an unchanged rank with the held VO and footnote', () => {
    const data = base({
      seasonRankHistory: [
        { week: 9, ranks: { a: 3 } },
        { week: 10, ranks: { a: 3 } },
        { week: 11, ranks: { a: 3 } },
      ],
    })
    const scene = buildClimb(data, story(['a']))!
    expect(scene.vo).toBe('Rally Caps have not moved in 3 weeks, still sitting 3rd.')
    expect((scene.props as { footnote: string }).footnote).toBe('HELD AT 3 FOR 3 WEEKS')
  })

  it('pins the exact fall footnote wording', () => {
    const data = base({
      seasonRankHistory: [
        { week: 9, ranks: { a: 2 } },
        { week: 10, ranks: { a: 5 } },
        { week: 11, ranks: { a: 9 } },
      ],
    })
    const scene = buildClimb(data, story(['a']))!
    expect((scene.props as { footnote: string }).footnote).toBe('SLID 7 SPOTS')
  })

  it('pins the exact climb footnote wording', () => {
    const scene = buildClimb(base(), story(['a']))!
    expect((scene.props as { footnote: string }).footnote).toBe('CLIMBED 5 SPOTS')
  })

  it('uses singular SPOT, not SPOTS, for a one-rank move', () => {
    const data = base({
      seasonRankHistory: [
        { week: 9, ranks: { a: 5 } },
        { week: 10, ranks: { a: 5 } },
        { week: 11, ranks: { a: 4 } },
      ],
    })
    const scene = buildClimb(data, story(['a']))!
    expect((scene.props as { footnote: string }).footnote).toBe('CLIMBED 1 SPOT')
  })
})
