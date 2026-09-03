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

/** Where the baseline had him, in the same round-and-slot form.
 *  Carries the fact the round figure alone cannot: "7 rds late" says
 *  how far he slid, "expected 7.10" says from where. A quarterback
 *  sliding from round seven and a receiver sliding from round two are
 *  different stories, and the reader can only tell them apart with
 *  both numbers on the row. */
function expectedSlot(
  d: { expectedPickOverall: number },
  teamCount: number,
): string {
  if (teamCount <= 0) return `#${d.expectedPickOverall}`
  const round = Math.max(1, Math.ceil(d.expectedPickOverall / teamCount))
  return draftSlot(d.expectedPickOverall, round, teamCount)
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
    const basisSupport = input.baseline
      ? `Against ${input.baseline.basis}, biggest gap first.`
      : "Against Sleeper's player ranking — the only ordering it publishes, " +
        'and a proxy for ADP rather than ADP itself. Biggest gap first.'

    // No separate "the steal" statement. It named the same player this
    // list leads with, one slide earlier — spending the deck's biggest
    // visual moment on a repeat, and telling the room the answer before
    // the reveal that was supposed to deliver it.
    if (div.fell.length > 0) {
      slides.push({
        kind: 'list',
        eyebrow: 'Fell furthest',
        headline: 'Who lasted longer than they should have.',
        support: basisSupport,
        revealOneByOne: true,
        rows: div.fell.slice(0, 5).map((d) => ({
          lead: draftSlot(d.pick.pickOverall, d.pick.round, facts.teamCount),
          label: d.pick.playerName,
          sub: `${input.teamName(d.pick.teamId)} · expected ${expectedSlot(d, facts.teamCount)}`,
          value: shortRounds(d.roundsDelta),
          ...teamVisual(input, d.pick.teamId),
        })),
      })
    }

    if (div.reached.length > 0) {
      slides.push({
        kind: 'list',
        eyebrow: 'Went early',
        headline: 'Picks the room did not see coming.',
        support: basisSupport,
        revealOneByOne: true,
        rows: div.reached.slice(0, 5).map((d) => ({
          lead: draftSlot(d.pick.pickOverall, d.pick.round, facts.teamCount),
          label: d.pick.playerName,
          sub: `${input.teamName(d.pick.teamId)} · expected ${expectedSlot(d, facts.teamCount)}`,
          value: shortRounds(d.roundsDelta),
          ...teamVisual(input, d.pick.teamId),
        })),
      })
    }

    // Every team, graded — as a COUNTDOWN. The list runs worst to best
    // so the winner is revealed last.
    //
    // Ordering it best-first put the answer on screen at step one and
    // then spent nine more steps descending into teams nobody was
    // waiting for. A grade sheet is the one slide with a result the
    // whole room wants, and a result is worth building to.
    //
    // Letters are LEAGUE-RELATIVE — see gradeTeamDrafts — so the rounds
    // figure sits beside each one rather than the letter standing alone
    // as a verdict.
    const graded = gradeTeamDrafts([...div.fell, ...div.reached])
    if (graded.length >= 4) {
      const countdown = [...graded].reverse()
      slides.push({
        kind: 'list',
        eyebrow: 'Draft grades',
        headline: 'Who beat the board.',
        support:
          `Rounds gained per pick against ${basis}, next to the league ` +
          'average. Counting up to the best draft in the room.',
        revealOneByOne: true,
        rows: countdown.map((g) => ({
          // Rank leads rather than the letter: a countdown needs a
          // position to count, and "10th" tells the room how far there
          // is left to go in a way that "D" does not.
          lead: `${ordinal(g.rank)}`,
          label: input.teamName(g.teamId),
          sub: `${g.grade} · ${g.picksCompared} picks compared`,
          value: `${g.vsLeague > 0 ? '+' : ''}${g.vsLeague}/pick`,
          ...teamVisual(input, g.teamId),
        })),
      })

    }

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

    if (strength.length >= 4) {
      const countdown = [...strength].reverse()
      slides.push({
        kind: 'list',
        eyebrow: 'Projected rosters',
        headline: 'Who actually drafted the best team.',
        support:
          `Best starting lineup each team can field, on Sleeper's ${input.baseline!.formatLabel} ` +
          'projections. Bench players score nothing, because they do not. ' +
          'Counting up to the strongest roster in the league.',
        revealOneByOne: true,
        rows: countdown.map((t) => ({
          lead: ordinal(t.rank),
          label: input.teamName(t.teamId),
          sub: `${t.projectedPoints.toLocaleString()} projected pts`,
          value: `${t.vsLeaguePerWeek > 0 ? '+' : ''}${t.vsLeaguePerWeek}/wk`,
          ...teamVisual(input, t.teamId),
        })),
      })

      // The crown. This is what the removed "the steal" slide's visual
      // weight is worth spending on: the one claim in the deck the room
      // will actually argue about afterwards.
      const best = strength[0]
      const worst = strength[strength.length - 1]
      const gap = Math.round((best.pointsPerWeek - worst.pointsPerWeek) * 10) / 10
      const beatBoard = graded.length >= 4 ? graded[0] : undefined
      slides.push({
        kind: 'statement',
        eyebrow: 'The verdict',
        headline: `${input.teamName(best.teamId)} drafted the best team.`,
        support:
          `${best.pointsPerWeek} projected points a week — ${gap} more than ` +
          `${input.teamName(worst.teamId)} at the bottom of the room. ` +
          // The contrast is the story whenever the two grades disagree,
          // and they usually do: beating the market and owning the best
          // roster are different achievements.
          (beatBoard && beatBoard.teamId !== best.teamId
            ? `${input.teamName(beatBoard.teamId)} beat the board by more, and still did not draft this team. `
            : '') +
          'Projections are a forecast, not a result. The season decides.',
        chips: [
          { value: ordinal(best.rank), label: 'projected' },
          { value: `${best.pointsPerWeek}`, label: 'pts / week' },
          { value: `+${best.vsLeaguePerWeek}`, label: 'vs league' },
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
