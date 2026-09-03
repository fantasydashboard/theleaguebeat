/**
 * What happened on the wire in one week.
 *
 * The draft deck is a one-off and the board is a ranking. This is the
 * only recurring deck about what people DID — Wednesday morning, after
 * waivers process, when a league has just found out who got the guy.
 *
 * Facts only. Every figure here is a count or a dollar amount taken
 * straight off the transaction log; nothing is projected, scored or
 * weighted. That is deliberate — the wire's appeal is that it is
 * simply true, and a league can check every number itself.
 *
 * ONE WEEK, NOT THE SEASON. The deck covers a single processing
 * period, because "most active manager since August" is a different
 * and much duller claim than "spent $47 on Tuesday night".
 */
import type { LeagueTransaction } from '../transactions/types'
import { acquiringTeams } from '../transactions/types'

export interface WireAdd {
  teamId: string
  playerName: string
  position?: string
  /** Winning FAAB bid, when the league uses FAAB. */
  faabBid?: number
  /** Waiver priority spent, when it uses priority instead. */
  waiverPriority?: number
  kind: 'fa-add' | 'waiver-add' | 'faab-add'
}

export interface WireTrade {
  teamIds: string[]
  /** Players each side received, keyed by team. */
  received: Map<string, string[]>
  playerCount: number
}

export interface WireFacts {
  week: number
  /** Every add this week, biggest FAAB first where FAAB exists. */
  adds: WireAdd[]
  trades: WireTrade[]
  /** Teams by number of moves, most active first. */
  activity: { teamId: string; moves: number }[]
  totalMoves: number
  /** Total FAAB spent this week, when the league uses it. */
  faabSpent?: number
  /** True when any add carried a bid — decides whether the copy talks
   *  about money or about priority. */
  usesFaab: boolean
}

/**
 * Reduce a week's transactions to the facts a deck can present.
 *
 * @param week the processing period to cover. Undefined takes the
 *             most recent week present in the log, which is what a
 *             Wednesday-morning deck wants.
 * @returns null when nothing happened. A wire deck with no moves is
 *          not a quiet week worth reporting, it is an empty deck.
 */
export function buildWireFacts(
  transactions: readonly LeagueTransaction[] | undefined,
  week?: number,
): WireFacts | null {
  if (!transactions || transactions.length === 0) return null

  const targetWeek =
    week ?? Math.max(...transactions.map((t) => t.week).filter(Number.isFinite))
  if (!Number.isFinite(targetWeek)) return null

  const inWeek = transactions.filter((t) => t.week === targetWeek)
  if (inWeek.length === 0) return null

  const adds: WireAdd[] = []
  const trades: WireTrade[] = []
  const moves = new Map<string, number>()

  for (const tx of inWeek) {
    // A trade moves players in both directions, so counting it once
    // per involved team is what "most active" should mean — counting
    // per movement would rank a two-for-two swap above four pickups.
    for (const teamId of tx.teamIds) {
      moves.set(teamId, (moves.get(teamId) ?? 0) + 1)
    }

    if (tx.kind === 'trade') {
      const received = new Map<string, string[]>()
      for (const m of tx.movements) {
        if (m.toTeamId === 'fa' || m.toTeamId === 'waivers') continue
        received.set(m.toTeamId, [...(received.get(m.toTeamId) ?? []), m.playerName])
      }
      trades.push({
        teamIds: tx.teamIds,
        received,
        playerCount: tx.movements.length,
      })
      continue
    }

    if (tx.kind === 'drop') continue

    // An add's headline player is the one arriving, not the corpse
    // going the other way — a pickup that drops someone is still a
    // pickup, and naming the dropped player would bury the story.
    const teamId = acquiringTeams(tx)[0]
    const arriving = tx.movements.find(
      (m) => m.toTeamId !== 'fa' && m.toTeamId !== 'waivers',
    )
    if (!teamId || !arriving) continue
    adds.push({
      teamId,
      playerName: arriving.playerName,
      position: arriving.position,
      faabBid: tx.faabBid,
      waiverPriority: tx.waiverPriority,
      kind: tx.kind,
    })
  }

  const usesFaab = adds.some((a) => typeof a.faabBid === 'number' && a.faabBid > 0)

  return {
    week: targetWeek,
    // Biggest bid first where money exists; otherwise the order the
    // log gave, which is chronological and reads fine.
    adds: usesFaab
      ? [...adds].sort((a, b) => (b.faabBid ?? 0) - (a.faabBid ?? 0))
      : adds,
    trades,
    activity: [...moves.entries()]
      .map(([teamId, m]) => ({ teamId, moves: m }))
      .sort((a, b) => b.moves - a.moves || a.teamId.localeCompare(b.teamId)),
    totalMoves: inWeek.length,
    faabSpent: usesFaab
      ? adds.reduce((total, a) => total + (a.faabBid ?? 0), 0)
      : undefined,
    usesFaab,
  }
}

/** "$47" / "priority 3" / "off waivers" — how an add was won. */
export function describeCost(add: WireAdd): string {
  if (typeof add.faabBid === 'number' && add.faabBid > 0) return `$${add.faabBid}`
  if (typeof add.waiverPriority === 'number') return `priority ${add.waiverPriority}`
  return add.kind === 'fa-add' ? 'free agency' : 'off waivers'
}
