import { describe, it, expect } from 'vitest'
import {
  bestLineupPoints,
  rankRosterStrength,
  startingSlots,
  type RosterPlayer,
} from '../rosterStrength'
import {
  buildDraftBaseline,
  projectionsUrl,
  scoringFor,
} from '../sleeperProjections'

describe('startingSlots', () => {
  it('drops the slots nobody starts from', () => {
    expect(startingSlots(['QB', 'RB', 'BN', 'BN', 'IR', 'TAXI'])).toEqual(['QB', 'RB'])
  })

  it('keeps duplicates, since two RB slots start two running backs', () => {
    expect(startingSlots(['RB', 'RB', 'BN'])).toEqual(['RB', 'RB'])
  })
})

describe('bestLineupPoints', () => {
  const p = (position: string, points: number) => ({ position, points })

  it('counts starters only, so hoarding a position earns nothing', () => {
    // THE reason this measures a lineup rather than a pile. In a
    // one-QB league a fourth quarterback is worth zero, which is very
    // close to what he is worth in October. Summing every drafted
    // player would rank this squad above a balanced one.
    const hoarder = [p('QB', 300), p('QB', 290), p('QB', 280), p('QB', 270)]
    const { total } = bestLineupPoints(hoarder, ['QB', 'RB', 'WR'])
    expect(total).toBe(300)
  })

  it('fills the most restrictive slot first, so flex cannot starve TE', () => {
    // Filling in listed order takes the only tight end into FLEX and
    // leaves the TE slot empty — understating a team through no fault
    // of its draft. With one TE on the roster, both slots must fill:
    // TE takes the tight end, FLEX takes the running back.
    const squad = [p('TE', 100), p('RB', 90)]
    const { total, filled } = bestLineupPoints(squad, ['FLEX', 'TE'])
    expect(filled).toBe(2)
    expect(total).toBe(190)
  })

  it('puts the best eligible player in each slot', () => {
    const squad = [p('RB', 50), p('RB', 200), p('WR', 150)]
    const { total } = bestLineupPoints(squad, ['RB', 'FLEX'])
    expect(total).toBe(350) // RB 200 at RB, WR 150 at flex
  })

  it('reports slots it could not fill rather than inventing points', () => {
    const { total, filled } = bestLineupPoints([p('RB', 100)], ['QB', 'RB', 'TE'])
    expect(filled).toBe(1)
    expect(total).toBe(100)
  })

  it('lets a superflex slot take a quarterback', () => {
    const squad = [p('QB', 300), p('RB', 100)]
    const { total } = bestLineupPoints(squad, ['QB', 'SUPER_FLEX'])
    expect(total).toBe(400)
  })
})

describe('rankRosterStrength', () => {
  const roster = (teamId: string, positions: string[]): RosterPlayer[] =>
    positions.map((position, i) => ({
      playerId: `${teamId}-${i}`,
      position,
      teamId,
    }))

  const slots = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'BN', 'BN']

  it('ranks by the lineup a team can field', () => {
    const players = [
      ...roster('strong', ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'RB']),
      ...roster('weak', ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'RB']),
    ]
    const points = (id: string) => (id.startsWith('strong') ? 200 : 100)
    const out = rankRosterStrength(players, points, slots)
    expect(out.map((t) => t.teamId)).toEqual(['strong', 'weak'])
    expect(out[0].rank).toBe(1)
  })

  it('centres the per-week figure on the league', () => {
    // All-positive figures would read as everyone having drafted well,
    // which is not a thing a ranking can mean.
    const players = [
      ...roster('a', ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'RB']),
      ...roster('b', ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'RB']),
      ...roster('c', ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'RB']),
    ]
    const tier: Record<string, number> = { a: 300, b: 200, c: 100 }
    const out = rankRosterStrength(players, (id) => tier[id.split('-')[0]], slots)
    expect(Math.max(...out.map((t) => t.vsLeaguePerWeek))).toBeGreaterThan(0)
    expect(Math.min(...out.map((t) => t.vsLeaguePerWeek))).toBeLessThan(0)
    // Deviations from a mean sum to zero, but these are rounded to a
    // tenth for display, so the sum lands within half a tenth per team
    // rather than exactly on it.
    const sum = out.reduce((t, r) => t + r.vsLeaguePerWeek, 0)
    expect(Math.abs(sum)).toBeLessThanOrEqual(0.05 * out.length)
  })

  it('treats an unprojected player as worth nothing, not as a gap', () => {
    // A deep flier with no projection is exactly the player who would
    // not start. Skipping him instead would let a thin roster field a
    // shorter, higher-scoring lineup.
    const players = roster('t', ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'RB'])
    const out = rankRosterStrength(
      players,
      (id) => (id === 't-0' ? 300 : undefined),
      slots,
    )
    expect(out[0].projectedPoints).toBe(300)
  })

  it('divides by the real season length, and never by zero', () => {
    const players = roster('t', ['QB'])
    expect(rankRosterStrength(players, () => 340, slots, 17)[0].pointsPerWeek).toBe(20)
    expect(rankRosterStrength(players, () => 340, slots, 0)[0].pointsPerWeek).toBe(20)
  })

  it('returns nothing without a lineup to fill', () => {
    expect(rankRosterStrength(roster('t', ['QB']), () => 100, ['BN', 'BN'])).toEqual([])
    expect(rankRosterStrength([], () => 100, slots)).toEqual([])
  })
})

describe('scoringFor', () => {
  it('reads the series off the reception value', () => {
    expect(scoringFor({ rec: 1 })).toBe('ppr')
    expect(scoringFor({ rec: 0.5 })).toBe('half_ppr')
    expect(scoringFor({ rec: 0 })).toBe('std')
  })

  it('treats a missing reception setting as standard, not PPR', () => {
    expect(scoringFor({})).toBe('std')
    expect(scoringFor(null)).toBe('std')
  })

  it('lets superflex override reception scoring', () => {
    expect(scoringFor({ rec: 1 }, ['QB', 'RB', 'SUPER_FLEX'])).toBe('2qb')
    expect(scoringFor({ rec: 1 }, ['QB', 'QB', 'RB'])).toBe('2qb')
    expect(scoringFor({ rec: 1 }, ['QB', 'RB', 'FLEX'])).toBe('ppr')
  })
})

describe('buildDraftBaseline', () => {
  const row = (player_id: string, stats: Record<string, number>) => ({ player_id, stats })

  it('reads ADP and projected points for the league format', () => {
    const b = buildDraftBaseline(
      [row('4046', { adp_half_ppr: 12.3, pts_half_ppr: 280.5, adp_ppr: 9.9 })],
      'half_ppr',
    )
    expect(b?.adpOf('4046')).toBe(12.3)
    expect(b?.pointsOf('4046')).toBe(280.5)
    expect(b?.basis).toBe('Sleeper half-PPR ADP')
  })

  it('excludes the 999 sentinel rather than reading it as a late pick', () => {
    // Sleeper marks unranked players with 999. Taken literally, every
    // undrafted flier becomes the steal of the century.
    const b = buildDraftBaseline(
      [row('a', { adp_half_ppr: 999, pts_half_ppr: 10 }), row('b', { adp_half_ppr: 50 })],
      'half_ppr',
    )
    expect(b?.adpOf('a')).toBeUndefined()
    expect(b?.adpOf('b')).toBe(50)
  })

  it('reads the series the format asks for, not whichever is present', () => {
    const b = buildDraftBaseline(
      [row('a', { adp_std: 10, adp_ppr: 20, adp_half_ppr: 30 })],
      'ppr',
    )
    expect(b?.adpOf('a')).toBe(20)
  })

  it('falls back to half-PPR points for superflex, which has no series', () => {
    // Superflex changes who starts, not what a catch is worth, so
    // there is no pts_2qb and there should not be.
    const b = buildDraftBaseline([row('a', { pts_half_ppr: 100, adp_2qb: 5 })], '2qb')
    expect(b?.pointsOf('a')).toBe(100)
    expect(b?.adpOf('a')).toBe(5)
  })

  it('returns null when the payload carries nothing usable', () => {
    expect(buildDraftBaseline(null, 'ppr')).toBeNull()
    expect(buildDraftBaseline([], 'ppr')).toBeNull()
    expect(buildDraftBaseline([row('a', {})], 'ppr')).toBeNull()
  })
})

describe('projectionsUrl', () => {
  it('asks for every position a lineup can start', () => {
    // The endpoint returns nothing without explicit positions, and
    // omitting K or DEF would silently drop those picks from the read.
    const url = projectionsUrl(2026)
    for (const pos of ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']) {
      expect(url).toContain(`position[]=${pos}`)
    }
    expect(url).toContain('/projections/nfl/2026')
    expect(url).toContain('season_type=regular')
  })
})
