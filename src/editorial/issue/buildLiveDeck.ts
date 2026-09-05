/**
 * What every team needs, right now.
 *
 * The only deck that cannot come from the issue. By Monday night the
 * numbers are minutes old, and a frozen artifact would be presenting a
 * score that has already changed — so this is assembled on open, every
 * time, and stored nowhere.
 *
 * It returns an `Issue` all the same, so `deckFromIssue` renders it
 * exactly like any other. A live deck is an issue nobody kept.
 *
 * WHAT "NEEDS" MEANS, precisely. The platform publishes a projected
 * final for each side, updated for the games already played. A team's
 * requirement is therefore the opponent's projected final minus what
 * this team has scored so far — the points still to come that would
 * see them level. That is a real number off the contract, not a model
 * of our own, and it is why this deck can exist at all.
 *
 * WHAT IT REFUSES TO SAY. Not WHICH players are still to play. That
 * needs per-player game status the points adapters do not fetch, and
 * "two games left" invented from a roster count would be wrong the
 * first time a manager benched somebody. The aggregate is honest; the
 * roster detail would not be.
 */
import type { LeagueDataPointsMatchup } from '../types'
import type { Issue, IssueRow, IssueSection } from './types'

export interface LiveDeckTeam {
  name: string
  avatarUrl?: string
  avatarColor?: string
  ownerInitials?: string
}

export interface LiveDeckInput {
  leagueName: string
  season: number
  week: number
  matchups: readonly LeagueDataPointsMatchup[]
  teamName: (teamId: string) => string
  team?: (teamId: string) => LiveDeckTeam | undefined
}

function visual(input: LiveDeckInput, teamId: string) {
  const t = input.team?.(teamId)
  if (!t) return {}
  return {
    teamId,
    logoUrl: t.avatarUrl,
    logoColor: t.avatarColor,
    logoInitials: t.ownerInitials,
  }
}

const round1 = (n: number) => Math.round(n * 10) / 10

/**
 * The line for one game.
 *
 * Three states, three different sentences, because a finished game and
 * a game that has not started are not the same claim in different
 * tenses.
 */
function describe(
  m: LeagueDataPointsMatchup,
  homeName: string,
  awayName: string,
): { title: string; subtitle: string; stat?: string } {
  const homeLead = m.homePoints - m.awayPoints
  const leaderName = homeLead >= 0 ? homeName : awayName
  const trailerName = homeLead >= 0 ? awayName : homeName

  if (m.status === 'final') {
    const margin = round1(Math.abs(homeLead))
    return {
      title: `${leaderName} beat ${trailerName}`,
      subtitle: margin === 0 ? 'Tied' : `by ${margin}`,
      stat: `${round1(Math.max(m.homePoints, m.awayPoints))} – ${round1(Math.min(m.homePoints, m.awayPoints))}`,
    }
  }

  if (m.status === 'upcoming' || (m.homePoints === 0 && m.awayPoints === 0)) {
    const proj =
      m.homeProjected !== undefined && m.awayProjected !== undefined
        ? `Projected ${round1(m.homeProjected)} – ${round1(m.awayProjected)}`
        : 'Not started'
    return { title: `${homeName} vs ${awayName}`, subtitle: proj }
  }

  // Live. The requirement is the opponent's projected final minus what
  // this side already has — the points still to come that would draw
  // them level.
  const trailerHasHome = homeLead < 0
  const trailerPoints = trailerHasHome ? m.homePoints : m.awayPoints
  const leaderProjected = trailerHasHome ? m.awayProjected : m.homeProjected
  const needs =
    leaderProjected !== undefined
      ? Math.max(0, round1(leaderProjected - trailerPoints))
      : undefined

  const winProb = trailerHasHome ? m.homeWinProb : m.awayWinProb
  const chance = winProb !== undefined ? `${Math.round(winProb * 100)}% to win` : ''

  return {
    title: needs !== undefined ? `${trailerName} need ${needs}` : `${trailerName} trail`,
    subtitle: [
      `${leaderName} lead ${round1(Math.abs(homeLead))}`,
      chance,
    ]
      .filter(Boolean)
      .join(' · '),
    stat: `${round1(Math.max(m.homePoints, m.awayPoints))} – ${round1(Math.min(m.homePoints, m.awayPoints))}`,
  }
}

/**
 * Returns null when there is nothing in flight.
 *
 * A deck of games nobody has played is a fixture list, and the issue
 * already covers the schedule.
 */
export function buildLiveDeck(input: LiveDeckInput): Issue | null {
  const games = input.matchups.filter((m) => m.homeTeamId && m.awayTeamId)
  if (games.length === 0) return null

  const anyLive = games.some((m) => m.status === 'live')
  const anyFinal = games.some((m) => m.status === 'final')
  if (!anyLive && !anyFinal) return null

  const rows: IssueRow[] = games
    // Closest first: the game with everything still to play for is the
    // one the room wants to hear about, and it stops the deck opening
    // on a blowout that was over by Sunday afternoon.
    .slice()
    .sort(
      (a, b) =>
        Math.abs(a.homePoints - a.awayPoints) - Math.abs(b.homePoints - b.awayPoints),
    )
    .map((m) => {
      const home = input.teamName(m.homeTeamId)
      const away = input.teamName(m.awayTeamId)
      const d = describe(m, home, away)
      const trailing = m.homePoints < m.awayPoints ? m.homeTeamId : m.awayTeamId
      // No `lead`: that gutter is for a rank or a slot, and a stat
      // label put there printed "margin" down the left edge of every
      // list slide.
      return {
        label: d.title,
        sub: d.subtitle,
        value: d.stat,
        ...visual(input, trailing),
      }
    })

  const section: IssueSection = {
    id: 'this-week',
    eyebrow: anyLive ? 'In flight' : 'The week',
    headline: anyLive
      ? 'What everyone still needs.'
      : `Week ${input.week}, settled.`,
    support: anyLive
      ? 'Points still required to draw level, against the platform’s projected ' +
        'finals. Closest game first.'
      : 'Final scores, closest game first.',
    rows,
    priority: 10,
  }

  return {
    leagueName: input.leagueName,
    season: input.season,
    week: input.week,
    basis: anyLive ? 'live scoring' : 'final scores',
    sections: [section],
  }
}
