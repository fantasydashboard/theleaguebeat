import { describe, it, expect } from 'vitest'
import { buildReel } from '@/editorial/video/buildReel'
import type {
  CategoryLeagueData,
  CategoryLeagueDataMatchup,
  CategoryLeagueDataTeam,
} from '@/editorial/types'
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

  /* ───────────────────────────────────────────────────────────────
     Fallback-routing regression tests (fix round 1).

     `templateForSection` gives a story's PREFERRED template based on
     a web-layout decision (section type), which has no idea what a
     video scene template actually needs data-wise. A single-team
     story routed to a two-team template must be able to fall back to
     the other story template rather than losing its slot outright.
  ─────────────────────────────────────────────────────────────── */

  const decidedMatchup = (
    id: string,
    home: string,
    away: string,
  ): CategoryLeagueDataMatchup => ({
    id, homeTeamId: home, awayTeamId: away, status: 'final',
    homeCatWins: 7, awayCatWins: 3, ties: 0, contestedCount: 0,
    catLines: [
      { catId: 'hr', homeCurrent: 18, awayCurrent: 6, status: 'decided-home' },
      { catId: 'sb', homeCurrent: 4, awayCurrent: 11, status: 'decided-away' },
    ],
  })

  const catDefs = [
    { id: 'hr', label: 'HR', name: 'Home Runs', side: 'hit' as const },
    { id: 'sb', label: 'SB', name: 'Stolen Bases', side: 'hit' as const },
  ]

  it('falls back to the climb template when the preferred throne cannot build', () => {
    // dynasty-falling names one team → hero-faceoff by layout → prefers
    // the-throne, which needs two teams and can never build here. It
    // has enough rank history to be a fine Climb instead.
    const story: SelectedStory = {
      type: 'dynasty-falling', category: 'standings', weight: 90, freshness: 1,
      scope: 'team', teamIds: ['a'], seasonStages: ['midseason'],
      context: {}, signature: 'dynasty-falling:a:12', score: 90,
    } as unknown as SelectedStory

    const data = base({
      seasonRankHistory: [
        { week: 9, ranks: { a: 1 } },
        { week: 10, ranks: { a: 3 } },
        { week: 11, ranks: { a: 6 } },
      ],
    })

    const reel = buildReel(data, context, [story])
    const templates = reel.scenes.map((s) => s.template)
    expect(templates).toContain('the-climb')
    expect(templates).not.toContain('the-throne')

    const climb = reel.scenes.find((s) => s.template === 'the-climb')!
    expect(climb.storySignature).toBe('dynasty-falling:a:12')
  })

  it('regression: a story that cannot build its preferred template does not block a later story from claiming it', () => {
    // story1 becomes hero (lower tier), prefers the-throne, but can
    // build neither throne (only one team named) nor climb (no rank
    // history) — it must produce nothing and release the-throne.
    // story2 prefers the-throne too and CAN build it. Under the old
    // pre-build dedup (dedupeByTemplate ran on section types before
    // any builder was called), story1's hero-faceoff section would
    // have claimed the-throne and discarded story2's matchup-of-week
    // section outright, producing zero throne scenes. The fix must
    // yield exactly one, sourced from story2.
    const story1: SelectedStory = {
      type: 'new-throne', category: 'standings', weight: 95, freshness: 1,
      scope: 'team', teamIds: ['a'], seasonStages: ['midseason'],
      context: {}, signature: 'new-throne:a:12', score: 95,
    } as unknown as SelectedStory

    const story2: SelectedStory = {
      type: 'matchup-of-week', category: 'matchup', weight: 85, freshness: 1,
      scope: 'matchup', teamIds: ['a', 'b'], seasonStages: ['midseason'],
      context: {}, signature: 'matchup-of-week:a:b:12', score: 85,
    } as unknown as SelectedStory

    const data = base({
      categories: catDefs,
      matchupsCurrentWeek: [decidedMatchup('m1', 'a', 'b')],
      seasonRankHistory: [], // no history at all → story1's climb fallback also fails
    })

    const reel = buildReel(data, context, [story1, story2])
    const thrones = reel.scenes.filter((s) => s.template === 'the-throne')
    expect(thrones).toHaveLength(1)
    expect(thrones[0].storySignature).toBe('matchup-of-week:a:b:12')
  })

  it('still builds exactly one scene per template when several stories could fill it', () => {
    // Both stories name a fully buildable throne matchup. Only one
    // the-throne scene should ever exist, and it belongs to whichever
    // story got there first (the higher-priority hero).
    const hero: SelectedStory = {
      type: 'new-throne', category: 'standings', weight: 95, freshness: 1,
      scope: 'matchup', teamIds: ['a', 'b'], seasonStages: ['midseason'],
      context: {}, signature: 'new-throne:a:b:12', score: 95,
    } as unknown as SelectedStory

    const other: SelectedStory = {
      type: 'matchup-of-week', category: 'matchup', weight: 85, freshness: 1,
      scope: 'matchup', teamIds: ['c', 'd'], seasonStages: ['midseason'],
      context: {}, signature: 'matchup-of-week:c:d:12', score: 85,
    } as unknown as SelectedStory

    const data = base({
      teams: [
        team('a', 'Thunder Cats'), team('b', 'Bench Mob'),
        team('c', 'Rally Caps'), team('d', 'Free Bases'),
      ],
      categories: catDefs,
      matchupsCurrentWeek: [
        decidedMatchup('m1', 'a', 'b'),
        decidedMatchup('m2', 'c', 'd'),
      ],
      seasonRankHistory: [], // no history → 'other' can't fall back to a climb either
    })

    const reel = buildReel(data, context, [hero, other])
    const thrones = reel.scenes.filter((s) => s.template === 'the-throne')
    expect(thrones).toHaveLength(1)
    expect(thrones[0].storySignature).toBe('new-throne:a:b:12')
  })
})
