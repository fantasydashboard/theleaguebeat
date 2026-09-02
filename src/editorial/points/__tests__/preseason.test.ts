/**
 * The post-draft, pre-kickoff state.
 *
 * Every football league sits here for the week between drafting and
 * week one, which is when most people first look. Every team is 0-0, so
 * the standings table is an ARBITRARY ORDER — and reading it as a
 * ladder produces confident nonsense: a named "cellar" team, a
 * "tightest race" between two of ten identical rows, somebody "level on
 * the ladder" with the entire league.
 */
import { describe, it, expect } from 'vitest'
import { hasPlayedGames } from '@/editorial/leagueCore'
import { computePointsPowerScores } from '@/editorial/points/powerScore'
import { renderBeatPoints } from '@/editorial/render-beat-points'
import { buildYourColumn } from '@/editorial/yourColumn/buildYourColumn'
import type { LeagueDataH2HPoints } from '@/editorial/types'

function preseasonLeague(): LeagueDataH2HPoints {
  const teams = Array.from({ length: 10 }, (_, i) => ({
    id: String(i + 1),
    name: `Team ${i + 1}`,
    ownerName: `Owner ${i + 1}`,
    ownerInitials: 'OO',
    avatarColor: 'red, blue',
    isMyTeam: false,
  }))
  return {
    format: 'h2h-points',
    sport: 'nfl',
    leagueId: 'L',
    leagueName: 'Preseason League',
    currentWeek: 1,
    currentSeason: 2026,
    regularSeasonEndWeek: 14,
    teams,
    weeklyScores: [],
    standings: teams.map((t, i) => ({
      rank: i + 1,
      teamId: t.id,
      catWins: 0, catLosses: 0, catTies: 0,
      winPct: 0,
      streak: { type: 'T' as const, length: 0 },
      lastSix: [],
      ownsCount: 0, bleedingCount: 0,
    })),
  } as LeagueDataH2HPoints
}

describe('a league that has drafted but not played', () => {
  const data = preseasonLeague()

  it('knows nothing has been played', () => {
    expect(hasPlayedGames(data)).toBe(false)
  })

  it('produces no power ranking, rather than ranking sort order', () => {
    // Ten identical 0-0 rows have no order. Emitting one would put a
    // real person tenth for no reason.
    expect(computePointsPowerScores(data)).toEqual([])
  })

  it('writes no standings-derived story', () => {
    const beat = renderBeatPoints(data, { now: new Date('2026-09-02T12:00:00Z') } as never)
    const text = JSON.stringify(beat)
    for (const phrase of [
      'level on the ladder',
      'a seat from the cutoff',
      'Adjacent in the standings',
      'dead even',
    ]) {
      expect(text, `preseason issue claimed: ${phrase}`).not.toContain(phrase)
    }
  })

  it('still knows games HAVE been played once one has', () => {
    // The guard must not permanently mute the league.
    const played = preseasonLeague()
    played.standings![0] = { ...played.standings![0], catWins: 1 }
    expect(hasPlayedGames(played)).toBe(true)
  })
})

describe("Your Column before the season starts", () => {
  const data = preseasonLeague()
  // A matchup that exists but has not kicked off: both sides on zero.
  data.currentWeekMatchups = [{
    id: 'm1',
    homeTeamId: '1',
    awayTeamId: '2',
    homePoints: 0,
    awayPoints: 0,
    status: 'upcoming',
  } as never]

  const column = buildYourColumn(data, '1')
  const text = JSON.stringify(column)

  it('does not report a rank or a win percentage', () => {
    // "Sits 1st, 0-0" reports a sort position, and ".000" reads as
    // failure rather than as absence.
    expect(text).not.toContain('Sits 1st')
    expect(text).not.toContain('WIN PCT')
    expect(text).toContain("The season hasn't started")
  })

  it('calls an unkicked matchup upcoming, not live', () => {
    expect(text).not.toContain('"LIVE"')
    expect(text).toContain('UPCOMING')
    // No "level with X, 0.0-0.0" over two empty bars.
    expect(text).not.toContain('0.0-0.0')
    expect(text).not.toContain('AHEAD')
  })

  it('still reports a real matchup once it has kicked off', () => {
    // The guard must not permanently mute the column.
    const live = preseasonLeague()
    live.standings![0] = { ...live.standings![0], catWins: 1, winPct: 1 }
    live.currentWeekMatchups = [{
      id: 'm1', homeTeamId: '1', awayTeamId: '2',
      homePoints: 101.5, awayPoints: 88.2, status: 'live',
    } as never]
    const t = JSON.stringify(buildYourColumn(live, '1'))
    expect(t).toContain('LIVE')
    expect(t).toContain('101.5')
  })
})
