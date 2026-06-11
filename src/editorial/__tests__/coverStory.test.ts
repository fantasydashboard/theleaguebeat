import { describe, it, expect } from 'vitest'
import { detectWildArc, detectPointsCoverStory } from '@/editorial/cover-story'
import type {
  CategoryLeagueData,
  CategoryLeagueDataStanding,
  CategoryLeagueDataWeeklyRanks,
  LeagueDataH2HPoints,
} from '@/editorial/types'

const team = (id: string) => ({
  id,
  name: id,
  ownerName: '',
  ownerInitials: id.slice(0, 2),
  avatarUrl: undefined,
  avatarColor: 'x',
  isMyTeam: false,
})

/** seasonRankHistory where `climber` follows `ranksByWeek`; the other
 *  teams fill the remaining ranks in order. */
function histFor(climber: string, ranksByWeek: number[], ids: string[]): CategoryLeagueDataWeeklyRanks[] {
  return ranksByWeek.map((cr, wi) => {
    const ranks: Record<string, number> = { [climber]: cr }
    let r = 1
    for (const id of ids) {
      if (id === climber) continue
      while (r === cr) r++
      ranks[id] = r
      r++
    }
    return { week: wi + 1, ranks }
  })
}

function viewFor(ids: string[], hist: CategoryLeagueDataWeeklyRanks[]): CategoryLeagueData {
  const standings: CategoryLeagueDataStanding[] = ids.map((id, i) => ({
    rank: i + 1,
    teamId: id,
    catWins: 6,
    catLosses: 6,
    catTies: 0,
    winPct: 0.5,
    streak: { type: 'W', length: 2 },
    lastSix: [],
    ownsCount: 0,
    bleedingCount: 0,
  }))
  return { teams: ids.map(team), standings, seasonRankHistory: hist, currentWeek: 7 } as unknown as CategoryLeagueData
}

const T8 = ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8']
const T10 = Array.from({ length: 10 }, (_, i) => 'a' + (i + 1))

describe('detectWildArc — chronological direction + shape', () => {
  it('a team that ends at its best rank reads as a CLIMB, not a fall', () => {
    const arc = detectWildArc(viewFor(T8, histFor('t1', [6, 5, 4, 2, 1, 1], T8)))
    expect(arc?.eyebrow).toBe('THE CLIMB')
    expect(arc?.headline).toMatch(/climbed to the top/)
    expect(arc?.chips[0]).toEqual(['#6 → #1', 'CLIMBED'])
    // never the misleading min→max "#1 → #6"
    expect(JSON.stringify(arc)).not.toMatch(/#1 → #6/)
    expect(arc?.body ?? '').not.toMatch(/parabola/)
  })

  it('a team that ends at its worst rank reads as a SLIDE', () => {
    const arc = detectWildArc(viewFor(T8, histFor('t1', [1, 2, 4, 6, 7, 8], T8)))
    expect(arc?.eyebrow).toBe('THE SLIDE')
    expect(arc?.chips[0]).toEqual(['#1 → #8', 'SLID'])
  })

  it('an out-and-back stays a WILDEST ARC with the range in the body', () => {
    const arc = detectWildArc(viewFor(T10, histFor('a1', [2, 5, 8, 10, 8, 6], T10)))
    expect(arc?.eyebrow).toBe('THE WILDEST ARC')
    expect(arc?.chips[0]).toEqual(['#2 → #6', 'SEASON ARC'])
    expect(arc?.body).toMatch(/Ranged from #2 to #10/)
  })
})

describe('detectPointsCoverStory', () => {
  it('fires a portable arc and uses no category vocabulary', () => {
    const data = {
      format: 'h2h-points',
      currentWeek: 12,
      ...viewFor(T8, histFor('t1', [6, 5, 4, 2, 1, 1], T8)),
    } as unknown as LeagueDataH2HPoints
    const arc = detectPointsCoverStory(data)
    expect(arc?.kind).toBe('WILD_ARC')
    expect(/\bcat\b|\bcats\b/i.test(JSON.stringify(arc))).toBe(false)
  })

  it('returns null without standings/history (Issue falls back to matchup hero)', () => {
    const empty = { format: 'h2h-points', currentWeek: 12, teams: T8.map(team), standings: [], seasonRankHistory: [] } as unknown as LeagueDataH2HPoints
    expect(detectPointsCoverStory(empty)).toBeNull()
  })
})
