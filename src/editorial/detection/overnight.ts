/**
 * Overnight-delta detectors — emit StoryCandidate from the
 * snapshot diff (today's live data vs the previous saved snapshot).
 *
 * Editorial purpose: drives The Wire's "since your last visit"
 * stories. The most relevant Wire content for category leagues —
 * cat-by-cat overnight movement is the heartbeat of the format.
 *
 * Story types:
 *   - matchup-tipped       : your matchup flipped sides overnight
 *   - matchup-pulse-up     : your matchup score improved (no flip)
 *   - matchup-pulse-down   : your matchup score worsened (no flip)
 *   - rank-shift-up        : a team climbed ≥2 ranks overnight
 *   - rank-shift-down      : a team fell ≥2 ranks overnight
 *
 * My-team-first weight boost: stories involving the viewing user's
 * team get +15 weight so they outrank generic league movement.
 */

import type { CategoryLeagueData } from '../types'
import type { IssueContext, StoryCandidate } from './types'
import { ALL_ACTIVE_STAGES } from './types'
import { signature } from './helpers'

export function detectOvernightStories(
  data: CategoryLeagueData,
  _context: IssueContext,
): StoryCandidate[] {
  const delta = data.snapshotDelta
  if (!delta) return []

  const out: StoryCandidate[] = []
  const myTeamId = data.teams.find((t) => t.isMyTeam)?.id ?? null

  // Skip if the comparison is too old to be "overnight" — anything
  // past 3 days reads as "since your last visit" but the data
  // changed too much to be a single editorial event.
  if (delta.daysSince > 3) return out

  /* ── Matchup shifts ──────────────────────────────────────── */
  for (const m of delta.matchupShifts) {
    const involvesMe =
      myTeamId != null &&
      (m.homeTeamId === myTeamId || m.awayTeamId === myTeamId)

    if (m.tipped) {
      out.push(buildMatchupTipped(m, data, involvesMe, delta.daysSince))
    } else {
      // No flip — but score moved. Worth surfacing if it moved
      // material (≥2 cats one direction).
      const swing = Math.abs(m.homeCatDelta - m.awayCatDelta)
      if (swing < 2) continue
      // Determine which side improved most.
      const homeImproved = m.homeCatDelta > m.awayCatDelta
      out.push(buildMatchupPulse(m, data, homeImproved, swing, involvesMe, delta.daysSince))
    }
  }

  /* ── Rank shifts ─────────────────────────────────────────── */
  for (const r of delta.rankShifts) {
    if (Math.abs(r.delta) < 2) continue  // ignore single-spot drift
    const isMyTeam = myTeamId === r.teamId
    out.push(buildRankShift(r, data, isMyTeam, delta.daysSince))
  }

  return out
}

/* ─────────────────────────────────────────────────────────────────
   STORY BUILDERS
───────────────────────────────────────────────────────────────── */

function buildMatchupTipped(
  m: NonNullable<CategoryLeagueData['snapshotDelta']>['matchupShifts'][number],
  data: CategoryLeagueData,
  involvesMe: boolean,
  daysSince: number,
): StoryCandidate {
  const homeName = teamNameOf(data, m.homeTeamId)
  const awayName = teamNameOf(data, m.awayTeamId)
  const nowLeaderName =
    m.leadNow === 'home' ? homeName : m.leadNow === 'away' ? awayName : 'Nobody'
  const thenLeaderName =
    m.leadThen === 'home' ? homeName : m.leadThen === 'away' ? awayName : 'Nobody'

  return {
    type: 'matchup-tipped',
    category: 'matchup',
    // Tipped matchups are the most dramatic overnight movement
    // editorially — base 82, +15 if it's the viewer's matchup.
    weight: involvesMe ? 97 : 82,
    freshness: freshnessForDaysSince(daysSince),
    scope: 'matchup',
    teamIds: [m.homeTeamId, m.awayTeamId],
    seasonStages: ALL_ACTIVE_STAGES,
    context: {
      matchupId: m.matchupId,
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      homeTeamName: homeName,
      awayTeamName: awayName,
      leadNow: m.leadNow,
      leadThen: m.leadThen,
      nowLeaderName,
      thenLeaderName,
      homeCatDelta: m.homeCatDelta,
      awayCatDelta: m.awayCatDelta,
      involvesMe,
      daysSince,
      headline: matchupTippedHeadline(nowLeaderName, thenLeaderName, involvesMe),
      summary: matchupTippedSummary(homeName, awayName, m),
    },
    signature: signature(['matchup-tipped', m.matchupId, daysSince]),
  }
}

function buildMatchupPulse(
  m: NonNullable<CategoryLeagueData['snapshotDelta']>['matchupShifts'][number],
  data: CategoryLeagueData,
  homeImproved: boolean,
  swing: number,
  involvesMe: boolean,
  daysSince: number,
): StoryCandidate {
  const homeName = teamNameOf(data, m.homeTeamId)
  const awayName = teamNameOf(data, m.awayTeamId)
  const winnerName = homeImproved ? homeName : awayName
  const loserName = homeImproved ? awayName : homeName

  // From the viewer's POV: are they the winner of this swing?
  const myTeamId = data.teams.find((t) => t.isMyTeam)?.id
  const myImproved =
    myTeamId != null &&
    ((homeImproved && myTeamId === m.homeTeamId) ||
      (!homeImproved && myTeamId === m.awayTeamId))

  return {
    type: myImproved
      ? 'matchup-pulse-up'
      : involvesMe
      ? 'matchup-pulse-down'
      : 'matchup-pulse-up',
    category: 'matchup',
    // Non-tipped pulses are quieter than flips. Base 60, +15 if mine.
    weight: involvesMe ? 75 + Math.min(10, swing * 2) : 60 + Math.min(10, swing * 2),
    freshness: freshnessForDaysSince(daysSince),
    scope: 'matchup',
    teamIds: [m.homeTeamId, m.awayTeamId],
    seasonStages: ALL_ACTIVE_STAGES,
    context: {
      matchupId: m.matchupId,
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      homeTeamName: homeName,
      awayTeamName: awayName,
      winnerName,
      loserName,
      swing,
      involvesMe,
      myImproved,
      daysSince,
      headline: matchupPulseHeadline(winnerName, swing, myImproved, involvesMe),
      summary: `${winnerName} gained ${swing} cat${swing === 1 ? '' : 's'} on ${loserName}.`,
    },
    signature: signature(['matchup-pulse', m.matchupId, daysSince]),
  }
}

function buildRankShift(
  r: NonNullable<CategoryLeagueData['snapshotDelta']>['rankShifts'][number],
  data: CategoryLeagueData,
  isMyTeam: boolean,
  daysSince: number,
): StoryCandidate {
  const teamName = teamNameOf(data, r.teamId)
  const climbed = r.delta > 0
  const moves = Math.abs(r.delta)

  return {
    type: climbed ? 'rank-shift-up' : 'rank-shift-down',
    category: 'standings',
    weight: isMyTeam ? 78 + moves * 2 : 58 + moves * 2,
    freshness: freshnessForDaysSince(daysSince),
    scope: 'team',
    teamIds: [r.teamId],
    seasonStages: ALL_ACTIVE_STAGES,
    context: {
      teamId: r.teamId,
      teamName,
      previousRank: r.previousRank,
      currentRank: r.currentRank,
      delta: r.delta,
      moves,
      isMyTeam,
      daysSince,
      headline: rankShiftHeadline(teamName, r.previousRank, r.currentRank, isMyTeam),
      summary: `From #${r.previousRank} to #${r.currentRank}${
        daysSince === 1 ? ' overnight' : ` in ${daysSince} days`
      }.`,
    },
    signature: signature(['rank-shift', r.teamId, daysSince]),
  }
}

/* ─────────────────────────────────────────────────────────────────
   COPY
───────────────────────────────────────────────────────────────── */

function matchupTippedHeadline(
  nowLeader: string,
  _thenLeader: string,
  involvesMe: boolean,
): string {
  if (involvesMe) return `Your matchup flipped — ${nowLeader} now leads.`
  return `${nowLeader} took the lead overnight.`
}

function matchupTippedSummary(
  homeName: string,
  awayName: string,
  m: NonNullable<CategoryLeagueData['snapshotDelta']>['matchupShifts'][number],
): string {
  const homeNet = m.homeCatDelta
  const awayNet = m.awayCatDelta
  return `${homeName} ${formatDelta(homeNet)}, ${awayName} ${formatDelta(awayNet)}.`
}

function formatDelta(d: number): string {
  if (d > 0) return `+${d} cats`
  if (d < 0) return `${d} cats`
  return 'unchanged'
}

function matchupPulseHeadline(
  winnerName: string,
  swing: number,
  myImproved: boolean,
  involvesMe: boolean,
): string {
  if (myImproved) return `You picked up ${swing} cats overnight.`
  if (involvesMe) return `${winnerName} pulled away on you.`
  return `${winnerName} stretched the lead.`
}

function rankShiftHeadline(
  teamName: string,
  prev: number,
  now: number,
  isMyTeam: boolean,
): string {
  const moves = Math.abs(prev - now)
  const verb = now < prev ? 'climbed' : 'slipped'
  if (isMyTeam) {
    return now < prev
      ? `You climbed to #${now}.`
      : `You slipped to #${now}.`
  }
  return `${teamName} ${verb} ${moves} ${moves === 1 ? 'spot' : 'spots'}.`
}

/* ─────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────── */

/**
 * Freshness for snapshot-delta stories. Yesterday = 1.0, two days
 * = 0.7, three days = 0.45, beyond = filtered upstream.
 */
function freshnessForDaysSince(days: number): number {
  if (days <= 1) return 1.0
  if (days === 2) return 0.7
  if (days === 3) return 0.45
  return 0.2
}

function teamNameOf(data: CategoryLeagueData, teamId: string): string {
  return data.teams.find((t) => t.id === teamId)?.name ?? `Team ${teamId}`
}
