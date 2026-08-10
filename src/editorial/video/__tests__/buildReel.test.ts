import { describe, it, expect } from 'vitest'
import { buildReel } from '@/editorial/video/buildReel'
import type { CategoryLeagueData, CategoryLeagueDataTeam } from '@/editorial/types'
import type { IssueContext, SelectedStory } from '@/editorial/detection/types'

const team = (id: string, name: string): CategoryLeagueDataTeam => ({
  id, name, ownerName: 'O', ownerInitials: 'O',
  avatarColor: '#22c55e, #0a5229', isMyTeam: false,
})

const context: IssueContext = {
  currentWeek: 12,
  seasonStage: 'midseason',
  issueDate: new Date('2026-08-09T12:00:00Z'),
}

const base = (over: Partial<CategoryLeagueData> = {}): CategoryLeagueData =>
  ({
    format: 'h2h-category',
    leagueId: 'lg1', leagueName: 'Dead Ball Era',
    currentWeek: 12, currentSeason: 2026, playoffCutoff: 6,
    teams: [team('a', 'Thunder Cats'), team('b', 'Bench Mob')],
    categories: [],
    standings: [
      { rank: 1, teamId: 'a', catWins: 62, catLosses: 38, catTies: 0, winPct: 0.62,
        streak: { type: 'W', length: 3 }, lastSix: [], ownsCount: 4, bleedingCount: 1 },
      { rank: 2, teamId: 'b', catWins: 58, catLosses: 42, catTies: 0, winPct: 0.58,
        streak: { type: 'L', length: 1 }, lastSix: [], ownsCount: 3, bleedingCount: 2 },
    ],
    categoryRanks: [], seasonRankHistory: [],
    ...over,
  }) as CategoryLeagueData

describe('buildReel', () => {
  it('always produces the fixed spine, even with no stories', () => {
    const reel = buildReel(base(), context, [])
    expect(reel.scenes.map((s) => s.template)).toEqual(['cold-open', 'the-board'])
  })

  it('never produces an empty reel for a league with standings', () => {
    expect(buildReel(base(), context, []).scenes.length).toBeGreaterThan(0)
  })

  it('opens on cold-open and closes on the last fixed scene', () => {
    const reel = buildReel(base(), context, [])
    expect(reel.scenes[0].template).toBe('cold-open')
    expect(reel.scenes[reel.scenes.length - 1].template).toBe('the-board')
  })

  it('carries league identity and video geometry', () => {
    const reel = buildReel(base(), context, [])
    expect(reel).toMatchObject({
      leagueId: 'lg1', leagueName: 'Dead Ball Era',
      year: 2026, week: 12,
      width: 1080, height: 1920, fps: 30,
    })
  })

  it('leaves voDurationMs unset — Phase 0 has no audio', () => {
    for (const scene of buildReel(base(), context, []).scenes) {
      expect(scene.voDurationMs).toBeUndefined()
    }
  })

  it('gives every scene a non-empty VO script', () => {
    for (const scene of buildReel(base(), context, []).scenes) {
      expect(scene.vo.length).toBeGreaterThan(0)
    }
  })

  it('places the board after the story scenes', () => {
    const climb: SelectedStory = {
      type: 'hot-climber', category: 'standings', weight: 70, freshness: 1,
      scope: 'team', teamIds: ['a'], seasonStages: ['midseason'],
      context: {}, signature: 'hot-climber:a:12', score: 70,
    } as unknown as SelectedStory

    const data = base({
      seasonRankHistory: [
        { week: 9, ranks: { a: 11, b: 1 } },
        { week: 10, ranks: { a: 9, b: 1 } },
        { week: 11, ranks: { a: 6, b: 2 } },
      ],
    })

    const templates = buildReel(data, context, [climb]).scenes.map((s) => s.template)
    expect(templates.indexOf('the-climb')).toBeLessThan(templates.indexOf('the-board'))
  })

  it('renders one scene, not two, when sections share a template', () => {
    const mk = (type: string, teamIds: string[], sig: string): SelectedStory =>
      ({
        type, category: 'standings', weight: 70, freshness: 1, scope: 'team',
        teamIds, seasonStages: ['midseason'], context: {}, signature: sig, score: 70,
      }) as unknown as SelectedStory

    const data = base({
      seasonRankHistory: [
        { week: 9, ranks: { a: 11, b: 3 } },
        { week: 10, ranks: { a: 9, b: 2 } },
        { week: 11, ranks: { a: 6, b: 2 } },
      ],
    })

    // hot-climber → hero-solo → the-climb; streak-built → streak-watch → the-climb
    const stories = [mk('hot-climber', ['a'], 's1'), mk('streak-built', ['b'], 's2')]
    const climbs = buildReel(data, context, stories)
      .scenes.filter((s) => s.template === 'the-climb')
    expect(climbs).toHaveLength(1)
  })

  it('skips a story scene whose builder returns null rather than faking it', () => {
    // hot-climber with no usable rank history → buildClimb returns null.
    const climb = {
      type: 'hot-climber', category: 'standings', weight: 70, freshness: 1,
      scope: 'team', teamIds: ['a'], seasonStages: ['midseason'],
      context: {}, signature: 'hot-climber:a:12', score: 70,
    } as unknown as SelectedStory

    const templates = buildReel(base(), context, [climb]).scenes.map((s) => s.template)
    expect(templates).not.toContain('the-climb')
  })

  it('omits the board for a league with no standings at all', () => {
    const reel = buildReel(base({ standings: [] }), context, [])
    expect(reel.scenes.map((s) => s.template)).toEqual(['cold-open'])
  })
})
