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
    expect(voiceViolations('Is OverDrive unstoppable?')).toContain('question-mark')
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

  it('catches sports-broadcast clichés', () => {
    expect(voiceViolations('They left it all on the field.')).toContain('cliche:left-it-all-on-the-field')
    expect(voiceViolations('The offense did the little things right.')).toContain('cliche:did-the-little-things')
    expect(voiceViolations('Everyone could tell they wanted it more.')).toContain('cliche:wanted-it-more')
    expect(voiceViolations('They showed up when it mattered most.')).toContain('cliche:showed-up-when-it-mattered')
  })

  it('catches corporate hedge phrases', () => {
    expect(voiceViolations('The offense appears to have stalled.')).toContain('hedge:appears-to-have')
    expect(voiceViolations('It looks like a blowout.')).toContain('hedge:looks-like')
    expect(voiceViolations('The trade seems lopsided.')).toContain('hedge:seems')
    expect(voiceViolations('This potentially changes the standings.')).toContain('hedge:potentially')
  })

  it('catches generic descriptors', () => {
    expect(voiceViolations('It was a great game.')).toContain('generic:great-game')
    expect(voiceViolations('A strong performance from the backfield.')).toContain('generic:strong-performance')
    expect(voiceViolations('Just a solid week overall.')).toContain('generic:solid-week')
    expect(voiceViolations('A tough loss to close the year.')).toContain('generic:tough-loss')
  })

  /* "Looks" alone is a normal verb; only "looks like" is the banned
   * hedge. A phrase list that over-matches on a component word would
   * wrongly flag ordinary prose like this. */
  it('does not flag a legitimate near-miss of a hedge phrase', () => {
    expect(voiceViolations('The offense looks sharp this week.')).toEqual([])
  })

  it('catches sentences over 30 words', () => {
    const long = 'The team ' + 'scored points and '.repeat(10) + 'won the game.'
    expect(voiceViolations(long)).toContain('too-long')
  })

  /* EDITORIAL.md: "Anything 30+ words gets cut" — 30 itself is cut. */
  it('flags a sentence at exactly 30 words', () => {
    const thirty = Array(30).fill('Word').join(' ') + '.'
    expect(voiceViolations(thirty)).toContain('too-long')
  })

  it('does not flag a sentence at 29 words', () => {
    const twentyNine = Array(29).fill('Word').join(' ') + '.'
    expect(voiceViolations(twentyNine)).toEqual([])
  })

  /* The cap is per SENTENCE, not per string. Canonical multi-sentence
   * variants (EDITORIAL.md #3, #4, #7, #11, #14, #15) routinely clear
   * 30 words combined without either sentence being too long. */
  it('does not flag a multi-sentence variant whose combined length exceeds the cap', () => {
    const twoShortSentences =
      Array(16).fill('Word').join(' ') + '. ' + Array(16).fill('Word').join(' ') + '.'
    expect(voiceViolations(twoShortSentences)).toEqual([])
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
