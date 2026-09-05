/**
 * The draft deck.
 *
 * Between a draft and kickoff this is the only thing that has happened,
 * and it is the week the league argues hardest — so it is the first
 * deck present mode ships.
 *
 * Every slide is built from a fact the pick list actually supports, and
 * a slide with nothing behind it is omitted rather than padded. A deck
 * of four true slides presents better than eight where half are filler,
 * and the presenter finds out which they have BEFORE they start
 * talking.
 *
 * Deliberately no ABSOLUTE pick grades. Saying a pick was good needs a
 * projection model, and that model is UFD's. What the deck says instead
 * is divergence from where a player was expected to go — measured
 * against real ADP for the league's own scoring format where that
 * resolves, and against Sleeper's `search_rank` only as a fallback. The
 * copy names whichever was used; see `points/adp.ts` for the gap
 * between them.
 */
import type { CategoryLeagueDataDraftPick } from '../types'
import { buildDraftStoryFacts } from '../points/draftStory'
import {
  findDraftDivergences,
  findAdpDivergences,
  gradeTeamDrafts,
  ordinal,
  type ValuedPick,
} from '../points/draftValue'
import type { DraftBaseline } from '../points/sleeperProjections'
import { rankRosterStrength, type RosterPlayer } from '../points/rosterStrength'
import type { PresentDeck, PresentSlide } from './types'

/** What the deck needs to draw a team. Resolved by the caller, which
 *  owns league data; the deck just carries it through to the slide. */
export interface DeckTeam {
  name: string
  avatarUrl?: string
  avatarColor?: string
  ownerInitials?: string
}

export interface DraftDeckInput {
  leagueName: string
  season: number
  picks: CategoryLeagueDataDraftPick[]
  /** Resolves a team id to its display name. */
  teamName: (teamId: string) => string
  /** Optional richer lookup, for logos. Falls back to `teamName`. */
  team?: (teamId: string) => DeckTeam | undefined
  /**
   * Sleeper's own ADP and projections, when they resolved. The
   * PREFERRED baseline — see `points/sleeperProjections.ts` for the
   * measured margin over the fallback.
   */
  baseline?: DraftBaseline
  /** The league's roster slots, e.g. ['QB','RB','RB',...,'BN'].
   *  Without them no starting lineup can be built, so the projected
   *  roster slides are omitted rather than guessed at. */
  rosterPositions?: readonly string[]
  /** How many weeks the projection totals span. Leave unset unless a
   *  source publishes something other than a full NFL season — it is
   *  NOT the league's fantasy schedule length. */
  projectionWeeks?: number
  /** Consensus rank for a player, lower being better. The FALLBACK
   *  baseline, used only when ADP could not be fetched. With neither,
   *  the deck omits the steal and reach slides rather than guessing. */
  consensusRank?: (playerId: string) => number | undefined
  /**
   * Headshot for a drafted player, or null when there is none.
   *
   * Resolved by the CALLER rather than here, because whether an id
   * will resolve is a question about the league, not about the deck:
   * headshots come from Sleeper's CDN, and ESPN and Yahoo picks only
   * carry Sleeper ids once the player-id bridge has succeeded. A deck
   * that built the URL itself would emit a grid of 404s on every
   * league where the bridge failed.
   */
  playerImage?: (playerId: string) => string | null | undefined
}

/** Draft slot in the form people actually say it: "1.01", "12.10".
 *  An overall pick number of 120 tells nobody anything; round-and-slot
 *  is how a draft board is read. */
function draftSlot(pickOverall: number, round: number, teamCount: number): string {
  if (teamCount <= 0 || round <= 0) return `#${pickOverall}`
  const inRound = pickOverall - (round - 1) * teamCount
  return `${round}.${String(inRound).padStart(2, '0')}`
}

/** Compact round figure for a list row: "3.5 rds", "1 rd". The
 *  direction is already carried by which slide the row is on. */
function shortRounds(roundsDelta: number): string {
  const n = Math.round(Math.abs(roundsDelta) * 2) / 2
  return n === 1 ? '1 rd' : `${n} rds`
}

/**
 * Where a team picked from, in the language a draft room uses.
 *
 * Read off their round-one pick rather than a seat number, because
 * that is the only slot the pick list actually evidences — third-round
 * reversals, traded picks and odd orders all mean "seat N" and "picked
 * Nth in round one" are not the same claim.
 *
 * Returns null when there is no round-one pick to read, rather than
 * guessing from a later round.
 */
function draftHole(
  picks: readonly CategoryLeagueDataDraftPick[],
  teamId: string,
  teamCount: number,
): string | null {
  if (teamCount <= 0) return null
  const first = picks
    .filter((p) => p.draftedByTeamId === teamId && p.round === 1)
    .sort((a, b) => a.pickOverall - b.pickOverall)[0]
  if (!first) return null
  const inRound = first.pickOverall - (first.round - 1) * teamCount
  if (inRound < 1 || inRound > teamCount) return null
  return `drafted from the ${ordinal(inRound)} hole`
}

/**
 * A team's first three picks, as faces.
 *
 * The first three rather than the highest-projected: this is a DRAFT
 * deck, and what a manager did with their premium capital is the
 * draft claim. Highest-projected is a claim about the roster, which
 * the board deck already owns — and ordering by it would put a
 * seventh-round hit above a first-round pick on a slide about how
 * somebody drafted.
 *
 * Three, because a full roster is fourteen names nobody reads at
 * presentation distance.
 *
 * `excludePlayerId` keeps the highlighted pick out of the row. The
 * most extreme divergence on a card is very often a FIRST-ROUND pick —
 * that is where the board is most confident and so where a reach costs
 * most — which put the same face on the same slide twice, once small
 * and once large. The row simply moves on to the next pick instead.
 */
function topPicks(
  input: DraftDeckInput,
  teamId: string,
  teamCount: number,
  excludePlayerId?: string,
): { name: string; sub?: string; imageUrl?: string }[] {
  return input.picks
    .filter((p) => p.draftedByTeamId === teamId && p.playerId !== excludePlayerId)
    .sort((a, b) => a.pickOverall - b.pickOverall)
    .slice(0, 3)
    .map((p) => ({
      name: p.playerName,
      sub: draftSlot(p.pickOverall, p.round, teamCount),
      imageUrl: input.playerImage?.(p.playerId) ?? undefined,
    }))
}

/** Slide-row visual fields for a team, or nothing when the caller gave
 *  us no way to resolve one. */
function teamVisual(input: DraftDeckInput, teamId: string) {
  const t = input.team?.(teamId)
  if (!t) return {}
  return {
    teamId,
    logoUrl: t.avatarUrl,
    logoColor: t.avatarColor,
    logoInitials: t.ownerInitials,
  }
}

/** Returns null when the league has no draft — the caller then omits
 *  this deck from the picker rather than offering an empty one. */
export function buildDraftDeck(input: DraftDeckInput): PresentDeck | null {
  const facts = buildDraftStoryFacts(input.picks)
  if (!facts) return null

  const slides: PresentSlide[] = []

  slides.push({
    kind: 'cold-open',
    title: input.leagueName,
    subtitle: 'The draft',
    meta: `${input.season} · ${facts.totalPicks} picks · ${facts.rounds} rounds`,
  })

  // JUST THE RANKING.
  //
  // This deck used to open with a lede, a where-each-position-went
  // list and a loaded-up statement, and close on a verdict. All four
  // were true and none of them was what the deck is for: the countdown
  // is the presentation, and the material around it was four slides
  // the room sat through before reaching it.
  //
  // The facts they carried are not lost — the issue page still prints
  // the draft lede and the position board, and the rank-one card IS
  // the verdict the closing slide used to restate.

  // Steals and reaches. Two baselines, and they are not equal: real
  // ADP when it resolved, Sleeper's `search_rank` only as a fallback.
  // The copy names whichever was used, because the reader is being
  // asked to accept a judgement about their own draft and is entitled
  // to know what it rests on.
  if (input.baseline || input.consensusRank) {
    const valued: ValuedPick[] = input.picks.map((p) => ({
      pickOverall: p.pickOverall,
      round: p.round,
      playerId: p.playerId,
      playerName: p.playerName,
      position: p.position,
      teamId: p.draftedByTeamId,
    }))
    const div = input.baseline
      ? findAdpDivergences(
          valued,
          (p) => input.baseline!.adpOf(p.playerId),
          facts.teamCount,
        )
      : findDraftDivergences(valued, input.consensusRank!, facts.teamCount)

    // Named for the reader, so the basis of every figure on the next
    // four slides is stated rather than assumed.
    const basis = input.baseline
      ? input.baseline.basis
      : "Sleeper's player ranking"

    // No separate "the steal" statement. It named the same player this
    // list leads with, one slide earlier — spending the deck's biggest
    // visual moment on a repeat, and telling the room the answer before
    // the reveal that was supposed to deliver it.
    // The league-wide fell-furthest and went-early lists used to sit
    // here. They are gone: every pick they named now appears on its
    // own team's card, where the room is already looking at that
    // manager, and ten steps of leaderboard before the cards was the
    // same information in the order that serves it worst.

    const graded = gradeTeamDrafts([...div.fell, ...div.reached])

    // THE ACTUAL GRADE. Everything above measures who beat the board.
    // This measures who has the team — a different claim, and the one
    // a league argues about. It needs projections, which is why it
    // could not exist until Sleeper's were found.
    const strength =
      input.baseline && input.rosterPositions?.length
        ? rankRosterStrength(
            input.picks.map<RosterPlayer>((p) => ({
              playerId: p.playerId,
              position: p.position,
              teamId: p.draftedByTeamId,
            })),
            input.baseline.pointsOf,
            input.rosterPositions,
            input.projectionWeeks,
          )
        : []

    // ONE CARD PER TEAM, worst to best, carrying that team's own draft.
    //
    // This replaces two separate ten-row countdowns — one for value
    // against the board, one for projected roster. Turning both into
    // cards would have meant twenty team slides in a single deck; the
    // room does not have that in it. Merging them means each team is
    // presented ONCE, with both grades side by side and its own best
    // and worst pick, which is a better slide than either list was:
    // the two grades frequently disagree, and the disagreement is only
    // visible when they sit on the same card.
    //
    // ORDERED BY DRAFT GRADE, not by projected roster.
    //
    // It used to sort on projected points per week, which is precisely
    // what the power-rankings deck sorts on — so the two decks ranked
    // the same league the same way and one of them was redundant. It
    // also put teams with a worse draft above teams with a better one,
    // because roster strength is not a measure of drafting.
    //
    // A draft deck should rank the DRAFT. Value against the board is
    // the draft-specific claim; roster strength is what the team is
    // worth afterwards, and that belongs to the board.
    //
    // Teams with no measurable divergence get no grade, so they are
    // appended rather than dropped — a manager missing from their own
    // league's draft deck would be a bug, not an omission.
    const gradedIds = new Set(graded.map((g) => g.teamId))
    const ungraded = strength
      .filter((t) => !gradedIds.has(t.teamId))
      .map((t, i) => ({ teamId: t.teamId, rank: graded.length + i + 1 }))
    const ranked: { teamId: string; rank: number }[] = [
      ...graded.map((g) => ({ teamId: g.teamId, rank: g.rank })),
      ...ungraded,
    ]
    const gradeBy = new Map(graded.map((g) => [g.teamId, g]))
    const strengthBy = new Map(strength.map((t) => [t.teamId, t]))

    // Each team's own best steal and worst reach, so a card can show
    // the picks that team will actually be asked about.
    const bestSteal = new Map<string, (typeof div.fell)[number]>()
    for (const d of div.fell) {
      if (!bestSteal.has(d.pick.teamId)) bestSteal.set(d.pick.teamId, d)
    }
    const worstReach = new Map<string, (typeof div.reached)[number]>()
    for (const d of div.reached) {
      if (!worstReach.has(d.pick.teamId)) worstReach.set(d.pick.teamId, d)
    }

    if (ranked.length >= 4) {
      const field = ranked.length
      for (const { teamId, rank } of [...ranked].reverse()) {
        const g = gradeBy.get(teamId)
        const t = strengthBy.get(teamId)
        const steal = bestSteal.get(teamId)
        const reach = worstReach.get(teamId)
        const notes: string[] = []

        // THE ONE PICK THEY WILL BE ASKED ABOUT.
        //
        // Whichever moved furthest, not "the steal if there is one" —
        // the most extreme divergence is the one the room reacts to,
        // and a team whose worst reach dwarfs its best value should be
        // shown the reach. Teams often have only one of the two, and
        // some have neither, so this simply goes missing rather than
        // filling the space with a lesser pick.
        //
        // These two facts used to be a pair of note lines naming the
        // same players. As a face with a tag they say more in a
        // fraction of the words, so the lines are gone.
        const candidates = [steal, reach].filter(
          (d): d is NonNullable<typeof d> => !!d,
        )
        const furthest = candidates.sort(
          (a, b) => Math.abs(b.roundsDelta) - Math.abs(a.roundsDelta),
        )[0]
        const highlight = furthest
          ? {
              label: furthest === steal ? 'Steal' : 'Reach',
              name: furthest.pick.playerName,
              sub:
                `${draftSlot(furthest.pick.pickOverall, furthest.pick.round, facts.teamCount)}, ` +
                `${shortRounds(furthest.roundsDelta)} ` +
                `${furthest === steal ? `later than ${basis}` : `ahead of ${basis}`}`,
              imageUrl: input.playerImage?.(furthest.pick.playerId) ?? undefined,
            }
          : undefined

        // Said only when it is true, and it often is: beating the
        // market and drafting the best roster are different things.
        if (t && g && Math.abs(t.rank - g.rank) >= 3) {
          notes.push(
            t.rank < g.rank
              ? `${ordinal(t.rank)} by roster but only ${ordinal(g.rank)} by value — ` +
                'they paid market price and still walked out ahead.'
              : `${ordinal(g.rank)} by value but only ${ordinal(t.rank)} by roster — ` +
                'beating the board is not the same as winning the draft.',
          )
        }

        slides.push({
          kind: 'team-card',
          eyebrow: 'Draft grades',
          rank,
          fieldSize: field,
          teamName: input.teamName(teamId),
          // THE HERO. This deck is called Draft grades, is ordered by
          // grade, and used to render the letter smaller than its own
          // note text while a rank numeral took the largest block on
          // the slide. Since the letters are assigned BY rank, those
          // were the same claim twice — so the letter takes the space
          // and the rank drops to "3rd of 10".
          //
          // `statValue` below stays directly beneath it, always. The
          // letters are a curve: somebody always lands top and
          // somebody always lands bottom regardless of how the room
          // drafted, so a letter without the figure that earned it
          // asserts more than the data supports. See `gradeTeamDrafts`.
          grade: g?.grade && g.grade !== '—' ? g.grade : undefined,
          slot: draftHole(input.picks, teamId, facts.teamCount) ?? undefined,
          // The figure that sorts. Showing projected points here while
          // sorting on draft value is the same defect this deck already
          // fixed once in its list ordering: a big number that does not
          // explain the order reads as a broken sort.
          statValue: g ? `${g.vsLeague > 0 ? '+' : ''}${g.vsLeague}` : '—',
          statLabel: 'rounds per pick against the room',
          players: topPicks(input, teamId, facts.teamCount, furthest?.pick.playerId),
          highlight,
          chips: [
            ...(g ? [{ value: `${g.picksCompared}`, label: 'picks compared' }] : []),
            // Roster strength stays as CONTEXT — it is what the draft
            // produced — but it no longer orders anything here. The
            // board deck is where it is the claim.
            ...(t
              ? [
                  { value: `${t.pointsPerWeek}`, label: 'projected pts / week' },
                  {
                    value: `${ordinal(t.rank)}`,
                    label: 'roster in the league',
                  },
                ]
              : []),
          ],
          notes,
          ...teamVisual(input, teamId),
        })
      }
    }

    // No closing verdict slide. It restated the rank-one card the
    // countdown had just built to — the same team, the same figure,
    // one slide later.
  }

  slides.push({
    kind: 'sign-off',
    headline: 'The board is set.',
    sub: 'The season starts when the games do.',
  })

  return { id: 'draft', title: 'The draft', slides }
}
