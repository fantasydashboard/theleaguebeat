/**
 * Present mode — the deck contract.
 *
 * A deck is an ordered list of slides; a slide makes ONE claim and
 * shows the evidence for it. Deliberately a plain data type, like the
 * Reel contract it mirrors, so deck builders can be tested without a
 * renderer and the renderer can be exercised without real league data.
 *
 * The slide vocabulary is small on purpose. Every deck (draft, power
 * rankings, the wire, this week) composes from these four; a new deck
 * should need a new BUILDER, not a new slide kind. When something
 * genuinely does not fit, that is the signal to add a kind — not to
 * bend an existing one.
 */

/** Opening card: whose league, what this deck is. */
export interface ColdOpenSlide {
  kind: 'cold-open'
  title: string
  subtitle: string
  /** e.g. "2026 · 140 picks" */
  meta?: string
}

/** One claim, optionally with supporting prose and a few figures. */
export interface StatementSlide {
  kind: 'statement'
  eyebrow: string
  headline: string
  support?: string
  chips?: { value: string; label: string }[]
}

/**
 * An ordered list revealed a row at a time.
 *
 * This is the slide that makes present mode worth presenting: a power
 * ranking read out one place at a time lands completely differently
 * from a table someone scrolls past. `revealOneByOne` tells the
 * renderer to advance through rows before moving to the next slide.
 */
export interface ListSlide {
  kind: 'list'
  eyebrow: string
  headline: string
  /** One line under the headline explaining what the figures mean. A
   *  column of numbers with no stated basis invites the presenter to
   *  guess at it out loud. */
  support?: string
  rows: {
    /** Left gutter — a rank, a round, a pick number. */
    lead?: string
    label: string
    /** Right-aligned figure. */
    value?: string
    /** Small line under the label. */
    sub?: string
    /** Team id, so the renderer can draw a logo when it has one. */
    teamId?: string
    /** Resolved at build time so the renderer stays dumb: it draws what
     *  it is handed rather than reaching back into league data. */
    logoUrl?: string
    /** OKLCH gradient stops for the fallback tile when there is no
     *  uploaded logo. Never fabricated — absent means draw initials. */
    logoColor?: string
    logoInitials?: string
  }[]
  revealOneByOne?: boolean
}

/**
 * One team, one slide.
 *
 * The list slide ranks a league; this one presents a TEAM. A ten-row
 * table read off a screen gives every team two seconds and the room
 * no reason to react to any of them. A card each turns a ranking into
 * ten moments, which is the entire reason to present rather than send
 * a link.
 *
 * Everything here is resolved at build time. The renderer draws what
 * it is handed and never reaches back into league data.
 */
export interface TeamCardSlide {
  kind: 'team-card'
  eyebrow: string
  /** 1 = best. Shown large — it is the reason the slide exists. */
  rank: number
  /** e.g. "10 teams", for "3rd of 10". */
  fieldSize: number
  teamName: string
  /** Short verdict word, e.g. "Contender". Omitted when the data
   *  cannot support one rather than defaulted to something bland. */
  tier?: string
  /** The headline number and what it is. */
  statValue: string
  statLabel: string
  /** Movement since a stated earlier point — omitted when there is no
   *  earlier point to compare against, never rendered as "+0" to fill
   *  the space. */
  movement?: { places: number; label: string }
  /** Supporting figures, at most three. */
  chips?: { value: string; label: string }[]
  /** One or two lines of detail: best player, thinnest slot. */
  notes?: string[]
  teamId?: string
  logoUrl?: string
  logoColor?: string
  logoInitials?: string
}

/**
 * One thing, alone on the screen.
 *
 * What a list row becomes in vertical format. A waiver pickup, a
 * matchup, one side of a trade — anything where the unit is a single
 * item the presenter talks about for a sentence.
 *
 * Distinct from `team-card` because the subject is not always a team:
 * a $47 waiver claim is about a PLAYER, and forcing it through a team
 * shape would bury the name that is the whole point of the slide.
 */
export interface SpotlightSlide {
  kind: 'spotlight'
  eyebrow: string
  /** The subject — a player, a matchup, a side of a trade. */
  title: string
  /** Who it belongs to, or what it is set against. */
  subtitle?: string
  /** The figure that makes it worth a slide. */
  statValue?: string
  statLabel?: string
  /** A face, when there is one. */
  imageUrl?: string
  teamId?: string
  logoUrl?: string
  logoColor?: string
  logoInitials?: string
}

/** Closing card. */
export interface SignOffSlide {
  kind: 'sign-off'
  headline: string
  sub?: string
}

export type PresentSlide =
  | ColdOpenSlide
  | StatementSlide
  | ListSlide
  | TeamCardSlide
  | SpotlightSlide
  | SignOffSlide

export interface PresentDeck {
  /** URL segment: 'draft', 'board', 'wire', 'week'. */
  id: string
  /** Shown in the picker. */
  title: string
  slides: PresentSlide[]
}

/**
 * Total advances a deck needs, counting each revealed row as its own
 * step. The renderer uses this for the progress indicator; a deck whose
 * progress bar jumps in uneven chunks reads as broken.
 */
export function deckStepCount(deck: PresentDeck): number {
  return deck.slides.reduce((total, slide) => {
    if (slide.kind === 'list' && slide.revealOneByOne) {
      return total + Math.max(1, slide.rows.length)
    }
    return total + 1
  }, 0)
}
