import { describe, it, expect } from 'vitest'
import { chooseHandoffs, handoffHref, handoffKeyFor, HANDOFFS, HANDOFF_CAP } from '../handoff'

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
    // A Wednesday with no trade should still get two, not one.
    expect(chooseHandoffs(['the-wire', 'live-matchups']).map((h) => h.key))
      .toEqual(['live-matchups', 'the-wire'])
    expect(chooseHandoffs([])).toEqual([])
  })

  it('carries the preseason page, which has none of the in-season sections', () => {
    // The preseason issue emits favourite, draft-grades, power-rankings,
    // the-field, schedule and since-the-draft — not one of which was a
    // hand-off key, so the entire pre-kickoff window rendered nothing.
    // That is the highest-intent traffic of the year.
    const preseason = ['favourite', 'draft-grades', 'power-rankings', 'the-field', 'schedule']
    expect(chooseHandoffs(preseason).map((h) => h.key)).toEqual(['draft-grades'])

    // Still nothing to say on a page with no draft and no live sections.
    expect(chooseHandoffs(['favourite', 'the-field', 'schedule'])).toEqual([])
  })

  it('drops the preseason pitch the moment the live one is available', () => {
    // Week one in progress, no week completed yet: the page is still the
    // preseason issue AND games are running, so both are on offer. They
    // make the same ask, and two lineup promos in one scroll is the
    // banner blindness the cap exists to prevent.
    const overlap = chooseHandoffs(['draft-grades', 'live-matchups'])
    expect(overlap.map((h) => h.key)).toEqual(['live-matchups'])

    // And a trade still outranks both.
    expect(chooseHandoffs(['draft-grades', 'live-matchups', 'trades']).map((h) => h.key))
      .toEqual(['trades', 'live-matchups'])
  })

  it('never promotes what UFD gives away and the issue already prints', () => {
    // Power rankings, standings and league history are UFD's free
    // tier, and this page carries all three. A hand-off there points a
    // reader at something they are already looking at.
    const keys = HANDOFFS.map((h) => h.key)
    for (const free of ['power-rankings', 'the-field', 'standings', 'honours']) {
      expect(keys).not.toContain(free)
    }
  })

  it('never promotes a paid tool on a section about the past alone', () => {
    // draft-grades is the one hand-off attached to something already
    // finished, so its copy has to point forward. A pitch about how you
    // drafted would be inventory; one about who to start is a decision.
    const draft = HANDOFFS.find((h) => h.key === 'draft-grades')!
    expect(draft.cta.toLowerCase()).toContain('lineup')
    expect(draft.body.toLowerCase()).toMatch(/week one|start/)
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

describe('the preseason carries two, not one', () => {
  // The preseason issue is the longest page of the year and the first
  // thing a lot of readers see. It was rendering a single hand-off
  // because the waiver section is called `since-the-draft` before
  // waivers run and `the-wire` after — same reader, same decision,
  // same tool, two names.
  const PRESEASON = [
    'favourite', 'draft-grades', 'power-rankings',
    'the-field', 'schedule', 'record-book', 'since-the-draft',
  ]

  it('pairs the wire with the lineup', () => {
    const keys = chooseHandoffs(PRESEASON).map((h) => h.key)
    expect(keys).toEqual(['the-wire', 'draft-grades'])
  })

  it('still respects the cap', () => {
    expect(chooseHandoffs(PRESEASON)).toHaveLength(HANDOFF_CAP)
  })

  it('resolves either name to the same hand-off', () => {
    expect(handoffKeyFor('since-the-draft')).toBe('the-wire')
    expect(handoffKeyFor('the-wire')).toBe('the-wire')
    // Anything without an alias is itself.
    expect(handoffKeyFor('trades')).toBe('trades')
  })

  it('says nothing about a week that has not happened', () => {
    // This copy now serves both season stages.
    const wire = HANDOFFS.find((h) => h.key === 'the-wire')!
    expect(wire.body).not.toMatch(/last week/i)
  })

  it('still gives a quiet preseason nothing rather than filler', () => {
    // No draft, no moves — no hand-off. A page with nothing to act on
    // does not get a promo pretending otherwise.
    expect(chooseHandoffs(['favourite', 'the-field', 'schedule'])).toEqual([])
  })
})
