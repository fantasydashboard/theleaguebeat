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
    })
  }

  // In season everything the issue needs is already on the contract —
  // no projections fetch, so this resolves immediately.
  const power = computePointsPowerScores(data)
  const weeks = [...new Set((data.weeklyScores ?? []).map((s) => s.week))]

  return buildWeeklyIssue({
    leagueName: args.leagueName,
    season: data.currentSeason,
    // The week the issue COVERS is the last one that finished, not the
    // one in progress. Publishing "Week 6" on Tuesday about week 5's
    // results is how an issue ends up misdating itself.
    week: Math.max(...weeks),
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
