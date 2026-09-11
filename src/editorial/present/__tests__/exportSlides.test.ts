import { describe, it, expect, vi, beforeEach } from 'vitest'

// `proxied` rewrites against the page origin; these tests run in node.
;(globalThis as Record<string, unknown>).location = {
  href: 'https://www.theleaguebeat.com/leagues/x/issue',
  origin: 'https://www.theleaguebeat.com',
}
// `waitForImages` awaits webfonts before capturing.
;(globalThis as Record<string, unknown>).document = { fonts: { ready: Promise.resolve() } }

type Opts = Record<string, unknown>
const toBlob = vi.fn(async (_el: HTMLElement, _opts?: Opts) =>
  new Blob(['x'], { type: 'image/png' }),
)
vi.mock('html-to-image', () => ({
  toBlob: (el: HTMLElement, opts?: Opts) => toBlob(el, opts),
}))

import { elementToPng, proxied } from '../exportSlides'

/** Enough of an element for `waitForImages` and the capture call. */
function stubEl(): HTMLElement {
  return { querySelectorAll: () => [] } as unknown as HTMLElement
}

describe('every crest survives the capture', () => {
  beforeEach(() => toBlob.mockClear())

  it('keeps the query string in html-to-image’s resource cache key', async () => {
    // THE BUG THIS EXISTS FOR. Proxied images all share ONE path —
    // `/api/proxy-image` — and differ only in `?url=`. html-to-image's
    // resource cache strips the query by default:
    //
    //   var key = url.replace(/\?.*/, '')
    //   if (includeQueryParams) { key = url }
    //
    // so every crest on a card collapsed onto a single cache entry and
    // rendered whichever image was fetched first. The record-book card
    // shipped with three teams wearing a fourth team's crest, and an
    // exported deck would have put one player's face on every slide.
    //
    // `cacheBust: true` does NOT cover this: the cache is consulted
    // before cache-busting rewrites the URL, so the stale entry wins.
    await elementToPng(stubEl(), 1080, 1350, 2)
    expect(toBlob.mock.calls[0][1]).toMatchObject({ includeQueryParams: true })
  })

  it('proxies distinct crests to URLs that differ only in the query', () => {
    // This is why the cache key matters. If these ever stopped sharing
    // a path the bug above would be harmless — they do not.
    const a = proxied('https://sleepercdn.com/uploads/6e9ca910d0e40bb7291771500518fa5d.jpg')!
    const b = proxied('https://sleepercdn.com/uploads/74362e4e771221184372e466490a6022.jpg')!
    expect(a).not.toBe(b)
    expect(a.split('?')[0]).toBe(b.split('?')[0])
  })
})
