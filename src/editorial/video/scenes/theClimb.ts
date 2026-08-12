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
import { rankAtWeek } from '../../detection/helpers'

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

  const historyPoints: ClimbPoint[] = [...data.seasonRankHistory]
    .sort((h1, h2) => h1.week - h2.week)
    .filter((h) => h.ranks[teamId] != null)
    .map((h) => ({ week: h.week, rank: h.ranks[teamId] }))

  // The Board derives "current rank" via `rankAtWeek`, which falls back
  // to live `data.standings` when the in-progress current week hasn't
  // been written to seasonRankHistory yet (ESPN only records weeks
  // where every matchup is decided). If the Climb stopped at the last
  // COMPLETED history week instead, its endpoint could disagree with
  // what the Board shows moments later for the same team — two
  // contradictory numbers for the same fact. Append the live
  // current-week rank as the terminal point so both scenes always
  // agree; skip it only when history already carries that week.
  const hasCurrentWeekPoint = historyPoints.some((p) => p.week === data.currentWeek)
  const liveRank = hasCurrentWeekPoint ? undefined : rankAtWeek(data, teamId, data.currentWeek)
  const points: ClimbPoint[] =
    liveRank != null
      ? [...historyPoints, { week: data.currentWeek, rank: liveRank }]
      : historyPoints

  if (points.length < MIN_POINTS) return null

  // Ghost arcs for every other team, faded behind the focus line so
  // the climb reads against the rest of the league instead of in
  // isolation. Week-aligned with `points`: exactly the focus team's
  // weeks, in the same order, so the x-axis matches across all lines.
  //
  // Two honesty rules:
  //  - Per-point, not per-arc: a team missing a rank for one of these
  //    weeks just has THAT point omitted, not its whole arc — this
  //    keeps as much real comparison on screen as possible instead of
  //    discarding a team over one gap. (The alternative — dropping the
  //    entire arc on any missing week — was rejected because ESPN's
  //    partial-week history makes single-week gaps common, and would
  //    empty out the background for reasons unrelated to that team's
  //    actual season.) An arc that ends up with zero points after this
  //    filtering is dropped entirely — there is nothing to draw.
  //  - Same lookup as the focus team's terminal point: rankAtWeek()
  //    falls back to live `data.standings` for the current week, so a
  //    ghost arc's current-week point can never contradict the focus
  //    line's own current-week point for the same underlying fact.
  const otherArcs = data.teams
    .filter((t) => t.id !== teamId)
    .map((t) => ({
      teamId: t.id,
      points: points
        .map((p) => {
          const rank = rankAtWeek(data, t.id, p.week)
          return rank == null ? null : { week: p.week, rank }
        })
        .filter((p): p is ClimbPoint => p != null),
    }))
    .filter((arc) => arc.points.length > 0)

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
      otherArcs,
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
