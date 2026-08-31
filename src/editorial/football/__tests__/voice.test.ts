import { describe, it, expect } from 'vitest'
import { voiceViolations, assertVoiceClean, wordCount } from '@/editorial/football/voice'

describe('voiceViolations', () => {
  it('passes canonical football sentences from EDITORIAL.md', () => {
    expect(voiceViolations('Nabers vanished. Three catches on seven targets.')).toEqual([])
    expect(voiceViolations('Reign Delay needed a real game. They got eighty-four.')).toEqual([])
  })

  it('catches em dashes', () => {
    expect(voiceViolations('The dynasty falls — again.')).toContain('em-dash')
  })

  it('catches double-hyphen em dash substitutes', () => {
    expect(voiceViolations('The dynasty falls -- again.')).toContain('double-hyphen')
  })

  it('catches exclamation points', () => {
    expect(voiceViolations('The dynasty falls!')).toContain('exclamation')
  })

  it('catches question-mark headlines', () => {
    expect(voiceViolations('Is Bullpen Theology unstoppable?')).toContain('question-mark')
  })

  it('catches second-person address', () => {
    expect(voiceViolations('Your team fell to .500.')).toContain('second-person')
    expect(voiceViolations('You lost by 40.')).toContain('second-person')
  })

  /* "Yourself" and "young" both contain "you" as a substring. A naive
   * check flags them; the rule is about addressing the reader. */
  it('does not flag words that merely contain "you"', () => {
    expect(voiceViolations('Younger rosters surged.')).toEqual([])
  })

  it('catches banned intensifiers', () => {
    expect(voiceViolations('An absolutely incredible week.')).toContain('intensifier:absolutely')
    expect(voiceViolations('An absolutely incredible week.')).toContain('intensifier:incredible')
  })

  /* "Very" is a banned intensifier, and it hides as a substring inside
   * ordinary words: "every" and "delivery" both contain it letter-for-
   * letter. A naive `s.includes('very')` check would flag this sentence;
   * the rule only fires on "very" as its own word. */
  it('does not flag an intensifier hiding inside a larger word', () => {
    expect(voiceViolations('Every drive stalled at midfield.')).toEqual([])
  })

  it('catches emoji', () => {
    expect(voiceViolations('The dynasty falls 🔥')).toContain('emoji')
  })

  it('catches baseball nouns — the inverse of the leak that started this', () => {
    expect(voiceViolations('Decided in the final at-bats.')).toContain('wrong-sport:at-bat')
    expect(voiceViolations('The bullpen collapsed.')).toContain('wrong-sport:bullpen')
    expect(voiceViolations('Seven innings of work.')).toContain('wrong-sport:inning')
  })

  /* This checker is a test-time lint over copy WE write, not a runtime
   * filter over data users supply — so it has no obligation to guess
   * whether a capitalized wrong-sport word is a proper noun. It flags
   * the word regardless. The corpus keeps its half of the bargain by
   * never giving a football fixture team a baseball-punning name. */
  it('flags a wrong-sport noun even when capitalized, by design', () => {
    expect(voiceViolations('Bullpen collapsed after the ninth.')).toContain('wrong-sport:bullpen')
  })

  it('catches sentences over 30 words', () => {
    const long = 'The team ' + 'scored points and '.repeat(10) + 'won the game.'
    expect(voiceViolations(long)).toContain('too-long')
  })

  it('reports every violation, not just the first', () => {
    const v = voiceViolations('Your absolutely incredible week!')
    expect(v.length).toBeGreaterThanOrEqual(3)
  })
})

describe('wordCount', () => {
  it('counts words, ignoring punctuation', () => {
    expect(wordCount('The dynasty falls.')).toBe(3)
    expect(wordCount('Three straight wins. 132.4 points per game.')).toBe(7)
  })
})

describe('assertVoiceClean', () => {
  it('does not throw on clean copy', () => {
    expect(() => assertVoiceClean(['The dynasty falls.', 'Ten in a row.'])).not.toThrow()
  })

  it('throws naming the offending string and its violations', () => {
    expect(() => assertVoiceClean(['Fine.', 'Your epic week!']))
      .toThrow(/Your epic week/)
  })
})
