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
  /** Platform-native player id, for a headshot. Vertical format gives
   *  a claim its own screen, and a name alone on a screen is thin. */
  playerId: string
  playerName: string
  position?: string
  /** Winning FAAB bid, when the league uses FAAB. */
  faabBid?: number
  /** Waiver priority spent, when it uses priority instead. */
  waiverPriority?: number
  kind: 'fa-add' | 'waiver-add' | 'faab-add'
  /**
   * What the claim was up against.
   *
   * RIVAL BIDS ONLY, and that is the whole subtlety. A manager may
   * enter several claims on the same player at different prices — a
   * $9 and an $8 on Denzel Boston, both from the same roster — and
   * counting those as competition reports a nail-biting escape from
   * a man bidding against himself. Only bids from OTHER teams count.
   */
  /**
   * Undefined means UNKNOWN, not zero.
   *
   * Only some platforms publish losing claims. Sleeper does; ESPN and
   * Yahoo drop anything that did not execute before it reaches the
   * contract, so on those leagues we never learn who else bid. Present
   * with `rivals: 0` means we saw the whole run and nobody did —
   * absent means we were never told, and nothing may be said either
   * way.
   */
  contest?: {
    /** How many other teams bid on him. */
    rivals: number
    /** The best rival bid. Undefined when nobody else wanted him. */
    nextBid?: number
  }
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
 * The claims that settled in the most recent waiver run.
 *
 * WHY NOT GROUP BY WEEK. Sleeper stamps a claim with the `leg` it was
 * SUBMITTED in, and a waiver run settles everything outstanding at
 * once. In the captured league one Wednesday run settled a $15 claim
 * stamped leg 1 and a $1 claim stamped leg 2 in the same second —
 * grouping by leg split one wire across two weeks and headlined the
 * issue with the $1 half. Worse, leg 1 also still held claims that
 * settled back in August, so "week 1's wire" mixed preseason with
 * Sunday.
 *
 * A wire section is about what just landed, and what just landed is a
 * run. Grouping by settlement day says exactly that and needs no
 * week arithmetic, so no amount of leg drift can break it.
 *
 * A calendar DAY rather than an exact timestamp because platforms
 * settle a batch over a few seconds, and a trade accepted the same
 * morning belongs in the same column.
 */
export function latestWireRun(
  transactions: readonly LeagueTransaction[] | undefined,
): LeagueTransaction[] {
  if (!transactions?.length) return []
  // UTC rather than local: the grouping has to be stable wherever it
  // renders, and a reader in Auckland must not see a different wire.
  const day = (t: LeagueTransaction) => Math.floor(t.timestamp / 86_400_000)
  const latest = Math.max(...transactions.map(day).filter(Number.isFinite))
  if (!Number.isFinite(latest)) return []
  return transactions.filter((t) => day(t) === latest)
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

  // No week given means "the wire as it stands" — the most recent run,
  // which is what a Wednesday-morning deck wants and what the issue
  // asks for. An explicit week still filters by week, for callers
  // reconstructing a past issue.
  let inWeek: LeagueTransaction[]
  if (week === undefined) {
    inWeek = latestWireRun(transactions)
  } else {
    if (!Number.isFinite(week)) return null
    inWeek = transactions.filter((t) => t.week === week)
  }
  if (inWeek.length === 0) return null
  // The week a run belongs to is whatever the claims in it say — they
  // can disagree (a run settles claims submitted in different legs),
  // so the latest wins: that is the week the wire is reporting into.
  const targetWeek = Math.max(...inWeek.map((t) => t.week).filter(Number.isFinite))

  const adds: WireAdd[] = []
  const trades: WireTrade[] = []
  const moves = new Map<string, number>()

  // Losing claims, grouped by player, so a winning bid can say what it
  // beat. Kept out of every count below: nothing changed hands.
  const lostFor = new Map<string, { teamId: string; bid: number }[]>()
  // Whether this platform publishes losing claims at all.
  let sawLosingBids = false
  for (const tx of inWeek) {
    if (tx.kind !== 'failed-claim') continue
    sawLosingBids = true
    for (const m of tx.movements) {
      if (typeof tx.faabBid !== 'number') continue
      const list = lostFor.get(m.playerId) ?? []
      list.push({ teamId: m.toTeamId, bid: tx.faabBid })
      lostFor.set(m.playerId, list)
    }
  }

  for (const tx of inWeek) {
    if (tx.kind === 'failed-claim') continue
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
    // Only OTHER teams count as competition. See `contest`.
    const rivals = (lostFor.get(arriving.playerId) ?? []).filter((l) => l.teamId !== teamId)
    const nextBid = rivals.length ? Math.max(...rivals.map((r) => r.bid)) : undefined
    adds.push({
      teamId,
      playerId: arriving.playerId,
      playerName: arriving.playerName,
      position: arriving.position,
      faabBid: tx.faabBid,
      waiverPriority: tx.waiverPriority,
      kind: tx.kind,
      // Set on EVERY add when this platform publishes losing claims,
      // even at zero rivals — that is the difference between "nobody
      // bid against him" and "we were never told who did".
      ...(sawLosingBids
        ? { contest: { rivals: new Set(rivals.map((r) => r.teamId)).size, nextBid } }
        : {}),
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

/**
 * What a winning bid was actually up against, in one clause.
 *
 * Says nothing rather than something bland: a $0 claim nobody else
 * wanted is not a story, and "held off 0 rivals" is worse than
 * silence. The interesting shapes are a squeaker, a raid, and a
 * player half the league wanted.
 */
export function describeContest(add: WireAdd): string | undefined {
  const paid = add.faabBid
  if (typeof paid !== 'number') return undefined
  const c = add.contest
  // No `contest` at all means the platform never published the losing
  // claims, so nothing here is knowable. Saying "nobody else bid" would
  // be reporting the shape of the feed as a fact about the league.
  if (!c) return undefined
  if (c.rivals === 0) {
    // Spending real money with nobody bidding against you is its own
    // small embarrassment, and it is only worth saying when it is real
    // money.
    return paid >= 5 ? `Nobody else bid. ${money(paid)} unopposed.` : undefined
  }
  const next = c.nextBid
  const others = c.rivals === 1 ? 'one other team' : `${c.rivals} other teams`
  if (typeof next !== 'number') return `${cap(others)} wanted him.`
  const margin = paid - next
  if (margin <= 0) return `${cap(others)} wanted him.`
  // Beating a zero is not a bidding war. "Won him by a dollar, best of
  // them $0" is arithmetically true and reads as nonsense — nobody put
  // money up, so say that instead.
  if (next === 0) return `${cap(others)} put a claim in, none of them money.`
  if (margin === 1) return `Won him by a dollar — ${others} bid, best of them ${money(next)}.`
  if (c.rivals >= 4) return `${cap(others)} bid. Next best was ${money(next)}.`
  if (margin >= 5 && margin >= next) {
    // Paying double what it would have taken is the line everybody
    // quotes back at the winner in October.
    return `${money(margin)} more than he had to — next bid was ${money(next)}.`
  }
  return `Held off ${others}; next bid ${money(next)}.`
}

const money = (n: number) => `$${n}`
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
