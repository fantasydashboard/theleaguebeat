/**
 * Power score tests.
 *
 * Two halves, on purpose:
 *   1. Hand-built inputs, where the correct answer is arithmetic and
 *      can be asserted exactly.
 *   2. Every real league in the conformance suite, where only
 *      invariants are asserted — because pinning one league's numbers
 *      is how a single league's shape becomes the assumed shape.
 */
import { describe, it, expect } from 'vitest'
import {
  buildAllPlay,
  computePointsPowerScores,
  POWER_WEIGHTS,
} from '../powerScore'
import { buildSleeperPointsData } from '@/editorial/adapters/sleeperAdapter'
import { sleeperLeagueSuite } from '@/fixtures/sleeperLeagueSuite'
import type { LeagueDataH2HPoints, PointsWeeklyScore } from '@/editorial/types'

function leagueOf(scores: PointsWeeklyScore[]): LeagueDataH2HPoints {
  return {
    format: 'h2h-points',
    sport: 'nfl',
    leagueId: 'l1',
    leagueName: 'Test',
    currentWeek: 3,
    currentSeason: 2026,
    teams: [],
    weeklyScores: scores,
  }
}

describe('all-play', () => {
  it('counts every pairwise comparison in a week', () => {
    // Three teams in one week: 100 / 90 / 80.
    const scores: PointsWeeklyScore[] = [
      { teamId: 'a', week: 1, points: 100 },
      { teamId: 'b', week: 1, points: 90 },
      { teamId: 'c', week: 1, points: 80 },
    ]
    const ap = buildAllPlay(scores)
    expect(ap.get('a')).toEqual({ wins: 2, losses: 0, ties: 0 })
    expect(ap.get('b')).toEqual({ wins: 1, losses: 1, ties: 0 })
    expect(ap.get('c')).toEqual({ wins: 0, losses: 2, ties: 0 })
  })

  it('scores equal weeks as ties for both teams', () => {
    const ap = buildAllPlay([
      { teamId: 'a', week: 1, points: 100 },
      { teamId: 'b', week: 1, points: 100 },
    ])
    expect(ap.get('a')).toEqual({ wins: 0, losses: 0, ties: 1 })
    expect(ap.get('b')).toEqual({ wins: 0, losses: 0, ties: 1 })
  })

  it('ignores a week with only one team, which has nobody to compare against', () => {
    const ap = buildAllPlay([{ teamId: 'a', week: 1, points: 100 }])
    expect(ap.size).toBe(0)
  })
})

describe('power score', () => {
  it('returns nothing when there are no weekly scores', () => {
    // Week one, before anything has been played. A placeholder board
    // would be indistinguishable from a real one on the page.
    expect(computePointsPowerScores(leagueOf([]))).toEqual([])
  })

  it('ranks the team that outscores the field first', () => {
    const scores: PointsWeeklyScore[] = []
    for (const week of [1, 2, 3]) {
      scores.push({ teamId: 'strong', week, points: 130 })
      scores.push({ teamId: 'middle', week, points: 100 })
      scores.push({ teamId: 'weak', week, points: 70 })
    }
    const rows = computePointsPowerScores(leagueOf(scores))
    expect(rows.map((r) => r.teamId)).toEqual(['strong', 'middle', 'weak'])
    expect(rows[0].components.allPlay).toBe(1)
    expect(rows[2].components.allPlay).toBe(0)
  })

  it('rates the unlucky high scorer above the lucky low scorer', () => {
    // The whole reason all-play carries the most weight. `unlucky`
    // outscores `lucky` every single week, but a hostile schedule could
    // leave it with the worse record. Standings are supplied saying
    // exactly that — and power must still favour the better team.
    const scores: PointsWeeklyScore[] = []
    for (const week of [1, 2, 3, 4]) {
      scores.push({ teamId: 'unlucky', week, points: 120 })
      scores.push({ teamId: 'lucky', week, points: 80 })
      scores.push({ teamId: 'filler', week, points: 100 })
    }
    const data = leagueOf(scores)
    data.standings = [
      { rank: 1, teamId: 'lucky', catWins: 4, catLosses: 0, catTies: 0, winPct: 1, streak: { type: 'W', length: 4 }, lastSix: [], ownsCount: 0, bleedingCount: 0 },
      { rank: 3, teamId: 'unlucky', catWins: 0, catLosses: 4, catTies: 0, winPct: 0, streak: { type: 'L', length: 4 }, lastSix: [], ownsCount: 0, bleedingCount: 0 },
      { rank: 2, teamId: 'filler', catWins: 2, catLosses: 2, catTies: 0, winPct: 0.5, streak: { type: 'W', length: 1 }, lastSix: [], ownsCount: 0, bleedingCount: 0 },
    ]
    const rows = computePointsPowerScores(data)
    const unlucky = rows.find((r) => r.teamId === 'unlucky')!
    const lucky = rows.find((r) => r.teamId === 'lucky')!

    expect(unlucky.score).toBeGreaterThan(lucky.score)
    // And the record component still reflects reality — power is not
    // pretending the wins did not happen, it is weighting them.
    expect(lucky.components.record).toBe(1)
    expect(unlucky.components.record).toBe(0)
  })

  it('gives every team 0.5 scoring when the league is perfectly level', () => {
    const scores = ['a', 'b', 'c'].flatMap((teamId) =>
      [1, 2].map((week) => ({ teamId, week, points: 100 })),
    )
    const rows = computePointsPowerScores(leagueOf(scores))
    // Zero standard deviation must not divide by zero.
    for (const r of rows) {
      expect(r.components.scoring).toBe(0.5)
      expect(Number.isFinite(r.score)).toBe(true)
    }
  })

  it('weights sum to one, so the blend is a true 0-1 fraction', () => {
    const total = Object.values(POWER_WEIGHTS).reduce((a, b) => a + b, 0)
    expect(total).toBeCloseTo(1, 10)
  })

  it('treats a zero as an absence, not a performance', () => {
    // A Guillotine league eliminates teams, which then post 0.00 for the
    // rest of the season. Counting those would make every eliminated
    // team tie every other and lose to everyone still playing.
    const scores: PointsWeeklyScore[] = [
      { teamId: 'alive1', week: 1, points: 110 },
      { teamId: 'alive2', week: 1, points: 100 },
      { teamId: 'out1', week: 1, points: 0 },
      { teamId: 'out2', week: 1, points: 0 },
    ]
    const ap = buildAllPlay(scores)
    expect(ap.has('out1'), 'an eliminated team should not appear').toBe(false)
    expect(ap.has('out2')).toBe(false)
    // The two live teams compared against each other and nobody else.
    expect(ap.get('alive1')).toEqual({ wins: 1, losses: 0, ties: 0 })
    expect(ap.get('alive2')).toEqual({ wins: 0, losses: 1, ties: 0 })
  })

  it('ignores a standing that exists but records no games', () => {
    // Guillotine standings are 0-0-0 for everyone. `winPct` is then 0,
    // which is "no record", not "lost every game" — reading it literally
    // drags every team down by the full weight of the record component.
    const scores: PointsWeeklyScore[] = []
    for (const week of [1, 2]) {
      scores.push({ teamId: 'top', week, points: 130 })
      scores.push({ teamId: 'bottom', week, points: 80 })
    }
    const data = leagueOf(scores)
    data.standings = [
      { rank: 1, teamId: 'top', catWins: 0, catLosses: 0, catTies: 0, winPct: 0, streak: { type: 'T', length: 0 }, lastSix: [], ownsCount: 0, bleedingCount: 0 },
      { rank: 2, teamId: 'bottom', catWins: 0, catLosses: 0, catTies: 0, winPct: 0, streak: { type: 'T', length: 0 }, lastSix: [], ownsCount: 0, bleedingCount: 0 },
    ]
    const rows = computePointsPowerScores(data)
    const top = rows.find((r) => r.teamId === 'top')!
    // Falls back to all-play (a perfect 1) rather than believing the 0.
    expect(top.components.record).toBe(1)
  })
})

/* ── Every real league, invariants only ─────────────────────────── */

describe('power score across real leagues', () => {
  for (const entry of sleeperLeagueSuite) {
    const name = String((entry.league as { name?: unknown }).name ?? 'unnamed')
    it(`${name}: produces a sane board`, () => {
      const data = buildSleeperPointsData(
        entry as unknown as Parameters<typeof buildSleeperPointsData>[0],
      )
      const rows = computePointsPowerScores(data)

      // Every league in the suite has played weeks, so every league
      // must produce a board.
      expect(rows.length, `${name} produced no power rows`).toBeGreaterThan(0)

      // One row per team that played — never a duplicate, which is what
      // a bad grouping key produces.
      expect(new Set(rows.map((r) => r.teamId)).size).toBe(rows.length)

      const teamIds = new Set(data.teams.map((t) => t.id))
      for (const r of rows) {
        expect(teamIds.has(r.teamId), `${name}: unknown team ${r.teamId}`).toBe(true)
        expect(r.score).toBeGreaterThanOrEqual(0)
        expect(r.score).toBeLessThanOrEqual(100)
        expect(Number.isFinite(r.pointsPerWeek)).toBe(true)
        expect(r.pointsPerWeek).toBeGreaterThan(0)
        for (const [k, v] of Object.entries(r.components)) {
          expect(Number.isFinite(v), `${name}: ${k} not finite`).toBe(true)
          expect(v, `${name}: ${k} out of range`).toBeGreaterThanOrEqual(0)
          expect(v).toBeLessThanOrEqual(1)
        }
      }

      // Sorted descending — the board reads top to bottom.
      for (let i = 1; i < rows.length; i++) {
        expect(rows[i - 1].score).toBeGreaterThanOrEqual(rows[i].score)
      }

      // All-play comparisons must be symmetric across the league: every
      // win for one team is a loss for another. This is the check that
      // catches a median-match league being double-counted, or a bye
      // being compared against nobody.
      const wins = rows.reduce((s, r) => s + r.allPlayWins, 0)
      const losses = rows.reduce((s, r) => s + r.allPlayLosses, 0)
      expect(wins, `${name}: all-play wins and losses disagree`).toBe(losses)
      const ties = rows.reduce((s, r) => s + r.allPlayTies, 0)
      expect(ties % 2, `${name}: an odd number of tie-sides is impossible`).toBe(0)
    })
  }
})
