import { describe, it, expect } from 'vitest'
import { espnSportFor } from '../espnSport'

const leagues = [
  { id: 'ball', sport: 'baseball' },
  { id: 'gridiron', sport: 'football' },
  { id: 'no-sport', sport: null },
]

describe('espnSportFor', () => {
  it('reads football off the league row', () => {
    // Without this the request goes to ESPN's baseball segment with a
    // football league id and comes back empty — the league does not
    // load at all, which is how it behaved before this existed.
    expect(espnSportFor('gridiron', leagues)).toBe('football')
  })

  it('defaults to baseball for everything else', () => {
    // Matches what every caller did before, so threading this cannot
    // change behaviour for an existing baseball league.
    expect(espnSportFor('ball', leagues)).toBe('baseball')
    expect(espnSportFor('no-sport', leagues)).toBe('baseball')
    expect(espnSportFor('unknown-id', leagues)).toBe('baseball')
    expect(espnSportFor(undefined, leagues)).toBe('baseball')
    expect(espnSportFor('ball', [])).toBe('baseball')
  })

  it('does not treat another sport as football', () => {
    expect(espnSportFor('x', [{ id: 'x', sport: 'basketball' }])).toBe('baseball')
  })
})
