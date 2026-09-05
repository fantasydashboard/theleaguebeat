/**
 * The issue, presented.
 *
 * Present mode does not assemble a week. It renders the one the issue
 * already assembled — so a deck cannot say a team won the draft while
 * the page says it did not, and a new section becomes a new slide
 * without anyone wiring it twice.
 *
 * This file is deliberately mechanical. Every editorial decision —
 * what runs, in what order, with what copy — was made in the issue
 * builder. The only judgement here is about the SHAPE of a screen
 * versus a page:
 *
 *   · a section with cards becomes one slide per team, counted down,
 *     because a ranking read out one place at a time lands and a table
 *     scrolled past does not
 *   · a section with rows becomes a reveal list
 *   · everything else becomes a statement
 *
 * A section can opt out with `presentable: false` when it reads on a
 * page and dies on a screen. Opting OUT rather than in means a new
 * section is presentable by default — the failure mode is a slide too
 * many, which someone notices, rather than a slide missing, which
 * nobody does.
 */
import type { Issue, IssueSection } from './types'
import type { PresentDeck, PresentSlide } from '../present/types'

/** How a deck will be shown, which changes what a section becomes. */
export type PresentFormat = 'landscape' | 'vertical'

export interface DeckFromIssueOptions {
  /** Present ONE section rather than the issue. Every section button
   *  is this with its own id. */
  only?: string
  /** Defaults to landscape. */
  format?: PresentFormat
  /** URL segment for the deck. */
  id?: string
}

/**
 * Cards count down to first place; everything else keeps its order.
 *
 * VERTICAL CHANGES THE UNIT, not just the styling. A list that
 * accumulates rows is unreadable in a 870x930 box and gives the
 * presenter nothing to talk about — so each row becomes its own
 * screen. The rule already existed for cards; vertical extends it to
 * rows.
 *
 * Support text is also dropped in vertical, because the presenter IS
 * the narration. Two sentences on screen while somebody reads them
 * aloud is the same information twice, in the space a name needs.
 */
function slidesForSection(
  section: IssueSection,
  format: PresentFormat,
): PresentSlide[] {
  const support = format === 'vertical' ? undefined : section.support

  if (section.cards?.length) {
    // Worst first, so the room waits for the top of the board instead
    // of reading it and then sitting through nine also-rans.
    const countdown = [...section.cards].sort((a, b) => b.rank - a.rank)
    return countdown.map((c) => ({
      kind: 'team-card',
      eyebrow: section.eyebrow,
      rank: c.rank,
      fieldSize: c.fieldSize,
      teamName: c.teamName,
      tier: c.tier,
      statValue: c.statValue,
      statLabel: c.statLabel,
      movement: c.movement,
      chips: c.chips,
      notes: c.notes,
      teamId: c.teamId,
      logoUrl: c.logoUrl,
      logoColor: c.logoColor,
      logoInitials: c.logoInitials,
    }))
  }

  if (section.rows?.length) {
    if (format === 'vertical') {
      // A title card, then one screen per item. The title card is what
      // tells a scroller what they are looking at before the first
      // item lands.
      return [
        {
          kind: 'statement',
          eyebrow: section.eyebrow,
          headline: section.headline,
          support,
          chips: section.chips,
        },
        ...section.rows.map<PresentSlide>((row) => ({
          kind: 'spotlight',
          eyebrow: section.eyebrow,
          title: row.label,
          subtitle: row.sub,
          statValue: row.value,
          statLabel: row.lead,
          imageUrl: row.imageUrl,
          teamId: row.teamId,
          logoUrl: row.logoUrl,
          logoColor: row.logoColor,
          logoInitials: row.logoInitials,
        })),
      ]
    }
    return [
      {
        kind: 'list',
        eyebrow: section.eyebrow,
        headline: section.headline,
        support,
        revealOneByOne: true,
        rows: section.rows,
      },
    ]
  }

  return [
    {
      kind: 'statement',
      eyebrow: section.eyebrow,
      headline: section.headline,
      support,
      chips: section.chips,
    },
  ]
}

/**
 * Turn an issue into a deck.
 *
 * @param issue the week, already assembled.
 * @param id    URL segment for the deck.
 */
export function deckFromIssue(
  issue: Issue,
  options: DeckFromIssueOptions = {},
): PresentDeck | null {
  const format = options.format ?? 'landscape'
  const id = options.id ?? options.only ?? 'issue'

  let presentable = issue.sections.filter((s) => s.presentable !== false)
  if (options.only) {
    presentable = presentable.filter((s) => s.id === options.only)
  }
  if (presentable.length === 0) return null

  // One section is its own clip, so it is titled by the section rather
  // than by the week — "Waivers", not "Week 3", because that is what
  // the post is about.
  const single = options.only ? presentable[0] : null

  const slides: PresentSlide[] = [
    {
      kind: 'cold-open',
      title: issue.leagueName,
      subtitle: issue.week > 0 ? `Week ${issue.week}` : 'Preseason',
      // States what the issue runs on, so a deck cannot misdescribe
      // its own evidence the way the board once claimed "preseason"
      // six weeks into a season.
      meta: `${issue.season} · ${issue.basis}`,
    },
  ]

  for (const section of presentable) {
    slides.push(...slidesForSection(section, format))
  }

  slides.push({
    kind: 'sign-off',
    headline: issue.week > 0 ? 'That is the week.' : 'The board is set.',
    sub: issue.week > 0 ? 'It changes again on Sunday.' : 'It only counts once they play.',
  })

  return {
    id,
    title: single
      ? single.eyebrow
      : issue.week > 0
        ? `Week ${issue.week}`
        : 'The preseason issue',
    slides,
  }
}
