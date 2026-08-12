import { describe, it, expect } from 'vitest'
import { buildClimb, ordinal } from '@/editorial/video/scenes/theClimb'
import type {
  CategoryLeagueData,
  CategoryLeagueDataStanding,
  CategoryLeagueDataTeam,
} from '@/editorial/types'
import type { SelectedStory } from '@/editorial/detection/types'

const team = (id: string, name: string): CategoryLeagueDataTeam => ({
  id, name, ownerName: 'O', ownerInitials: 'O',
  avatarColor: '#22c55e, #0a5229', isMyTeam: false,
})

const standing = (teamId: string, rank: number): CategoryLeagueDataStanding => ({
  rank, teamId,
  catWins: 0, catLosses: 0, catTies: 0, winPct: 0,
  streak: { type: 'W', length: 0 }, lastSix: [],
  ownsCount: 0, bleedingCount: 0,
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

  it('agrees with the Board when history ends before currentWeek and live standings disagree', () => {
    // seasonRankHistory only goes through week 11 (ESPN skips any week
    // that isn't fully decided), but the league is on week 12 and this
    // team's LIVE rank there — same source The Board reads — is 4, not
    // the week-11 history value of 6. The Climb's endpoint must reflect
    // the live rank, or it would narrate a different "current" rank
    // than The Board shows moments later in the same reel.
    const data = base({ standings: [standing('a', 4)] })
    const scene = buildClimb(data, story(['a']))!
    expect(scene.props).toMatchObject({ toRank: 4 })
    const { points } = scene.props as { points: { week: number; rank: number }[] }
    expect(points[points.length - 1]).toEqual({ week: 12, rank: 4 })
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

  describe('otherArcs', () => {
    it('is empty for a league of one team', () => {
      const scene = buildClimb(base(), story(['a']))!
      const { otherArcs } = scene.props as { otherArcs: unknown[] }
      expect(otherArcs).toEqual([])
    })

    it('carries every other team, week-aligned with the focus points', () => {
      const data = base({
        teams: [team('a', 'Rally Caps'), team('b', 'Bench Mob')],
        seasonRankHistory: [
          { week: 9, ranks: { a: 11, b: 1 } },
          { week: 10, ranks: { a: 9, b: 2 } },
          { week: 11, ranks: { a: 6, b: 3 } },
        ],
      })
      const scene = buildClimb(data, story(['a']))!
      const { points, otherArcs } = scene.props as {
        points: { week: number }[]
        otherArcs: { teamId: string; points: { week: number; rank: number }[] }[]
      }
      expect(otherArcs).toHaveLength(1)
      expect(otherArcs[0].teamId).toBe('b')
      expect(otherArcs[0].points.map((p) => p.week)).toEqual(points.map((p) => p.week))
      expect(otherArcs[0].points).toEqual([
        { week: 9, rank: 1 },
        { week: 10, rank: 2 },
        { week: 11, rank: 3 },
      ])
    })

    it('never names the focus team among the other arcs', () => {
      const data = base({
        teams: [team('a', 'Rally Caps'), team('b', 'Bench Mob')],
        seasonRankHistory: [
          { week: 9, ranks: { a: 11, b: 1 } },
          { week: 10, ranks: { a: 9, b: 2 } },
          { week: 11, ranks: { a: 6, b: 3 } },
        ],
      })
      const scene = buildClimb(data, story(['a']))!
      const { otherArcs } = scene.props as { otherArcs: { teamId: string }[] }
      expect(otherArcs.some((arc) => arc.teamId === 'a')).toBe(false)
    })

    it('omits a team\'s point for a week it is absent from, keeping the rest of its arc', () => {
      const data = base({
        teams: [team('a', 'Rally Caps'), team('b', 'Bench Mob')],
        seasonRankHistory: [
          { week: 9, ranks: { a: 11, b: 1 } },
          { week: 10, ranks: { a: 9 } },        // b absent this week
          { week: 11, ranks: { a: 6, b: 3 } },
        ],
      })
      const scene = buildClimb(data, story(['a']))!
      const { otherArcs } = scene.props as {
        otherArcs: { teamId: string; points: { week: number; rank: number }[] }[]
      }
      expect(otherArcs[0].points).toEqual([
        { week: 9, rank: 1 },
        { week: 11, rank: 3 },
      ])
    })

    it('drops a team entirely when none of its points survive', () => {
      const data = base({
        teams: [team('a', 'Rally Caps'), team('b', 'Bench Mob')],
        seasonRankHistory: [
          { week: 9, ranks: { a: 11 } },
          { week: 10, ranks: { a: 9 } },
          { week: 11, ranks: { a: 6 } },
        ],
      })
      const scene = buildClimb(data, story(['a']))!
      const { otherArcs } = scene.props as { otherArcs: unknown[] }
      expect(otherArcs).toEqual([])
    })

    it('uses the same live-standings fallback as the focus team for the current-week point', () => {
      const data = base({
        teams: [team('a', 'Rally Caps'), team('b', 'Bench Mob')],
        standings: [standing('a', 4), standing('b', 7)],
      })
      const scene = buildClimb(data, story(['a']))!
      const { points, otherArcs } = scene.props as {
        points: { week: number; rank: number }[]
        otherArcs: { teamId: string; points: { week: number; rank: number }[] }[]
      }
      const currentWeekPoint = points[points.length - 1]
      expect(currentWeekPoint).toEqual({ week: 12, rank: 4 })
      const bCurrentWeekPoint = otherArcs[0].points[otherArcs[0].points.length - 1]
      expect(bCurrentWeekPoint).toEqual({ week: 12, rank: 7 })
    })
  })
})
