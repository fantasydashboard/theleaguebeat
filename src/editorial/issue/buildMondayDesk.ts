/**
 * The Monday desk: the week's endgame, live on the issue page.
 *
 * By Monday the week has split — most results are in, a few games
 * hang on the night's players — and the site's whole Monday question
 * is "who needs what". This block answers it in two lists and one
 * pill: STILL ALIVE (the need, the lead, the live odds), DONE AND
 * DUSTED (finals plus the games that are over in every sense but the
 * paperwork), and an UPSET WATCH pill on any live game where the
 * pregame underdog is currently ahead.
 *
 * EPHEMERAL BY DESIGN. Assembled from live matchups on open, stored
 * nowhere, part of no Issue object — so archives never carry a score
 * that was minutes old, and Tuesday morning the weekly issue (with
 * its upset section) simply takes over. Same reasoning as the live
 * deck, which is also why the need math here matches it exactly: the
 * opponent's projected final minus what this side has scored.
 *
 * GATED ON EVIDENCE, NOT THE CALENDAR. The desk appears when at
 * least one game is decided and at least one is not. In practice
 * that is Sunday night through Tuesday; no weekday is consulted.
 * "Decided" includes the effectively-decided — a lead bigger than
 * everything the trailer has left — because Sleeper keeps a matchup
 * "live" until the week closes, and a 30-point lead over a team
 * projecting 8 more is not a story with suspense in it.
 *
 * THE WATCH RULE is the upset detector's, applied mid-flight: the
 * current leader came in under 35% by prior-week scoring (under 25%
 * is the heist), stated with the rank framing and the pregame
 * percentage as the receipt. Tuesday's issue then confirms it as an
 * upset or records the escape — the desk is the cliffhanger, the
 * issue is the resolution.
 */
import {
  winProbability,
  UPSET_MAX_PROB,
  HEIST_MAX_PROB,
  MIN_PRIOR_WEEKS,
} from '../points/upsets'
import type { LeagueDataPointsMatchup } from '../types'

export interface MondayDeskTeam {
  name: string
  avatarUrl?: string
  avatarColor?: string
  ownerInitials?: string
}

export interface MondayDeskInput {
  matchups: readonly LeagueDataPointsMatchup[]
  /** Scoring average over completed weeks, for the watch pill. The
   *  in-flight week is never in `weeklyScores`, so no exclusion is
   *  needed here — completed weeks ARE the pregame record. */
  priorPointsPerWeek?: (teamId: string) => number | undefined
  priorWeeks?: number
  /** Current board rank, for the watch sentence. */
  priorRank?: (teamId: string) => number | undefined
  teamName: (teamId: string) => string
  team?: (teamId: string) => MondayDeskTeam | undefined
}

export interface MondayDeskRow {
  matchupId: string
  title: string
  sub: string
  score: string
  watch?: 'upset' | 'heist'
  teamId: string
  logoUrl?: string
  logoColor?: string
  logoInitials?: string
}

export interface MondayDesk {
  headline: string
  support: string
  alive: MondayDeskRow[]
  decided: MondayDeskRow[]
}

const round1 = (n: number) => Math.round(n * 10) / 10

/** Effectively over: final, near-certain, or the trailer cannot get
 *  there even hitting their whole remaining projection. */
function isDecided(m: LeagueDataPointsMatchup): boolean {
  if (m.status === 'final') return true
  if (m.status === 'upcoming') return false
  const margin = Math.abs(m.homePoints - m.awayPoints)
  if (margin === 0) return false
  const prob = Math.max(m.homeWinProb ?? 0, m.awayWinProb ?? 0)
  if (prob >= 0.97) return true
  const trailerHasHome = m.homePoints < m.awayPoints
  const trailerPoints = trailerHasHome ? m.homePoints : m.awayPoints
  const trailerProjected = trailerHasHome ? m.homeProjected : m.awayProjected
  if (trailerProjected === undefined) return false
  const trailerRemaining = Math.max(0, trailerProjected - trailerPoints)
  return trailerRemaining < margin
}

export function buildMondayDesk(input: MondayDeskInput): MondayDesk | null {
  const games = input.matchups.filter(
    (m) => m.homeTeamId && m.awayTeamId && m.status !== 'upcoming',
  )
  const decidedGames = games.filter(isDecided)
  const aliveGames = games.filter((g) => !isDecided(g))
  // A desk needs a split week: all-alive belongs to the matchups
  // page, all-decided belongs to Tuesday's issue.
  if (decidedGames.length === 0 || aliveGames.length === 0) return null

  const visual = (teamId: string) => {
    const t = input.team?.(teamId)
    return {
      teamId,
      logoUrl: t?.avatarUrl,
      logoColor: t?.avatarColor,
      logoInitials: t?.ownerInitials,
    }
  }

  /** The watch level for a live game, when the priors can support one. */
  const watchFor = (m: LeagueDataPointsMatchup): 'upset' | 'heist' | undefined => {
    if (!input.priorPointsPerWeek || (input.priorWeeks ?? 0) < MIN_PRIOR_WEEKS) return undefined
    if (m.homePoints === m.awayPoints) return undefined
    const leaderId = m.homePoints > m.awayPoints ? m.homeTeamId : m.awayTeamId
    const trailerId = m.homePoints > m.awayPoints ? m.awayTeamId : m.homeTeamId
    const leaderMean = input.priorPointsPerWeek(leaderId)
    const trailerMean = input.priorPointsPerWeek(trailerId)
    if (leaderMean === undefined || trailerMean === undefined) return undefined
    const pregame = winProbability(leaderMean - trailerMean)
    if (pregame >= UPSET_MAX_PROB) return undefined
    return pregame < HEIST_MAX_PROB ? 'heist' : 'upset'
  }

  const pregamePct = (m: LeagueDataPointsMatchup): number => {
    const leaderId = m.homePoints > m.awayPoints ? m.homeTeamId : m.awayTeamId
    const trailerId = m.homePoints > m.awayPoints ? m.awayTeamId : m.homeTeamId
    const p = winProbability(
      (input.priorPointsPerWeek?.(leaderId) ?? 0) - (input.priorPointsPerWeek?.(trailerId) ?? 0),
    )
    return Math.round(p * 100)
  }

  const alive: MondayDeskRow[] = aliveGames.map((m) => {
    const homeLeads = m.homePoints >= m.awayPoints
    const leaderId = homeLeads ? m.homeTeamId : m.awayTeamId
    const trailerId = homeLeads ? m.awayTeamId : m.homeTeamId
    const leaderName = input.teamName(leaderId)
    const trailerName = input.teamName(trailerId)
    const margin = round1(Math.abs(m.homePoints - m.awayPoints))
    const trailerPoints = homeLeads ? m.awayPoints : m.homePoints
    const leaderProjected = homeLeads ? m.homeProjected : m.awayProjected
    const needs =
      leaderProjected !== undefined
        ? Math.max(0, round1(leaderProjected - trailerPoints))
        : undefined
    const trailerWinProb = homeLeads ? m.awayWinProb : m.homeWinProb
    const watch = watchFor(m)

    if (watch) {
      const wr = input.priorRank?.(leaderId)
      const lr = input.priorRank?.(trailerId)
      const rankBit = wr && lr ? `No. ${wr} lead No. ${lr}` : `${leaderName} lead`
      return {
        matchupId: m.id,
        title: `${leaderName} lead ${trailerName}`,
        sub: `${rankBit} · pregame chance ${pregamePct(m)}%`,
        score: `${round1(Math.max(m.homePoints, m.awayPoints))} – ${round1(Math.min(m.homePoints, m.awayPoints))}`,
        watch,
        ...visual(leaderId),
      }
    }

    return {
      matchupId: m.id,
      title: needs !== undefined ? `${trailerName} need ${needs}` : `${trailerName} trail`,
      sub: [
        `${leaderName} lead by ${margin}`,
        trailerWinProb !== undefined ? `${Math.round(trailerWinProb * 100)}% to win` : '',
      ]
        .filter(Boolean)
        .join(' · '),
      score: `${round1(Math.max(m.homePoints, m.awayPoints))} – ${round1(Math.min(m.homePoints, m.awayPoints))}`,
      ...visual(trailerId),
    }
  })

  // Watch rows lead (heist before upset), then closest game first —
  // the pill is the story, the margin is the tiebreak.
  const level = (r: MondayDeskRow) => (r.watch === 'heist' ? 0 : r.watch === 'upset' ? 1 : 2)
  const marginOf = new Map(
    aliveGames.map((g) => [g.id, Math.abs(g.homePoints - g.awayPoints)]),
  )
  alive.sort(
    (a, b) =>
      level(a) - level(b) ||
      (marginOf.get(a.matchupId) ?? 0) - (marginOf.get(b.matchupId) ?? 0),
  )

  const decided: MondayDeskRow[] = decidedGames.map((m) => {
    const homeWon = m.homePoints >= m.awayPoints
    const winnerId = homeWon ? m.homeTeamId : m.awayTeamId
    const loserId = homeWon ? m.awayTeamId : m.homeTeamId
    const margin = round1(Math.abs(m.homePoints - m.awayPoints))
    return {
      matchupId: m.id,
      title:
        m.status === 'final'
          ? `${input.teamName(winnerId)} beat ${input.teamName(loserId)}`
          : `${input.teamName(winnerId)} have it put away`,
      sub: m.status === 'final' ? `by ${margin}` : `Up ${margin}, more than ${input.teamName(loserId)} have left`,
      score: `${round1(Math.max(m.homePoints, m.awayPoints))} – ${round1(Math.min(m.homePoints, m.awayPoints))}`,
      ...visual(winnerId),
    }
  })

  // The headline promotes the live upset when there is one; otherwise
  // the closest game carries it.
  const lead = alive[0]
  let headline: string
  let support: string
  if (lead.watch) {
    headline = lead.watch === 'heist' ? 'A heist is live.' : 'An upset is live.'
    support = `${lead.title}. ${lead.sub}.`
  } else {
    headline = `${alive.length} game${alive.length === 1 ? '' : 's'} still alive.`
    support = `${lead.title} — ${lead.sub}.`
  }

  return { headline, support, alive, decided }
}
