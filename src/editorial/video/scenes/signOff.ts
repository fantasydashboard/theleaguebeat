/**
 * Sign-Off — the fixed last scene. Previews next week's marquee
 * matchup, then the brand outro.
 *
 * "Marquee" is defined as the scheduled matchup whose two teams have
 * the best combined current rank. When next week's schedule is absent
 * — or names a team we don't have — this returns null and the reel
 * ends on The Board. We never invent a fixture.
 */

import type { CategoryLeagueData, CategoryLeagueDataMatchup } from '../../types'
import type { ReelScene } from '../types'
import { toReelTeam } from './coldOpen'

export function buildSignOff(data: CategoryLeagueData): ReelScene | null {
  const nextWeek = data.currentWeek + 1
  const scheduled = data.matchupsByWeek?.[String(nextWeek)]
  if (!scheduled || scheduled.length === 0) return null

  const rankOf = (teamId: string): number =>
    data.standings.find((s) => s.teamId === teamId)?.rank ?? Number.MAX_SAFE_INTEGER

  const marquee = [...scheduled].sort(
    (m1, m2) =>
      rankOf(m1.homeTeamId) + rankOf(m1.awayTeamId) -
      (rankOf(m2.homeTeamId) + rankOf(m2.awayTeamId)),
  )[0] as CategoryLeagueDataMatchup

  const home = data.teams.find((t) => t.id === marquee.homeTeamId)
  const away = data.teams.find((t) => t.id === marquee.awayTeamId)
  if (!home || !away) return null

  const homeRank = rankOf(home.id)
  const awayRank = rankOf(away.id)
  const ranked = homeRank !== Number.MAX_SAFE_INTEGER && awayRank !== Number.MAX_SAFE_INTEGER

  const line = ranked
    ? `#${homeRank} vs #${awayRank}`
    : `Week ${nextWeek}`

  return {
    template: 'sign-off',
    props: {
      teamA: toReelTeam(home),
      teamB: toReelTeam(away),
      line,
      brandUrl: 'theleaguebeat.com',
    },
    vo: `Next week: ${home.name} and ${away.name}. That's the beat.`,
    minDurationMs: 6000,
  }
}
