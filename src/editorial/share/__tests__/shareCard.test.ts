import { describe, it, expect } from 'vitest'
import {
  isShareable,
  shareRows,
  omittedCount,
  rowScale,
  prefersShareSheet,
  shareLabelFor,
  shareFilename,
  MAX_ROWS,
} from '../shareCard'
import type { IssueSection } from '@/editorial/issue/types'

const base = { id: 'x', eyebrow: 'Power rankings', headline: 'H' } as IssueSection

const withRows = (n: number): IssueSection => ({
  ...base,
  rows: Array.from({ length: n }, (_, i) => ({ label: `Team ${i}`, value: `${100 - i}` })),
})

const withCards = (n: number): IssueSection => ({
  ...base,
  cards: Array.from({ length: n }, (_, i) => ({
    teamId: `t${i}`,
    rank: i + 1,
    fieldSize: n,
    teamName: `Team ${i}`,
    statValue: `${100 - i}`,
    statLabel: 'pts',
    notes: [`note ${i}`],
  })),
})

describe('shareable cards', () => {
  it('offers an image for a list, not for a sentence', () => {
    // A statement rendered 1080 wide with a footer is a poster of one
    // sentence. Nobody forwards that, and the button is a lie.
    expect(isShareable(withRows(10))).toBe(true)
    expect(isShareable(withCards(3))).toBe(true)
    expect(isShareable({ ...base, chips: [{ value: '5', label: 'teams' }] })).toBe(false)
    expect(isShareable(base)).toBe(false)
    expect(isShareable(withRows(1))).toBe(false)
  })

  it('flattens cards and rows into the same shape', () => {
    // The card has one layout. A section can be two things, and the
    // two must not drift into two renderers.
    const fromCards = shareRows(withCards(2))
    expect(fromCards[0]).toMatchObject({ lead: '1', label: 'Team 0', value: '100', sub: 'note 0' })

    const fromRows = shareRows(withRows(2))
    expect(fromRows[0]).toMatchObject({ label: 'Team 0', value: '100' })
    expect(Object.keys(fromCards[0]).sort()).toEqual(Object.keys(fromRows[0]).sort())
  })

  it('carries the note, because a ranking without one is just numbers', () => {
    const [first] = shareRows(withCards(1))
    expect(first.sub).toBe('note 0')
  })

  it('truncates instead of shrinking past readable, and says how many', () => {
    const big = withRows(MAX_ROWS + 6)
    expect(shareRows(big)).toHaveLength(MAX_ROWS)
    expect(omittedCount(big)).toBe(6)
    expect(omittedCount(withRows(4))).toBe(0)
  })

  it('fits the rows into the height that is actually left', () => {
    // Fixed buckets overflowed the footer at ten rows, because the
    // headline is editorial copy and wraps differently every week.
    const px = (v: Record<string, string>, k: string) => parseInt(v[k], 10)
    for (const [avail, n] of [[900, 10], [900, 3], [900, 12], [1000, 2]] as const) {
      const s = rowScale(avail, n)
      expect(px(s, '--row-h') * n).toBeLessThanOrEqual(avail)
      expect(px(s, '--mark')).toBeLessThan(px(s, '--row-h'))
    }
  })

  it('holds the biggest league either tier runs', () => {
    // 12 teams in the FFL. A card that truncates a full league is a
    // card nobody in that league wants to send.
    expect(MAX_ROWS).toBeGreaterThanOrEqual(12)
    // Worst realistic header (a three-line headline) still fits twelve.
    const s = rowScale(857, 12)
    expect(parseInt(s['--row-h'], 10) * 12).toBeLessThanOrEqual(857)
  })

  it('never shrinks past readable, and drops the note before the name', () => {
    // At chat preview size an unreadable note is worse than no note.
    const tight = rowScale(760, 12)
    expect(parseInt(tight['--row-h'], 10)).toBeGreaterThanOrEqual(62)
    expect(tight['--sub-display']).toBe('none')
    expect(parseInt(tight['--name'], 10)).toBeGreaterThanOrEqual(24)

    const roomy = rowScale(900, 8)
    expect(roomy['--sub-display']).toBe('-webkit-box')
  })

  it('does not turn three rows into three posters', () => {
    expect(parseInt(rowScale(1100, 2)['--row-h'], 10)).toBeLessThanOrEqual(168)
  })

  it('lets the detail wrap once a row is tall enough to hold it', () => {
    // A four-row record book was leaving ~430px empty while clipping
    // the sentence that carries the all-time rank.
    const tall = rowScale(900, 4)
    expect(tall['--sub-lines']).toBe('2')
    expect(tall['--sub-wrap']).toBe('normal')

    // A crowded board still gets one line, so rows stay uniform.
    const packed = rowScale(900, 12)
    expect(packed['--sub-lines']).toBe('1')
    expect(packed['--sub-wrap']).toBe('nowrap')
  })

  it('calls the full board what it is once it leaves the page', () => {
    // On the page "The field" sits under a Power rankings story and the
    // pair reads as one idea. Alone in a group chat that context is
    // gone, and ten teams ranked by projection labelled "The field" is
    // a card whose own headline never says what it is.
    expect(shareLabelFor({ ...base, id: 'the-field', eyebrow: 'The field' }))
      .toBe('Power rankings')
    // Everything else keeps the name the issue gave it.
    expect(shareLabelFor({ ...base, id: 'the-wire', eyebrow: 'The wire' })).toBe('The wire')
    // And a section with no eyebrow still gets a label.
    expect(shareLabelFor({ ...base, id: 'trades', eyebrow: '' })).toBe('trades')
  })

  it('names the file after the league and the section', () => {
    // These live in a camera roll for a week before anyone posts them.
    expect(shareFilename('League of Record', base)).toBe('league-of-record-power-rankings.png')
    expect(shareFilename("Josh's League!!", { ...base, id: 'the-wire', eyebrow: 'The wire' }))
      .toBe('joshs-league-the-wire.png')
    // The filename uses the card's label, so file and image agree.
    expect(shareFilename('League of Record', { ...base, id: 'the-field', eyebrow: 'The field' }))
      .toBe('league-of-record-power-rankings.png')
    // No eyebrow falls back to the section id rather than nothing.
    expect(shareFilename('League of Record', { ...base, eyebrow: '', id: 'results' }))
      .toBe('league-of-record-results.png')
    // And with nothing usable at all, still a real filename — never a
    // bare or dot-leading one.
    const bare = shareFilename('', { ...base, eyebrow: '', id: '' })
    expect(bare).toBe('the-league-beat.png')
    expect(bare.startsWith('.')).toBe(false)
  })
})

describe('where the image should go', () => {
  const fine = () => ({ matches: false })
  const coarse = () => ({ matches: true })

  it('downloads on a laptop, shares on a phone', () => {
    // macOS advertises the Web Share API, so feature detection alone
    // opened a contact picker for somebody who pressed "image" and
    // wanted a file.
    expect(prefersShareSheet(fine)).toBe(false)
    expect(prefersShareSheet(coarse)).toBe(true)
  })

  it('asks about pointer coarseness, not the user agent', () => {
    // iPadOS reports itself as a Mac; UA sniffing gets it backwards.
    let asked = ''
    prefersShareSheet((q) => { asked = q; return { matches: true } })
    expect(asked).toBe('(pointer: coarse)')
  })

  it('falls back to downloading when it cannot tell', () => {
    // No matchMedia, or a browser that throws on an unknown query.
    expect(prefersShareSheet(undefined as never)).toBe(false)
    expect(prefersShareSheet(() => { throw new Error('nope') })).toBe(false)
  })
})
