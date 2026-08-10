import { describe, it, expect } from 'vitest'
import { buildColdOpen, toReelTeam } from '@/editorial/video/scenes/coldOpen'
import { buildSignOff } from '@/editorial/video/scenes/signOff'
import type {
  CategoryLeagueData,
  CategoryLeagueDataTeam,
  CategoryLeagueDataMatchup,
} from '@/editorial/types'

const team = (id: string, name: string): CategoryLeagueDataTeam => ({
  id,
  name,
  ownerName: 'Owner ' + id,
  ownerInitials: id.slice(0, 2).toUpperCase(),
  avatarColor: '#22c55e, #0a5229',
  isMyTeam: false,
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
})
