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

import type { CategoryLeagueData, LeagueData } from '../types'
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
  data: LeagueData,
  context: IssueContext,
): StoryCandidate[] {
  // Guarded, not widened: unlike injury/slump reports, trades and
  // waiver claims are genuinely cross-sport -- Sleeper exposes a
  // transactions feed for football leagues too. But `transactions`
  // isn't on `LeagueDataH2HPoints` yet, and adding it means both
  // extending that contract AND wiring a points-side adapter to
  // populate it -- real feature work, not a type-annotation change.
  // Gating here is a "not yet plumbed" guard, not a "doesn't apply"
  // guard: this is expected to widen cleanly once that adapter work
  // lands, with nothing built here needing to be redone.
  if (data.format !== 'h2h-category') return []

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
  const acquiredByTeam = teams.map((id) => ({
    teamId: id,
    teamName: teamNameOf(data, id),
    players: playersAcquiredBy(tx, id).map(formatMovementPlayer),
  }))

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
      acquiredByTeam,
      sentByTeam: teams.map((id) => ({
        teamId: id,
        teamName: teamNameOf(data, id),
        players: playersSentBy(tx, id).map(formatMovementPlayer),
      })),
      week: tx.week,
      timestamp: tx.timestamp,
      headline: blockbusterHeadline(partyCount, playerCount, teamNames),
      summaryLine: tradeBodyLine(acquiredByTeam),
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
  const acquiredByTeam = teams.map((id) => ({
    teamId: id,
    teamName: teamNameOf(data, id),
    players: playersAcquiredBy(tx, id).map(formatMovementPlayer),
  }))

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
      acquiredByTeam,
      sentByTeam: teams.map((id) => ({
        teamId: id,
        teamName: teamNameOf(data, id),
        players: playersSentBy(tx, id).map(formatMovementPlayer),
      })),
      week: tx.week,
      timestamp: tx.timestamp,
      headline: standardTradeHeadline(acquiredByTeam),
      summaryLine: tradeBodyLine(acquiredByTeam),
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
      headline: faabHeadline(teamName, player?.playerName, bid),
      summaryLine: faabBodyLine(bid, player?.position),
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
      headline: waiverHeadline(teamName, player?.playerName, pri),
      summaryLine: waiverBodyLine(pri, player?.position),
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
    // Strip trailing position parentheticals platforms tack onto
    // player names ("Shohei Ohtani (Pitcher)" → "Shohei Ohtani").
    // Yahoo lists two-way players this way; the suffix reads as
    // unedited in magazine copy. Position is preserved in its own
    // field so body copy can still reference it.
    playerName: m.playerName.replace(/\s*\([^)]*\)\s*$/, '').trim(),
    // Yahoo concatenates multi-position eligibility as "LF,RF" with
    // no space. Add the space so the rendered body reads as a
    // proper list ("SP for LF, RF" not "SP for LF,RF").
    position: m.position?.replace(/,(?!\s)/g, ', '),
  }
}

/* ─────────────────────────────────────────────────────────────────
   COPY — magazine voice for the Wire
───────────────────────────────────────────────────────────────── */

type AcquiredSide = {
  teamId: string
  teamName: string
  players: { playerId: string; playerName: string; position?: string }[]
}

/** "A and B" / "A, B and C" / "A, B, C and 2 more." */
function joinNames(names: string[], cap = 3): string {
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  if (names.length <= cap) {
    return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
  }
  const shown = names.slice(0, cap)
  const rest = names.length - cap
  return `${shown.join(', ')} and ${rest} more`
}

function blockbusterHeadline(
  partyCount: number,
  playerCount: number,
  teamNames: string[],
): string {
  if (partyCount >= 3) {
    return `${joinNames(teamNames)} pulled off a three-way swap.`
  }
  const [a, b] = teamNames
  if (a && b) return `${a} and ${b} swapped ${playerCount} pieces.`
  return `A blockbuster cleared.`
}

function standardTradeHeadline(acquired: AcquiredSide[]): string {
  if (acquired.length === 2) {
    const [a, b] = acquired
    const aGot = a.players[0]?.playerName
    const bGot = b.players[0]?.playerName
    if (aGot && bGot) {
      return `${a.teamName} got ${aGot}. ${b.teamName} got ${bGot}.`
    }
  }
  const teamNames = acquired.map((s) => s.teamName)
  return `${joinNames(teamNames)} swung a deal.`
}

/**
 * Body line for trade cards. Adds context the headline doesn't —
 * positions, shape of the swap, what changed beyond the player
 * names. The old version restated the headline ("Injury Prone got
 * Ohtani" + "Injury Prone gets Ohtani"), which read as filler. The
 * new version comments on the SHAPE of the trade instead.
 *
 * For multi-player trades where the headline only names the lead
 * piece on each side, we fall back to listing the additional bodies
 * so the body still adds information.
 */
function tradeBodyLine(acquired: AcquiredSide[]): string {
  const sides = acquired.filter((s) => s.players.length > 0)
  if (sides.length < 2) return 'A trade clears. Both sides took the bet.'

  const totalPlayers = sides.reduce((n, s) => n + s.players.length, 0)

  // 1-for-1: the headline names both players already, so the body
  // talks about position calculus instead of duplicating names.
  if (sides.length === 2 && sides[0].players.length === 1 && sides[1].players.length === 1) {
    const aPos = sides[0].players[0].position
    const bPos = sides[1].players[0].position
    if (aPos && bPos && aPos === bPos) {
      return `Position-for-position. The roster shape stays; the names change.`
    }
    if (aPos && bPos) {
      return `${aPos} for ${bPos}. Both sides bet they got the slot they needed more.`
    }
    return `One-for-one. The league chat will spend the weekend deciding who won.`
  }

  // Multi-player: the headline only mentioned the lead piece on each
  // side, so listing the additional players IS adding information.
  // Skip the first player on each side (already in the headline) and
  // call out the rest by name.
  const extraPieces = sides
    .map((s) => ({ teamName: s.teamName, rest: s.players.slice(1) }))
    .filter((s) => s.rest.length > 0)
  if (extraPieces.length > 0) {
    const extras = extraPieces
      .map((s) => `${s.teamName} also got ${joinNames(s.rest.map((p) => p.playerName), 3)}`)
      .join('; ')
    return `${extras}. ${totalPlayers} pieces change hands; the standings will tell the story.`
  }

  // Fallback (every side is a single-player but more than two sides
  // — a 3-way swap, e.g.).
  return `${totalPlayers} players moving across ${sides.length} rosters. Both sides reshape; the standings catch up next week.`
}

function faabHeadline(teamName: string, playerName: string | undefined, bid: number): string {
  if (playerName) {
    return `${teamName} paid $${bid} for ${playerName}.`
  }
  return `${teamName} dropped $${bid} on the wire.`
}

function faabBodyLine(bid: number, position?: string): string {
  const pos = position ? `${position} pickup. ` : ''
  if (bid >= 50) return `${pos}Half the budget gone in a single move.`
  if (bid >= 30) return `${pos}Aggressive bid. Someone wanted this badly.`
  return `${pos}Outbid the room. The wire just thinned out.`
}

function waiverHeadline(
  teamName: string,
  playerName: string | undefined,
  priority: number,
): string {
  if (playerName) {
    return `${teamName} burned ${ordinal(priority)} waiver on ${playerName}.`
  }
  return `${teamName} spent ${ordinal(priority)} priority.`
}

function waiverBodyLine(priority: number, position?: string): string {
  const pos = position ? `${position} addition. ` : ''
  if (priority === 1) return `${pos}Top of the order. They wanted it most.`
  if (priority === 2) return `${pos}Second priority. Worth the slide.`
  return `${pos}Top-3 claim. A roster move with intent.`
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
