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

describe('name fallback', () => {
  // Sleeper's cross-references are stale where it matters: only 29% of
  // the top 250 projected players carry an espn_id, and the gaps are
  // the stars. Bridging on ids alone lost ~7 picks in 10, and which
  // seven varied by team — one roster projected 75.9 points a week and
  // another 17.9 in a league where nobody is below 100.
  const blob = {
    '1': { player_id: '1', espn_id: 4242, first_name: 'Old', last_name: 'Timer', position: 'RB' },
    // No espn_id — exactly the 2023+ draft-class case.
    '2': { player_id: '2', first_name: 'Bijan', last_name: 'Robinson', position: 'RB' },
    '3': { player_id: '3', first_name: 'Marvin', last_name: 'Harrison', position: 'WR' },
    // Two players, one name: must never be guessed.
    '4': { player_id: '4', first_name: 'Ronald', last_name: 'Jones', position: 'RB' },
    '5': { player_id: '5', first_name: 'Ronald', last_name: 'Jones', position: 'RB' },
    // Same name, different position — not ambiguous.
    '6': { player_id: '6', first_name: 'Ronald', last_name: 'Jones', position: 'WR' },
  }
  const bridge = buildPlayerIdBridge(blob, 'espn')

  it('resolves a player the id map has never heard of', () => {
    expect(bridge.byName('Bijan Robinson', 'RB')).toBe('2')
  })

  it('survives the spelling differences between two platforms', () => {
    // ESPN writes the suffix, Sleeper does not. Accents, apostrophes
    // and hyphens differ freely in both directions.
    expect(bridge.byName('Marvin Harrison Jr.', 'WR')).toBe('3')
    expect(bridge.byName('  MARVIN   HARRISON  ', 'wr')).toBe('3')
  })

  it('refuses to guess when a name is ambiguous', () => {
    expect(bridge.byName('Ronald Jones', 'RB')).toBeUndefined()
    // The collision is per position, so the receiver still resolves.
    expect(bridge.byName('Ronald Jones', 'WR')).toBe('6')
  })

  it('resolves a bare name when it is unique, and only then', () => {
    // A position narrows the search, but ESPN sometimes has none to
    // give — see the 'Unknown' case below. Unique is the real bar.
    expect(bridge.byName('Bijan Robinson')).toBe('2')
    expect(bridge.byName('Bijan Robinson', '')).toBe('2')
    // 'Ronald Jones' is two players across two positions, so a bare
    // name cannot be resolved even though each position could be.
    expect(bridge.byName('Ronald Jones')).toBeUndefined()
  })

  it('prefers the exact id over the name, and reports which did the work', () => {
    const out = bridgePicks(
      [
        { playerId: '4242', playerName: 'Old Timer', position: 'RB' },
        { playerId: '99999', playerName: 'Bijan Robinson', position: 'RB' },
        { playerId: '88888', playerName: 'Ronald Jones', position: 'RB' },
      ],
      bridge,
    )
    expect(out.picks.map((p) => p.playerId)).toEqual(['1', '2', '88888'])
    expect(out.byId).toBe(1)
    expect(out.byName).toBe(1)
    expect(out.bridged).toBe(2)
  })
})

describe('picks with no usable position', () => {
  const blob = {
    '1': { player_id: '1', first_name: 'Bijan', last_name: 'Robinson', position: 'RB' },
    '2': { player_id: '2', first_name: 'Ronald', last_name: 'Jones', position: 'RB' },
    '3': { player_id: '3', first_name: 'Ronald', last_name: 'Jones', position: 'WR' },
  }
  const bridge = buildPlayerIdBridge(blob, 'espn')

  it("resolves ESPN's 'Unknown' position by name alone", () => {
    // getDraftWithPlayers writes 'Unknown' when its player lookup
    // missed. Treating that as a real position fails every key.
    expect(bridge.byName('Bijan Robinson', 'Unknown')).toBe('1')
    expect(bridge.byName('Bijan Robinson')).toBe('1')
  })

  it('still refuses a name shared across positions', () => {
    expect(bridge.byName('Ronald Jones', 'Unknown')).toBeUndefined()
    expect(bridge.byName('Ronald Jones')).toBeUndefined()
  })
})
