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
 * Deliberately no pick grades. Judging a pick needs a projection model,
 * and that model is UFD's — see draftStory.ts for the same reasoning.
 */
import type { CategoryLeagueDataDraftPick } from '../types'
import {
  buildDraftStoryFacts,
  draftLede,
  numberWord,
  positionWord,
} from '../points/draftStory'
import type { PresentDeck, PresentSlide } from './types'

export interface DraftDeckInput {
  leagueName: string
  season: number
  picks: CategoryLeagueDataDraftPick[]
  /** Resolves a team id to its display name. */
  teamName: (teamId: string) => string
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

  if (facts.firstPick) {
    slides.push({
      kind: 'statement',
      eyebrow: 'Pick 1.1',
      headline: `${input.teamName(facts.firstPick.draftedByTeamId)} took ${facts.firstPick.playerName}.`,
      support: facts.firstPick.position
        ? `${facts.firstPick.position}${facts.firstPick.mlbTeam ? `, ${facts.firstPick.mlbTeam}` : ''}. The board started here.`
        : undefined,
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
        teamId: f.teamId,
      })),
    })
  }

  // Runs — the moments the room reacted to itself rather than its board.
  if (facts.runs.length > 0) {
    slides.push({
      kind: 'list',
      eyebrow: 'The runs',
      headline: 'When the room moved together.',
      revealOneByOne: true,
      rows: facts.runs.slice(0, 5).map((r) => ({
        lead: `${r.fromPick}–${r.toPick}`,
        label: `${numberWord(r.count)} ${positionWord(r.position, r.count)}`,
        value: `${r.count}×`,
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

  if (facts.positionCounts.length > 0) {
    slides.push({
      kind: 'list',
      eyebrow: 'The shape of it',
      headline: 'What the league drafted.',
      rows: facts.positionCounts.map((p) => ({
        lead: p.position,
        label: positionWord(p.position, p.count),
        value: String(p.count),
      })),
    })
  }

  slides.push({
    kind: 'sign-off',
    headline: 'The board is set.',
    sub: 'The season starts when the games do.',
  })

  return { id: 'draft', title: 'The draft', slides }
}
