import { describe, it, expect } from 'vitest'
import { buildWireFacts, describeContest } from '../wireFacts'
import type { LeagueTransaction } from '@/editorial/transactions/types'

const DAY = 16 * 86_400_000

const won = (player: string, teamId: string, bid: number): LeagueTransaction => ({
  id: `w-${player}-${teamId}`, platform: 'sleeper', kind: 'faab-add',
  timestamp: DAY, week: 2, teamIds: [teamId], faabBid: bid,
  movements: [{ playerId: player, playerName: player, fromTeamId: 'waivers', toTeamId: teamId }],
})

const lost = (player: string, teamId: string, bid: number): LeagueTransaction => ({
  id: `l-${player}-${teamId}-${bid}`, platform: 'sleeper', kind: 'failed-claim',
  timestamp: DAY, week: 2, teamIds: [teamId], faabBid: bid,
  movements: [{ playerId: player, playerName: player, fromTeamId: 'waivers', toTeamId: teamId }],
})

const addFor = (txs: LeagueTransaction[], player: string) =>
  buildWireFacts(txs)!.adds.find((a) => a.playerName === player)!

describe('what a winning bid was up against', () => {
  it('ignores a manager bidding against himself', () => {
    // THE REAL CASE. One roster entered a $9 and an $8 on the same
    // player. Counting its own losing bid as competition reports a
    // nail-biting escape from nobody.
    const add = addFor([won('Boston', 't4', 9), lost('Boston', 't4', 8)], 'Boston')
    expect(add.contest).toEqual({ rivals: 0, nextBid: undefined })
    expect(describeContest(add)).toBe('Nobody else bid. $9 unopposed.')
  })

  it('calls a one-dollar win a one-dollar win', () => {
    const add = addFor([won('Sadiq', 't3', 2), lost('Sadiq', 't1', 1)], 'Sadiq')
    expect(describeContest(add)).toBe('Won him by a dollar. one other team bid, best of them $1.')
  })

  it('names the crowd when half the league wanted him', () => {
    // Devaughn Vele drew eight bids across seven rivals.
    const add = addFor([
      won('Vele', 't7', 15),
      ...['t6', 't10', 't9', 't4', 't2', 't3'].map((t, i) => lost('Vele', t, [10, 4, 4, 3, 1, 0][i])),
    ], 'Vele')
    expect(add.contest).toEqual({ rivals: 6, nextBid: 10 })
    expect(describeContest(add)).toBe('6 other teams bid. Next best was $10.')
  })

  it('counts rival TEAMS, not rival bids', () => {
    // One opponent entering two claims on the same player is one
    // opponent. Counting bids reports a bidding war between two
    // managers as a three-way scramble.
    const add = addFor([
      won('Guy', 't1', 10),
      lost('Guy', 't2', 8),
      lost('Guy', 't2', 6),
    ], 'Guy')
    expect(add.contest).toEqual({ rivals: 1, nextBid: 8 })
    expect(describeContest(add)).toBe('Held off one other team; next bid $8.')
  })

  it('says so when somebody paid double what it took', () => {
    const add = addFor([won('Guy', 't1', 30), lost('Guy', 't2', 5)], 'Guy')
    expect(describeContest(add)).toBe('$25 more than he had to — next bid was $5.')
  })

  it('stays quiet about a cheap unopposed claim', () => {
    // "$1, nobody else bid" is not a story and would pad every row.
    const add = addFor([won('Nobody', 't1', 1)], 'Nobody')
    expect(describeContest(add)).toBeUndefined()
  })

  it('says nothing at all where there is no money', () => {
    const add = addFor([{ ...won('Free', 't1', 0), kind: 'waiver-add', faabBid: undefined }], 'Free')
    expect(describeContest(add)).toBeUndefined()
  })
})

describe('a lost claim is not a move', () => {
  it('never appears as a pickup', () => {
    const facts = buildWireFacts([won('Winner', 't1', 5), lost('Winner', 't2', 4)])!
    expect(facts.adds.map((a) => a.playerName)).toEqual(['Winner'])
  })

  it('is not counted as activity', () => {
    // A manager who lost six claims did not make six moves, and
    // ranking him top of "most active" would be a lie about the week.
    const facts = buildWireFacts([
      won('Winner', 't1', 5),
      ...[4, 3, 2, 1].map((b) => lost('Winner', 't2', b)),
    ])!
    const byTeam = new Map(facts.activity.map((a) => [a.teamId, a.moves]))
    expect(byTeam.get('t1')).toBe(1)
    expect(byTeam.get('t2')).toBeUndefined()
  })

  it('does not inflate what the week cost', () => {
    const facts = buildWireFacts([won('Winner', 't1', 5), lost('Winner', 't2', 4)])!
    expect(facts.faabSpent).toBe(5)
  })
})
