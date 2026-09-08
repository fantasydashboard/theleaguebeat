import { describe, it, expect } from 'vitest'
import { chooseHandoffs, handoffHref, HANDOFFS, HANDOFF_CAP } from '../handoff'

describe('UFD hand-offs', () => {
  it('never shows more than two, however much is on the page', () => {
    // Banner blindness is learned per PATTERN, not per instance. Three
    // of the same treatment in one scroll teaches the reader to skip
    // all of them, including the one that would have converted.
    const everything = HANDOFFS.map((h) => h.key)
    expect(everything.length).toBeGreaterThan(HANDOFF_CAP)
    expect(chooseHandoffs(everything)).toHaveLength(HANDOFF_CAP)
  })

  it('keeps the ones the reader can act on first', () => {
    // A trade just landed and you are deciding whether to answer it;
    // games are running and lineups lock shortly. The wire already
    // processed — the next move there is a week away.
    const all = chooseHandoffs(['the-wire', 'live-matchups', 'trades'])
    expect(all.map((h) => h.key)).toEqual(['trades', 'live-matchups'])

    // Order of the input must not decide the outcome.
    const reversed = chooseHandoffs(['trades', 'live-matchups', 'the-wire'])
    expect(reversed.map((h) => h.key)).toEqual(['trades', 'live-matchups'])
  })

  it('fills the slots with whatever the week actually has', () => {
    // A Wednesday with no trade should still get two, not one — and a
    // quiet preseason page should get none rather than a filler.
    expect(chooseHandoffs(['the-wire', 'live-matchups']).map((h) => h.key))
      .toEqual(['live-matchups', 'the-wire'])
    expect(chooseHandoffs(['favourite', 'the-field', 'schedule'])).toEqual([])
    expect(chooseHandoffs([])).toEqual([])
  })

  it('never promotes what UFD gives away and the issue already prints', () => {
    // Power rankings, standings and league history are UFD's free
    // tier, and this page carries all three. A hand-off there points a
    // reader at something they are already looking at.
    const keys = HANDOFFS.map((h) => h.key)
    for (const free of ['power-rankings', 'the-field', 'standings', 'honours']) {
      expect(keys).not.toContain(free)
    }
    // And the draft is past tense — nothing to act on.
    expect(keys).not.toContain('draft-grades')
  })

  it('points at the front door, tagged for attribution', () => {
    // Every deep path renders UFD's marketing page to a signed-out
    // visitor, so a "see the trade analyser" link that lands on a
    // pitch would be a bait. The door is the honest destination.
    for (const h of HANDOFFS) {
      const url = new URL(handoffHref(h))
      expect(url.pathname).toBe('/')
      expect(url.searchParams.get('utm_source')).toBe('theleaguebeat')
      expect(url.searchParams.get('utm_campaign')).toBe(h.campaign)
    }
    // Campaigns are distinct, or the analytics cannot tell which
    // placement earned the click.
    const campaigns = HANDOFFS.map((h) => h.campaign)
    expect(new Set(campaigns).size).toBe(campaigns.length)
  })

  it('does not claim the reader is already signed in', () => {
    // Separate origin means a separate session: they will meet a sign-in
    // wall. The account and the connected leagues ARE shared, which is
    // the true and still-useful version.
    for (const h of HANDOFFS) {
      expect(h.body.toLowerCase()).not.toContain('already signed in')
    }
  })
})
