import { describe, it, expect } from 'vitest'
import { buildWeeklyIssue } from '../buildWeeklyIssue'
import { deckFromIssue } from '../toSlides'
import type { PointsPowerRow } from '@/editorial/points/powerScore'
import type { LeagueDataPointsMatchup } from '@/editorial/types'
import type { LeagueTransaction } from '@/editorial/transactions/types'

const power = (spec: [string, number][], weeksPlayed = 5): PointsPowerRow[] =>
  spec.map(([teamId, score], i) => ({
    teamId,
    score,
    components: { allPlay: 0, scoring: 0, record: 0, recent: 0 },
    allPlayWins: (spec.length - 1) * weeksPlayed - i * weeksPlayed,
    allPlayLosses: i * weeksPlayed,
    allPlayTies: 0,
    pointsPerWeek: 120 - i * 4,
    weeksPlayed,
  }))

const final = (
  id: string, home: string, away: string, hp: number, ap: number,
): LeagueDataPointsMatchup => ({
  id, homeTeamId: home, awayTeamId: away, status: 'final',
  homePoints: hp, awayPoints: ap,
})

const base = {
  leagueName: 'League of Record',
  season: 2026,
  week: 5,
  teamName: (id: string) => `Team ${id}`,
}

const six = power([['a', 90], ['b', 80], ['c', 70], ['d', 60], ['e', 50], ['f', 40]])

describe('buildWeeklyIssue', () => {
  it('leads with what happened, named and numbered', () => {
    // Week one is when people look hardest and when a ranking is least
    // earned. The lead is therefore a result, not a verdict.
    const issue = buildWeeklyIssue({
      ...base,
      power: six,
      results: [final('1', 'a', 'b', 141.2, 98.4), final('2', 'c', 'd', 101, 99)],
    })!
    expect(issue.sections[0].id).toBe('results')
    expect(issue.sections[0].headline).toBe('Team a put up 141.2.')
    expect(issue.sections[0].support).toContain('Team c')
    expect(issue.sections[0].support).toContain('by 2')
  })

  it('names its evidence, and says how thin it is in week one', () => {
    // The board once claimed "preseason" six weeks in. An issue that
    // states what it ran on cannot do that.
    const wk1 = buildWeeklyIssue({ ...base, week: 1, power: power([['a', 90], ['b', 80], ['c', 70], ['d', 60]], 1) })!
    expect(wk1.basis).toContain('1 week played')
    const rankings = wk1.sections.find((s) => s.id === 'power-rankings')!
    expect(rankings.support).toMatch(/read it as a sketch/)

    const wk6 = buildWeeklyIssue({ ...base, week: 6, power: six })!
    expect(wk6.sections.find((s) => s.id === 'power-rankings')!.support).not.toMatch(/sketch/)
  })

  it('shows movement only when a team actually moved', () => {
    // "+0" beside every name is noise that trains people to stop
    // reading the column.
    const issue = buildWeeklyIssue({
      ...base, power: six,
      previousPowerRank: (id) => (id === 'c' ? 6 : { a: 1, b: 2, d: 4, e: 5, f: 3 }[id]),
    })!
    const cards = issue.sections.find((s) => s.id === 'power-rankings')!.cards!
    expect(cards.find((c) => c.teamId === 'a')!.movement).toBeUndefined()
    expect(cards.find((c) => c.teamId === 'c')!.movement).toEqual({
      places: 3, label: 'since last week',
    })
  })

  it('withholds the luck verdict until there is enough season to read it', () => {
    // Two weeks of a fluke schedule is not "riding luck", it is two
    // weeks. The threshold lives in luck.ts and this proves the issue
    // honours it.
    const records = [
      { teamId: 'a', wins: 0, losses: 0, ties: 0 }, // best on power, worst record
      { teamId: 'b', wins: 0, losses: 0, ties: 0 },
      { teamId: 'c', wins: 0, losses: 0, ties: 0 },
      { teamId: 'd', wins: 0, losses: 0, ties: 0 },
      { teamId: 'e', wins: 0, losses: 0, ties: 0 },
      { teamId: 'f', wins: 0, losses: 0, ties: 0 },
    ]
    const flip = (n: number) =>
      records.map((r, i) => ({ ...r, wins: i, losses: n - i })) // record inverts power

    const early = buildWeeklyIssue({ ...base, week: 2, power: power([['a', 90], ['b', 80], ['c', 70], ['d', 60], ['e', 50], ['f', 40]], 2), records: flip(2) })!
    expect(JSON.stringify(early.sections)).not.toMatch(/record flatters|Better than their record/)

    const later = buildWeeklyIssue({ ...base, week: 5, power: six, records: flip(5) })!
    expect(JSON.stringify(later.sections)).toMatch(/record flatters|Better than their record/)
  })

  it('gives each side of a trade its own line', () => {
    // A trade is argued about one side at a time, and "what they got"
    // is the sentence people actually say.
    // Deliberately lopsided, 1-for-2. A 1-for-1 would read identically
    // whichever side the builder attributed the players to, and would
    // prove nothing about who got what.
    const trade: LeagueTransaction = {
      id: 't1', platform: 'sleeper', kind: 'trade', timestamp: 1, week: 5,
      teamIds: ['a', 'b'],
      movements: [
        { playerId: '1', playerName: 'Bijan Robinson', toTeamId: 'a', fromTeamId: 'b' },
        { playerId: '2', playerName: 'Puka Nacua', toTeamId: 'b', fromTeamId: 'a' },
        { playerId: '3', playerName: 'Jaylen Waddle', toTeamId: 'b', fromTeamId: 'a' },
      ],
    }
    const issue = buildWeeklyIssue({ ...base, power: six, transactions: [trade] })!
    const trades = issue.sections.find((s) => s.id === 'trades')!
    expect(trades.rows).toHaveLength(2)
    const a = trades.rows!.find((r) => r.label === 'Team a')!
    const b = trades.rows!.find((r) => r.label === 'Team b')!
    expect(a.sub).toBe('Got Bijan Robinson')
    expect(b.sub).toContain('Puka Nacua')
    expect(b.sub).toContain('Jaylen Waddle')
  })

  it('carries the wire that just ran, and says which week it was', () => {
    // Claims answering week 5's results process on the Wednesday inside
    // week 6. Filtering the wire to the issue's own week would show
    // LAST Wednesday's claims — a week stale, and unmarked.
    const claim = (id: string, week: number, name: string, bid: number): LeagueTransaction => ({
      id, platform: 'sleeper', kind: 'faab-add', timestamp: week, week,
      teamIds: ['a'], faabBid: bid,
      movements: [{ playerId: id, playerName: name, toTeamId: 'a', fromTeamId: 'waivers' }],
    })
    const issue = buildWeeklyIssue({
      ...base, week: 5, power: six,
      transactions: [claim('old', 5, 'Last Week Guy', 3), claim('new', 6, 'This Week Guy', 44)],
    })!
    const wire = issue.sections.find((s) => s.id === 'the-wire')!
    expect(wire.rows!.map((r) => r.label)).toEqual(['This Week Guy'])
    expect(wire.headline).toBe('$44 changed hands.')
    expect(wire.support).toContain('Week 6 claims.')

    // But only within a week. On a stale or finished season the log's
    // most recent period can be months past what is being written
    // about — a real 2025 league put week 17's playoff claims under a
    // week 14 headline. Beyond one week it falls back to the issue's
    // own week.
    const stale = buildWeeklyIssue({
      ...base, week: 5, power: six,
      transactions: [claim('old', 5, 'Last Week Guy', 3), claim('far', 17, 'Playoff Guy', 44)],
    })!
    const staleWire = stale.sections.find((s) => s.id === 'the-wire')!
    expect(staleWire.rows!.map((r) => r.label)).toEqual(['Last Week Guy'])
    expect(staleWire.support).not.toContain('Week 17')
  })

  it('offers no trades section in a week nobody traded', () => {
    const issue = buildWeeklyIssue({ ...base, power: six, transactions: [] })!
    expect(issue.sections.find((s) => s.id === 'trades')).toBeUndefined()
  })

  it('runs the playoff picture only when the bubble is within reach', () => {
    // Gated on the RACE being close, not on a week number. A table
    // settled by week nine has no picture to describe, and a scramble
    // in week twelve very much does.
    const records = (pcts: number[]) =>
      pcts.map((w, i) => ({ teamId: 'abcdef'[i], wins: w, losses: 10 - w, ties: 0 }))

    const settled = buildWeeklyIssue({
      ...base, week: 10, regularSeasonEndWeek: 13, playoffCutoff: 4,
      power: six, records: records([10, 9, 8, 7, 1, 0]),
    })!
    expect(settled.sections.find((s) => s.id === 'playoff-picture')).toBeUndefined()

    const scramble = buildWeeklyIssue({
      ...base, week: 10, regularSeasonEndWeek: 13, playoffCutoff: 4,
      power: six, records: records([8, 7, 6, 5, 5, 4]),
    })!
    const race = scramble.sections.find((s) => s.id === 'playoff-picture')!
    expect(race.headline).toBe('Team e are the first team out.')
    expect(race.support).toContain('3 weeks left')
  })

  it('keeps the playoff picture out of a week where the season is young', () => {
    const early = buildWeeklyIssue({
      ...base, week: 4, regularSeasonEndWeek: 13, playoffCutoff: 4,
      power: six, records: [{ teamId: 'a', wins: 3, losses: 1, ties: 0 }],
    })!
    expect(early.sections.find((s) => s.id === 'playoff-picture')).toBeUndefined()
  })

  it('returns null rather than publishing an issue about nothing', () => {
    expect(buildWeeklyIssue({ ...base, power: [] })).toBeNull()
  })

  it('presents each section as its own clip', () => {
    const issue = buildWeeklyIssue({
      ...base, power: six,
      results: [final('1', 'a', 'b', 141.2, 98.4)],
    })!
    expect(deckFromIssue(issue, { only: 'power-rankings' })!.title).toBe('Power rankings')
    expect(deckFromIssue(issue, { only: 'results' })!.title).toBe('The week')

    // Counted down, one team per slide, in both formats.
    for (const format of ['landscape', 'vertical'] as const) {
      const deck = deckFromIssue(issue, { only: 'power-rankings', format })!
      const ranks = deck.slides.filter((s) => s.kind === 'team-card').map((s) => (s as { rank: number }).rank)
      expect(ranks).toEqual([6, 5, 4, 3, 2, 1])
    }
  })
})
