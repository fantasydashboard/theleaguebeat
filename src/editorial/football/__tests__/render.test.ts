import { describe, it, expect } from 'vitest'
import { renderBeatPoints } from '@/editorial/render-beat-points'
import { voiceViolations } from '@/editorial/football/voice'
import type { LeagueDataH2HPoints } from '@/editorial/types'

const team = (id: string, name: string) =>
  ({ id, name, ownerName: 'o', ownerInitials: id.toUpperCase(), avatarColor: 'c', isMyTeam: false })

/**
 * Two teams, one decided game, a photo finish.
 *
 * Matchup id is 'm3' deliberately, not incidentally: `pick()` hashes the
 * item key to choose a variant, so which of the football body's two
 * "Monday night" candidates (out of nine possible bodies for this score
 * line) gets selected depends on the exact key string. 'm3' is the id
 * that lands the deterministic hash on a Monday-night variant — verified
 * against the actual hashString/pick implementation in
 * render-beat-points.ts, not assumed. A differently-named matchup would
 * legitimately select a different (still football, still clean) body,
 * and the "monday night" assertion below would fail through no fault of
 * the renderer.
 */
function league(sport: 'nfl' | 'mlb'): LeagueDataH2HPoints {
  return {
    format: 'h2h-points', sport,
    leagueId: 'lg', leagueName: 'Gridiron', currentWeek: 9, currentSeason: 2026,
    regularSeasonEndWeek: 14,
    teams: [team('a', 'Gridiron Man'), team('b', 'Scuttlebucs')],
    standings: [
      { rank: 1, teamId: 'a', catWins: 6, catLosses: 2, catTies: 0, winPct: 0.75,
        streak: { type: 'W', length: 2 }, lastSix: [], ownsCount: 0, bleedingCount: 0 },
      { rank: 2, teamId: 'b', catWins: 4, catLosses: 4, catTies: 0, winPct: 0.5,
        streak: { type: 'L', length: 1 }, lastSix: [], ownsCount: 0, bleedingCount: 0 },
    ],
    seasonRankHistory: [{ week: 8, ranks: { a: 1, b: 2 } }],
    weeklyPointsAverage: 109.4,
    previousWeekMatchups: [
      { id: 'm3', homeTeamId: 'a', awayTeamId: 'b', status: 'final',
        homePoints: 110.1, awayPoints: 108.9 },
    ],
  } as unknown as LeagueDataH2HPoints
}

const allText = (items: Array<{ headline?: string; body?: string }>) =>
  items.flatMap((i) => [i.headline, i.body]).filter((s): s is string => !!s)

describe('renderBeatPoints — sport selection', () => {
  it('never says "at-bats" for a football league', () => {
    const text = allText(renderBeatPoints(league('nfl'), new Date('2026-11-10T12:00:00Z')).items)
    expect(text.join(' ').toLowerCase()).not.toContain('at-bat')
  })

  it('emits no voice violations for a football league', () => {
    const text = allText(renderBeatPoints(league('nfl'), new Date('2026-11-10T12:00:00Z')).items)
    for (const s of text) expect(voiceViolations(s)).toEqual([])
  })

  it('produces football-specific framing on a photo finish', () => {
    const text = allText(renderBeatPoints(league('nfl'), new Date('2026-11-10T12:00:00Z')).items)
    expect(text.join(' ').toLowerCase()).toContain('monday night')
  })

  /* A points league that is NOT football keeps the neutral copy. This is
   * the regression guard for ESPN/Yahoo points baseball leagues, which
   * ship today and must not start reading like football. */
  it('leaves a non-football points league on the neutral copy', () => {
    const text = allText(renderBeatPoints(league('mlb'), new Date('2026-11-10T12:00:00Z')).items)
    expect(text.join(' ').toLowerCase()).not.toContain('monday night')
  })
})
