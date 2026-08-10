/**
 * The Climb — one team's season arc drawn across the weeks we have.
 *
 * Works in both directions. A team that fell gets the same treatment
 * with honest copy; we do not describe a collapse as a climb.
 *
 * Ordinal note: `vo` is narration destined for text-to-speech, so
 * every rank interpolated into it MUST go through `ordinal()` rather
 * than a hardcoded "th" suffix — "1th", "2th", "22th" etc. are wrong
 * English and get spoken aloud wrong, not just displayed wrong.
 */

import type { CategoryLeagueData } from '../../types'
import type { SelectedStory } from '../../detection/types'
import type { ClimbPoint, ReelScene } from '../types'
import { toReelTeam } from './coldOpen'

const MIN_POINTS = 3

/** English ordinal: 1 -> "1st", 2 -> "2nd", 3 -> "3rd", 11 -> "11th",
 *  21 -> "21st". 11/12/13 are the special case that always takes "th". */
export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export function buildClimb(
  data: CategoryLeagueData,
  story: SelectedStory,
): ReelScene | null {
  const teamId = story.teamIds?.[0]
  if (!teamId) return null

  const team = data.teams.find((t) => t.id === teamId)
  if (!team) return null

  const points: ClimbPoint[] = [...data.seasonRankHistory]
    .sort((h1, h2) => h1.week - h2.week)
    .filter((h) => h.ranks[teamId] != null)
    .map((h) => ({ week: h.week, rank: h.ranks[teamId] }))

  if (points.length < MIN_POINTS) return null

  const fromRank = points[0].rank
  const toRank = points[points.length - 1].rank
  const moved = fromRank - toRank          // positive = climbed
  const spanWeeks = points.length

  const direction = moved > 0 ? 'climbed' : moved < 0 ? 'slid' : 'held'
  const spots = Math.abs(moved)

  const vo =
    moved === 0
      ? `${team.name} have not moved in ${spanWeeks} weeks, still sitting ${ordinal(toRank)}.`
      : `${team.name} have gone from ${ordinal(fromRank)} to ${ordinal(toRank)} across ${spanWeeks} weeks.`

  return {
    template: 'the-climb',
    props: {
      team: toReelTeam(team),
      points,
      fromRank,
      toRank,
      spanWeeks,
      footnote:
        moved === 0
          ? `HELD AT ${toRank} FOR ${spanWeeks} WEEKS`
          : `${direction.toUpperCase()} ${spots} ${spots === 1 ? 'SPOT' : 'SPOTS'}`,
    },
    vo,
    minDurationMs: 10000,
    storySignature: story.signature,
  }
}
