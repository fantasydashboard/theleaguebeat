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

/**
 * Where a pick sat WITHIN ITS OWN POSITION — "the fifth running back
 * off the board".
 *
 * This is deliberately the only draft-order judgement the deck makes.
 * The obvious alternative is to grade picks against Sleeper's
 * `search_rank`, and it does not survive contact with real data: it
 * correlates with draft order at only 0.79, carries 45 duplicate values
 * across 140 picks, and is blind to positional scarcity — so in a
 * one-quarterback league it flags Mahomes, Purdy, Nix and Dart as the
 * four biggest "steals" purely because quarterbacks always fall. A
 * league would spot that as nonsense immediately.
 *
 * Position-relative order avoids cross-position comparison entirely, so
 * it is true whatever the league's settings are. Real value grades need
 * real projections, which is UFD's model, not a number scraped from a
 * search index.
 */
function positionOrder(
  picks: CategoryLeagueDataDraftPick[],
): Map<number, { position: string; nth: number }> {
  const seen = new Map<string, number>()
  const out = new Map<number, { position: string; nth: number }>()
  for (const p of [...picks].sort((a, b) => a.pickOverall - b.pickOverall)) {
    if (!p.position) continue
    const nth = (seen.get(p.position) ?? 0) + 1
    seen.set(p.position, nth)
    out.set(p.pickOverall, { position: p.position, nth })
  }
  return out
}

/** Returns null when the league has no draft — the caller then omits
 *  this deck from the picker rather than offering an empty one. */
export function buildDraftDeck(input: DraftDeckInput): PresentDeck | null {
  const facts = buildDraftStoryFacts(input.picks)
  if (!facts) return null

  const posOrder = positionOrder(input.picks)
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
        ...teamVisual(input, f.teamId),
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

  // Round one, pick by pick — the slide a room actually wants walked
  // through. Each row carries where the player sat within his own
  // position, which is the only order judgement this deck makes.
  const roundOne = [...input.picks]
    .filter((p) => p.round === 1)
    .sort((a, b) => a.pickOverall - b.pickOverall)
  if (roundOne.length >= 4) {
    slides.push({
      kind: 'list',
      eyebrow: 'Round one',
      headline: 'How the first round went.',
      revealOneByOne: true,
      rows: roundOne.map((p) => {
        const po = posOrder.get(p.pickOverall)
        return {
          lead: `${p.pickOverall}`,
          label: p.playerName,
          sub: input.teamName(p.draftedByTeamId),
          value: po ? `${po.position}${po.nth}` : p.position,
          ...teamVisual(input, p.draftedByTeamId),
        }
      }),
    })
  }

  slides.push({
    kind: 'sign-off',
    headline: 'The board is set.',
    sub: 'The season starts when the games do.',
  })

  return { id: 'draft', title: 'The draft', slides }
}
