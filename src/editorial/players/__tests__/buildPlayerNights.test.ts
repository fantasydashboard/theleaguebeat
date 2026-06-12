import { describe, it, expect } from 'vitest'
import { keepNight } from '@/editorial/players/buildPlayerNights'

describe('keepNight', () => {
  it('always keeps owned players, however quiet or rough the line', () => {
    // A 0-for-4 or a 5-ER start is "not notable" league-wide, but the owner
    // still wants it (Your Players duds). Owned wins regardless.
    expect(keepNight(true, true, false)).toBe(true)
    expect(keepNight(true, false, false)).toBe(true)
  })
  it('keeps unowned only when notable AND includeUnowned', () => {
    expect(keepNight(false, true, true)).toBe(true) // league-wide gossip
    expect(keepNight(false, true, false)).toBe(false) // quiet unowned, dropped
    expect(keepNight(false, false, true)).toBe(false) // notable but owners-only mode
  })
})
