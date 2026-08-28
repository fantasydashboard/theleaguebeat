/**
 * Player-night detectors — emit StoryCandidate per notable
 * yesterday performance. Powers The Wire's daily player cards.
 *
 * Six detectors:
 *   - three-hr-game   : hitter with 3+ HR
 *   - twelve-k-game   : pitcher with 12+ K (start)
 *   - monster-night   : multi-HR + 5+ RBI + 4+ R combos
 *   - no-hitter / perfect-game (folded into monster-night)
 *   - quality-start (folded — too common to surface alone)
 *
 * My-team-first ordering: weight is boosted when ANY of the
 * viewing user's teams roster the player. Editorial signal:
 * "your guy did X" beats "some guy did X."
 */

import type { CategoryLeagueData, LeagueData } from '../types'
import type { IssueContext, StoryCandidate } from './types'
import { ALL_ACTIVE_STAGES } from './types'
import { signature } from './helpers'
import type { PlayerNight } from '../players/types'
import type { InjuryReport } from '../players/injuries'
import type { SlumpReport } from '../players/slumps'
import { normalizeName } from '../players/buildPlayerNights'

/* ─────────────────────────────────────────────────────────────────
   ENTRY POINT
───────────────────────────────────────────────────────────────── */

export function detectPlayerStories(
  data: LeagueData,
  _context: IssueContext,
): StoryCandidate[] {
  // Guarded, not widened: `injuryReports` and `slumpReports` are MLB
  // Stats API products (IL placements, rolling batting-average /
  // ERA windows) -- they're baseball-only in substance, not merely
  // absent from the points type because nobody's plumbed it yet.
  // There is no football equivalent to widen toward, so this
  // detector stays category-only until (if ever) a sport-specific
  // feed exists for points leagues. `playerNights` itself IS shared
  // across formats, but the injury/slump/bench sub-features that
  // make up most of this file are not, so gating the whole entry
  // point is more honest than threading format checks through every
  // helper below.
  if (data.format !== 'h2h-category') return []

  const nights = data.playerNights
  if (!nights || nights.length === 0) return []

  const out: StoryCandidate[] = []
  const myTeamId = data.teams.find((t) => t.isMyTeam)?.id ?? null

  const myBench = data.myBenchedPlayers

  for (const n of nights) {
    if (n.hitting) {
      const hitter = classifyHitterNight(n, data, myTeamId)
      if (hitter) out.push(hitter)
    }
    if (n.pitching) {
      const pitcher = classifyPitcherNight(n, data, myTeamId)
      if (pitcher) out.push(pitcher)
    }
    // Bench bad-beat: an owned player on YOUR bench had a notable
    // night. Only fires when the player passed the "notable" filter
    // upstream AND is on the viewer's roster but benched today.
    if (
      myTeamId &&
      myBench &&
      n.ownedByTeamIds.includes(myTeamId) &&
      myBench.has(normalizeName(n.name))
    ) {
      const badBeat = buildBenchBadBeat(n, data)
      if (badBeat) out.push(badBeat)
    }
  }

  // Injury reports — IL placements and returns for rostered players.
  for (const r of data.injuryReports ?? []) {
    const card = classifyInjuryReport(r, data, myTeamId)
    if (card) out.push(card)
  }

  // Slump reports — multi-day cold streaks for rostered players.
  for (const s of data.slumpReports ?? []) {
    const card = classifySlumpReport(s, data, myTeamId)
    if (card) out.push(card)
  }

  return out
}

function classifySlumpReport(
  s: SlumpReport,
  data: CategoryLeagueData,
  myTeamId: string | null,
): StoryCandidate | null {
  if (s.ownedByTeamIds.length === 0) return null

  const teamIds = s.ownedByTeamIds
  const teamNames = teamIds.map((id) => teamNameOf(data, id))
  const isMyGuy = myTeamId != null && teamIds.includes(myTeamId)
  const type = s.kind === 'hitter' ? 'slump-hitter' : 'slump-pitcher-rolling'

  // Weight scales with how bad the slump is. Truly miserable lines
  // outrank routine cold streaks.
  let weight = 60
  if (s.kind === 'hitter') {
    const ba = s.summary.battingAverage ?? 0
    if (ba <= 0.100) weight = 78
    else if (ba <= 0.140) weight = 72
    else weight = 66
  } else {
    const era = s.summary.era ?? 0
    if (era >= 9.0) weight = 80
    else if (era >= 7.5) weight = 74
    else weight = 68
  }

  return {
    type,
    category: 'player',
    weight: isMyGuy ? weight + 12 : weight,
    // Slumps are by definition multi-day. Freshness reflects "data
    // is current" rather than "event happened today" — keep it high
    // since the report just rolled forward this morning.
    freshness: 0.85,
    scope: teamIds.length === 1 ? 'team' : 'matchup',
    teamIds,
    seasonStages: ALL_ACTIVE_STAGES,
    context: {
      mlbId: s.mlbId,
      playerName: s.playerName,
      position: s.position,
      mlbTeam: s.mlbTeam,
      gameDate: s.endDate,
      windowDays: s.windowDays,
      ownedByTeamIds: teamIds,
      ownedByTeamNames: teamNames,
      isMyGuy,
      kind: s.kind,
      summary: s.summary,
      headline: slumpHeadline(s, isMyGuy),
      summaryLine: slumpSummaryLine(s),
    },
    signature: signature(['slump', s.mlbId, s.endDate, String(s.windowDays)]),
  }
}

function slumpHeadline(s: SlumpReport, isMyGuy: boolean): string {
  if (s.kind === 'hitter') {
    const ba = s.summary.battingAverage ?? 0
    const ops = s.summary.ops ?? 0
    if (ba <= 0.100) {
      return isMyGuy
        ? `${s.playerName} cannot find a hit for you.`
        : `${s.playerName} cannot buy a hit.`
    }
    if (ops <= 0.450) {
      return isMyGuy
        ? `${s.playerName} is dragging your week down.`
        : `${s.playerName} has gone cold.`
    }
    return isMyGuy
      ? `${s.playerName} is in a funk on your roster.`
      : `${s.playerName} is in a funk.`
  }
  // pitcher
  const era = s.summary.era ?? 0
  if (era >= 9.0) {
    return isMyGuy
      ? `${s.playerName} is wrecking your ratios.`
      : `${s.playerName} cannot get outs.`
  }
  if (era >= 7.5) {
    return isMyGuy
      ? `${s.playerName} has been a problem on your roster.`
      : `${s.playerName} has been a problem.`
  }
  return isMyGuy
    ? `${s.playerName} is sitting on a rough stretch for you.`
    : `${s.playerName} is sitting on a rough stretch.`
}

function slumpSummaryLine(s: SlumpReport): string {
  if (s.kind === 'hitter') {
    const ba = formatAverage(s.summary.battingAverage)
    const ops = formatAverage(s.summary.ops)
    const hits = s.summary.hits ?? 0
    const ab = s.summary.atBats ?? 0
    return `${hits}-for-${ab}, ${ba} / ${ops} OPS over the last ${s.windowDays} days.`
  }
  const era = formatRate(s.summary.era, 2)
  const whip = formatRate(s.summary.whip, 2)
  const ip = formatRate(s.summary.inningsPitched, 1)
  return `${ip} IP, ${era} ERA, ${whip} WHIP over the last ${s.windowDays} days.`
}

function formatAverage(v: number | undefined): string {
  if (v == null) return '.000'
  // ".321" style — leading dot, three digits.
  return v.toFixed(3).replace(/^0/, '')
}

function formatRate(v: number | undefined, digits: number): string {
  if (v == null) return '0'
  return v.toFixed(digits)
}

function classifyInjuryReport(
  r: InjuryReport,
  data: CategoryLeagueData,
  myTeamId: string | null,
): StoryCandidate | null {
  if (r.ownedByTeamIds.length === 0) return null

  const teamIds = r.ownedByTeamIds
  const teamNames = teamIds.map((id) => teamNameOf(data, id))
  const isMyGuy = myTeamId != null && teamIds.includes(myTeamId)
  const isReturn = r.kind === 'return'

  return {
    type: isReturn ? 'il-return' : 'il-placement',
    category: 'player',
    // Placements weigh more than returns — bad news travels faster
    // and demands faster roster response. My-guy +12 as elsewhere.
    weight: (isReturn ? 64 : 72) + (isMyGuy ? 12 : 0),
    freshness: freshnessForGameDate(r.date),
    scope: teamIds.length === 1 ? 'team' : 'matchup',
    teamIds,
    seasonStages: ALL_ACTIVE_STAGES,
    context: {
      mlbId: r.mlbId,
      playerName: r.playerName,
      gameDate: r.date,
      ownedByTeamIds: teamIds,
      ownedByTeamNames: teamNames,
      isMyGuy,
      kind: isReturn ? 'il-return' : 'il-placement',
      headline: injuryHeadline(r.playerName, isReturn, isMyGuy),
      summaryLine: r.description,
    },
    signature: signature([isReturn ? 'il-return' : 'il-placement', r.mlbId, r.date]),
  }
}

function injuryHeadline(name: string, isReturn: boolean, isMyGuy: boolean): string {
  if (isReturn) {
    return isMyGuy ? `${name} is back for you.` : `${name} is back.`
  }
  return isMyGuy ? `${name} hit the IL on you.` : `${name} hit the IL.`
}

/* ─────────────────────────────────────────────────────────────────
   BENCH BAD-BEAT — you sat the right guy
───────────────────────────────────────────────────────────────── */

function buildBenchBadBeat(
  n: PlayerNight,
  data: CategoryLeagueData,
): StoryCandidate | null {
  // Compute the "regret weight" — bigger lines = sharper sting.
  let regretWeight = 60
  let summary = ''
  if (n.hitting) {
    const h = n.hitting
    if (h.homeRuns >= 3) { regretWeight = 96; summary = `${h.hits}-for-${h.atBats}, ${h.homeRuns} HR.` }
    else if (h.homeRuns >= 2) { regretWeight = 82; summary = `${h.hits}-for-${h.atBats}, ${h.homeRuns} HR, ${h.rbi} RBI.` }
    else if (h.hits >= 4) { regretWeight = 76; summary = `${h.hits}-for-${h.atBats}, ${h.rbi} RBI.` }
    else if (h.stolenBases >= 3) { regretWeight = 74; summary = `${h.stolenBases} SB.` }
    else { regretWeight = 68; summary = `${h.hits}-for-${h.atBats}, ${h.homeRuns} HR, ${h.rbi} RBI.` }
  } else if (n.pitching) {
    const p = n.pitching
    if (p.noHitter || p.perfectGame) { regretWeight = 98; summary = `${formatIp(p.inningsPitched)} IP, ${p.strikeouts} K. No-hitter.` }
    else if (p.completeGame) { regretWeight = 88; summary = `Complete game, ${p.strikeouts} K.` }
    else if (p.strikeouts >= 12) { regretWeight = 84; summary = `${formatIp(p.inningsPitched)} IP, ${p.strikeouts} K.` }
    else { regretWeight = 70; summary = `${formatIp(p.inningsPitched)} IP, ${p.strikeouts} K, ${p.earnedRuns} ER.` }
  } else {
    return null
  }

  return {
    type: 'bench-bad-beat',
    category: 'player',
    // Bad-beat stories are personal — always boost above generic
    // player-night gossip. Weight is regretWeight + 8 so a benched
    // 3-HR night reads as more important than a started 3-HR night.
    weight: regretWeight + 8,
    freshness: freshnessForGameDate(n.gameDate),
    scope: 'team',
    teamIds: n.ownedByTeamIds,
    seasonStages: ALL_ACTIVE_STAGES,
    context: {
      mlbId: n.mlbId,
      playerName: n.name,
      position: n.position,
      mlbTeam: n.mlbTeam,
      gameDate: n.gameDate,
      ownedByTeamIds: n.ownedByTeamIds,
      ownedByTeamNames: n.ownedByTeamIds.map((id) => teamNameOf(data, id)),
      isMyGuy: true,
      kind: n.hitting ? 'hitter' : 'pitcher',
      headline: benchBadBeatHeadline(n.name),
      summaryLine: summary,
    },
    signature: signature(['bench-bad-beat', n.mlbId, n.gameDate]),
  }
}

function benchBadBeatHeadline(name: string): string {
  return `You benched ${name}. He went off.`
}

/* ─────────────────────────────────────────────────────────────────
   HITTER NIGHTS
───────────────────────────────────────────────────────────────── */

function classifyHitterNight(
  n: PlayerNight,
  data: CategoryLeagueData,
  myTeamId: string | null,
): StoryCandidate | null {
  const h = n.hitting!

  // Story type + base weight depend on the line.
  let storyType: 'three-hr-game' | 'monster-night' | null = null
  let weight = 60

  if (h.homeRuns >= 3) {
    storyType = 'three-hr-game'
    weight = 96
  } else if (h.homeRuns >= 2 && h.rbi >= 5) {
    storyType = 'monster-night'
    weight = 84
  } else if (h.hits >= 5) {
    storyType = 'monster-night'
    weight = 80
  } else if (h.homeRuns >= 2) {
    storyType = 'monster-night'
    weight = 72
  } else if (h.hits >= 4 && (h.runs >= 3 || h.rbi >= 4)) {
    storyType = 'monster-night'
    weight = 68
  } else if (h.stolenBases >= 3) {
    storyType = 'monster-night'
    weight = 66
  } else if (h.doubles + h.triples + h.homeRuns >= 3) {
    storyType = 'monster-night'
    weight = 64
  }

  if (!storyType) return null

  const teamIds = n.ownedByTeamIds
  const teamNames = teamIds.map((id) => teamNameOf(data, id))
  const isMyGuy = myTeamId != null && teamIds.includes(myTeamId)

  return {
    type: storyType,
    category: 'player',
    weight: isMyGuy ? weight + 12 : weight,
    freshness: freshnessForGameDate(n.gameDate),
    scope: teamIds.length === 1 ? 'team' : 'matchup',
    teamIds,
    seasonStages: ALL_ACTIVE_STAGES,
    context: {
      mlbId: n.mlbId,
      playerName: n.name,
      position: n.position,
      mlbTeam: n.mlbTeam,
      gameDate: n.gameDate,
      ownedByTeamIds: teamIds,
      ownedByTeamNames: teamNames,
      isMyGuy,
      kind: 'hitter',
      line: {
        atBats: h.atBats,
        hits: h.hits,
        runs: h.runs,
        rbi: h.rbi,
        homeRuns: h.homeRuns,
        doubles: h.doubles,
        triples: h.triples,
        walks: h.walks,
        strikeouts: h.strikeouts,
        stolenBases: h.stolenBases,
      },
      headline: hitterHeadline(n.name, h, isMyGuy),
      summaryLine: hitterSummary(h),
    },
    signature: signature(['player-night', n.mlbId, n.gameDate]),
  }
}

function hitterHeadline(
  name: string,
  h: PlayerNight['hitting'] & object,
  isMyGuy: boolean,
): string {
  if (h.homeRuns >= 3) return `${name} hit three.`
  if (h.homeRuns >= 2) return `${name} went deep twice.`
  if (h.hits >= 5) return `${name} had a five-hit night.`
  if (h.stolenBases >= 3) return `${name} stole ${h.stolenBases} bags.`
  return isMyGuy ? `${name} carried for you.` : `${name} went off.`
}

function hitterSummary(h: PlayerNight['hitting'] & object): string {
  const parts: string[] = []
  parts.push(`${h.hits}-for-${h.atBats}`)
  if (h.homeRuns > 0) parts.push(`${h.homeRuns} HR`)
  if (h.rbi > 0) parts.push(`${h.rbi} RBI`)
  if (h.runs > 0) parts.push(`${h.runs} R`)
  if (h.stolenBases > 0) parts.push(`${h.stolenBases} SB`)
  return parts.join(', ')
}

/* ─────────────────────────────────────────────────────────────────
   PITCHER NIGHTS
───────────────────────────────────────────────────────────────── */

function classifyPitcherNight(
  n: PlayerNight,
  data: CategoryLeagueData,
  myTeamId: string | null,
): StoryCandidate | null {
  const p = n.pitching!
  const isUnowned = n.ownedByTeamIds.length === 0

  // Blow-up routing: only surface as a story when owned. An unowned
  // pitcher giving up 7 ER is nobody's story; an owned pitcher giving
  // up 7 ER is a roster crisis.
  if (p.earnedRuns >= 7 && !isUnowned) {
    return buildPitcherBlowup(n, data, myTeamId)
  }

  // Streamer routing: unowned pitcher that hit the notable threshold
  // is an actionable add. Different editorial frame from "look what
  // this superstar did."
  let storyType: 'twelve-k-game' | 'monster-night' | 'streamer-of-day' | null = null
  let weight = 60

  if (p.perfectGame) {
    storyType = isUnowned ? 'streamer-of-day' : 'monster-night'
    weight = 100
  } else if (p.noHitter) {
    storyType = isUnowned ? 'streamer-of-day' : 'monster-night'
    weight = 98
  } else if (p.strikeouts >= 12) {
    storyType = isUnowned ? 'streamer-of-day' : 'twelve-k-game'
    weight = isUnowned ? 78 : 88
  } else if (p.completeGame) {
    storyType = isUnowned ? 'streamer-of-day' : 'monster-night'
    weight = isUnowned ? 76 : 86
  } else if (p.strikeouts >= 10) {
    storyType = isUnowned ? 'streamer-of-day' : 'twelve-k-game'
    weight = isUnowned ? 72 : 78
  } else if (p.inningsPitched >= 7 && p.earnedRuns === 0) {
    storyType = isUnowned ? 'streamer-of-day' : 'monster-night'
    weight = isUnowned ? 70 : 72
  }

  if (!storyType) return null

  const teamIds = n.ownedByTeamIds
  const teamNames = teamIds.map((id) => teamNameOf(data, id))
  const isMyGuy = myTeamId != null && teamIds.includes(myTeamId)

  // Streamers don't get the my-team boost (they're unowned by
  // definition). Owned-pitcher stories keep the +12 boost.
  const finalWeight = storyType === 'streamer-of-day'
    ? weight
    : isMyGuy ? weight + 12 : weight

  return {
    type: storyType,
    category: 'player',
    weight: finalWeight,
    freshness: freshnessForGameDate(n.gameDate),
    scope: storyType === 'streamer-of-day' ? 'league' : teamIds.length === 1 ? 'team' : 'matchup',
    teamIds: storyType === 'streamer-of-day' ? [] : teamIds,
    seasonStages: ALL_ACTIVE_STAGES,
    context: {
      mlbId: n.mlbId,
      playerName: n.name,
      position: n.position,
      mlbTeam: n.mlbTeam,
      gameDate: n.gameDate,
      ownedByTeamIds: teamIds,
      ownedByTeamNames: teamNames,
      isMyGuy: storyType === 'streamer-of-day' ? false : isMyGuy,
      kind: 'pitcher',
      line: {
        inningsPitched: p.inningsPitched,
        hits: p.hits,
        runs: p.runs,
        earnedRuns: p.earnedRuns,
        walks: p.walks,
        strikeouts: p.strikeouts,
        decision: p.decision,
        completeGame: p.completeGame,
        noHitter: p.noHitter,
        perfectGame: p.perfectGame,
      },
      headline: storyType === 'streamer-of-day'
        ? streamerHeadline(n.name, p)
        : pitcherHeadline(n.name, p, isMyGuy),
      summaryLine: pitcherSummary(p),
    },
    signature: signature([storyType, n.mlbId, n.gameDate]),
  }
}

/**
 * Pitcher blow-up — owned, gave up 7+ ER. Its own story type so the
 * editorial voice can lean into the pain instead of pretending it
 * was a "monster night."
 */
function buildPitcherBlowup(
  n: PlayerNight,
  data: CategoryLeagueData,
  myTeamId: string | null,
): StoryCandidate {
  const p = n.pitching!
  const teamIds = n.ownedByTeamIds
  const teamNames = teamIds.map((id) => teamNameOf(data, id))
  const isMyGuy = myTeamId != null && teamIds.includes(myTeamId)

  // Weight scales with damage. 7 ER stings; 10+ ER is a 5-alarm fire.
  let weight = 58
  if (p.earnedRuns >= 10) weight = 74
  else if (p.earnedRuns >= 8) weight = 66

  return {
    type: 'pitcher-blowup',
    category: 'player',
    weight: isMyGuy ? weight + 12 : weight,
    freshness: freshnessForGameDate(n.gameDate),
    scope: teamIds.length === 1 ? 'team' : 'matchup',
    teamIds,
    seasonStages: ALL_ACTIVE_STAGES,
    context: {
      mlbId: n.mlbId,
      playerName: n.name,
      position: n.position,
      mlbTeam: n.mlbTeam,
      gameDate: n.gameDate,
      ownedByTeamIds: teamIds,
      ownedByTeamNames: teamNames,
      isMyGuy,
      kind: 'pitcher',
      line: {
        inningsPitched: p.inningsPitched,
        earnedRuns: p.earnedRuns,
        hits: p.hits,
        walks: p.walks,
        strikeouts: p.strikeouts,
        decision: p.decision,
      },
      headline: pitcherBlowupHeadline(n.name, p, isMyGuy),
      summaryLine: pitcherSummary(p),
    },
    signature: signature(['pitcher-blowup', n.mlbId, n.gameDate]),
  }
}

function streamerHeadline(name: string, p: PlayerNight['pitching'] & object): string {
  if (p.perfectGame) return `Off the wire: ${name} threw a perfect game.`
  if (p.noHitter) return `Off the wire: ${name} threw a no-hitter.`
  if (p.strikeouts >= 12) return `Free agent gem: ${name} carved.`
  if (p.completeGame) return `${name} is sitting on waivers. He went the distance.`
  if (p.strikeouts >= 10) return `${name} is sitting on waivers. ${p.strikeouts} K.`
  if (p.inningsPitched >= 7 && p.earnedRuns === 0) {
    return `${name} is sitting on waivers. Shutout.`
  }
  return `${name} is available. Worth a look.`
}

function pitcherBlowupHeadline(
  name: string,
  p: PlayerNight['pitching'] & object,
  isMyGuy: boolean,
): string {
  if (p.earnedRuns >= 10) {
    return isMyGuy ? `${name} buried you.` : `${name} got buried.`
  }
  if (p.earnedRuns >= 8) {
    return isMyGuy ? `${name} torched your ratios.` : `${name} got torched.`
  }
  return isMyGuy ? `${name} got shelled on you.` : `${name} got shelled.`
}

function pitcherHeadline(
  name: string,
  p: PlayerNight['pitching'] & object,
  isMyGuy: boolean,
): string {
  if (p.perfectGame) return `${name} threw a perfect game.`
  if (p.noHitter) return `${name} threw a no-hitter.`
  if (p.strikeouts >= 15) return `${name} struck out ${p.strikeouts}.`
  if (p.strikeouts >= 12) return `${name} carved them up.`
  if (p.completeGame) return `${name} went the distance.`
  if (p.earnedRuns >= 7) {
    return isMyGuy ? `${name} got rocked on you.` : `${name} got rocked.`
  }
  if (p.inningsPitched >= 7 && p.earnedRuns === 0) return `${name} shut them down.`
  return `${name} got a quality start.`
}

function pitcherSummary(p: PlayerNight['pitching'] & object): string {
  const parts: string[] = []
  parts.push(`${formatIp(p.inningsPitched)} IP`)
  parts.push(`${p.strikeouts} K`)
  parts.push(`${p.earnedRuns} ER`)
  if (p.decision && p.decision !== 'ND') parts.push(p.decision)
  return parts.join(', ')
}

function formatIp(ip: number): string {
  const whole = Math.floor(ip)
  const fractional = ip - whole
  const outs = Math.round(fractional * 3)
  return `${whole}.${outs}`
}

/* ─────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────── */

/**
 * Freshness: today = 1.0, yesterday-of-current-day = 0.9 (the most
 * common case), two days = 0.6, then drops fast.
 *
 * Player nights age fast — yesterday's monster night is gold today
 * and irrelevant by Friday. Faster decay than trades.
 */
function freshnessForGameDate(gameDate: string): number {
  if (!gameDate) return 0.5
  const game = new Date(gameDate + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const daysAgo = Math.round((today.getTime() - game.getTime()) / (1000 * 60 * 60 * 24))
  if (daysAgo <= 0) return 1.0
  if (daysAgo === 1) return 0.95
  if (daysAgo === 2) return 0.60
  if (daysAgo === 3) return 0.35
  return 0.15
}

function teamNameOf(data: CategoryLeagueData, teamId: string): string {
  return data.teams.find((t) => t.id === teamId)?.name ?? `Team ${teamId}`
}
