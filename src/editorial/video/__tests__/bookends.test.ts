import { describe, it, expect } from 'vitest'
import { buildColdOpen, toReelTeam } from '@/editorial/video/scenes/coldOpen'
import { buildSignOff } from '@/editorial/video/scenes/signOff'
import type {
  CategoryLeagueData,
  CategoryLeagueDataTeam,
  CategoryLeagueDataMatchup,
  CategoryLeagueDataStanding,
} from '@/editorial/types'

const team = (id: string, name: string): CategoryLeagueDataTeam => ({
  id,
  name,
  ownerName: 'Owner ' + id,
  ownerInitials: id.slice(0, 2).toUpperCase(),
  avatarColor: '#22c55e, #0a5229',
  isMyTeam: false,
})

const standing = (teamId: string, rank: number): CategoryLeagueDataStanding => ({
  rank,
  teamId,
  catWins: 0,
  catLosses: 0,
  catTies: 0,
  winPct: 0,
  streak: { type: 'W', length: 0 },
  lastSix: [],
  ownsCount: 0,
  bleedingCount: 0,
})

const base = (over: Partial<CategoryLeagueData> = {}): CategoryLeagueData =>
  ({
    format: 'h2h-category',
    leagueId: 'lg1',
    leagueName: 'Dead Ball Era',
    currentWeek: 12,
    currentSeason: 2026,
    playoffCutoff: 6,
    teams: [team('a', 'Thunder Cats'), team('b', 'Bench Mob')],
    categories: [],
    standings: [],
    categoryRanks: [],
    seasonRankHistory: [],
    ...over,
  }) as CategoryLeagueData

describe('buildColdOpen', () => {
  it('names the league and the week', () => {
    const scene = buildColdOpen(base())
    expect(scene.template).toBe('cold-open')
    expect(scene.props).toMatchObject({ leagueName: 'Dead Ball Era', week: 12 })
  })

  it('writes a VO line naming both', () => {
    expect(buildColdOpen(base()).vo).toBe('Week 12 in the Dead Ball Era.')
  })

  it('has no story signature — it is a fixed scene', () => {
    expect(buildColdOpen(base()).storySignature).toBeUndefined()
  })
})

describe('buildSignOff', () => {
  const nextWeek: CategoryLeagueDataMatchup[] = [
    {
      id: 'm1',
      homeTeamId: 'a',
      awayTeamId: 'b',
      status: 'upcoming',
      homeCatWins: 0,
      awayCatWins: 0,
      ties: 0,
      contestedCount: 10,
    },
  ]

  it('previews next week from matchupsByWeek', () => {
    const scene = buildSignOff(base({ matchupsByWeek: { '13': nextWeek } }))
    expect(scene).not.toBeNull()
    expect(scene!.template).toBe('sign-off')
    expect(scene!.props).toMatchObject({
      teamA: { name: 'Thunder Cats' },
      teamB: { name: 'Bench Mob' },
    })
  })

  it('returns null when next week has no schedule — never invent a matchup', () => {
    expect(buildSignOff(base({ matchupsByWeek: {} }))).toBeNull()
    expect(buildSignOff(base())).toBeNull()
  })

  it('returns null when a scheduled team is missing from teams[]', () => {
    const orphan: CategoryLeagueDataMatchup[] = [
      { ...nextWeek[0], awayTeamId: 'ghost' },
    ]
    expect(buildSignOff(base({ matchupsByWeek: { '13': orphan } }))).toBeNull()
  })

  it('marquee selection picks the best combined rank from multiple candidates', () => {
    const teams = [
      team('a', 'Thunder Cats'),
      team('b', 'Bench Mob'),
      team('c', 'Team C'),
      team('d', 'Team D'),
      team('e', 'Team E'),
      team('f', 'Team F'),
    ]
    const standings = [
      standing('c', 5),
      standing('d', 6),
      standing('a', 1),
      standing('b', 2),
      standing('e', 3),
      standing('f', 4),
    ]
    // The winning pairing (a vs b, combined rank 3) is deliberately last
    // in the input array — if the marquee sort were dropped, the builder
    // would fall through to the first candidate (c vs d) instead.
    const candidates: CategoryLeagueDataMatchup[] = [
      {
        id: 'm1',
        homeTeamId: 'c',
        awayTeamId: 'd',
        status: 'upcoming',
        homeCatWins: 0,
        awayCatWins: 0,
        ties: 0,
        contestedCount: 10,
      },
      {
        id: 'm2',
        homeTeamId: 'e',
        awayTeamId: 'f',
        status: 'upcoming',
        homeCatWins: 0,
        awayCatWins: 0,
        ties: 0,
        contestedCount: 10,
      },
      {
        id: 'm3',
        homeTeamId: 'a',
        awayTeamId: 'b',
        status: 'upcoming',
        homeCatWins: 0,
        awayCatWins: 0,
        ties: 0,
        contestedCount: 10,
      },
    ]

    const scene = buildSignOff(base({ teams, standings, matchupsByWeek: { '13': candidates } }))

    expect(scene).not.toBeNull()
    expect(scene!.props).toMatchObject({
      teamA: { name: 'Thunder Cats' },
      teamB: { name: 'Bench Mob' },
    })
  })

  it('formats the ranked line as "#N vs #M" when both teams have standings', () => {
    const standings = [standing('a', 2), standing('b', 5)]
    const scene = buildSignOff(base({ standings, matchupsByWeek: { '13': nextWeek } }))
    expect(scene).not.toBeNull()
    expect(scene!.props).toMatchObject({ line: '#2 vs #5' })
  })
})

describe('toReelTeam', () => {
  it('carries only what a scene needs to draw', () => {
    expect(toReelTeam(team('a', 'Thunder Cats'))).toEqual({
      id: 'a',
      name: 'Thunder Cats',
      avatarColor: '#22c55e, #0a5229',
      ownerInitials: 'A',
    })
  })

  it('passes an uploaded logo through as avatarUrl', () => {
    const withLogo = { ...team('a', 'Thunder Cats'), avatarUrl: '/demo-categories-logos/bt.jpg' }
    expect(toReelTeam(withLogo).avatarUrl).toBe('/demo-categories-logos/bt.jpg')
  })

  it('leaves avatarUrl undefined for a team with none — never fabricated', () => {
    expect(toReelTeam(team('a', 'Thunder Cats')).avatarUrl).toBeUndefined()
  })
})
