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
import {
  buildDraftStoryFacts,
  draftLede,
  numberWord,
  positionWord,
} from '../points/draftStory'
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

  // The lede — the single most arguable thing about the draft.
  const lede = draftLede(facts, input.teamName)
  if (lede) {
    slides.push({
      kind: 'statement',
      eyebrow: 'The room',
      headline: lede,
      chips: [
        { value: String(facts.totalPicks), label: 'picks' },
        { value: String(facts.rounds), label: 'rounds' },
        { value: String(facts.teamCount), label: 'teams' },
      ],
    })
  }

  // Where each position first went. Reveals one at a time, because the
  // interesting part is the GAP between them — a quarterback going at 41
  // in one league and 22 in another is the whole conversation.
  if (facts.firstAtPosition.length >= 2) {
    slides.push({
      kind: 'list',
      eyebrow: 'Off the board',
      headline: 'Where each position went first.',
      support: 'Draft slot, as round and pick.',
      revealOneByOne: true,
      rows: facts.firstAtPosition.slice(0, 6).map((f) => ({
        lead: f.position,
        label: f.playerName,
        sub: input.teamName(f.teamId),
        value: draftSlot(f.pickOverall, f.round, facts.teamCount),
        ...teamVisual(input, f.teamId),
      })),
    })
  }

  const top = facts.concentrations[0]
  if (top) {
    slides.push({
      kind: 'statement',
      eyebrow: 'Loaded up',
      headline: `${input.teamName(top.teamId)} left with ${numberWord(top.count)} ${positionWord(top.position, top.count)}.`,
      support: 'More than anyone else in the room.',
    })
  }

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

        if (steal) {
          notes.push(
            `Best value: ${steal.pick.playerName} at ` +
              `${draftSlot(steal.pick.pickOverall, steal.pick.round, facts.teamCount)}, ` +
              `${shortRounds(steal.roundsDelta)} later than ${basis} expected.`,
          )
        }
        if (reach) {
          notes.push(
            `Went early on ${reach.pick.playerName} at ` +
              `${draftSlot(reach.pick.pickOverall, reach.pick.round, facts.teamCount)} — ` +
              `${shortRounds(reach.roundsDelta)} ahead of ${basis}.`,
          )
        }
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
          // The letter alone. Writing "Grade A" trips the deck's own
          // guard against verdict language, and the eyebrow already
          // says Draft grades — the pill does not need to repeat it.
          tier: g?.grade && g.grade !== '—' ? g.grade : undefined,
          // The figure that sorts. Showing projected points here while
          // sorting on draft value is the same defect this deck already
          // fixed once in its list ordering: a big number that does not
          // explain the order reads as a broken sort.
          statValue: g ? `${g.vsLeague > 0 ? '+' : ''}${g.vsLeague}` : '—',
          statLabel: 'rounds per pick gained on the board',
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

    // The projected-roster countdown that used to sit here is gone —
    // the team cards above already carry every one of its figures, and
    // a second ten-row pass over the same league said nothing the room
    // had not just been shown one team at a time.
    if (strength.length >= 4) {
      // The crown — and it must crown the team the COUNTDOWN built to,
      // which is now the best draft grade rather than the best roster.
      // Ranking the cards one way and crowning the other would have the
      // deck contradict itself on its last slide.
      //
      // The roster winner, when it is somebody else, becomes the twist
      // instead of the verdict: it is the more interesting fact once
      // the deck has spent ten cards establishing who drafted well.
      const bestDraft = graded[0]
      const bestRoster = strength[0]
      const differs = bestRoster && bestRoster.teamId !== bestDraft.teamId
      slides.push({
        kind: 'statement',
        eyebrow: 'The verdict',
        headline: `${input.teamName(bestDraft.teamId)} won the draft.`,
        support:
          `${bestDraft.vsLeague > 0 ? '+' : ''}${bestDraft.vsLeague} rounds per pick ` +
          `against ${basis}, the best in the room. ` +
          (differs
            ? `${input.teamName(bestRoster.teamId)} walks away with the stronger ` +
              'roster on projection — beating the board and owning the best team ' +
              'are different achievements, and this room split them. '
            : 'They walk away with the strongest projected roster too. ') +
          'Projections are a forecast, not a result. The season decides.',
        chips: [
          {
            value: `${bestDraft.vsLeague > 0 ? '+' : ''}${bestDraft.vsLeague}`,
            label: 'rounds / pick',
          },
          ...(bestDraft.grade !== '—'
            ? [{ value: bestDraft.grade, label: 'grade' }]
            : []),
          ...(bestRoster
            ? [{ value: `${bestRoster.pointsPerWeek}`, label: 'top roster pts / wk' }]
            : []),
        ],
      })
    } else if (graded.length >= 4) {
      // No projections resolved — fall back to crowning the value
      // winner, which is a weaker claim and says so.
      const winner = graded[0]
      slides.push({
        kind: 'statement',
        eyebrow: 'The verdict',
        headline: `${input.teamName(winner.teamId)} beat the board.`,
        support:
          `${winner.vsLeague > 0 ? '+' : ''}${winner.vsLeague} rounds per pick ` +
          `better than the league average against ${basis}. That is value ` +
          'against the market, which is not the same as the best roster — ' +
          'saying which would need projections.',
      })
    }
  }

  slides.push({
    kind: 'sign-off',
    headline: 'The board is set.',
    sub: 'The season starts when the games do.',
  })

  return { id: 'draft', title: 'The draft', slides }
}
