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
  /** Record BEFORE this week counts, so the desk can show what each
   *  side's record becomes once a decided game lands. */
  recordOf?: (teamId: string) => { wins: number; losses: number; ties: number } | undefined
  /** Starters whose NFL game has not kicked off, so the desk can name
   *  who a side is waiting on rather than only how much it needs. */
  stillToPlay?: (teamId: string) => readonly { name: string; points: number }[] | undefined
  teamName: (teamId: string) => string
  team?: (teamId: string) => MondayDeskTeam | undefined
}

/** One side of a game, as the row draws it. */
export interface MondayDeskSide {
  teamId: string
  name: string
  points: number
  /** Record once this game counts. Decided games only — an
   *  unfinished one has no result to add. */
  record?: string
  leading: boolean
  logoUrl?: string
  logoColor?: string
  logoInitials?: string
}

export interface MondayDeskRow {
  matchupId: string
  /** Leader first, so the crests and the scores agree. */
  left: MondayDeskSide
  right: MondayDeskSide
  /** The story. The names live on the sides, so this is only what
   *  the scoreline cannot say by itself. */
  sub: string
  watch?: 'upset' | 'heist'
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

  /** A side, optionally carrying the record this game would give it. */
  const side = (
    teamId: string,
    points: number,
    leading: boolean,
    outcome?: 'win' | 'loss',
  ): MondayDeskSide => {
    const t = input.team?.(teamId)
    const base = input.recordOf?.(teamId)
    let record: string | undefined
    if (base && outcome) {
      const w = base.wins + (outcome === 'win' ? 1 : 0)
      const l = base.losses + (outcome === 'loss' ? 1 : 0)
      record = base.ties > 0 ? `${w}-${l}-${base.ties}` : `${w}-${l}`
    }
    return {
      teamId,
      name: input.teamName(teamId),
      points: round1(points),
      record,
      leading,
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

  /** "Mahomes and Rice" / "Mahomes, Rice and 2 more". */
  const namePending = (teamId: string): string => {
    const left = (input.stillToPlay?.(teamId) ?? [])
      .slice()
      .sort((a, b) => b.points - a.points)
    if (left.length === 0) return ''
    const shown = left.slice(0, 2).map((p) => p.name)
    const rest = left.length - shown.length
    const joined = shown.length === 2 ? `${shown[0]} and ${shown[1]}` : shown[0]
    return rest > 0 ? `${joined} and ${rest} more` : joined
  }

  const alive: MondayDeskRow[] = aliveGames.map((m) => {
    const homeLeads = m.homePoints >= m.awayPoints
    const leaderId = homeLeads ? m.homeTeamId : m.awayTeamId
    const trailerId = homeLeads ? m.awayTeamId : m.homeTeamId
    const leaderPts = homeLeads ? m.homePoints : m.awayPoints
    const trailerPts = homeLeads ? m.awayPoints : m.homePoints
    const margin = round1(leaderPts - trailerPts)
    const leaderProjected = homeLeads ? m.homeProjected : m.awayProjected
    const needs =
      leaderProjected !== undefined
        ? Math.max(0, round1(leaderProjected - trailerPts))
        : undefined
    const watch = watchFor(m)

    // Who each side is still waiting on. When only the trailer has
    // football left the ask is a flat target; when both do it is a
    // race, and saying "needs 3.3" would quietly ignore the points
    // the leader is about to add.
    const trailerLeft = namePending(trailerId)
    const leaderLeft = namePending(leaderId)

    let story: string
    if (needs === undefined) {
      story = `${input.teamName(leaderId)} lead by ${margin}`
    } else if (trailerLeft && leaderLeft) {
      story =
        `${input.teamName(trailerId)} need ${needs} from ${trailerLeft}, ` +
        `with ${leaderLeft} still to play for ${input.teamName(leaderId)}`
    } else if (trailerLeft) {
      story = `${input.teamName(trailerId)} need ${needs} from ${trailerLeft}`
    } else {
      story = `${input.teamName(trailerId)} need ${needs}`
    }

    if (watch) {
      const wr = input.priorRank?.(leaderId)
      const lr = input.priorRank?.(trailerId)
      const rankBit = wr && lr ? `No. ${wr} lead No. ${lr}` : `${input.teamName(leaderId)} lead`
      return {
        matchupId: m.id,
        left: side(leaderId, leaderPts, true),
        right: side(trailerId, trailerPts, false),
        sub: `${rankBit} · pregame chance ${pregamePct(m)}% · ${story}`,
        watch,
      }
    }

    return {
      matchupId: m.id,
      left: side(leaderId, leaderPts, true),
      right: side(trailerId, trailerPts, false),
      sub: story,
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
    const winnerPts = homeWon ? m.homePoints : m.awayPoints
    const loserPts = homeWon ? m.awayPoints : m.homePoints
    const margin = round1(winnerPts - loserPts)
    const loserProjected = homeWon ? m.awayProjected : m.homeProjected
    const loserLeft =
      loserProjected !== undefined ? Math.max(0, round1(loserProjected - loserPts)) : undefined

    // A final needs no explanation. A game that is merely over needs
    // the arithmetic that makes it over.
    const sub =
      m.status === 'final'
        ? `Final · won by ${margin}`
        : loserLeft !== undefined
          ? `${input.teamName(loserId)} need ${margin} with ${loserLeft} left to play`
          : `Locked · ${input.teamName(winnerId)} by ${margin}`

    return {
      matchupId: m.id,
      left: side(winnerId, winnerPts, true, 'win'),
      right: side(loserId, loserPts, false, 'loss'),
      sub,
    }
  })

  // The headline promotes the live upset when there is one; otherwise
  // it counts what is left and lets the rows tell each story once.
  const lead = alive[0]
  const headline = lead.watch
    ? lead.watch === 'heist'
      ? 'A heist is live.'
      : 'An upset is live.'
    : `${alive.length} game${alive.length === 1 ? '' : 's'} still alive.`
  const support = lead.watch
    ? `${lead.left.name} lead ${lead.right.name}. ${lead.sub}.`
    : `${decided.length} decided. ${lead.sub}.`

  return { headline, support, alive, decided }
}
