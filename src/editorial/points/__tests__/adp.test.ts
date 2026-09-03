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

  it('scales ADP to the league size rather than using it raw', () => {
    // The scaling is the finding, not a detail: regressing real pick
    // number on ADP for a 10-team league against 12-team ADP gives a
    // slope of 0.838 against a team ratio of 0.833.
    const twelve = buildAdpLookup(data, 12)
    const ten = buildAdpLookup(data, 10)
    expect(twelve.expectedPickOf('Bijan Robinson', 'RB', 'ATL')).toBe(24)
    expect(ten.expectedPickOf('Bijan Robinson', 'RB', 'ATL')).toBe(20)
  })

  it('matches a player whose name is spelled differently upstream', () => {
    const l = buildAdpLookup(data, 12)
    expect(l.expectedPickOf('JaMarr Chase', 'WR', 'CIN')).toBe(12)
  })

  it('matches defenses on NFL team, since the names never agree', () => {
    const l = buildAdpLookup(data, 12)
    expect(l.expectedPickOf('Seahawks', 'DEF', 'SEA')).toBe(120)
  })

  it('returns undefined for players outside the sample', () => {
    // Excluded, never treated as "undrafted" — otherwise every late
    // flier is reported as a reach.
    const l = buildAdpLookup(data, 12)
    expect(l.expectedPickOf('Some Rookie', 'RB', 'CHI')).toBeUndefined()
  })

  it('does not divide by zero on a malformed team count', () => {
    const l = buildAdpLookup({ ...data, teams: 0 }, 0)
    expect(l.expectedPickOf('Bijan Robinson', 'RB', 'ATL')).toBe(24)
  })

  it('names the basis with the draft count, so the reader can judge it', () => {
    expect(buildAdpLookup(data, 12).basis).toBe('Half-PPR ADP over 718 drafts')
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

  /** Expected pick keyed by player name, for a 10-team league. */
  const expectedFrom =
    (m: Record<string, number>) =>
    (name: string): number | undefined =>
      m[name]

  it('splits fallers from reachers by direction', () => {
    const picks = [pick(5, 'Early Guy'), pick(40, 'Late Guy')]
    const div = findAdpDivergences(
      picks,
      expectedFrom({ 'Early Guy': 25, 'Late Guy': 15 }),
      10,
    )
    expect(div.reached.map((d) => d.pick.playerName)).toEqual(['Early Guy'])
    expect(div.fell.map((d) => d.pick.playerName)).toEqual(['Late Guy'])
  })

  it('ignores gaps under a round as ordinary draft noise', () => {
    const div = findAdpDivergences(
      [pick(10, 'Close Enough')],
      expectedFrom({ 'Close Enough': 15 }),
      10,
    )
    expect(div.fell).toHaveLength(0)
    expect(div.reached).toHaveLength(0)
  })

  it('excludes players the sample does not cover', () => {
    // The whole list would otherwise be late-round fliers "reaching"
    // against a baseline that simply has no opinion on them.
    const div = findAdpDivergences([pick(140, 'Deep Flier')], () => undefined, 10)
    expect(div.fell).toHaveLength(0)
    expect(div.reached).toHaveLength(0)
  })

  it('ranks by significance, not raw round count', () => {
    // Two rounds late on a round-two player matters more than two
    // rounds late on a round-ten one, even though both read "2 rds".
    const div = findAdpDivergences(
      [pick(40, 'Early Round Faller'), pick(120, 'Late Round Faller')],
      expectedFrom({ 'Early Round Faller': 20, 'Late Round Faller': 100 }),
      10,
    )
    expect(div.fell.map((d) => d.pick.playerName)).toEqual([
      'Early Round Faller',
      'Late Round Faller',
    ])
    // Both are genuinely 2 rounds — the ordering is doing the work.
    expect(div.fell.map((d) => d.roundsDelta)).toEqual([2, 2])
  })

  it('reports position order over the covered picks, for the copy', () => {
    const picks = [pick(5, 'First RB'), pick(15, 'Second RB'), pick(60, 'Third RB')]
    const div = findAdpDivergences(
      picks,
      expectedFrom({ 'First RB': 4, 'Second RB': 14, 'Third RB': 20 }),
      10,
    )
    const third = div.fell.find((d) => d.pick.playerName === 'Third RB')
    expect(third?.actualAtPosition).toBe(3)
  })

  it('yields nothing when the team count is unusable', () => {
    // Round figures are meaningless without it, and a zero divisor
    // would otherwise produce Infinity deltas on every pick.
    const div = findAdpDivergences([pick(5, 'A')], expectedFrom({ A: 25 }), 0)
    expect(div.fell).toHaveLength(0)
    expect(div.reached).toHaveLength(0)
  })
})
