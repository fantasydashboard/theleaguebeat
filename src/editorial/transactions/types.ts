/**
 * Universal transaction model — cross-platform shape for league
 * transactions (trades, adds, drops, waiver claims, FAAB winners).
 *
 * Each platform exposes transactions differently:
 *   - ESPN serves them under view=mTransactions2 as an array of
 *     transaction objects with executionType + items.
 *   - Yahoo's transactions resource returns add/drop/trade entries.
 *   - Sleeper's /league/{id}/transactions/{round} returns one round
 *     at a time, comprehensive shape.
 *
 * Adapters normalize each platform's native shape into the model
 * below. Detectors in src/editorial/detection/transactions.ts read
 * from CategoryLeagueData.transactions and emit StoryCandidates
 * (blockbuster-trade, faab-blowout, waiver-winner, etc.).
 *
 * Keep this shape MINIMAL and stable — adding a field means every
 * adapter has to populate it, and a missing field means the
 * detector path quietly disables.
 */

/** Source platform. Mirrors the league row's platform field. */
export type TransactionPlatform = 'espn' | 'yahoo' | 'sleeper' | 'fantrax'

/** Transaction kinds we model. "fa-add" = free agent pickup (no
 *  bidding), "waiver-add" = won via waiver-priority claim,
 *  "faab-add" = won via FAAB blind bid. Most apps lump these; we
 *  split because the editorial story differs ("won the FAAB war"
 *  vs "scooped from waivers"). */
export type TransactionKind =
  | 'trade'        // multi-team swap, processed
  | 'fa-add'       // pickup off free agency, no bidding
  | 'waiver-add'   // claim won via waiver priority
  | 'faab-add'     // claim won via FAAB blind bid
  | 'drop'         // standalone drop (no replacement)

/** One player movement within a transaction. A trade has multiple;
 *  a simple add has one (fromTeamId='fa', toTeamId=acquirer). */
export interface TransactionMovement {
  /** Platform-specific player ID. Adapters set the platform's native
   *  ID so we can derive headshot URLs via playerHeadshot.ts. */
  playerId: string
  playerName: string
  /** Position (P, C, OF, SP, RP, etc.). Useful for editorial copy
   *  ("scooped a closer"). Optional because not every platform
   *  surfaces position on transaction records. */
  position?: string
  /** Team that owned the player BEFORE this movement. 'fa' for free
   *  agency, 'waivers' for waiver pool, otherwise a team ID
   *  matching CategoryLeagueDataTeam.id. */
  fromTeamId: string | 'fa' | 'waivers'
  /** Team that owns the player AFTER. 'fa' / 'waivers' for drops. */
  toTeamId: string | 'fa' | 'waivers'
}

export interface LeagueTransaction {
  /** Platform-native transaction ID for dedup + linking. */
  id: string
  platform: TransactionPlatform
  kind: TransactionKind

  /** When the transaction processed (unix ms). For trades, this is
   *  the accept/execute timestamp, not the proposal time. */
  timestamp: number

  /** Fantasy week the transaction belongs to. Adapters compute this
   *  from the platform's schedule + timestamp. */
  week: number

  /** Teams involved. Single team for adds/drops; 2+ for trades. */
  teamIds: string[]

  /** Player movements. A trade has N movements (one per player
   *  moved); an add has 1; a drop has 1. */
  movements: TransactionMovement[]

  /** FAAB dollar bid amount, when kind === 'faab-add'. */
  faabBid?: number

  /** Waiver priority used, when kind === 'waiver-add'. Lower = better. */
  waiverPriority?: number
}

/**
 * Helper — given a movement, classify whether the destination team
 * is acquiring a player (vs dropping). Used by detectors to bucket
 * movements into "added" vs "lost" per team.
 */
export function isAcquisition(m: TransactionMovement): boolean {
  return m.toTeamId !== 'fa' && m.toTeamId !== 'waivers'
}

/**
 * Helper — get the list of teams that gained at least one player
 * from this transaction.
 */
export function acquiringTeams(tx: LeagueTransaction): string[] {
  const set = new Set<string>()
  for (const m of tx.movements) {
    if (isAcquisition(m)) set.add(m.toTeamId)
  }
  return Array.from(set)
}

/**
 * Helper — players acquired by a specific team in this transaction.
 */
export function playersAcquiredBy(
  tx: LeagueTransaction,
  teamId: string,
): TransactionMovement[] {
  return tx.movements.filter((m) => m.toTeamId === teamId)
}

/**
 * Helper — players sent away by a specific team in this transaction.
 */
export function playersSentBy(
  tx: LeagueTransaction,
  teamId: string,
): TransactionMovement[] {
  return tx.movements.filter((m) => m.fromTeamId === teamId)
}
