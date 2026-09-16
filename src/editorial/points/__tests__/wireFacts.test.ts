import { describe, it, expect } from 'vitest'
import { buildWireFacts, describeCost } from '../wireFacts'
import type { LeagueTransaction } from '@/editorial/transactions/types'

const add = (
  id: string,
  teamId: string,
  playerName: string,
  week = 3,
  extra: Partial<LeagueTransaction> = {},
): LeagueTransaction => ({
  id,
  platform: 'sleeper',
  kind: 'faab-add',
  // A timestamp consistent with the week. Every fixture used to sit on
  // 0, which models two claims from different weeks settling in the
  // same instant — waiver runs are a week apart, and a wire grouped by
  // when it SETTLED cannot be tested against a state that cannot occur.
  timestamp: week * 7 * 86_400_000,
  week,
  teamIds: [teamId],
  movements: [{ playerId: `p-${id}`, playerName, fromTeamId: 'waivers', toTeamId: teamId }],
  ...extra,
})

const trade = (id: string, a: string, b: string, week = 3): LeagueTransaction => ({
  id,
  platform: 'sleeper',
  kind: 'trade',
  // Same reasoning as `add` above: the timestamp has to agree with the
  // week, or a trade sits in a different run from the claims it was
  // written to appear beside.
  timestamp: week * 7 * 86_400_000,
  week,
  teamIds: [a, b],
  movements: [
    { playerId: 'x', playerName: 'Player X', fromTeamId: a, toTeamId: b },
    { playerId: 'y', playerName: 'Player Y', fromTeamId: b, toTeamId: a },
  ],
})

describe('buildWireFacts', () => {
  it('returns null when nothing happened', () => {
    // An empty deck, not a quiet week worth reporting.
    expect(buildWireFacts(undefined)).toBeNull()
    expect(buildWireFacts([])).toBeNull()
    expect(buildWireFacts([add('1', 't1', 'A', 2)], 5)).toBeNull()
  })

  it('covers the most recent week by default', () => {
    // A Wednesday deck wants this Wednesday, not the season.
    const facts = buildWireFacts([
      add('1', 't1', 'Old News', 1),
      add('2', 't2', 'This Week', 4),
    ])!
    expect(facts.week).toBe(4)
    expect(facts.adds.map((a) => a.playerName)).toEqual(['This Week'])
  })

  it('keeps one waiver run together when the platform splits its legs', () => {
    // THE REAL CASE. Sleeper stamps a claim with the leg it was
    // SUBMITTED in, but a run settles everything outstanding at once.
    // One Wednesday run in the captured league settled a $15 claim
    // stamped leg 1 and a $1 claim stamped leg 2 in the same second.
    // Grouping by leg split the wire across two weeks and headlined
    // the issue "$1 changed hands" on a week somebody spent fifteen.
    const settled = 16 * 86_400_000 + 9 * 3_600_000      // same morning
    const facts = buildWireFacts([
      { ...add('a', 't1', 'Devaughn Vele', 1, { faabBid: 15 }), timestamp: settled },
      { ...add('b', 't2', 'Kenyon Sadiq', 2, { faabBid: 1 }), timestamp: settled + 400 },
    ])!
    expect(facts.adds.map((a) => a.playerName)).toEqual(['Devaughn Vele', 'Kenyon Sadiq'])
    expect(facts.adds[0].faabBid).toBe(15)
    // Stamped by the LATEST leg in the run — the week it reports into.
    expect(facts.week).toBe(2)
  })

  it('leaves an older run behind even when its legs overlap', () => {
    // Leg 1 also still holds claims that settled back in August. "The
    // wire" is the most recent run, not every claim ever stamped with
    // the same leg.
    const august = 3 * 86_400_000
    const today = 16 * 86_400_000
    const facts = buildWireFacts([
      { ...add('old', 't1', 'Preseason Pickup', 1, { faabBid: 7 }), timestamp: august },
      { ...add('new', 't2', 'This Morning', 1, { faabBid: 2 }), timestamp: today },
    ])!
    expect(facts.adds.map((a) => a.playerName)).toEqual(['This Morning'])
  })

  it('sorts claims by bid when the league uses FAAB', () => {
    const facts = buildWireFacts([
      add('1', 't1', 'Cheap', 3, { faabBid: 4 }),
      add('2', 't2', 'Expensive', 3, { faabBid: 47 }),
      add('3', 't3', 'Middling', 3, { faabBid: 20 }),
    ])!
    expect(facts.usesFaab).toBe(true)
    expect(facts.adds.map((a) => a.playerName)).toEqual(['Expensive', 'Middling', 'Cheap'])
    expect(facts.faabSpent).toBe(71)
  })

  it('leaves claims in log order when there is no FAAB', () => {
    // Sorting by a bid nobody made would silently reorder to nothing.
    const facts = buildWireFacts([
      add('1', 't1', 'First', 3, { kind: 'waiver-add', waiverPriority: 5 }),
      add('2', 't2', 'Second', 3, { kind: 'waiver-add', waiverPriority: 1 }),
    ])!
    expect(facts.usesFaab).toBe(false)
    expect(facts.faabSpent).toBeUndefined()
    expect(facts.adds.map((a) => a.playerName)).toEqual(['First', 'Second'])
  })

  it('carries the arriving player id, so a slide can show a face', () => {
    // Vertical format gives a claim its own screen. Without the id
    // there is no headshot, and a name alone on a screen is thin.
    const facts = buildWireFacts([add('1', 't1', 'Arriving', 3, { faabBid: 9 })])!
    expect(facts.adds[0].playerId).toBe('p-1')
  })

  it('names the arriving player, not the one dropped', () => {
    // A pickup that drops someone is still a pickup; naming the corpse
    // would bury the story.
    const facts = buildWireFacts([
      add('1', 't1', 'Arriving', 3, {
        faabBid: 12,
        movements: [
          { playerId: 'out', playerName: 'Departing', fromTeamId: 't1', toTeamId: 'fa' },
          { playerId: 'in', playerName: 'Arriving', fromTeamId: 'waivers', toTeamId: 't1' },
        ],
      }),
    ])!
    expect(facts.adds[0].playerName).toBe('Arriving')
  })

  it('separates trades from claims', () => {
    const facts = buildWireFacts([add('1', 't1', 'A', 3), trade('t', 't2', 't3', 3)])!
    expect(facts.adds).toHaveLength(1)
    expect(facts.trades).toHaveLength(1)
    expect(facts.trades[0].received.get('t3')).toEqual(['Player X'])
    expect(facts.trades[0].received.get('t2')).toEqual(['Player Y'])
  })

  it('counts a trade once per side, not once per player moved', () => {
    // THE distinguishing case for "busiest". Counting movements would
    // rank a lopsided swap above the manager who made more moves,
    // which is not what working the wire means.
    //
    // Deliberately a TWO-for-one: with a one-for-one the two rules
    // give the same answer, so the earlier version of this test passed
    // under either and proved nothing.
    const lopsided: LeagueTransaction = {
      id: 'big', platform: 'sleeper', kind: 'trade', timestamp: 3 * 7 * 86_400_000, week: 3,
      teamIds: ['trader', 'other'],
      movements: [
        { playerId: 'a', playerName: 'A', fromTeamId: 'other', toTeamId: 'trader' },
        { playerId: 'b', playerName: 'B', fromTeamId: 'other', toTeamId: 'trader' },
        { playerId: 'c', playerName: 'C', fromTeamId: 'trader', toTeamId: 'other' },
      ],
    }
    const facts = buildWireFacts([
      lopsided,
      add('1', 'grinder', 'A', 3),
      add('2', 'grinder', 'B', 3),
    ])!
    const byTeam = new Map(facts.activity.map((a) => [a.teamId, a.moves]))
    expect(byTeam.get('trader')).toBe(1)
    expect(byTeam.get('grinder')).toBe(2)
    expect(facts.activity[0].teamId).toBe('grinder')
  })

  it('ignores standalone drops', () => {
    // Cutting a player is not a wire move anyone presents.
    const facts = buildWireFacts([
      add('1', 't1', 'Kept', 3),
      { ...add('2', 't2', 'Cut', 3), kind: 'drop' },
    ])!
    expect(facts.adds.map((a) => a.playerName)).toEqual(['Kept'])
  })
})

describe('describeCost', () => {
  it('states how a claim was won', () => {
    expect(describeCost({ teamId: 't', playerId: 'p', playerName: 'A', faabBid: 47, kind: 'faab-add' })).toBe('$47')
    expect(
      describeCost({ teamId: 't', playerId: 'p', playerName: 'A', waiverPriority: 3, kind: 'waiver-add' }),
    ).toBe('priority 3')
    expect(describeCost({ teamId: 't', playerId: 'p', playerName: 'A', kind: 'fa-add' })).toBe('free agency')
  })

  it('does not render a $0 bid as a price paid', () => {
    // Sleeper reports 0 for a claim in a league with no FAAB.
    expect(describeCost({ teamId: 't', playerId: 'p', playerName: 'A', faabBid: 0, kind: 'waiver-add' })).toBe(
      'off waivers',
    )
  })
})
