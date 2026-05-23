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

import type { CategoryLeagueData } from '../types'
import type { IssueContext, StoryCandidate } from './types'
import { ALL_ACTIVE_STAGES } from './types'
import { signature } from './helpers'
import type { PlayerNight } from '../players/types'
import type { InjuryReport } from '../players/injuries'
import { normalizeName } from '../players/buildPlayerNights'

/* ─────────────────────────────────────────────────────────────────
   ENTRY POINT
───────────────────────────────────────────────────────────────── */

export function detectPlayerStories(
  data: CategoryLeagueData,
  _context: IssueContext,
): StoryCandidate[] {
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

  return out
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

  let storyType: 'twelve-k-game' | 'monster-night' | null = null
  let weight = 60

  if (p.perfectGame) {
    storyType = 'monster-night'
    weight = 100
  } else if (p.noHitter) {
    storyType = 'monster-night'
    weight = 98
  } else if (p.strikeouts >= 12) {
    storyType = 'twelve-k-game'
    weight = 88
  } else if (p.completeGame) {
    storyType = 'monster-night'
    weight = 86
  } else if (p.strikeouts >= 10) {
    storyType = 'twelve-k-game'
    weight = 78
  } else if (p.inningsPitched >= 7 && p.earnedRuns === 0) {
    storyType = 'monster-night'
    weight = 72
  } else if (p.earnedRuns >= 7) {
    // Blow-up start — editorial bad-news angle. Lower weight, only
    // surfaces when owned.
    storyType = 'monster-night'
    weight = 58
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
      headline: pitcherHeadline(n.name, p, isMyGuy),
      summaryLine: pitcherSummary(p),
    },
    signature: signature(['player-night', n.mlbId, n.gameDate]),
  }
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
