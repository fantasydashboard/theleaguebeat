import { describe, it, expect } from 'vitest'
import { bridgePicks, buildPlayerIdBridge } from '../playerIdBridge'

/** A slice of the shape Sleeper's player blob really has: its own id a
 *  string, the cross-references numbers. */
const blob = {
  '4046': { player_id: '4046', espn_id: 3139477, yahoo_id: 30123 },
  '6794': { player_id: '6794', espn_id: 4241389, yahoo_id: 32671 },
  '1234': { player_id: '1234', espn_id: null, yahoo_id: undefined },
  '9999': { player_id: '9999' },
  SEA: { player_id: 'SEA', espn_id: -16026, yahoo_id: 100026 },
}

describe('buildPlayerIdBridge', () => {
  it('maps a foreign id to the Sleeper id', () => {
    expect(buildPlayerIdBridge(blob, 'espn').toSleeperId('3139477')).toBe('4046')
    expect(buildPlayerIdBridge(blob, 'yahoo').toSleeperId('30123')).toBe('4046')
  })

  it('coerces ids to strings on both sides', () => {
    // THE failure this guards. Sleeper stores its own id as a string
    // and the cross-references as numbers, so comparing a platform's
    // string id against a raw number misses every player — silently,
    // producing exactly the empty deck the bridge exists to prevent.
    const bridge = buildPlayerIdBridge(blob, 'espn')
    expect(bridge.toSleeperId(3139477 as unknown as string)).toBe('4046')
  })

  it('bridges defenses, which are ids like any other here', () => {
    // No name matching means no special case: a defense is a row with
    // an id, and negative ESPN ids are still ids.
    expect(buildPlayerIdBridge(blob, 'espn').toSleeperId('-16026')).toBe('SEA')
  })

  it('skips players with no cross-reference rather than mapping them to null', () => {
    const bridge = buildPlayerIdBridge(blob, 'espn')
    expect(bridge.toSleeperId('null')).toBeUndefined()
    expect(bridge.toSleeperId('')).toBeUndefined()
    expect(bridge.size).toBe(3) // 4046, 6794, SEA — not the two without
  })

  it('returns an empty bridge rather than throwing on a bad payload', () => {
    for (const bad of [null, undefined, 'nope', 42]) {
      expect(buildPlayerIdBridge(bad, 'espn').size).toBe(0)
    }
  })
})

describe('bridgePicks', () => {
  const bridge = buildPlayerIdBridge(blob, 'espn')

  it('rewrites what it can and counts it', () => {
    const { picks, bridged } = bridgePicks(
      [{ playerId: '3139477' }, { playerId: '4241389' }],
      bridge,
    )
    expect(bridged).toBe(2)
    expect(picks.map((p) => p.playerId)).toEqual(['4046', '6794'])
  })

  it('keeps an unmapped pick rather than dropping it', () => {
    // Dropping would silently shorten the draft — a 140-pick board
    // rendering as 132 with no explanation. Keeping the original id
    // lets it fall out of the graded slides the same way an unranked
    // Sleeper player already does.
    const { picks, bridged } = bridgePicks(
      [{ playerId: '3139477' }, { playerId: 'unknown' }],
      bridge,
    )
    expect(bridged).toBe(1)
    expect(picks).toHaveLength(2)
    expect(picks[1].playerId).toBe('unknown')
  })

  it('preserves every other field on a pick', () => {
    const { picks } = bridgePicks(
      [{ playerId: '3139477', playerName: 'Patrick Mahomes', round: 14 }],
      bridge,
    )
    expect(picks[0]).toMatchObject({
      playerId: '4046',
      playerName: 'Patrick Mahomes',
      round: 14,
    })
  })

  it('does not mutate the input', () => {
    const original = [{ playerId: '3139477' }]
    bridgePicks(original, bridge)
    expect(original[0].playerId).toBe('3139477')
  })
})
