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
    for (const shape of [base, blowout, close]) {
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

  it('works the record in when one is supplied', () => {
    const withRecord = { ...base, winnerRecord: '6-2' }
    expect(real(footballFinalBodies(withRecord)).join(' ')).toContain('6-2')
    expect(real(footballFinalBodies(base)).join(' ')).not.toContain('6-2')
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

  /* Measured over DISTINCT strings. The same six unconditional headlines
   * repeated across nine shapes would otherwise carry this on their own. */
  it('varies sentence length rather than settling on one shape', () => {
    const lengths = new Set([...new Set(corpus)].map(wordCount))
    expect(lengths.size).toBeGreaterThan(4)
  })
})
