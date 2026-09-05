/**
 * The Issue — one week, one ordered set of sections.
 *
 * WHY THIS LAYER EXISTS. The Issue page and present mode were about to
 * become two implementations of the same week. The decks
 * (`buildDraftDeck`, `buildBoardDeck`, `buildWireDeck`) each assemble
 * their own narrative from the shared facts modules; a page that did
 * the same would be a third assembly, and within a month one of them
 * would say a team won the draft while another said it did not.
 *
 * So the week is assembled ONCE, here, into sections. The page renders
 * sections as blocks; present mode renders the same sections as
 * slides. Adding a section adds a slide, for free and in agreement.
 *
 * This sits BESIDE the facts modules rather than above them. It does
 * no arithmetic — every number arrives already computed by
 * `rosterStrength`, `draftValue`, `projectedSeason`, `wireFacts` and
 * the rest. A calculation appearing in this file is a signal it
 * belongs in one of those.
 */

/** One row of tabular content — a claim per line. */
export interface IssueRow {
  /** Left gutter: a rank, a slot, a grade. */
  lead?: string
  label: string
  /** Right-aligned figure. */
  value?: string
  /** Small line under the label. */
  sub?: string
  teamId?: string
  logoUrl?: string
  logoColor?: string
  logoInitials?: string
  /** A face, when the row is about a person. Vertical format gives a
   *  row its own screen, and a name alone on a screen is thin. */
  imageUrl?: string
}

/** One team, presented on its own. */
export interface IssueCard {
  teamId: string
  /** 1 = top. */
  rank: number
  fieldSize: number
  teamName: string
  /** Short verdict word — "Contender", a draft grade. Omitted when the
   *  data cannot support one rather than defaulted to something bland. */
  tier?: string
  statValue: string
  statLabel: string
  /** Movement since a stated earlier point. Omitted, never "+0". */
  movement?: { places: number; label: string }
  chips?: { value: string; label: string }[]
  /** One or two lines of detail. This is where a card earns its place:
   *  the specific, slightly uncomfortable fact about THIS team. */
  notes?: string[]
  logoUrl?: string
  logoColor?: string
  logoInitials?: string
}

/**
 * A section of the issue.
 *
 * Content is exactly one of chips / rows / cards, or none at all for a
 * pure statement. A section carrying two kinds is a section that has
 * not decided what it is.
 */
/**
 * A section's artwork.
 *
 * Sized DOWN from the cover on purpose: the cover earns a half-screen
 * portrait, and a page where every section shouts at that volume is a
 * page with no hierarchy. These are identity marks — they tell you
 * whose story this is at a glance — not illustrations.
 */
export interface IssueVisual {
  /** One team's mark, or two set against each other. */
  teamIds: string[]
  /** Optional player face, for a section about a person. */
  playerHeadshotUrl?: string
  /** Resolved at build time so the renderer stays dumb. */
  logos: {
    teamId: string
    url?: string
    color?: string
    initials?: string
  }[]
}

export interface IssueSection {
  /** Stable id — render keys, deep links, and the present-mode route. */
  id: string
  /** Small label above the headline: "The verdict", "Power rankings". */
  eyebrow: string
  headline: string
  support?: string
  /** Artwork beside the headline. Omitted when a section has no
   *  subject worth picturing — the schedule is about everybody, so it
   *  gets none rather than an arbitrary crest. */
  visual?: IssueVisual
  chips?: { value: string; label: string }[]
  rows?: IssueRow[]
  cards?: IssueCard[]
  /**
   * Order within the issue. Lower runs earlier.
   *
   * Deliberately a number rather than array position: sections are
   * emitted by independent builders that must not need to know about
   * each other to sit in the right place.
   */
  priority: number
  /**
   * Whether present mode should include this section.
   *
   * Some content reads on a page and dies on a screen — a dense table
   * nobody can follow from six feet away. Defaults to true; a section
   * opts out rather than opting in, so a new section is presentable
   * unless someone decided otherwise.
   */
  presentable?: boolean
}

export interface Issue {
  /** Which league, and which week this covers. */
  leagueName: string
  season: number
  /** 0 before kickoff. */
  week: number
  /** What the issue is running on — stated, so it cannot misdescribe
   *  itself the way the board once claimed "preseason" in week six. */
  basis: string
  /** Ordered, priority-sorted. */
  sections: IssueSection[]
}

/** Sections in reading order. */
export function orderSections(sections: IssueSection[]): IssueSection[] {
  return [...sections].sort((a, b) => a.priority - b.priority)
}
