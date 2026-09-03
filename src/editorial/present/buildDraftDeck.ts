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
 * Deliberately no pick GRADES. Judging a pick needs a projection model,
 * and that model is UFD's. What the deck does say is position-relative
 * order ("the fifth running back off the board"), which is true whatever
 * the league's settings are — see `positionOrder` for why the obvious
 * shortcut fails.
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
  describeDivergence,
  gradeTeamDrafts,
  type ValuedPick,
} from '../points/draftValue'
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
  /** Consensus rank for a player, lower being better. Optional: with
   *  no source of consensus the deck simply omits the steal and reach
   *  slides rather than guessing at them. */
  consensusRank?: (playerId: string) => number | undefined
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
      revealOneByOne: true,
      rows: facts.firstAtPosition.slice(0, 6).map((f) => ({
        lead: f.position,
        label: f.playerName,
        sub: input.teamName(f.teamId),
        value: `#${f.pickOverall}`,
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

  // Steals and reaches. Measured WITHIN each position, so positional
  // scarcity cancels out — see draftValue.ts for why comparing across
  // positions produces four quarterbacks and no credibility.
  if (input.consensusRank) {
    const valued: ValuedPick[] = input.picks.map((p) => ({
      pickOverall: p.pickOverall,
      round: p.round,
      playerId: p.playerId,
      playerName: p.playerName,
      position: p.position,
      teamId: p.draftedByTeamId,
    }))
    const div = findDraftDivergences(valued, input.consensusRank, facts.teamCount)

    if (div.fell.length > 0) {
      const top = div.fell[0]
      slides.push({
        kind: 'statement',
        eyebrow: 'The steal',
        headline: `${input.teamName(top.pick.teamId)} got ${top.pick.playerName} at ${top.pick.pickOverall}.`,
        support: describeDivergence(top, positionWord(top.pick.position, 1)),
      })
      if (div.fell.length > 1) {
        slides.push({
          kind: 'list',
          eyebrow: 'Fell furthest',
          headline: 'Who lasted longer than they should have.',
          revealOneByOne: true,
          rows: div.fell.slice(0, 5).map((d) => ({
            lead: `#${d.pick.pickOverall}`,
            label: d.pick.playerName,
            sub: input.teamName(d.pick.teamId),
            value: shortRounds(d.roundsDelta),
            ...teamVisual(input, d.pick.teamId),
          })),
        })
      }
    }

    if (div.reached.length > 0) {
      slides.push({
        kind: 'list',
        eyebrow: 'Went early',
        headline: 'Picks the room did not see coming.',
        revealOneByOne: true,
        rows: div.reached.slice(0, 5).map((d) => ({
          lead: `#${d.pick.pickOverall}`,
          label: d.pick.playerName,
          sub: input.teamName(d.pick.teamId),
          value: shortRounds(d.roundsDelta),
          ...teamVisual(input, d.pick.teamId),
        })),
      })
    }

    // Every team, graded. Letters are LEAGUE-RELATIVE — see
    // gradeTeamDrafts — so the rounds figure sits beside each one
    // rather than the letter standing alone as a verdict.
    const graded = gradeTeamDrafts([...div.fell, ...div.reached])
    if (graded.length >= 4) {
      slides.push({
        kind: 'list',
        eyebrow: 'Draft grades',
        headline: 'Graded on a curve, against consensus.',
        revealOneByOne: true,
        rows: graded.map((g) => ({
          lead: g.grade,
          label: input.teamName(g.teamId),
          sub: `${g.picksCompared} picks compared`,
          value: `${g.roundsGained > 0 ? '+' : ''}${g.roundsGained} rds`,
          ...teamVisual(input, g.teamId),
        })),
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
