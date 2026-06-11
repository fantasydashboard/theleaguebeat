import { describe, it, expect } from 'vitest'
import { renderBeatPoints } from '@/editorial/render-beat-points'
import type {
  CategoryLeagueDataStanding,
  CategoryLeagueDataTeam,
  CategoryLeagueDataWeeklyRanks,
  LeagueDataH2HPoints,
  LeagueDataPointsMatchup,
  WLT,
} from '@/editorial/types'

const team = (id: string): CategoryLeagueDataTeam => ({
  id, name: id, ownerName: '', ownerInitials: id.slice(0, 2), avatarUrl: undefined, avatarColor: 'x', isMyTeam: false,
})
const st = (rank: number, id: string, w: number, l: number, sT: WLT, sL: number): CategoryLeagueDataStanding => ({
  rank, teamId: id, catWins: w, catLosses: l, catTies: 0, winPct: w / (w + l || 1), streak: { type: sT, length: sL }, lastSix: [], ownsCount: 0, bleedingCount: 0,
})
const fin = (id: string, h: string, a: string, hp: number, ap: number): LeagueDataPointsMatchup => ({
  id, homeTeamId: h, awayTeamId: a, status: 'final', homePoints: hp, awayPoints: ap,
})
const live = (id: string, h: string, a: string, hp: number, ap: number, hpr: number, apr: number): LeagueDataPointsMatchup => ({
  id, homeTeamId: h, awayTeamId: a, status: 'live', homePoints: hp, awayPoints: ap, homeProjected: hpr, awayProjected: apr,
})

const teams = ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8'].map(team)
const standings = [
  st(1, 't1', 8, 3, 'W', 2), st(2, 't2', 8, 3, 'L', 1), st(3, 't3', 7, 4, 'W', 3), st(4, 't4', 7, 4, 'W', 1),
  st(5, 't5', 7, 4, 'L', 1), st(6, 't6', 5, 6, 'W', 1), st(7, 't7', 3, 8, 'L', 7), st(8, 't8', 2, 9, 'L', 6),
]
const seasonRankHistory: CategoryLeagueDataWeeklyRanks[] = [
  { week: 10, ranks: { t2: 1, t1: 2, t3: 3, t4: 4, t5: 5, t6: 6, t7: 7, t8: 8 } },
  { week: 11, ranks: { t1: 1, t2: 2, t3: 3, t4: 4, t5: 5, t6: 6, t7: 7, t8: 8 } }, // t1 takes #1 -> THRONE
]
const previousWeekMatchups = [
  fin('p1', 't3', 't4', 762, 749.1), // t3 wins, W3 streak -> "3rd straight"
  fin('p2', 't1', 't2', 738.5, 710.2),
  fin('p3', 't5', 't6', 598.4, 449.6),
  fin('p4', 't7', 't8', 770.6, 277.3),
]
const currentWeekMatchups = [
  live('c1', 't5', 't1', 177.4, 59.6, 700, 700), // blowout (proj even) -> NOT live drama
  live('c2', 't3', 't4', 96.7, 70.5, 700, 690), // moderately close
  live('c3', 't6', 't7', 300, 302, 650, 660), // dead heat (margin 2) <- closest
  live('c4', 't2', 't8', 84, 2.5, 700, 2.5), // empty lineup -> NOT live drama
]
const data: LeagueDataH2HPoints = {
  format: 'h2h-points', leagueId: 'L', leagueName: 'BB', currentWeek: 12, currentSeason: 2026,
  teams, standings, seasonRankHistory, previousWeekMatchups, currentWeekMatchups, weeklyPointsAverage: 632, playoffCutoff: 4,
} as LeagueDataH2HPoints

const now = new Date(2026, 5, 9, 15, 48, 0) // Tuesday Jun 9 2026, 3:48 PM
const beat = renderBeatPoints(data, now)

describe('renderBeatPoints', () => {
  it('produces every portable event kind', () => {
    const kinds = new Set(beat.items.map((i) => i.category))
    for (const k of ['FINAL', 'STREAK', 'THRONE', 'CELLAR', 'RACE', 'ISSUE', 'BRIEFING', 'LIVE']) {
      expect(kinds.has(k as never)).toBe(true)
    }
  })

  it('uses no category vocabulary', () => {
    expect(/\bcats?\b/i.test(JSON.stringify(beat))).toBe(false)
  })

  it('groups into days with TODAY + YESTERDAY labels and one featured per day', () => {
    expect(beat.days.length).toBeGreaterThanOrEqual(2)
    expect(beat.days.some((d) => /TODAY/.test(d.label))).toBe(true)
    expect(beat.days.some((d) => /YESTERDAY/.test(d.label))).toBe(true)
    for (const d of beat.days) {
      expect(d.items.filter((i) => i.isFeatured)).toHaveLength(1)
    }
  })

  it('only surfaces genuinely close matchups as LIVE (not blowouts or empty lineups)', () => {
    const liveHeadlines = beat.items.filter((i) => i.category === 'LIVE').map((i) => i.headline)
    const blob = JSON.stringify(liveHeadlines)
    expect(blob).not.toMatch(/177\.4-59\.6/) // the blowout
    expect(blob).not.toMatch(/84\.0-2\.5|by 81\.5/) // the empty lineup
    expect(blob).not.toMatch(/too close to call/)
  })

  it('renders the FINAL streak body with a correct ordinal (not "3th")', () => {
    const f = beat.items.find((i) => i.category === 'FINAL' && /762/.test(i.headline))
    expect(f?.body).toMatch(/3rd straight/)
    expect(JSON.stringify(beat)).not.toMatch(/[0-9]th straight/)
  })

  it('points the BRIEFING marquee at the closest matchup on the scoreboard', () => {
    const b = beat.items.find((i) => i.category === 'BRIEFING')
    expect(b?.body).toMatch(/t6 vs t7/) // c3, margin 2 — the tightest
  })
})
