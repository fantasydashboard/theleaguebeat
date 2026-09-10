/**
 * Fetch what the preseason issue needs, then assemble it.
 *
 * The issue's best material — the favourite, the draft-versus-roster
 * split, per-team cards, the schedule finding — all depends on
 * Sleeper's projections, which the Issue page does not otherwise load.
 * That payload is ~3MB.
 *
 * WHICH IS WHY THIS IS SEPARATE AND ASYNC. 3MB is fine on a
 * present-mode route somebody deliberately opened, and not fine as a
 * blocking load on the page everyone lands on. So the page renders
 * immediately from what it already has, calls this, and fills the
 * projection-backed sections in when they arrive. A reader gets a
 * complete-looking issue at once and a better one a moment later,
 * rather than a spinner.
 *
 * Every fetch is best-effort. Any failure returns null and the page
 * keeps whatever it already rendered.
 */
import {
  buildDraftBaseline,
  projectionsUrl,
  scoringFor,
  ASSUMED_SCORING,
  type SleeperScoring,
} from '../points/sleeperProjections'
import { rankRosterStrength, type RosterPlayer } from '../points/rosterStrength'
import {
  projectSeason,
  weeklyScoreSpread,
  type ScheduledGame,
} from '../points/projectedSeason'
import {
  findAdpDivergences,
  gradeTeamDrafts,
  type ValuedPick,
} from '../points/draftValue'
import { buildWireFacts } from '../points/wireFacts'
import {
  bridgePicks,
  buildPlayerIdBridge,
  SLEEPER_PLAYERS_URL,
  type BridgePlatform,
} from '../points/playerIdBridge'
import { buildPreseasonIssue, type PreseasonIssueTeam } from './buildPreseasonIssue'
import type { Issue } from './types'
import type { CategoryLeagueDataDraftPick } from '../types'
import type { LeagueTransaction } from '../transactions/types'
import type { CareerRecord } from '@/editorial/points/recordBook'

export interface LoadPreseasonIssueArgs {
  leagueName: string
  season: number
  platform: string
  /** The platform's own league id — Sleeper's, ESPN's, Yahoo's. */
  platformLeagueId: string
  picks: CategoryLeagueDataDraftPick[]
  transactions?: LeagueTransaction[]
  teamName: (teamId: string) => string
  team?: (teamId: string) => PreseasonIssueTeam | undefined
  /**
   * The league's lineup shape, off the contract.
   *
   * Roster strength cannot be ranked without it, and it used to be read
   * only from Sleeper's own league endpoint — so an ESPN league reached
   * `if (!rosterPositions?.length) return null` and the entire preseason
   * issue collapsed to whatever the page could render on its own.
   */
  rosterPositions?: string[]
  /** Career totals for the record book, and how many seasons are
   *  behind this one. Absent where a platform has no history walk. */
  careers?: CareerRecord[]
  seasonsPlayed?: number
}

/** One week's pairings from a raw Sleeper matchups payload. */
function pairWeek(
  week: number,
  entries: { roster_id?: number; matchup_id?: number | null }[],
): ScheduledGame[] {
  const byId = new Map<number, string[]>()
  for (const e of entries) {
    if (e?.matchup_id == null || e.roster_id == null) continue
    byId.set(e.matchup_id, [...(byId.get(e.matchup_id) ?? []), String(e.roster_id)])
  }
  const games: ScheduledGame[] = []
  for (const pair of byId.values()) {
    if (pair.length === 2) games.push({ week, homeTeamId: pair[0], awayTeamId: pair[1] })
  }
  return games
}

export async function loadPreseasonIssue(
  args: LoadPreseasonIssueArgs,
): Promise<Issue | null> {
  const { platform, platformLeagueId, season } = args
  if (args.picks.length === 0) return null

  try {
    // Scoring decides which ADP and points series apply. Sleeper
    // exposes its own settings; the others are not on the contract, so
    // they take the documented midpoint.
    let scoring: SleeperScoring = ASSUMED_SCORING
    // Contract first. Sleeper still refetches below because it needs the
    // scoring settings from the same call anyway.
    let rosterPositions: string[] | undefined = args.rosterPositions
    let previousLeagueId: string | undefined

    if (platform === 'sleeper') {
      const res = await fetch(`https://api.sleeper.app/v1/league/${platformLeagueId}`)
      if (!res.ok) return null
      const lg = (await res.json()) as {
        scoring_settings?: Record<string, unknown>
        roster_positions?: string[]
        previous_league_id?: string
      }
      rosterPositions = lg.roster_positions
      previousLeagueId = lg.previous_league_id
      scoring = scoringFor(lg.scoring_settings, lg.roster_positions)
    }

    const projRes = await fetch(projectionsUrl(season))
    if (!projRes.ok) return null
    const baseline = buildDraftBaseline(await projRes.json(), scoring)
    if (!baseline) return null

    // ESPN and Yahoo picks carry their own player ids. Bridging costs
    // the 15MB blob, paid only by the platforms that need it.
    let picks = args.picks
    if (platform !== 'sleeper') {
      const blobRes = await fetch(SLEEPER_PLAYERS_URL)
      if (!blobRes.ok) return null
      const bridge = buildPlayerIdBridge(await blobRes.json(), platform as BridgePlatform)
      const bridged = bridgePicks(picks, bridge)
      if (bridged.bridged === 0) return null
      picks = bridged.picks
    }

    // Draft value against ADP.
    const valued: ValuedPick[] = picks.map((p) => ({
      pickOverall: p.pickOverall,
      round: p.round,
      playerId: p.playerId,
      playerName: p.playerName,
      position: p.position,
      teamId: p.draftedByTeamId,
    }))
    const teamCount = new Set(valued.map((p) => p.teamId)).size
    const div = findAdpDivergences(valued, (p) => baseline.adpOf(p.playerId), teamCount)
    const graded = gradeTeamDrafts(div.all)

    /**
     * Position from the SAME source as the points, not the platform's.
     *
     * Sleeper's branch already reads `baseline.positionOf`; ESPN's read
     * ESPN's own string, which arrives as 'Unknown' whenever the player
     * lookup missed and can carry vocabulary the slot matcher does not
     * know. A position that does not match a slot cannot be started, so
     * the player sat on the roster scoring nothing — and a team whose
     * picks mostly failed that way projected 17.9 points a week in a
     * league where nobody is below 100.
     *
     * The platform's own string stays as the fallback: better a guess
     * than an empty slot when the baseline has never heard of a player.
     */
    const rosterPlayerFromPick = (p: { playerId: string; position: string; draftedByTeamId: string }): RosterPlayer => ({
      playerId: p.playerId,
      position: baseline.positionOf(p.playerId) ?? p.position,
      teamId: p.draftedByTeamId,
    })

    // Roster strength needs current rosters, which only Sleeper
    // exposes without auth. Elsewhere the DRAFTED roster stands in —
    // it is the same roster until somebody makes a move, and this is
    // the preseason issue.
    let players: RosterPlayer[]
    if (platform === 'sleeper') {
      const rostersRes = await fetch(
        `https://api.sleeper.app/v1/league/${platformLeagueId}/rosters`,
      )
      if (!rostersRes.ok) return null
      const rosters = (await rostersRes.json()) as {
        roster_id: number
        players?: string[] | null
      }[]
      players = rosters.flatMap((r) =>
        (r.players ?? []).map((playerId) => ({
          playerId,
          position: baseline.positionOf(playerId) ?? '',
          teamId: String(r.roster_id),
        })),
      )
      rosterPositions = rosterPositions ?? []
    } else {
      players = picks.map(rosterPlayerFromPick)
    }
    if (!rosterPositions?.length) return null

    const strength = rankRosterStrength(players, baseline.pointsOf, rosterPositions)
    if (strength.length < 4) return null

    // Where each team ranked on the roster it DRAFTED — the difference
    // is what waivers have already done.
    const draftedStrength = rankRosterStrength(
      picks.map(rosterPlayerFromPick),
      baseline.pointsOf,
      rosterPositions,
    )
    const draftRankBy = new Map(draftedStrength.map((t) => [t.teamId, t.rank]))

    // The schedule, for projected records and the strength-of-schedule
    // finding. Sleeper publishes every week before kickoff.
    let projected
    if (platform === 'sleeper') {
      const weeks = await Promise.all(
        Array.from({ length: 14 }, (_, i) =>
          fetch(`https://api.sleeper.app/v1/league/${platformLeagueId}/matchups/${i + 1}`)
            .then((r) => (r.ok ? r.json() : []))
            .then((ms) => pairWeek(i + 1, ms)),
        ),
      )
      const schedule = weeks.flat()
      let spread: number | undefined
      if (previousLeagueId) {
        const prior = await Promise.all(
          Array.from({ length: 14 }, (_, i) =>
            fetch(
              `https://api.sleeper.app/v1/league/${previousLeagueId}/matchups/${i + 1}`,
            ).then((r) => (r.ok ? r.json() : [])),
          ),
        )
        spread = weeklyScoreSpread(
          prior.flat().map((m: { points?: number }) => m?.points ?? 0),
        )
      }
      if (schedule.length > 0) {
        projected = projectSeason(
          strength.map((t) => ({ teamId: t.teamId, pointsPerWeek: t.pointsPerWeek })),
          schedule,
          spread,
        )
      }
    }

    return buildPreseasonIssue({
      leagueName: args.leagueName,
      season,
      careers: args.careers,
      seasonsPlayed: args.seasonsPlayed,
      strength,
      graded,
      projected,
      wire: buildWireFacts(args.transactions),
      draftRank: (teamId) => draftRankBy.get(teamId),
      teamName: args.teamName,
      team: args.team,
      formatLabel: baseline.formatLabel,
    })
  } catch {
    // Offline, rate-limited, or an upstream shape change. The page
    // keeps whatever it already rendered.
    return null
  }
}
