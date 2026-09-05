import { describe, it, expect } from 'vitest'
import { previousPowerRanks } from '../previousBoard'
import { computePointsPowerScores } from '../powerScore'
import type { LeagueDataH2HPoints, CategoryLeagueDataStanding } from '@/editorial/types'

const standing = (
  teamId: string, rank: number, w: number, l: number,
): CategoryLeagueDataStanding => ({
  rank, teamId, catWins: w, catLosses: l, catTies: 0,
  winPct: w + l > 0 ? w / (w + l) : 0,
  streak: { type: 'W', length: 1 }, lastSix: [],
  ownsCount: 0, bleedingCount: 0,
})

/**
 * Two weeks, built so that RECORD is the only thing separating `b` and
 * `c`.
 *
 * They score identically every week — 120 and 120 — so all-play,
 * recent form and scoring strength are equal for them by construction,
 * and the 0.20-weighted record component is the sole tiebreak. That is
 * what makes this fixture able to detect whether the standings were
 * rewound: with three of the four components pinned, nothing else can
 * move them past each other.
 *
 * Week 1 paired a-b and c-d, so `c` won and `b` lost. Week 2 paired
 * them the same way with the results inverted, so today both sit 1-1
 * and the divergence exists ONLY in the past.
 */
const league = (over: Partial<LeagueDataH2HPoints> = {}): LeagueDataH2HPoints => ({
  format: 'h2h-points',
  leagueId: 'l', leagueName: 'League of Record',
  currentWeek: 3, currentSeason: 2026,
  teams: ['a', 'b', 'c', 'd'].map((id) => ({ id, name: `Team ${id}` })) as never,
  weeklyScores: [
    { teamId: 'a', week: 1, points: 150 },
    { teamId: 'b', week: 1, points: 120 },
    { teamId: 'c', week: 1, points: 120 },
    { teamId: 'd', week: 1, points: 90 },
    { teamId: 'a', week: 2, points: 100 },
    { teamId: 'b', week: 2, points: 140 },
    { teamId: 'c', week: 2, points: 80 },
    { teamId: 'd', week: 2, points: 130 },
  ],
  // Everyone 1-1 today. Going into week 2 it was a and c at 1-0.
  standings: [
    standing('a', 1, 1, 1), standing('b', 2, 1, 1),
    standing('c', 3, 1, 1), standing('d', 4, 1, 1),
  ],
  // Week 2's games — what the rewind backs out.
  previousWeekMatchups: [
    { id: 'm1', homeTeamId: 'a', awayTeamId: 'b', status: 'final', homePoints: 100, awayPoints: 140 },
    { id: 'm2', homeTeamId: 'c', awayTeamId: 'd', status: 'final', homePoints: 80, awayPoints: 130 },
  ],
  ...over,
})

const order = (m: Map<string, number>) =>
  [...m.entries()].sort((x, y) => x[1] - y[1]).map(([id]) => id)

describe('previousPowerRanks', () => {
  it('ranks the league as it stood before the latest week', () => {
    const prior = previousPowerRanks(league())!
    // Week 1 alone: a scored most, d least.
    expect(prior.get('a')).toBe(1)
    expect(prior.get('d')).toBe(4)

    // And it must actually differ from today's board, or a movement
    // column built on it would always read zero.
    const now = [...computePointsPowerScores(league())]
      .sort((x, y) => y.score - x.score)
      .map((r) => r.teamId)
    expect(now).not.toEqual(order(prior))
  })

  it('backs the latest week out of the standings, not just the scores', () => {
    // THE reason this file exists. The power score reads winPct, so a
    // standings table left at today's values while the scores rewind
    // produces movement that is half real and half arithmetic.
    //
    // `b` and `c` are identical on every other component, so their
    // order is decided purely by record: rewound, `c` was 1-0 and `b`
    // 0-1, and c must lead. Skip the rewind and both read 1-1, the
    // tiebreak collapses, and b comes back first.
    expect(order(previousPowerRanks(league())!)).toEqual(['a', 'c', 'b', 'd'])

    const notRewound = computePointsPowerScores({
      ...league(),
      weeklyScores: league().weeklyScores!.filter((s) => s.week === 1),
    })
      .sort((x, y) => y.score - x.score)
      .map((r) => r.teamId)
    expect(notRewound).toEqual(['a', 'b', 'c', 'd'])
  })

  it('declines rather than guessing when the standings cannot be rewound', () => {
    // No games means no way to subtract the week. A movement column is
    // worth having; a fabricated one is not.
    expect(previousPowerRanks(league({ previousWeekMatchups: [] }))).toBeNull()
    expect(previousPowerRanks(league({ previousWeekMatchups: undefined }))).toBeNull()
  })

  it('declines when the standings and the results disagree', () => {
    // `d` won week 2 but is credited with no wins, so the rewind gives
    // it −1. Mid-week fetch, corrected result, platform quirk —
    // whatever the cause, the rewind is not sound.
    const broken = league({
      standings: [
        standing('a', 1, 1, 1), standing('b', 2, 1, 1),
        standing('c', 3, 1, 1), standing('d', 4, 0, 2),
      ],
    })
    expect(previousPowerRanks(broken)).toBeNull()
  })

  it('has no opinion after a single week', () => {
    expect(
      previousPowerRanks(
        league({ weeklyScores: league().weeklyScores!.filter((s) => s.week === 1) }),
      ),
    ).toBeNull()
  })

  it('still works for a league with no standings at all', () => {
    // The power score falls back to all-play when a standing is
    // absent, so there is nothing to undo and the rewind proceeds.
    const prior = previousPowerRanks(league({ standings: undefined }))!
    expect(prior.get('a')).toBe(1)
  })
})
