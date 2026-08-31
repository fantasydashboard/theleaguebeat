import { describe, it, expect } from 'vitest'
import {
  footballFinalHeadlines, footballFinalBodies,
  footballHighScore, footballLowScore,
  type FinalArgs,
} from '@/editorial/football/points'
import { assertVoiceClean, wordCount } from '@/editorial/football/voice'

const base: FinalArgs = {
  winner: 'Gridiron Man', loser: 'Scuttlebucs',
  winnerPts: 128.4, loserPts: 96.2,
  leagueAvg: 109.4,
  week: 8,
}

const blowout: FinalArgs = { ...base, winnerPts: 160.0, loserPts: 96.2 }
const close: FinalArgs = { ...base, winnerPts: 110.1, loserPts: 108.9 }

/* 131.7 is 20% above this league's average. The margin clears the
 * blowout threshold, so margin-gated framing would call a good week a
 * bad one. */
const loserWentOff: FinalArgs = { ...base, winnerPts: 170.0, loserPts: 131.7 }

const real = (xs: Array<string | null>) => xs.filter((s): s is string => !!s)

/* One regex, used by both the positive and the negative blowout test.
 * The brief's draft used a wider regex for the positive case than for
 * the negative one, which let an UNCONDITIONAL "ran past" variant satisfy
 * both with no margin gating implemented at all. */
const BLOWOUT_WORDS = /never a game|ran past|buried|no contest/

describe('football finals copy', () => {
  it('offers several headline variants so weeks do not read identically', () => {
    const hs = real(footballFinalHeadlines(base))
    expect(hs.length).toBeGreaterThanOrEqual(4)
    // Four copies of one string is not four variants.
    expect(new Set(hs).size).toBe(hs.length)
  })

  /* The draft checked the winner's score only, on one shape. A build that
   * never printed the loser's score passed it. */
  it('every headline names both teams and both scores', () => {
    for (const shape of [base, blowout, close, loserWentOff]) {
      for (const h of real(footballFinalHeadlines(shape))) {
        expect(h).toContain(shape.winner)
        expect(h).toContain(shape.loser)
        expect(h).toContain(shape.winnerPts.toFixed(1))
        expect(h).toContain(shape.loserPts.toFixed(1))
      }
    }
  })

  it('offers blowout-specific framing on a wide margin', () => {
    const all = real(footballFinalHeadlines(blowout)).join(' ').toLowerCase()
    expect(all).toMatch(BLOWOUT_WORDS)
  })

  it('does not offer blowout framing on a narrow margin', () => {
    const all = real(footballFinalHeadlines(close)).join(' ').toLowerCase()
    expect(all).not.toMatch(BLOWOUT_WORDS)
  })

  /* The gate is a share of the league average, not the two fixture shapes.
   * 32.2 on a 109.4 average is a comfortable win, not a burial. */
  it('does not offer blowout framing on an ordinary win either', () => {
    const all = real(footballFinalHeadlines(base)).join(' ').toLowerCase()
    expect(all).not.toMatch(BLOWOUT_WORDS)
  })

  /* The single most football-specific sentence available, and honest:
   * the engine sources from the closed week, so Monday night has happened. */
  it('reaches for Monday night on a photo finish', () => {
    const all = real(footballFinalBodies(close)).join(' ').toLowerCase()
    expect(all).toContain('monday night')
  })

  it('never mentions Monday night on a blowout', () => {
    const all = real(footballFinalBodies(blowout)).join(' ').toLowerCase()
    expect(all).not.toContain('monday night')
  })

  it('never mentions Monday night on an ordinary win', () => {
    const all = real(footballFinalBodies(base)).join(' ').toLowerCase()
    expect(all).not.toContain('monday night')
  })

  /* The draft asserted /4|four/ against bodies that already contained
   * "128.4". It passed with the streak variant deleted entirely. This
   * version names the streak phrasing and proves it is absent without one. */
  it('leads with the streak when the winner is running hot', () => {
    const hot = { ...base, winnerStreak: { type: 'W' as const, length: 4 } }
    const all = real(footballFinalBodies(hot)).join(' ')
    expect(all).toMatch(/\b4 (straight|in a row)\b/)
    expect(real(footballFinalBodies(base)).join(' ')).not.toMatch(/\b4 (straight|in a row)\b/)
  })

  it('stays quiet about a one-win or two-win streak', () => {
    const warm = { ...base, winnerStreak: { type: 'W' as const, length: 2 } }
    expect(real(footballFinalBodies(warm)).join(' ')).not.toMatch(/\b2 (straight|in a row)\b/)
  })

  /* A losing week above the league average is a good week that ran into
   * a monster. The margin says blowout; the loser's score says otherwise,
   * and the loser's score is the one that decides whether copy is allowed
   * to write them down. */
  it('never writes down a loser who beat the league average', () => {
    const all = [
      ...real(footballFinalHeadlines(loserWentOff)),
      ...real(footballFinalBodies(loserWentOff)),
    ].join(' ').toLowerCase()
    expect(all).not.toContain('who managed')
    expect(all).not.toContain('never in it')
    expect(all).not.toContain('never got close')
    expect(all).not.toContain('never a game')
    expect(all).not.toContain('no contest')
    expect(all).not.toMatch(/only 14 weeks/)
  })

  it('says out loud that the above-average loser went off', () => {
    const all = [
      ...real(footballFinalHeadlines(loserWentOff)),
      ...real(footballFinalBodies(loserWentOff)),
    ].join(' ')
    expect(all).toMatch(/131\.7 and still lost|cleared the 109\.4 average and lost/)
    // Still available: the margin is real even when the loser played well.
    expect(all.toLowerCase()).toMatch(/ran past|buried/)
  })

  it('keeps the put-down when the loser actually earned it', () => {
    const all = real(footballFinalHeadlines(blowout)).join(' ').toLowerCase()
    expect(all).toContain('who managed')
    expect(all).toContain('never a game')
  })

  it('works the record in when one is supplied', () => {
    const withRecord = { ...base, winnerRecord: '6-2' }
    expect(real(footballFinalBodies(withRecord)).join(' ')).toContain('6-2')
    expect(real(footballFinalBodies(base)).join(' ')).not.toContain('6-2')
  })
})

/* points.ts promises in its header that nothing prints a margin of 0.0
 * as a claim. Without this, a future edit could reintroduce "outscored
 * Scuttlebucs by 0.0" and the corpus tests would stay green: they only
 * check voice rules and length, neither of which a false margin breaks. */
describe('zero-margin games never get a margin claim', () => {
  const zeroMargin: FinalArgs[] = [
    { ...base, winnerPts: 0, loserPts: 0 },
    { ...base, winnerPts: 100.0, loserPts: 100.0 },
  ]

  it('emits nothing containing a 0.0 margin', () => {
    for (const shape of zeroMargin) {
      const emitted = [
        ...real(footballFinalHeadlines(shape)),
        ...real(footballFinalBodies(shape)),
      ]
      for (const s of emitted) {
        expect(s).not.toMatch(/by 0\.0\b/)
        expect(s).not.toMatch(/\b0\.0 (points|short|more|back|clear)/)
        expect(s).not.toMatch(/\bneeded 0\.0\b/)
      }
      // And it still has something to say about the game.
      expect(emitted.length).toBeGreaterThan(3)
    }
  })
})

describe('high and low score copy', () => {
  it('high score names the team and the number', () => {
    const s = footballHighScore('Gridiron Man', 160.2, 8)
    expect(s).toContain('Gridiron Man')
    expect(s).toContain('160.2')
    expect(s).toContain('8')
  })

  /* The draft's name promised bluntness and asserted only substrings. */
  it('low score is blunt without being cruel filler', () => {
    const s = footballLowScore('Team 3', 61.8, 8)
    expect(s).toContain('Team 3')
    expect(s).toContain('61.8')
    expect(s).toContain('8')
    // "there are only 14 of them" is the football-specific weight here.
    expect(s).toContain('14')
    expect(wordCount(s)).toBeLessThan(20)
  })
})

/* The corpus gate. Every string this module can emit, across the shapes
 * that change which variants appear, run through the mechanical rules. */
describe('voice conformance across the whole corpus', () => {
  const shapes: FinalArgs[] = [
    base,
    blowout,
    close,
    loserWentOff,
    { ...base, winnerRecord: '6-2', winnerPts: 128.4 },
    { ...base, winnerStreak: { type: 'W', length: 4 } },
    { ...base, winnerStreak: { type: 'L', length: 3 } },
    { ...base, winnerRecord: '6-2' },
    { ...base, winnerPts: 101.2, loserPts: 99.8 },
    { ...base, winner: 'The Aman-Ra Stars', loser: 'Game of Throws' },
    { ...base, winnerPts: 0, loserPts: 0 },
  ]

  const corpus = [
    ...shapes.flatMap((s) => real(footballFinalHeadlines(s))),
    ...shapes.flatMap((s) => real(footballFinalBodies(s))),
    footballHighScore('Gridiron Man', 160.2, 8),
    footballLowScore('Team 3', 61.8, 8),
  ]

  it('has a corpus worth checking', () => {
    expect(corpus.length).toBeGreaterThan(15)
  })

  it('breaks no mechanical rule from EDITORIAL.md', () => {
    expect(() => assertVoiceClean(corpus)).not.toThrow()
  })

  /* EDITORIAL.md targets 70% under 10 words. Uniform ~12-word sentences
   * are the "reads as templated" failure mode it names first. */
  it('skews short, per the 70/25/5 distribution', () => {
    const short = corpus.filter((s) => wordCount(s) < 10).length
    expect(short / corpus.length).toBeGreaterThan(0.55)
  })

  it('varies sentence length rather than settling on one shape', () => {
    const lengths = new Set(corpus.map(wordCount))
    expect(lengths.size).toBeGreaterThan(4)
  })

  /* The real templated-rhythm risk is not "too few lengths", it is one
   * length dominating the pool. An earlier draft of this library had four
   * of six unconditional headlines at exactly 9 words. Measured over
   * distinct strings, since the emitted corpus repeats variants per shape. */
  it('does not let one sentence length dominate the pool', () => {
    const distinct = [...new Set(corpus)]
    const counts = new Map<number, number>()
    for (const s of distinct) {
      const n = wordCount(s)
      counts.set(n, (counts.get(n) ?? 0) + 1)
    }
    const commonest = Math.max(...counts.values())
    expect(commonest / distinct.length).toBeLessThan(0.4)
  })

  /* EDITORIAL.md allows 5% in the 20-30 band for analytical setup. */
  it('carries at least one line long enough to do analysis', () => {
    expect(corpus.some((s) => wordCount(s) >= 20)).toBe(true)
    expect(corpus.every((s) => wordCount(s) < 30)).toBe(true)
  })
})

/* ---------------------------------------------------------------------
 * Task 3: streaks and season stage.
 *
 * Three of the brief's draft assertions are kept in spirit and rewritten,
 * because as drafted they pass against a broken implementation:
 *
 *   1. `expect(l).toMatch(/4|four/i)` is unanchored, so a hardcoded "14"
 *      anywhere in the line satisfies it — the same defect that let a
 *      streak test pass against copy containing "128.4". Here the streak
 *      length is asserted word-bounded, and proven to be interpolated by
 *      running two lengths and requiring the other number to be absent.
 *   2. `footballStageLine('stretch', 11, 14)` matching /3|three/i is
 *      satisfied by any line printing any 3. Here the same stage is run at
 *      three (week, endWeek) pairs whose games-remaining differ, which no
 *      week-number or constant line can satisfy.
 *   3. `expect(footballStageLine('quarter', 4, 14)).not.toBeUndefined()`
 *      is a tautology: every value except undefined passes it, so a stage
 *      returning a sentence, an empty string or null all pass equally. The
 *      contract being described is "returns null", so that is asserted,
 *      paired with a test that the other stages are NOT null so a
 *      null-everything stub cannot satisfy the pair.
 * ------------------------------------------------------------------- */

import {
  footballStreakLines, footballCellarLine,
  footballStageLine, type FootballStage,
} from '@/editorial/football'

const ALL_STAGES: FootballStage[] = [
  'opening', 'quarter', 'half', 'stretch', 'final-week', 'playoffs', 'championship',
]

describe('football streak copy', () => {
  it('offers variants for a win streak, each carrying the number', () => {
    const lines = real(footballStreakLines('Gridiron Man', 'W', 4))
    expect(lines.length).toBeGreaterThanOrEqual(2)
    for (const l of lines) expect(l).toMatch(/\b(4|four)\b/i)
  })

  /* The number has to be interpolated, not baked into the sentence. A
   * library that says "4 straight" for every streak passes the assertion
   * above; it cannot pass this one. */
  it('prints the streak it was given, not a constant', () => {
    for (const type of ['W', 'L'] as const) {
      const four = real(footballStreakLines('Gridiron Man', type, 4))
      const six = real(footballStreakLines('Gridiron Man', type, 6))
      for (const l of four) {
        expect(l).toMatch(/\b(4|four)\b/i)
        expect(l).not.toMatch(/\b(6|six)\b/i)
      }
      for (const l of six) {
        expect(l).toMatch(/\b(6|six)\b/i)
        expect(l).not.toMatch(/\b(4|four)\b/i)
      }
    }
  })

  it('names the team in every line', () => {
    for (const type of ['W', 'L'] as const) {
      for (const l of real(footballStreakLines('Mighty Mallards', type, 5))) {
        expect(l).toContain('Mighty Mallards')
      }
    }
  })

  /* The draft compared two joined strings for inequality, which one
   * swapped adjective satisfies. Disjointness is the actual requirement. */
  it('frames a losing streak without reusing the winning copy', () => {
    const w = real(footballStreakLines('The Juggernauts', 'W', 3))
    const l = real(footballStreakLines('The Juggernauts', 'L', 3))
    expect(w.length).toBeGreaterThanOrEqual(2)
    expect(l.length).toBeGreaterThanOrEqual(2)
    // Not one shared sentence between the two sides.
    expect(new Set([...w, ...l]).size).toBe(w.length + l.length)
    // And they reach for opposite vocabulary, not one template.
    expect(w.join(' ')).not.toMatch(/\b(losses|skid|dropped)\b/i)
    expect(l.join(' ')).toMatch(/\b(losses|skid|dropped)\b/i)
    expect(w.join(' ')).toMatch(/\b(won|taken|riding)\b/i)
  })

  /* points.ts already ruled that two of anything is a coincidence, and
   * stays silent below three. The two libraries render into the same
   * issue, so they agree on where a streak becomes a story. */
  it('stays quiet about a one-game or two-game streak', () => {
    for (const type of ['W', 'L'] as const) {
      expect(real(footballStreakLines('OverDrive', type, 1))).toHaveLength(0)
      expect(real(footballStreakLines('OverDrive', type, 2))).toHaveLength(0)
      expect(real(footballStreakLines('OverDrive', type, 3)).length).toBeGreaterThan(0)
    }
  })

  it('cellar copy names the team and its record', () => {
    const s = footballCellarLine('Team 3', '2-12')
    expect(s).toContain('Team 3')
    expect(s).toContain('2-12')
    // Both fields interpolated, not one hardcoded around the other.
    const other = footballCellarLine('Pigskin Prophtz', '1-6')
    expect(other).toContain('Pigskin Prophtz')
    expect(other).toContain('1-6')
    expect(other).not.toContain('Team 3')
  })

  /* footballCellarLine is handed a name and a record. It cannot know WHY
   * they are last, so it must not say. */
  it('does not assert a cause its arguments cannot support', () => {
    const s = footballCellarLine('Team 10', '2-12').toLowerCase()
    for (const claim of ['injur', 'draft', 'bench', 'trade', 'gave up', 'quit', 'abandon']) {
      expect(s).not.toContain(claim)
    }
  })
})

describe('football season-stage copy', () => {
  /* 14 games, not 22. "Three left" is a number a football manager feels. */
  it('counts games remaining rather than weeks elapsed', () => {
    // Same stage, three schedules. Only endWeek - week explains all three.
    const cases: Array<[number, number, RegExp, RegExp]> = [
      [11, 14, /\b(3|three)\b/i, /\b(11|eleven)\b/i],
      [11, 15, /\b(4|four)\b/i, /\b(11|eleven)\b/i],
      [12, 18, /\b(6|six)\b/i, /\b(12|twelve)\b/i],
    ]
    for (const [week, endWeek, remaining, elapsed] of cases) {
      const s = footballStageLine('stretch', week, endWeek)
      expect(s).not.toBeNull()
      expect(s!).toMatch(remaining)
      expect(s!).not.toMatch(elapsed)
    }
  })

  it('gives championship week its own line', () => {
    const s = footballStageLine('championship', 17, 14)
    expect(s).not.toBeNull()
    expect(s!.toLowerCase()).toMatch(/title|championship|ring|trophy/)
  })

  /* Weeks 15-17 are past the end of a 14-week regular season, so every
   * remaining-count is negative there. "-3 games left" must never render. */
  it('never prints a negative or zero games-remaining count', () => {
    for (const stage of ALL_STAGES) {
      for (const [week, endWeek] of [[14, 14], [15, 14], [17, 14], [20, 14]]) {
        const s = footballStageLine(stage, week, endWeek)
        if (s === null) continue
        expect(s).not.toMatch(/-\d/)
        expect(s).not.toMatch(/\b0 (games|weeks)\b/)
      }
    }
  })

  /* Falling through to the neutral copy is correct, not a gap. */
  it('returns null for a stage with no football-specific framing', () => {
    expect(footballStageLine('quarter', 4, 14)).toBeNull()
  })

  it('still writes a line for most stages, so null is a choice not a stub', () => {
    const written = ALL_STAGES
      .map((st) => footballStageLine(st, 11, 14))
      .filter((s): s is string => !!s)
    expect(written.length).toBeGreaterThanOrEqual(5)
    // Every stage that speaks says something different.
    expect(new Set(written).size).toBe(written.length)
  })

  it('returns null rather than undefined or an empty string', () => {
    for (const stage of ALL_STAGES) {
      const s = footballStageLine(stage, 11, 14)
      expect(s === null || (typeof s === 'string' && s.length > 0)).toBe(true)
    }
  })
})

describe('extended corpus conformance', () => {
  const extended = [
    ...real(footballStreakLines('Gridiron Man', 'W', 4)),
    ...real(footballStreakLines('Scuttlebucs', 'L', 5)),
    ...real(footballStreakLines('The Aman-Ra Stars', 'W', 7)),
    ...real(footballStreakLines('Team 10', 'L', 3)),
    footballCellarLine('Team 3', '2-12'),
    footballCellarLine('Game of Throws', '4-10'),
    ...ALL_STAGES
      .map((st) => footballStageLine(st, 11, 14))
      .filter((s): s is string => !!s),
    ...ALL_STAGES
      .map((st) => footballStageLine(st, 3, 14))
      .filter((s): s is string => !!s),
  ]

  it('has a corpus worth checking', () => {
    expect(extended.length).toBeGreaterThan(15)
  })

  it('breaks no mechanical rule', () => {
    expect(() => assertVoiceClean(extended)).not.toThrow()
  })

  it('skews short', () => {
    const short = extended.filter((s) => wordCount(s) < 10).length
    expect(short / extended.length).toBeGreaterThan(0.5)
  })

  /* The failure mode EDITORIAL.md names first is "reads fine but feels
   * templated", and it shows up as one sentence length owning the pool. */
  it('does not let one sentence length dominate', () => {
    const distinct = [...new Set(extended)]
    const counts = new Map<number, number>()
    for (const s of distinct) counts.set(wordCount(s), (counts.get(wordCount(s)) ?? 0) + 1)
    expect(Math.max(...counts.values()) / distinct.length).toBeLessThan(0.4)
  })
})

/* ---------------------------------------------------------------------
 * Fix round 1: "The Aman-Ra Stars is 9-5" reads wrong — a plural team
 * name wants "are", and half this league's names are plural ("The
 * Aman-Ra Stars", "Mighty Mallards", "The Juggernauts", "Scuttlebucs")
 * while the other half read singular ("Gridiron Man", "OverDrive").
 * Team names are arbitrary user strings this engine cannot classify as
 * grammatically singular or plural, so no variant may hinge a
 * present-tense verb's form on which kind of name it lands next to.
 *
 * A fully general check ("no team name is ever followed by 'is'/'has'")
 * is not expressible as a blunt regex here, because the corpus generator
 * does not know which substrings of an emitted sentence are team names
 * versus ordinary words — "That is 5 of 14 weeks" legitimately contains
 * "is" with no team name anywhere near it, and a naive scan for the word
 * "is" alone would flag it. Anchoring the check to the ACTUAL team name
 * strings passed into each function, as done below, is the practical
 * middle ground: it exercises every present-tense-risk verb this bug
 * class ever produced (is / has / owns / sits) against both a plural-
 * reading and a singular-reading name, across every conditional branch
 * (record, streak, blowout, photo finish, cellar) rather than only the
 * one line that was reported.
 */
describe('grammar never depends on team name plurality', () => {
  const RISKY_VERBS = ['is', 'has', 'owns', 'sits']
  const names = ['The Aman-Ra Stars', 'Gridiron Man']

  /** True if `name` is immediately followed by a present-tense verb that
   *  would need a different form for a plural vs. singular name. */
  const hasAgreementRisk = (s: string, name: string) => {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`\\b${escaped} (${RISKY_VERBS.join('|')})\\b`).test(s)
  }

  it('finals copy never puts a risky verb right after the winner or loser name', () => {
    for (const winner of names) {
      for (const loser of names) {
        if (winner === loser) continue
        const shapes: FinalArgs[] = [
          { winner, loser, winnerPts: 128.4, loserPts: 96.2, leagueAvg: 109.4, week: 8 },
          { winner, loser, winnerPts: 128.4, loserPts: 96.2, leagueAvg: 109.4, week: 8, winnerRecord: '9-5' },
          { winner, loser, winnerPts: 160.0, loserPts: 96.2, leagueAvg: 109.4, week: 8 },
          { winner, loser, winnerPts: 110.1, loserPts: 108.9, leagueAvg: 109.4, week: 8 },
          { winner, loser, winnerPts: 170.0, loserPts: 131.7, leagueAvg: 109.4, week: 8 },
          { winner, loser, winnerPts: 128.4, loserPts: 96.2, leagueAvg: 109.4, week: 8, winnerStreak: { type: 'W', length: 4 } },
        ]
        for (const shape of shapes) {
          const corpus = [...real(footballFinalHeadlines(shape)), ...real(footballFinalBodies(shape))]
          for (const s of corpus) {
            expect(hasAgreementRisk(s, winner)).toBe(false)
            expect(hasAgreementRisk(s, loser)).toBe(false)
          }
        }
      }
    }
  })

  it('streak copy never puts a risky verb right after the team name', () => {
    for (const team of names) {
      for (const type of ['W', 'L'] as const) {
        for (const length of [3, 4, 5, 7, 10]) {
          for (const s of real(footballStreakLines(team, type, length))) {
            expect(hasAgreementRisk(s, team)).toBe(false)
          }
        }
      }
    }
  })

  it('cellar copy never puts a risky verb right after the team name', () => {
    for (const team of names) {
      expect(hasAgreementRisk(footballCellarLine(team, '2-12'), team)).toBe(false)
    }
  })
})
