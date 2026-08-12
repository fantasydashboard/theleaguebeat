import { describe, it, expect } from 'vitest'
import { buildBoard } from '@/editorial/video/scenes/theBoard'
import type {
  CategoryLeagueData,
  CategoryLeagueDataStanding,
  CategoryLeagueDataTeam,
} from '@/editorial/types'

const team = (id: string, name: string): CategoryLeagueDataTeam => ({
  id, name, ownerName: 'O', ownerInitials: 'O',
  avatarColor: '#22c55e, #0a5229', isMyTeam: false,
})

const standing = (
  teamId: string, rank: number, over: Partial<CategoryLeagueDataStanding> = {},
): CategoryLeagueDataStanding => ({
  rank, teamId,
  catWins: 62, catLosses: 38, catTies: 0,
  winPct: 0.62,
  streak: { type: 'W', length: 3 },
  lastSix: ['W', 'W', 'L', 'W', 'W', 'W'],
  ownsCount: 4, bleedingCount: 1,
  ...over,
})

const base = (over: Partial<CategoryLeagueData> = {}): CategoryLeagueData =>
  ({
    format: 'h2h-category',
    leagueId: 'lg1', leagueName: 'Dead Ball Era',
    currentWeek: 12, currentSeason: 2026, playoffCutoff: 6,
    teams: [team('a', 'Thunder Cats'), team('b', 'Bench Mob')],
    categories: [], categoryRanks: [],
    standings: [standing('a', 1), standing('b', 2)],
    seasonRankHistory: [],
    ...over,
  }) as CategoryLeagueData

describe('buildBoard', () => {
  it('returns null with no standings — nothing honest to show', () => {
    expect(buildBoard(base({ standings: [] }))).toBeNull()
  })

  it('emits one row per team, in rank order', () => {
    const scene = buildBoard(base())!
    expect(scene.template).toBe('the-board')
    const { rows } = scene.props as { rows: unknown[] }
    expect(rows).toHaveLength(2)
    expect((rows as { rank: number }[]).map((r) => r.rank)).toEqual([1, 2])
  })

  it('formats the category record without ties when there are none', () => {
    const rows = (buildBoard(base())!.props as { rows: { record: string }[] }).rows
    expect(rows[0].record).toBe('62–38')
  })

  it('includes ties in the record when non-zero', () => {
    const data = base({ standings: [standing('a', 1, { catTies: 2 })] })
    const rows = (buildBoard(data)!.props as { rows: { record: string }[] }).rows
    expect(rows[0].record).toBe('62–38–2')
  })

  it('computes delta against the most recent history week, not currentWeek - 1', () => {
    // History skips week 11 entirely — ESPN does this.
    const data = base({
      seasonRankHistory: [
        { week: 9, ranks: { a: 8, b: 1 } },
        { week: 10, ranks: { a: 4, b: 1 } },
      ],
    })
    const rows = (buildBoard(data)!.props as { rows: { delta: number | null }[] }).rows
    expect(rows[0].delta).toBe(3)   // was 4, now 1 → climbed 3
    expect(rows[1].delta).toBe(-1)  // was 1, now 2 → fell 1
  })

  it('reports a null delta when there is no history to compare against', () => {
    const rows = (buildBoard(base())!.props as { rows: { delta: number | null }[] }).rows
    expect(rows[0].delta).toBeNull()
  })

  it('reports a null delta for a team absent from the history entry', () => {
    const data = base({ seasonRankHistory: [{ week: 11, ranks: { b: 1 } }] })
    const rows = (buildBoard(data)!.props as { rows: { delta: number | null }[] }).rows
    expect(rows[0].delta).toBeNull()
  })

  it('highlights only the requested teams', () => {
    const rows = (buildBoard(base(), ['b'])!.props as { rows: { highlight: boolean }[] }).rows
    expect(rows.map((r) => r.highlight)).toEqual([false, true])
  })

  it('names the leader in the VO', () => {
    expect(buildBoard(base())!.vo).toContain('Thunder Cats')
  })

  it('speaks the leader record as raw numbers when there are no ties', () => {
    expect(buildBoard(base())!.vo).toContain('on top at 62 and 38.')
  })

  it('pins the exact VO opener — "after week N", not "after N"', () => {
    expect(buildBoard(base())!.vo).toBe(
      "Here's the board after week 12. Thunder Cats on top at 62 and 38.",
    )
  })

  it('speaks the leader record with a pluralized tie count', () => {
    const data = base({ standings: [standing('a', 1, { catTies: 2 }), standing('b', 2)] })
    expect(buildBoard(data)!.vo).toContain('on top at 62 and 38 with 2 ties.')
  })

  it('speaks a singular tie when there is exactly one', () => {
    const data = base({ standings: [standing('a', 1, { catTies: 1 }), standing('b', 2)] })
    expect(buildBoard(data)!.vo).toContain('on top at 62 and 38 with 1 tie.')
  })

  it('produces the playoff-cutoff note when there are more teams than the cutoff', () => {
    const data = base({ playoffCutoff: 1 })
    const { note } = buildBoard(data)!.props as { note: string }
    expect(note).toBe('TOP 1 MAKE THE PLAYOFFS')
  })

  it('omits the note when the team count exactly equals the cutoff', () => {
    const data = base({ playoffCutoff: 2 })
    const { note } = buildBoard(data)!.props as { note: string }
    expect(note).toBe('')
  })

  it('omits the note when playoffCutoff is 0', () => {
    const data = base({ playoffCutoff: 0 })
    const { note } = buildBoard(data)!.props as { note: string }
    expect(note).toBe('')
  })

  it('nests each row\'s identity as a ReelTeam, including avatarUrl when present', () => {
    const teams = [
      { ...team('a', 'Thunder Cats'), avatarUrl: '/demo-categories-logos/bt.jpg' },
      team('b', 'Bench Mob'),
    ]
    const data = base({ teams })
    const rows = (buildBoard(data)!.props as {
      rows: { team: { name: string; avatarUrl?: string; avatarColor: string; ownerInitials: string } }[]
    }).rows
    expect(rows[0].team).toMatchObject({
      name: 'Thunder Cats',
      avatarUrl: '/demo-categories-logos/bt.jpg',
      avatarColor: '#22c55e, #0a5229',
      ownerInitials: 'O',
    })
    expect(rows[1].team.avatarUrl).toBeUndefined()
  })

  it('degrades gracefully with an empty color/initials, not a fabricated one, when a standings entry names a team missing from teams[]', () => {
    const data = base({ standings: [standing('a', 1), standing('ghost', 2)] })
    const rows = (buildBoard(data)!.props as {
      rows: { team: { name: string; avatarColor: string; ownerInitials: string; avatarUrl?: string } }[]
    }).rows
    const ghostRow = rows.find((r) => r.team.name === 'Unknown')!
    expect(ghostRow).toBeDefined()
    expect(ghostRow.team.avatarColor).toBe('')
    expect(ghostRow.team.ownerInitials).toBe('')
    expect(ghostRow.team.avatarUrl).toBeUndefined()
  })
})
