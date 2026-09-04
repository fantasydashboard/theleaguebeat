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

/** Cards count down to first place; everything else keeps its order. */
function slidesForSection(section: IssueSection): PresentSlide[] {
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
    return [
      {
        kind: 'list',
        eyebrow: section.eyebrow,
        headline: section.headline,
        support: section.support,
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
      support: section.support,
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
export function deckFromIssue(issue: Issue, id = 'issue'): PresentDeck | null {
  const presentable = issue.sections.filter((s) => s.presentable !== false)
  if (presentable.length === 0) return null

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
    slides.push(...slidesForSection(section))
  }

  slides.push({
    kind: 'sign-off',
    headline: issue.week > 0 ? 'That is the week.' : 'The board is set.',
    sub: issue.week > 0 ? 'It changes again on Sunday.' : 'It only counts once they play.',
  })

  return { id, title: issue.week > 0 ? `Week ${issue.week}` : 'The preseason issue', slides }
}
