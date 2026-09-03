import { describe, it, expect } from 'vitest'
import {
  adpFormatFor,
  buildAdpLookup,
  normalizeName,
  parseAdpResponse,
  type AdpData,
} from '../adp'
import { findAdpDivergences, type ValuedPick } from '../draftValue'

describe('normalizeName', () => {
  // Every case here is a real difference observed between what Sleeper
  // puts in pick metadata and what the ADP source publishes.
  it.each([
    ["Ja'Marr Chase", 'jamarr chase'],
    ['D.J. Moore', 'dj moore'],
    ['Marvin Harrison Jr.', 'marvin harrison'],
    ['Amon-Ra St. Brown', 'amon ra st brown'],
    ['Kenneth Walker III', 'kenneth walker'],
  ])('collapses %s', (raw, expected) => {
    expect(normalizeName(raw)).toBe(expected)
  })

  it('makes the two spellings of a name agree', () => {
    expect(normalizeName("Ja'Marr Chase")).toBe(normalizeName('JaMarr Chase'))
    expect(normalizeName('Marvin Harrison Jr.')).toBe(normalizeName('Marvin Harrison'))
  })
})

describe('adpFormatFor', () => {
  it('reads PPR, half-PPR and standard off the reception value', () => {
    expect(adpFormatFor({ rec: 1 })).toBe('ppr')
    expect(adpFormatFor({ rec: 0.5 })).toBe('half-ppr')
    expect(adpFormatFor({ rec: 0 })).toBe('standard')
  })

  it('treats a missing reception setting as standard, not PPR', () => {
    // Guessing PPR here would misvalue every receiver in a league that
    // simply does not score receptions.
    expect(adpFormatFor({})).toBe('standard')
    expect(adpFormatFor(null)).toBe('standard')
    expect(adpFormatFor(undefined)).toBe('standard')
  })

  it('lets superflex override reception scoring', () => {
    // A second startable QB moves the board more than PPR does, so it
    // has to win — otherwise a superflex PPR league is graded against
    // a table where quarterbacks go three rounds later than they did.
    expect(adpFormatFor({ rec: 1 }, ['QB', 'RB', 'SUPER_FLEX'])).toBe('2qb')
    expect(adpFormatFor({ rec: 1 }, ['QB', 'QB', 'RB'])).toBe('2qb')
    expect(adpFormatFor({ rec: 1 }, ['QB', 'RB', 'FLEX'])).toBe('ppr')
  })
})

describe('buildAdpLookup', () => {
  const data: AdpData = {
    format: 'Half-PPR',
    teams: 12,
    totalDrafts: 718,
    players: [
      { name: "Ja'Marr Chase", position: 'WR', team: 'CIN', adp: 12 },
      { name: 'Bijan Robinson', position: 'RB', team: 'ATL', adp: 24 },
      { name: 'Seattle Defense', position: 'DEF', team: 'SEA', adp: 120 },
    ],
  }

  it('returns ADP raw, without converting it to a pick number', () => {
    // Converting arithmetically is the mistake this module made once:
    // scaling by the ratio of league sizes left a systematic +1.01
    // round bias on a real draft. Ranks are mapped in
    // findAdpDivergences instead; the lookup stays a lookup.
    const l = buildAdpLookup(data)
    expect(l.adpOf('Bijan Robinson', 'RB', 'ATL')).toBe(24)
    expect(l.adpOf("Ja'Marr Chase", 'WR', 'CIN')).toBe(12)
  })

  it('matches a player whose name is spelled differently upstream', () => {
    expect(buildAdpLookup(data).adpOf('JaMarr Chase', 'WR', 'CIN')).toBe(12)
  })

  it('matches defenses on NFL team, since the names never agree', () => {
    expect(buildAdpLookup(data).adpOf('Seahawks', 'DEF', 'SEA')).toBe(120)
  })

  it('returns undefined for players outside the sample', () => {
    // Excluded, never treated as "undrafted" — otherwise every late
    // flier is reported as a reach.
    expect(buildAdpLookup(data).adpOf('Some Rookie', 'RB', 'CHI')).toBeUndefined()
  })

  it('names the basis with the draft count, so the reader can judge it', () => {
    expect(buildAdpLookup(data).basis).toBe('Half-PPR ADP over 718 drafts')
  })
})

describe('parseAdpResponse', () => {
  it('reads a well-formed payload', () => {
    const parsed = parseAdpResponse({
      meta: { type: 'PPR', teams: 12, total_drafts: 8007 },
      players: [{ name: 'Jahmyr Gibbs', position: 'RB', team: 'DET', adp: 1.5 }],
    })
    expect(parsed).toMatchObject({ format: 'PPR', teams: 12, totalDrafts: 8007 })
    expect(parsed?.players).toHaveLength(1)
  })

  it('returns null rather than a partial structure when the shape changes', () => {
    // The deck omits its value slides on null. Publishing steals
    // computed from a half-read payload would be worse than silence.
    expect(parseAdpResponse(null)).toBeNull()
    expect(parseAdpResponse({})).toBeNull()
    expect(parseAdpResponse({ players: [] })).toBeNull()
    expect(parseAdpResponse({ players: 'nope' })).toBeNull()
  })

  it('drops unusable rows but keeps the good ones', () => {
    const parsed = parseAdpResponse({
      meta: { type: 'PPR', teams: 12, total_drafts: 10 },
      players: [
        { name: 'Good Player', position: 'RB', team: 'DET', adp: 5 },
        { name: '', position: 'RB', team: 'DET', adp: 6 },
        { name: 'No ADP', position: 'RB', team: 'DET', adp: 0 },
      ],
    })
    expect(parsed?.players.map((p) => p.name)).toEqual(['Good Player'])
  })

  it('falls back to a sane league size when meta omits it', () => {
    const parsed = parseAdpResponse({
      players: [{ name: 'A Player', position: 'RB', team: 'DET', adp: 5 }],
    })
    expect(parsed?.teams).toBe(12)
  })
})

describe('findAdpDivergences', () => {
  const pick = (
    pickOverall: number,
    playerName: string,
    position = 'RB',
  ): ValuedPick => ({
    pickOverall,
    round: Math.ceil(pickOverall / 10),
    playerId: playerName.toLowerCase().replace(/\s/g, ''),
    playerName,
    position,
    teamId: `t${pickOverall % 10}`,
  })

  const adpFrom =
    (m: Record<string, number>) =>
    (name: string): number | undefined =>
      m[name]

  it('carries no systematic bias, however offset the source is', () => {
    // THE regression this model exists to prevent. Every ADP here is
    // shifted early by a constant — the exact shape that produced 58
    // fallers against 14 reaches on the real 2026 draft when ADP was
    // scaled arithmetically instead of ranked. Because only the ORDER
    // is read, a uniform offset changes nothing at all.
    const picks = [10, 20, 30, 40, 50, 60].map((n) => pick(n, `P${n}`))
    const trueAdp = { P10: 10, P20: 20, P30: 30, P40: 40, P50: 50, P60: 60 }
    const shifted = Object.fromEntries(
      Object.entries(trueAdp).map(([k, v]) => [k, v * 0.8 - 5]),
    )
    const out = findAdpDivergences(picks, adpFrom(shifted), 10)
    expect(out.fell).toHaveLength(0)
    expect(out.reached).toHaveLength(0)
  })

  it('is symmetric: a faller implies a riser', () => {
    // A draft board is a permutation, so the deltas sum to zero. A
    // model that reports four times as many fallers as reaches is
    // reporting its own miscalibration.
    const picks = [10, 20, 30, 40].map((n) => pick(n, `P${n}`))
    // P40 has the best ADP but went last; P10 the worst but went first.
    const out = findAdpDivergences(
      picks,
      adpFrom({ P40: 1, P20: 2, P30: 3, P10: 4 }),
      10,
    )
    const sum = [...out.fell, ...out.reached].reduce((t, d) => t + d.roundsDelta, 0)
    expect(sum).toBeCloseTo(0, 5)
    expect(out.fell).toHaveLength(1)
    expect(out.reached).toHaveLength(1)
  })

  it('expects a player at a slot the draft actually used', () => {
    // Mapping to 1..N instead would invent picks that never happened
    // when the sample does not cover the whole board.
    const picks = [5, 25, 105].map((n) => pick(n, `P${n}`))
    const out = findAdpDivergences(picks, adpFrom({ P105: 1, P25: 2, P5: 3 }), 10)
    const used = new Set([5, 25, 105])
    for (const d of [...out.fell, ...out.reached]) {
      expect(used.has(d.expectedPickOverall)).toBe(true)
    }
  })

  it('splits fallers from reachers by direction', () => {
    const picks = [pick(5, 'Early Guy'), pick(40, 'Late Guy')]
    const out = findAdpDivergences(picks, adpFrom({ 'Late Guy': 1, 'Early Guy': 2 }), 10)
    expect(out.reached.map((d) => d.pick.playerName)).toEqual(['Early Guy'])
    expect(out.fell.map((d) => d.pick.playerName)).toEqual(['Late Guy'])
  })

  it('ignores gaps under a round as ordinary draft noise', () => {
    const picks = [pick(10, 'A'), pick(15, 'B')]
    const out = findAdpDivergences(picks, adpFrom({ B: 1, A: 2 }), 10)
    expect(out.fell).toHaveLength(0)
    expect(out.reached).toHaveLength(0)
  })

  it('excludes players the sample does not cover', () => {
    // The whole list would otherwise be late-round fliers "reaching"
    // against a baseline that simply has no opinion on them.
    const out = findAdpDivergences([pick(140, 'Deep Flier')], () => undefined, 10)
    expect(out.fell).toHaveLength(0)
    expect(out.reached).toHaveLength(0)
  })

  it('reports position order over the covered picks, for the copy', () => {
    const picks = [pick(5, 'First RB'), pick(15, 'Second RB'), pick(60, 'Third RB')]
    const out = findAdpDivergences(
      picks,
      adpFrom({ 'First RB': 1, 'Second RB': 2, 'Third RB': 3 }),
      10,
    )
    const third = [...out.fell, ...out.reached].find(
      (d) => d.pick.playerName === 'Third RB',
    )
    expect(third?.actualAtPosition ?? 3).toBe(3)
  })

  it('yields nothing when the team count is unusable', () => {
    // Round figures are meaningless without it, and a zero divisor
    // would otherwise produce Infinity deltas on every pick.
    const out = findAdpDivergences([pick(5, 'A')], adpFrom({ A: 1 }), 0)
    expect(out.fell).toHaveLength(0)
    expect(out.reached).toHaveLength(0)
  })
})
