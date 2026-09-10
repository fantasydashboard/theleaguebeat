/**
 * Hand-offs to Ultimate Fantasy Dashboard.
 *
 * The League Beat reports what happened. UFD's paid tools decide what
 * to do about it — the wire ranked against YOUR lineup, the trade
 * analyser, the start/sit call. So the pitch belongs at the moment the
 * reader has just been told what happened and their next thought is
 * already "so what do I do?", not in a rail nobody reads.
 *
 * WHAT IS NOT ADVERTISED. UFD gives power rankings, standings and
 * league history away free, and The League Beat already prints all
 * three. Promoting those would point a reader at something they are
 * looking at. Only the paid decisions are worth a hand-off.
 *
 * WHY THERE IS A CAP. Banner blindness is learned per PATTERN, not per
 * instance: show the same treatment three times in one scroll and the
 * reader learns to skip it, including the one that would have
 * converted. Two is the ceiling.
 *
 * WHERE THESE MUST NEVER APPEAR. Every line says "your league", "your
 * lineup". The issue is also a thing you share with the whole league,
 * and UFD's own position is "don't tell your league — this is your
 * edge, not a league-wide tool". So these render only on the
 * authenticated league view: never on the public share page, never in
 * exported slides, never in present mode.
 */

export type HandoffTone = 'card' | 'note'

export interface Handoff {
  /** Section id this attaches to, or a synthetic key for a page block. */
  key: string
  tone: HandoffTone
  body: string
  cta: string
  /** Appended to the destination for attribution. */
  campaign: string
}

const BASE = 'https://www.ultimatefantasydashboard.com/'

/**
 * Destination for a hand-off.
 *
 * Deliberately the front door rather than a deep link. `/wire`,
 * `/trades` and the rest all render the marketing page to a signed-out
 * visitor — and a reader who clicks "see the trade analyser" and lands
 * on a pitch has been misled. Point at the door, let UFD route them,
 * and keep the copy honest about where they are going.
 */
export function handoffHref(h: Handoff): string {
  return `${BASE}?utm_source=theleaguebeat&utm_medium=issue&utm_campaign=${h.campaign}`
}

/**
 * Ordered by what the reader can DO right now, which is not the same
 * as how interesting the section is.
 *
 * A trade just landed and you are deciding whether to answer it; games
 * are running and the lineup lock is minutes away. Both beat the wire,
 * where the claims already processed and the next move is a week off.
 *
 * The draft-grades one is LAST because it is the weakest moment of the
 * four, not because it does not belong. An earlier version left it out
 * entirely on the grounds that the draft is past tense and there is
 * nothing to act on. That is true of the grade and false of the reader:
 * somebody who has just seen their roster ranked is about to ask who
 * they should start, and before kickoff it is the only hand-off the
 * page can carry — the preseason issue has no trades, no wire and no
 * live matchups, so the whole pre-season window rendered nothing at
 * all.
 */
export const HANDOFFS: Handoff[] = [
  {
    key: 'trades',
    tone: 'card',
    body:
      'Ultimate Fantasy Dashboard reads every roster in your league to find the ' +
      'manager who is desperate for what you are sitting on — then scores the deal ' +
      'from both sides. Same account; your leagues are already connected.',
    cta: 'See the trade analyser',
    campaign: 'trades',
  },
  {
    key: 'live-matchups',
    tone: 'note',
    body:
      'Not sure who to start? Ultimate Fantasy Dashboard builds your optimal lineup ' +
      'in your league’s exact scoring, with the reason attached.',
    cta: 'See your lineup',
    campaign: 'lineup',
  },
  {
    key: 'the-wire',
    tone: 'note',
    // Stage-neutral on purpose: this same hand-off serves the preseason
    // `since-the-draft` section, where "who scored most last week" names
    // a week that has not happened.
    body:
      'That is what your league did. Ultimate Fantasy Dashboard ranks the wire by ' +
      'what a player would add to YOUR starting lineup — not by who is being added ' +
      'everywhere else.',
    cta: 'See your wire targets',
    campaign: 'wire',
  },
  {
    key: 'draft-grades',
    tone: 'card',
    body:
      'Your draft is done. Ultimate Fantasy Dashboard builds your week one lineup ' +
      'in your league’s exact scoring and tells you which of these picks are ' +
      'actually worth starting. Same account; your leagues are already connected.',
    cta: 'See your week one lineup',
    campaign: 'preseason-lineup',
  },
]

/**
 * Section ids that mean the same thing to a hand-off.
 *
 * The preseason calls the waiver section `since-the-draft`; once
 * waivers run for real the weekly issue calls it `the-wire`. Same
 * reader, same decision, same UFD tool — only the season stage differs,
 * so keying the pitch to one id left the whole preseason with a single
 * hand-off on a page long enough to carry two.
 */
const SECTION_ALIASES: Record<string, string> = {
  'since-the-draft': 'the-wire',
}

/** At most this many in one issue. */
export const HANDOFF_CAP = 2

/** The hand-off key a section answers to, if any. */
export function handoffKeyFor(sectionId: string): string {
  return SECTION_ALIASES[sectionId] ?? sectionId
}

/**
 * Which hand-offs to show, given what is actually on the page.
 *
 * Capped rather than hardcoded, because which sections exist changes
 * week to week: a Wednesday with no trade gets the wire and the
 * lineup, a week with one gets the trade and the lineup, the preseason
 * gets none at all. Fixing the pair would leave empty slots some weeks
 * and three promos in others.
 */
export function chooseHandoffs(available: readonly string[]): Handoff[] {
  const present = new Set(available.map(handoffKeyFor))
  // Both lineup pitches make the same ask, and they overlap for exactly
  // one window: week one in progress, before any week has completed, when
  // the page is still the preseason issue but games are running. The live
  // one is the better moment, so the preseason one stands down.
  if (present.has('live-matchups')) present.delete('draft-grades')
  return HANDOFFS.filter((h) => present.has(h.key)).slice(0, HANDOFF_CAP)
}
