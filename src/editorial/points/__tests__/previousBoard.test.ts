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

describe('the prior board must use the same model as the current one', () => {
  /**
   * THE REAL BUG. The current board is built with the projection
   * component; the prior board was built without one, because nothing
   * passed `projectedStrength` through. So "up three" was not movement
   * at all — it was the difference between two different measures.
   *
   * This fixture makes a team that projects brilliantly and performs
   * modestly. With the projection it ranks high in both weeks and has
   * barely moved. Without it, last week's board drops it several
   * places and the arrow invents a climb.
   */
  const projector = (): LeagueDataH2HPoints => league({
    weeklyScores: [
      // `a` scores least but projects best — the UCDUST shape.
      { teamId: 'a', week: 1, points: 100 }, { teamId: 'b', week: 1, points: 140 },
      { teamId: 'c', week: 1, points: 130 }, { teamId: 'd', week: 1, points: 120 },
      { teamId: 'a', week: 2, points: 100 }, { teamId: 'b', week: 2, points: 140 },
      { teamId: 'c', week: 2, points: 130 }, { teamId: 'd', week: 2, points: 120 },
    ],
  })
  const strength = (id: string) => (id === 'a' ? 1 : 0)

  it('reproduces the board exactly as it was published last week', () => {
    // The real contract. Not "prior equals current" — the projection
    // weight DECAYS as weeks accumulate, so a projection-heavy team
    // legitimately drifts down even scoring identically, and that is
    // the model working rather than a fault. What must hold is that
    // the rewind matches what the board actually showed a week ago.
    const data = projector()
    const weekOneOnly = {
      ...data,
      weeklyScores: (data.weeklyScores ?? []).filter((w) => w.week === 1),
    }
    const asPublished = [...computePointsPowerScores(weekOneOnly, { projectedStrength: strength })]
      .sort((x, y) => y.score - x.score)
      .map((r) => r.teamId)
    const prior = previousPowerRanks(data, strength)!
    const priorOrder = [...prior.entries()].sort((x, y) => x[1] - y[1]).map(([id]) => id)
    expect(priorOrder).toEqual(asPublished)
  })

  it('lets the projection decay move a team, which is not a fault', () => {
    // Same scores both weeks, yet `a` slips: at one week played the
    // projection carries half the score, at two weeks a third. Worth
    // pinning so nobody later "fixes" it back into a constant.
    const data = projector()
    const prior = previousPowerRanks(data, strength)!
    const current = [...computePointsPowerScores(data, { projectedStrength: strength })]
      .sort((x, y) => y.score - x.score)
      .map((r) => r.teamId)
    expect(prior.get('a')).toBe(1)
    expect(current.indexOf('a')).toBe(1)   // second now
  })

  it('without the projection the prior board disagrees — which is the bug', () => {
    const data = projector()
    const withProj = previousPowerRanks(data, strength)!
    const without = previousPowerRanks(data)!
    // `a` is the projection darling. Drop the projection and it falls.
    expect(withProj.get('a')).toBe(1)
    expect(without.get('a')).toBeGreaterThan(1)
  })
})
