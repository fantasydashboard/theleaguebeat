/**
 * The Wire — what the league did this week.
 *
 * The third deck, and the one with the best rhythm. The draft deck is
 * a one-off that becomes an archive at kickoff; the board is a ranking
 * that changes slowly. This covers a single Wednesday: waivers have
 * processed, somebody overpaid, and the room already has opinions.
 *
 * Every figure is a count or a dollar amount off the transaction log.
 * Nothing is projected, scored or weighted, and that is the point — a
 * league can check all of it, which is exactly the licence a deck
 * needs to be blunt about who spent what.
 */
import type { PresentDeck, PresentSlide } from './types'
import { ordinal } from '../points/draftValue'
import { buildWireFacts, describeCost, type WireFacts } from '../points/wireFacts'
import type { LeagueTransaction } from '../transactions/types'

export interface WireDeckTeam {
  name: string
  avatarUrl?: string
  avatarColor?: string
  ownerInitials?: string
}

export interface WireDeckInput {
  leagueName: string
  season: number
  transactions?: readonly LeagueTransaction[]
  /** Which processing period to cover. Defaults to the most recent. */
  week?: number
  teamName: (teamId: string) => string
  team?: (teamId: string) => WireDeckTeam | undefined
}

function teamVisual(input: WireDeckInput, teamId: string) {
  const t = input.team?.(teamId)
  if (!t) return {}
  return {
    teamId,
    logoUrl: t.avatarUrl,
    logoColor: t.avatarColor,
    logoInitials: t.ownerInitials,
  }
}

/** "two players", "four players" — small counts read better as words. */
function playerCount(n: number): string {
  const words = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven']
  return `${words[n] ?? n} player${n === 1 ? '' : 's'}`
}

/**
 * Returns null when the week had no moves.
 *
 * A quiet week is not a story — it is an empty deck, and offering it
 * would be the same mistake as a board with nothing to rank.
 */
export function buildWireDeck(input: WireDeckInput): PresentDeck | null {
  const facts: WireFacts | null = buildWireFacts(input.transactions, input.week)
  if (!facts || facts.totalMoves === 0) return null

  const slides: PresentSlide[] = []

  slides.push({
    kind: 'cold-open',
    title: input.leagueName,
    subtitle: 'The wire',
    meta:
      `${input.season} · week ${facts.week} · ${facts.totalMoves} move` +
      `${facts.totalMoves === 1 ? '' : 's'}`,
  })

  // The lede: money if the league uses it, volume if it does not.
  if (facts.usesFaab && facts.faabSpent) {
    const top = facts.adds[0]
    slides.push({
      kind: 'statement',
      eyebrow: 'The wire',
      headline: `$${facts.faabSpent} changed hands this week.`,
      support:
        top && top.faabBid
          ? `The biggest single bid was ${input.teamName(top.teamId)}'s $${top.faabBid} ` +
            `on ${top.playerName}. Whether that was decisive or merely expensive ` +
            'is what the next few weeks decide.'
          : 'Spread across the week’s claims.',
      chips: [
        { value: `$${facts.faabSpent}`, label: 'FAAB spent' },
        { value: `${facts.adds.length}`, label: 'claims won' },
        { value: `${facts.trades.length}`, label: 'trades' },
      ],
    })
  } else {
    slides.push({
      kind: 'statement',
      eyebrow: 'The wire',
      headline: `${facts.totalMoves} move${facts.totalMoves === 1 ? '' : 's'} this week.`,
      support:
        `${facts.adds.length} pickup${facts.adds.length === 1 ? '' : 's'} and ` +
        `${facts.trades.length} trade${facts.trades.length === 1 ? '' : 's'}. ` +
        'Everything below came off the league log.',
    })
  }

  // Who won what. One row per claim, biggest bid first.
  if (facts.adds.length > 0) {
    slides.push({
      kind: 'list',
      eyebrow: 'Claimed',
      headline: facts.usesFaab ? 'Who paid what.' : 'Who picked up whom.',
      support: facts.usesFaab
        ? 'Winning bids, biggest first. Losing bids are not published by any platform.'
        : 'Pickups this week, in the order they processed.',
      revealOneByOne: true,
      rows: facts.adds.slice(0, 8).map((a) => ({
        lead: describeCost(a),
        label: a.playerName,
        sub: `${input.teamName(a.teamId)}${a.position ? ` · ${a.position}` : ''}`,
        ...teamVisual(input, a.teamId),
      })),
    })
  }

  // Trades get their own slide each: a trade is the one transaction a
  // league argues about for weeks, and burying it in a list of waiver
  // claims would waste it.
  for (const trade of facts.trades) {
    const sides = trade.teamIds.map((teamId) => {
      const got = trade.received.get(teamId) ?? []
      return `${input.teamName(teamId)} got ${got.length ? got.join(', ') : 'nothing'}`
    })
    slides.push({
      kind: 'statement',
      eyebrow: 'Trade',
      headline: trade.teamIds.map((t) => input.teamName(t)).join(' and '),
      support: `${sides.join('. ')}. ${playerCount(trade.playerCount)} moved.`,
    })
  }

  // Activity. Counted per team per transaction, so a two-for-two swap
  // is one move each rather than four.
  if (facts.activity.length >= 3) {
    slides.push({
      kind: 'list',
      eyebrow: 'Busiest',
      headline: 'Who worked the wire.',
      support: 'Transactions per team this week. A trade counts once for each side.',
      revealOneByOne: true,
      rows: facts.activity.slice(0, 8).map((a, i) => ({
        lead: ordinal(i + 1),
        label: input.teamName(a.teamId),
        value: `${a.moves}`,
        ...teamVisual(input, a.teamId),
      })),
    })
  }

  slides.push({
    kind: 'sign-off',
    headline: 'The wire never closes.',
    sub: 'Next claims process Wednesday.',
  })

  return { id: 'wire', title: 'The wire', slides }
}
