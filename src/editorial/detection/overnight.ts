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

import type { CategoryLeagueData, LeagueData } from '../types'
import type { IssueContext, StoryCandidate } from './types'
import { ALL_ACTIVE_STAGES } from './types'
import { signature } from './helpers'
import { sportOf } from '../leagueCore'

export function detectOvernightStories(
  data: LeagueData,
  _context: IssueContext,
): StoryCandidate[] {
  // Two gates below, for two different reasons — they look redundant
  // today (nfl is the only sport on the points format) but they will
  // diverge the moment a daily sport (nba/nhl) lands on points, so
  // don't collapse them into one:

  // 1) EDITORIAL: overnight beats answer "what changed since
  // yesterday". That is a daily-sport question. Football plays once
  // a week, so these would either fire as noise or restate Sunday's
  // result every day until Thursday. Sports that play daily get
  // them; football does not.
  if (sportOf(data) === 'nfl') return []

  // 2) DATA SHAPE: snapshot deltas (cat-by-cat overnight movement)
  // only exist for category leagues today — `snapshotDelta` isn't
  // declared on the points contract at all, so this also narrows
  // `data` to `CategoryLeagueData` for the rest of this function.
  if (data.format !== 'h2h-category') return []

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
      out.push(buildMatchupTipped(m, data, involvesMe, delta.daysSince, myTeamId))
    } else {
      // No flip — but score moved. Worth surfacing if it moved
      // material (≥2 cats one direction).
      const swing = Math.abs(m.homeCatDelta - m.awayCatDelta)
      if (swing < 2) continue
      // Determine which side improved most.
      const homeImproved = m.homeCatDelta > m.awayCatDelta
      out.push(buildMatchupPulse(m, data, homeImproved, swing, involvesMe, delta.daysSince, myTeamId))
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
  myTeamId: string | null,
): StoryCandidate {
  const homeName = teamNameOf(data, m.homeTeamId)
  const awayName = teamNameOf(data, m.awayTeamId)
  const nowLeaderName =
    m.leadNow === 'home' ? homeName : m.leadNow === 'away' ? awayName : 'Nobody'
  const thenLeaderName =
    m.leadThen === 'home' ? homeName : m.leadThen === 'away' ? awayName : 'Nobody'
  // Subject name = the viewer's team name when the matchup involves
  // them. Used by the headline to name the team explicitly instead
  // of falling back to "Your matchup" voice.
  const subjectName = involvesMe && myTeamId
    ? (m.homeTeamId === myTeamId ? homeName : awayName)
    : undefined

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
      headline: matchupTippedHeadline(nowLeaderName, thenLeaderName, involvesMe, subjectName),
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
  myTeamIdParam: string | null,
): StoryCandidate {
  const homeName = teamNameOf(data, m.homeTeamId)
  const awayName = teamNameOf(data, m.awayTeamId)
  const winnerName = homeImproved ? homeName : awayName
  const loserName = homeImproved ? awayName : homeName

  // From the viewer's POV: are they the winner of this swing?
  const myTeamId = myTeamIdParam ?? data.teams.find((t) => t.isMyTeam)?.id ?? null
  const myImproved =
    myTeamId != null &&
    ((homeImproved && myTeamId === m.homeTeamId) ||
      (!homeImproved && myTeamId === m.awayTeamId))
  // Subject name when the matchup involves the viewer's team. Used
  // by the headline to name that team explicitly (Wire voice rule —
  // team names in third person, never "you").
  const subjectName = involvesMe && myTeamId
    ? (m.homeTeamId === myTeamId ? homeName : awayName)
    : undefined

  // Direction-aware leadership state from the snapshot delta. When
  // the viewer is currently leading, an opponent overnight gain
  // hasn't "pulled away" — they've cut into the lead. The headline
  // builder needs this to avoid claiming directional movement that
  // contradicts the current state.
  const myLeadNow: 'leading' | 'trailing' | 'tied' = (() => {
    if (myTeamId == null) return 'tied'
    if (m.leadNow === 'tied') return 'tied'
    if (m.leadNow === 'home') return myTeamId === m.homeTeamId ? 'leading' : 'trailing'
    if (m.leadNow === 'away') return myTeamId === m.awayTeamId ? 'leading' : 'trailing'
    return 'tied'
  })()

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
      headline: matchupPulseHeadline(winnerName, swing, myImproved, involvesMe, myLeadNow, subjectName),
      summary: matchupPulseSummary(winnerName, loserName, swing, myImproved, involvesMe, myLeadNow),
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

/** Tipped-matchup headline.
 *
 *  Voice rule: the Wire uses team names in third person. Reserve
 *  "you/your" exclusively for the ON YOUR LINE strip — the magazine
 *  has one consistent narrator across surfaces. When the matchup
 *  involves the viewer's team, we still name that team explicitly
 *  ("{nowLeader} took the lead on {subjectName} overnight") rather
 *  than collapsing to "Your matchup flipped."
 */
function matchupTippedHeadline(
  nowLeader: string,
  _thenLeader: string,
  involvesMe: boolean,
  subjectName?: string,
): string {
  if (involvesMe && subjectName) return `${nowLeader} took the lead on ${subjectName} overnight.`
  return `${nowLeader} took the lead overnight.`
}

function matchupTippedSummary(
  homeName: string,
  awayName: string,
  m: NonNullable<CategoryLeagueData['snapshotDelta']>['matchupShifts'][number],
): string {
  const homeNet = m.homeCatDelta
  const awayNet = m.awayCatDelta
  // Early-week snapshots can produce big-looking deltas (Monday: 1
  // cat decided; Tuesday: 10 cats decided → home "+9") which read
  // as implausible overnight motion. Reframe as "cat LEADS gained
  // since yesterday" — accurate to what the snapshot measures, and
  // doesn't claim impossible stat motion. Drop the "unchanged" word
  // (which was confusing when the team is actively losing the
  // matchup) in favour of just naming who gained ground.
  const homeGained = homeNet > 0
  const awayGained = awayNet > 0
  if (homeGained && !awayGained) {
    return `${homeName} picked up ${plural(homeNet, 'cat lead')} since yesterday.`
  }
  if (awayGained && !homeGained) {
    return `${awayName} picked up ${plural(awayNet, 'cat lead')} since yesterday.`
  }
  if (homeGained && awayGained) {
    return `${homeName} gained ${plural(homeNet, 'cat lead')}; ${awayName} gained ${plural(awayNet, 'cat lead')}.`
  }
  return `Cats redistributed overnight.`
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

/** Direction-aware pulse headline.
 *
 *  Voice: team names in third person across all branches. The
 *  myImproved branch names the subject team (the viewer's team)
 *  explicitly. The previous "You picked up..." voice collided
 *  with the LEDE rule of team-name third person and has been
 *  retired in favor of consistency across the Wire.
 */
function matchupPulseHeadline(
  winnerName: string,
  swing: number,
  myImproved: boolean,
  involvesMe: boolean,
  myLeadNow: 'leading' | 'trailing' | 'tied',
  subjectName?: string,
): string {
  if (myImproved) {
    const me = subjectName ?? winnerName
    if (myLeadNow === 'leading') {
      return `${me} picked up ${plural(swing, 'cat lead')} overnight.`
    }
    if (myLeadNow === 'tied') {
      return `${me} evened the matchup overnight.`
    }
    return `${me} cut into the deficit overnight.`
  }
  if (involvesMe) {
    if (myLeadNow === 'leading') {
      return `${winnerName} chipped at the lead overnight.`
    }
    if (myLeadNow === 'tied') {
      return `${winnerName} pulled the matchup level overnight.`
    }
    return subjectName
      ? `${winnerName} pulled away on ${subjectName}.`
      : `${winnerName} pulled away.`
  }
  return `${winnerName} stretched the lead.`
}

/** Direction-aware body for the matchup-pulse Wire card. Reads as
 *  the "what actually moved overnight" sentence; pairs with the
 *  headline's framing so they don't contradict.
 *
 *  Voice: team names, third person. The summary intentionally avoids
 *  re-naming the subject team since the headline already did — uses
 *  "the lead" / "the deficit" / "the matchup" instead. */
function matchupPulseSummary(
  winnerName: string,
  loserName: string,
  swing: number,
  myImproved: boolean,
  involvesMe: boolean,
  myLeadNow: 'leading' | 'trailing' | 'tied',
): string {
  // "Cat leads" not "cats" — the swing measures lead movement, not
  // raw category wins. Saying "gained 8 cats" reads as winning 8
  // categories overnight, which is impossible in a 9-cat league.
  const leadWord = plural(swing, 'cat lead')
  if (myImproved && involvesMe) {
    if (myLeadNow === 'leading') return `The lead grew by ${leadWord}.`
    if (myLeadNow === 'tied') return `${leadWord} landed for the comeback; the matchup is now level.`
    return `${leadWord} moved the right direction, but the deficit holds.`
  }
  if (!myImproved && involvesMe) {
    if (myLeadNow === 'leading') return `${winnerName} took ${leadWord} back; the lead holds.`
    if (myLeadNow === 'tied') return `${winnerName} pulled ${leadWord} back to level.`
    return `${winnerName} extended the gap by ${leadWord}.`
  }
  return `${winnerName} gained ${leadWord} on ${loserName}.`
}

function rankShiftHeadline(
  teamName: string,
  prev: number,
  now: number,
  _isMyTeam: boolean,
): string {
  // Voice: team names in third person across the Wire. The previous
  // "You climbed / You slipped" voice has been retired — same rule
  // as the matchup-pulse headlines.
  const moves = Math.abs(prev - now)
  const verb = now < prev ? 'climbed' : 'slipped'
  return `${teamName} ${verb} ${moves} ${moves === 1 ? 'spot' : 'spots'} to #${now}.`
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
