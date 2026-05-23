/**
 * Transaction detectors — emit StoryCandidate per trade / FAAB win /
 * waiver claim. Consumed by the Wire (daily) and the share-card
 * pipeline.
 *
 * Story types:
 *   - blockbuster-trade  : 3+ players moving across teams
 *   - lopsided-trade     : standard 1-for-1 or 2-for-1 trade
 *   - faab-blowout       : FAAB pickup with notably high bid
 *   - waiver-winner      : successful waiver-priority claim
 *
 * Freshness drives editorial weight: a trade from yesterday is
 * front-page material; a trade from 4 weeks ago is footnote.
 */

import type { CategoryLeagueData } from '../types'
import type { IssueContext, StoryCandidate } from './types'
import { ALL_ACTIVE_STAGES } from './types'
import { signature } from './helpers'
import {
  acquiringTeams,
  playersAcquiredBy,
  playersSentBy,
  type LeagueTransaction,
  type TransactionMovement,
} from '../transactions/types'

/* ─────────────────────────────────────────────────────────────────
   ENTRY POINT
───────────────────────────────────────────────────────────────── */

export function detectTransactionStories(
  data: CategoryLeagueData,
  context: IssueContext,
): StoryCandidate[] {
  const txs = data.transactions
  if (!txs || txs.length === 0) return []

  const out: StoryCandidate[] = []

  for (const tx of txs) {
    const fresh = freshnessForTransaction(tx, context.currentWeek)
    // Skip stale transactions — anything more than ~3 weeks old reads
    // as "old news" in The Wire and clogs the feed.
    if (fresh < 0.20) continue

    if (tx.kind === 'trade') {
      // Trades use a slower freshness decay than single-game stories
      // because they reshape rosters for weeks. A 3-team trade from
      // last week is still front-page material.
      const tradeFresh = freshnessForTrade(tx, context.currentWeek)
      const playerCount = tx.movements.length
      if (playerCount >= 3) {
        out.push(buildBlockbusterTrade(tx, tradeFresh, data))
      } else {
        out.push(buildStandardTrade(tx, tradeFresh, data))
      }
    }

    if (tx.kind === 'faab-add' && (tx.faabBid ?? 0) >= FAAB_BLOWOUT_THRESHOLD) {
      out.push(buildFaabBlowout(tx, fresh, data))
    }

    if (tx.kind === 'waiver-add') {
      // Only surface waiver wins when the priority was low (top 3) —
      // routine back-end claims aren't editorially interesting.
      const pri = tx.waiverPriority ?? 99
      if (pri <= 3) {
        out.push(buildWaiverWinner(tx, fresh, data))
      }
    }
  }

  return out
}

/* ─────────────────────────────────────────────────────────────────
   STORY BUILDERS
───────────────────────────────────────────────────────────────── */

function buildBlockbusterTrade(
  tx: LeagueTransaction,
  fresh: number,
  data: CategoryLeagueData,
): StoryCandidate {
  const teams = acquiringTeams(tx)
  const partyCount = teams.length
  const playerCount = tx.movements.length
  const teamNames = teams.map((id) => teamNameOf(data, id))

  return {
    type: 'blockbuster-trade',
    category: 'transaction',
    weight: 88 + Math.min(playerCount, 6) * 2,
    freshness: fresh,
    scope: 'matchup',
    teamIds: teams,
    seasonStages: ALL_ACTIVE_STAGES,
    context: {
      tradeId: tx.id,
      teamIds: teams,
      playerCount,
      partyCount,
      teamNames,
      acquiredByTeam: teams.map((id) => ({
        teamId: id,
        teamName: teamNameOf(data, id),
        players: playersAcquiredBy(tx, id).map(formatMovementPlayer),
      })),
      sentByTeam: teams.map((id) => ({
        teamId: id,
        teamName: teamNameOf(data, id),
        players: playersSentBy(tx, id).map(formatMovementPlayer),
      })),
      week: tx.week,
      timestamp: tx.timestamp,
    },
    signature: signature(['blockbuster-trade', tx.id]),
  }
}

function buildStandardTrade(
  tx: LeagueTransaction,
  fresh: number,
  data: CategoryLeagueData,
): StoryCandidate {
  const teams = acquiringTeams(tx)
  const teamNames = teams.map((id) => teamNameOf(data, id))
  const playerCount = tx.movements.length

  return {
    type: 'lopsided-trade',
    category: 'transaction',
    weight: 72,
    freshness: fresh,
    scope: 'matchup',
    teamIds: teams,
    seasonStages: ALL_ACTIVE_STAGES,
    context: {
      tradeId: tx.id,
      teamIds: teams,
      teamNames,
      playerCount,
      acquiredByTeam: teams.map((id) => ({
        teamId: id,
        teamName: teamNameOf(data, id),
        players: playersAcquiredBy(tx, id).map(formatMovementPlayer),
      })),
      sentByTeam: teams.map((id) => ({
        teamId: id,
        teamName: teamNameOf(data, id),
        players: playersSentBy(tx, id).map(formatMovementPlayer),
      })),
      week: tx.week,
      timestamp: tx.timestamp,
    },
    signature: signature(['standard-trade', tx.id]),
  }
}

function buildFaabBlowout(
  tx: LeagueTransaction,
  fresh: number,
  data: CategoryLeagueData,
): StoryCandidate {
  const teamId = tx.movements[0]?.toTeamId
  const player = tx.movements.find((m) => m.toTeamId === teamId)
  const teamName = teamId ? teamNameOf(data, teamId) : 'A team'
  const bid = tx.faabBid ?? 0

  return {
    type: 'faab-blowout',
    category: 'transaction',
    weight: 60 + Math.min(20, Math.floor(bid / 5)),
    freshness: fresh,
    scope: 'team',
    teamIds: teamId && teamId !== 'fa' && teamId !== 'waivers' ? [teamId] : [],
    seasonStages: ALL_ACTIVE_STAGES,
    context: {
      txId: tx.id,
      teamId,
      teamName,
      playerName: player?.playerName ?? 'A free agent',
      playerPosition: player?.position,
      faabBid: bid,
      week: tx.week,
      timestamp: tx.timestamp,
    },
    signature: signature(['faab-blowout', tx.id]),
  }
}

function buildWaiverWinner(
  tx: LeagueTransaction,
  fresh: number,
  data: CategoryLeagueData,
): StoryCandidate {
  const teamId = tx.movements[0]?.toTeamId
  const player = tx.movements.find((m) => m.toTeamId === teamId)
  const teamName = teamId ? teamNameOf(data, teamId) : 'A team'
  const pri = tx.waiverPriority ?? 99

  return {
    type: 'waiver-winner',
    category: 'transaction',
    weight: 55,
    freshness: fresh,
    scope: 'team',
    teamIds: teamId && teamId !== 'fa' && teamId !== 'waivers' ? [teamId] : [],
    seasonStages: ALL_ACTIVE_STAGES,
    context: {
      txId: tx.id,
      teamId,
      teamName,
      playerName: player?.playerName ?? 'A free agent',
      playerPosition: player?.position,
      waiverPriority: pri,
      week: tx.week,
      timestamp: tx.timestamp,
    },
    signature: signature(['waiver-winner', tx.id]),
  }
}

/* ─────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────── */

/** A FAAB bid worth surfacing. Most baseball leagues use 100-dollar
 *  budgets — anything 20+ is meaningful. */
const FAAB_BLOWOUT_THRESHOLD = 20

/**
 * Freshness for FAAB + waiver claims. Same-week stories stay fresh
 * for 3 days, then taper. By 3 weeks they're below the cutoff.
 *
 *   today        1.00
 *   <3 days      0.85
 *   same week    0.65
 *   1 week ago   0.55
 *   2 weeks ago  0.35
 *   3+ weeks     0.15   (filtered out by entry-point threshold)
 */
function freshnessForTransaction(
  tx: LeagueTransaction,
  currentWeek: number,
): number {
  const weeksAgo = Math.max(0, currentWeek - tx.week)
  if (weeksAgo === 0) {
    const hoursAgo = (Date.now() - tx.timestamp) / (1000 * 60 * 60)
    if (hoursAgo < 24) return 1.0
    if (hoursAgo < 72) return 0.85
    return 0.65
  }
  if (weeksAgo === 1) return 0.55
  if (weeksAgo === 2) return 0.35
  return 0.15
}

/**
 * Freshness for TRADES — slower decay than other transactions.
 * Trades reshape rosters for weeks; a trade from last Tuesday is
 * still magazine-worthy on Sunday. They stay at "front page" for
 * the first week and don't drop below the cutoff until ~5 weeks
 * have passed.
 *
 *   today        1.00
 *   <3 days      0.95
 *   <1 week      0.85
 *   1 week ago   0.75
 *   2 weeks ago  0.55
 *   3 weeks ago  0.40
 *   4 weeks ago  0.28
 *   5+ weeks     0.15   (filtered out by entry-point threshold)
 *
 * The motivation: a single-game performance is a moment; a trade
 * is a state change. Editorial weight should match.
 */
function freshnessForTrade(
  tx: LeagueTransaction,
  currentWeek: number,
): number {
  const weeksAgo = Math.max(0, currentWeek - tx.week)
  if (weeksAgo === 0) {
    const hoursAgo = (Date.now() - tx.timestamp) / (1000 * 60 * 60)
    if (hoursAgo < 24) return 1.0
    if (hoursAgo < 72) return 0.95
    return 0.85
  }
  if (weeksAgo === 1) return 0.75
  if (weeksAgo === 2) return 0.55
  if (weeksAgo === 3) return 0.40
  if (weeksAgo === 4) return 0.28
  return 0.15
}

function teamNameOf(data: CategoryLeagueData, teamId: string): string {
  return data.teams.find((t) => t.id === teamId)?.name ?? `Team ${teamId}`
}

function formatMovementPlayer(m: TransactionMovement): {
  playerId: string
  playerName: string
  position?: string
} {
  return {
    playerId: m.playerId,
    playerName: m.playerName,
    position: m.position,
  }
}
