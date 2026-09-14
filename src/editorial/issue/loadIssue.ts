/**
 * One entry point for "the issue for this league, right now".
 *
 * The page and present mode both call this, which is what stops them
 * describing the same week differently. It is also the only place that
 * decides WHICH issue a league is due — before kickoff the preseason
 * one, after it the weekly one — so that judgement lives once instead
 * of in every caller.
 *
 * The split is on evidence, not on the calendar: a league with a
 * completed week gets the weekly issue because there are results to
 * write about, and one without gets the preseason issue because
 * projections are all that exist. A date would be wrong for every
 * league that drafts late or plays a short season.
 */
import { computePointsPowerScores } from '../points/powerScore'
import { previousPowerRanks } from '../points/previousBoard'
import { buildWeeklyIssue } from './buildWeeklyIssue'
import { loadPreseasonIssue } from './loadPreseasonIssue'
import type { Issue } from './types'
import type { LeagueDataH2HPoints } from '../types'

export interface IssueTeamVisual {
  name: string
  avatarUrl?: string
  avatarColor?: string
  ownerInitials?: string
}

export interface LoadIssueArgs {
  data: LeagueDataH2HPoints
  leagueName: string
  platform: string
  /** The platform's own league id — Sleeper's, ESPN's, Yahoo's. */
  platformLeagueId: string
  teamName: (teamId: string) => string
  team?: (teamId: string) => IssueTeamVisual | undefined
  playerImage?: (playerId: string) => string | null | undefined
}

/** Whether a week has actually finished, which is what the weekly
 *  issue needs. Sleeper points accumulate live, so "everyone has
 *  scored" is not the same question. */
export function hasCompletedWeek(data: LeagueDataH2HPoints): boolean {
  return (data.weeklyScores ?? []).length > 0
}

export async function loadIssue(args: LoadIssueArgs): Promise<Issue | null> {
  const { data } = args

  if (!hasCompletedWeek(data)) {
    const picks = [...(data.draft?.picks ?? [])]
    if (picks.length === 0) return null
    return loadPreseasonIssue({
      leagueName: args.leagueName,
      season: data.currentSeason,
      platform: args.platform,
      platformLeagueId: args.platformLeagueId,
      picks,
      transactions: data.transactions,
      teamName: args.teamName,
      team: args.team,
      rosterPositions: data.rosterPositions,
      careers: data.careerRecords,
      // Completed seasons behind this one. `seasonHistory` only holds
      // finished seasons, so its length IS the count.
      seasonsPlayed: (data.seasonHistory ?? []).length,
    })
  }

  // In season everything the issue needs is already on the contract —
  // no projections fetch, so this resolves immediately.
  const power = computePointsPowerScores(data)
  const weeks = [...new Set((data.weeklyScores ?? []).map((s) => s.week))]
  const coveredWeek = Math.max(...weeks)

  // Pregame expectation for the upset gate: each team's scoring
  // average across the weeks BEFORE the covered one. The covered
  // week is excluded on principle — an upset must not partially
  // justify itself with the very score that caused it.
  const priorScores = (data.weeklyScores ?? []).filter((s) => s.week < coveredWeek)
  const priorWeeksPlayed = new Set(priorScores.map((s) => s.week)).size
  const priorTotals = new Map<string, { sum: number; n: number }>()
  for (const s of priorScores) {
    const t = priorTotals.get(s.teamId) ?? { sum: 0, n: 0 }
    t.sum += s.points
    t.n += 1
    priorTotals.set(s.teamId, t)
  }

  return buildWeeklyIssue({
    leagueName: args.leagueName,
    season: data.currentSeason,
    // The week the issue COVERS is the last one that finished, not the
    // one in progress. Publishing "Week 6" on Tuesday about week 5's
    // results is how an issue ends up misdating itself.
    week: coveredWeek,
    priorPointsPerWeek: (id: string) => {
      const t = priorTotals.get(id)
      return t && t.n > 0 ? t.sum / t.n : undefined
    },
    priorWeeksPlayed,
    regularSeasonEndWeek: data.regularSeasonEndWeek,
    playoffCutoff: data.playoffCutoff,
    power,
    records: (data.standings ?? []).map((s) => ({
      teamId: s.teamId,
      wins: s.catWins,
      losses: s.catLosses,
      ties: s.catTies,
    })),
    results: data.previousWeekMatchups,
    transactions: data.transactions,
    previousPowerRank: (() => {
      const prior = previousPowerRanks(data)
      return prior ? (id: string) => prior.get(id) : undefined
    })(),
    teamName: args.teamName,
    team: args.team,
    playerImage: args.playerImage,
  })
}
