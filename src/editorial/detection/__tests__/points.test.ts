import { describe, it, expect } from 'vitest'
import { detectPointsStories } from '@/editorial/detection/points'
import type { LeagueDataH2HPoints, LeagueDataPointsMatchup } from '@/editorial/types'
import type { IssueContext } from '@/editorial/detection/types'

const context: IssueContext = {
  currentWeek: 5, seasonStage: 'settling',
  issueDate: new Date('2026-10-07T12:00:00Z'),
}

const team = (id: string, name: string) =>
  ({ id, name, ownerName: 'o', ownerInitials: id.toUpperCase(), avatarColor: 'c', isMyTeam: false })

const game = (
  id: string, home: string, away: string, hp: number, ap: number,
  status: LeagueDataPointsMatchup['status'] = 'final',
): LeagueDataPointsMatchup =>
  ({ id, homeTeamId: home, awayTeamId: away, status, homePoints: hp, awayPoints: ap })

/** avg 100 makes the multiples easy to read: blowout ≥40, photo ≤3,
 *  shootout ≥125 each, rock fight ≤75 each. */
const league = (games: LeagueDataPointsMatchup[], avg = 100): LeagueDataH2HPoints =>
  ({
    format: 'h2h-points', sport: 'nfl',
    leagueId: 'lg', leagueName: 'Gridiron',
    currentWeek: 5, currentSeason: 2026, regularSeasonEndWeek: 14,
    teams: [team('a', 'Alpha'), team('b', 'Bravo'), team('c', 'Charlie'), team('d', 'Delta')],
    standings: [], seasonRankHistory: [],
    weeklyPointsAverage: avg,
    currentWeekMatchups: games,
  }) as unknown as LeagueDataH2HPoints

const types = (d: LeagueDataH2HPoints) => detectPointsStories(d, context).map((s) => s.type)

describe('detectPointsStories', () => {
  it('emits nothing for a category league', () => {
    const cats = { format: 'h2h-category' } as never
    expect(detectPointsStories(cats, context)).toEqual([])
  })

  it('detects a blowout at 40% of the weekly average', () => {
    expect(types(league([game('m1', 'a', 'b', 145, 100)]))).toContain('points-blowout')
  })

  it('does not call a 30-point win a blowout when the average is 100', () => {
    expect(types(league([game('m1', 'a', 'b', 130, 100)]))).not.toContain('points-blowout')
  })

  /* The same 45-point margin in a high-scoring league is not a blowout —
   * this is the test that proves thresholds are relative, not absolute. */
  it('scales with the league: 45 points is not a blowout at a 200 average', () => {
    expect(types(league([game('m1', 'a', 'b', 245, 200)], 200))).not.toContain('points-blowout')
  })

  it('detects a photo finish inside 3% of the average', () => {
    expect(types(league([game('m1', 'a', 'b', 101, 99)]))).toContain('points-photo-finish')
  })

  /* Mirrors the blowout "scales with the league" test: the same tiny
   * margin must qualify at one average and not at another, proving the
   * threshold is relative rather than a bare point value. */
  it('scales with the league: a 10-point margin is a photo finish at a 500 average but not at 100', () => {
    // cutoff at avg 500 is 15 -> margin 10 qualifies.
    expect(types(league([game('m1', 'a', 'b', 255, 245)], 500))).toContain('points-photo-finish')
    // cutoff at avg 100 is 3 -> the same 10-point margin does not.
    expect(types(league([game('m1', 'a', 'b', 105, 95)]))).not.toContain('points-photo-finish')
  })

  it('detects a shootout when both sides clear 125% of the average', () => {
    expect(types(league([game('m1', 'a', 'b', 140, 132)]))).toContain('points-shootout')
  })

  /* AND, not OR: one side clearing the cutoff alone is not a shootout —
   * both offenses have to have gone off. */
  it('does not call it a shootout when only one side clears 125%', () => {
    expect(types(league([game('m1', 'a', 'b', 140, 100)]))).not.toContain('points-shootout')
  })

  it('detects a rock fight when both sides are under 75%', () => {
    expect(types(league([game('m1', 'a', 'b', 70, 66)]))).toContain('points-rock-fight')
  })

  /* AND, not OR: one side staying under the cutoff alone is not a rock
   * fight — neither offense can be moving the ball. */
  it('does not call it a rock fight when only one side stays under 75%', () => {
    expect(types(league([game('m1', 'a', 'b', 70, 90)]))).not.toContain('points-rock-fight')
  })

  it('names the week high and low across all games, by team, not by position in the list', () => {
    // A detector that always picked totals[0] for both high and low
    // would pass a "both types present" check but get the actual
    // teams wrong — assert the teamIds directly.
    const out = detectPointsStories(league([
      game('m1', 'a', 'b', 150, 90),
      game('m2', 'c', 'd', 88, 60),
    ]), context)
    const high = out.find((s) => s.type === 'points-high-score')
    const low = out.find((s) => s.type === 'points-low-score')
    expect(high?.teamIds).toEqual(['a'])
    expect(low?.teamIds).toEqual(['d'])
  })

  it('ignores matchups that are not final', () => {
    expect(types(league([game('m1', 'a', 'b', 145, 100, 'live')]))).toEqual([])
  })

  /* Never fabricate a baseline: with no average and only one game there
   * is nothing to compute a relative threshold against. Uses a lopsided
   * (200, 10) score on purpose -- a fabricated baseline averaging this
   * single game's own two scores (105) would call the 190-point margin
   * a blowout (0.4 * 105 = 42 < 190), so this only stays green if the
   * "too thin to average" guard actually holds regardless of the
   * numbers involved. */
  it('emits no margin stories when the weekly average is unknown and history is too thin', () => {
    const noAvg = { ...league([game('m1', 'a', 'b', 200, 10)]), weeklyPointsAverage: undefined }
    expect(types(noAvg as LeagueDataH2HPoints)).not.toContain('points-blowout')
  })

  it('handles a zero-zero week without dividing by zero', () => {
    const out = types(league([game('m1', 'a', 'b', 0, 0)], 0))
    expect(Array.isArray(out)).toBe(true)
    expect(out).not.toContain('points-blowout')
  })

  it('handles a tie without calling it a blowout', () => {
    const out = types(league([game('m1', 'a', 'b', 100, 100)]))
    expect(out).not.toContain('points-blowout')
    expect(out).toContain('points-photo-finish')
  })

  it('falls back to previousWeekMatchups when the current week has no finals at all', () => {
    // The current week is live (no final games there at all); the
    // detectors must fall back to the closed previous week rather than
    // finding nothing. This is the Sleeper in_season case: its current
    // week is 'live'/'upcoming' by construction, never 'final', mid-season.
    const data = {
      ...league([game('m1', 'a', 'b', 100, 100, 'live')]),
      previousWeekMatchups: [game('p1', 'a', 'b', 145, 100, 'final')],
    } as LeagueDataH2HPoints
    expect(types(data)).toContain('points-blowout')
  })

  it('sources directly from currentWeekMatchups finals when present (the primary path)', () => {
    // Covers a completed season: there is no "next" week to have
    // closed the current one out, so the current week's own final
    // games are the only source available.
    const data = league([game('m1', 'a', 'b', 145, 100, 'final')])
    expect(types(data)).toContain('points-blowout')
  })

  it('prefers a final CURRENT week over previousWeekMatchups when both have finals', () => {
    // Regression pin for the precedence bug: the fix must prefer the
    // MOST RECENT week that has finals, not previousWeekMatchups
    // unconditionally. This is exactly the ESPN/Yahoo Monday-night-to-
    // Tuesday window (both mark the current week final from real
    // platform data while still mid-transition) and the completed-
    // season case (current week IS the final week, previous is stale).
    // A previous-week-preferred implementation would source from the
    // tiny 1-point previous-week margin (a photo finish, not a
    // blowout) and miss the current week's unmistakable 290-point
    // blowout entirely.
    const data = {
      ...league([game('m1', 'a', 'b', 300, 10, 'final')]),
      previousWeekMatchups: [game('p1', 'a', 'b', 101, 100, 'final')],
    } as LeagueDataH2HPoints
    const out = detectPointsStories(data, context)
    const blowout = out.find((s) => s.type === 'points-blowout')
    expect(blowout).toBeDefined()
    expect((blowout?.context as any).week).toBe(context.currentWeek)
  })

  it('labels a previous-week-sourced story with the week it actually happened, not context.currentWeek', () => {
    // Off-by-one pin: when the source is `previousWeekMatchups`
    // (currentWeek - 1), the story's `week`, its signature, and its
    // freshness must reflect that actual week — not context.currentWeek,
    // which would mislabel the story and collide its signature with a
    // genuine same-numbered story published a week later.
    const data = {
      ...league([game('m1', 'a', 'b', 100, 100, 'live')]),
      previousWeekMatchups: [game('p1', 'a', 'b', 145, 100, 'final')],
    } as LeagueDataH2HPoints
    const out = detectPointsStories(data, context)
    const blowout = out.find((s) => s.type === 'points-blowout')
    expect(blowout).toBeDefined()
    expect((blowout?.context as any).week).toBe(context.currentWeek - 1)
    expect(blowout?.signature.split('|')).toContain(String(context.currentWeek - 1))
    expect(blowout?.signature.split('|')).not.toContain(String(context.currentWeek))
    // One week stale, not fresh — freshnessForWeekAge(1) === 0.7.
    expect(blowout?.freshness).toBeCloseTo(0.7)
  })

  it('gives every story a stable signature', () => {
    const out = detectPointsStories(league([game('m1', 'a', 'b', 145, 100)]), context)
    for (const s of out) expect(s.signature.length).toBeGreaterThan(0)
    const again = detectPointsStories(league([game('m1', 'a', 'b', 145, 100)]), context)
    expect(out.map((s) => s.signature)).toEqual(again.map((s) => s.signature))
  })
})
