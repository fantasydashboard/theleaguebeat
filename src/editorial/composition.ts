/**
 * Composition — turns selected stories into an ordered section list
 * the home view can render.
 *
 * Two layers of sections are mixed:
 *   1. Story-driven sections: one per selected story; the section
 *      type is chosen from the story's type (hero face-off vs hero
 *      solo vs matchup-of-week, etc.).
 *   2. Anchor sections: always-shown (standings, matchup feed,
 *      ticker) or season-stage conditional (playoff-push only fires
 *      late season; draft-autopsy only in opening weeks).
 *
 * Sections all carry a `priority` — composition.ts sorts by it and
 * the home view renders top-to-bottom.
 *
 * See docs/EDITORIAL_ARCHITECTURE.md for the full design.
 */

import type {
  IssueContext,
  SelectedStory,
  StoryType,
} from './detection/types'

/* ─────────────────────────────────────────────────────────────────
   SECTION TYPES
   The set of renderable sections the home view knows about. Adding
   a new section type means:
     1. Add it here
     2. Map a story type → this section in `sectionForStoryType`
        (or add to ANCHOR_SECTIONS for an always-show section)
     3. Wire a Vue component in the home view's section renderer
───────────────────────────────────────────────────────────────── */

export type SectionType =
  /* HERO SLOT — first section, biggest visual weight */
  | 'hero-faceoff'        // two teams: throne change, rivalry, division clash
  | 'hero-solo'           // single team: climber, sweep, milestone
  | 'hero-quiet'          // fallback: low-stakes day, top team holds
  | 'hero-trade'          // future: blockbuster trade
  | 'hero-milestone'      // future: player milestone

  /* STORY SECTIONS — supporting beats below the hero */
  | 'matchup-of-week'     // top 2 facing off
  | 'streak-watch'        // long active streaks
  | 'division-race'       // division standings drama
  | 'trade-recap'         // future: recent trade
  | 'player-spotlight'    // future: player performance

  /* ANCHOR SECTIONS — always or near-always shown */
  | 'standings-compact'
  | 'matchup-feed-today'
  | 'playoff-push-detailed' // stretch / final only
  | 'draft-autopsy'         // opening only
  | 'bracket-projection'    // playoffs only
  | 'quick-reads-ticker'

/* ─────────────────────────────────────────────────────────────────
   ISSUE SECTION SHAPE
───────────────────────────────────────────────────────────────── */

export interface IssueSection {
  type: SectionType
  /** Story driving this section (absent for anchor sections). */
  story?: SelectedStory
  /** Higher renders first. Range ~5–100. */
  priority: number
}

/* ─────────────────────────────────────────────────────────────────
   PUBLIC ENTRY
───────────────────────────────────────────────────────────────── */

export function composeIssue(
  stories: SelectedStory[],
  context: IssueContext,
): IssueSection[] {
  const sections: IssueSection[] = []

  /* 1. Hero — top-ranked story drives the cover. */
  if (stories[0]) {
    sections.push({
      type: heroSectionForStoryType(stories[0].type),
      story: stories[0],
      priority: 100,
    })
  } else {
    // No stories at all → still render a hero placeholder so the page
    // doesn't open with the standings table. The home view renders
    // hero-quiet with a sensible default.
    sections.push({ type: 'hero-quiet', priority: 100 })
  }

  /* 2. Story sections — next 3–4 stories below the hero. Each picks
   *    its own section type; score → priority so the more important
   *    stories show up higher. */
  for (const story of stories.slice(1, 5)) {
    const sectionType = sectionForStoryType(story.type)
    if (!sectionType) continue
    sections.push({
      type: sectionType,
      story,
      priority: scoreToSectionPriority(story.score),
    })
  }

  /* 3. Anchor sections — always shown. */
  sections.push({ type: 'matchup-feed-today', priority: 55 })
  sections.push({ type: 'standings-compact', priority: 50 })

  /* 4. Season-stage conditional inserts. */
  if (context.seasonStage === 'opening') {
    sections.push({ type: 'draft-autopsy', priority: 80 })
  }
  if (context.seasonStage === 'stretch' || context.seasonStage === 'final') {
    sections.push({ type: 'playoff-push-detailed', priority: 60 })
  }
  if (context.seasonStage === 'playoffs') {
    sections.push({ type: 'bracket-projection', priority: 90 })
  }

  /* 5. Ticker — always last. */
  sections.push({ type: 'quick-reads-ticker', priority: 5 })

  /* Sort by priority desc, with stable ordering for ties. */
  return sections
    .map((s, i) => ({ s, i }))
    .sort((a, b) => b.s.priority - a.s.priority || a.i - b.i)
    .map(({ s }) => s)
}

/* ─────────────────────────────────────────────────────────────────
   STORY-TYPE → SECTION-TYPE MAPPINGS
───────────────────────────────────────────────────────────────── */

/** Which hero treatment a story should get when it's the top story.
 *  Defaults to the catch-all solo hero. */
function heroSectionForStoryType(type: StoryType): SectionType {
  switch (type) {
    /* Two-team narratives — face-off format */
    case 'new-throne':
    case 'dynasty-falling':
    case 'dethroned-rivalry':
    case 'division-lead-change':
    case 'matchup-of-week':
    case 'photo-finish':
    case 'razor-close':
    case 'playoff-rematch':
    case 'rematch':
    case 'division-clash':
    case 'spoiler-watch':
      return 'hero-faceoff'

    /* Quiet-day catch-all */
    case 'quiet-day':
      return 'hero-quiet'

    /* Trade-driven (future) */
    case 'blockbuster-trade':
    case 'lopsided-trade':
      return 'hero-trade'

    /* Player-driven (future) */
    case 'monster-night':
    case 'three-hr-game':
    case 'twelve-k-game':
    case 'no-hitter':
    case 'hat-trick':
      return 'hero-milestone'

    /* Everything else gets the solo hero treatment */
    default:
      return 'hero-solo'
  }
}

/** Which supporting-section treatment a story should get when it's a
 *  non-hero supporting beat below the cover. Returns null when the
 *  story has no supporting section (just lives in the ticker). */
function sectionForStoryType(type: StoryType): SectionType | null {
  switch (type) {
    case 'matchup-of-week':
    case 'photo-finish':
    case 'razor-close':
    case 'playoff-rematch':
    case 'division-clash':
    case 'spoiler-watch':
    case 'rematch':
      return 'matchup-of-week'

    case 'throne-streak':
    case 'consistency-award':
    case 'basement-streak':
    case 'three-week-comeback':
    case 'three-week-collapse':
    case 'streak-built':
    case 'streak-broken':
    case 'inconsistency-award':
      return 'streak-watch'

    case 'division-race-tight':
    case 'division-locked-up':
    case 'division-rival-streak':
    case 'cross-division-power-shift':
    case 'divisional-wild-card-implication':
    case 'division-lead-change':
      return 'division-race'

    case 'blockbuster-trade':
    case 'lopsided-trade':
      return 'trade-recap'

    case 'monster-night':
    case 'three-hr-game':
    case 'twelve-k-game':
    case 'no-hitter':
    case 'hat-trick':
      return 'player-spotlight'

    /* Standings stories without a dedicated supporting section just
     *  appear as a solo hero if they made the hero slot, or get
     *  absorbed into the ticker. Return null to skip. */
    default:
      return null
  }
}

/** Map a story's composite score to a section priority. Linear scale
 *  capped between 30 and 95 so anchor sections stay where they belong
 *  (standings at 50, matchup feed at 55). */
function scoreToSectionPriority(score: number): number {
  if (!Number.isFinite(score)) return 30
  // Scores typically range 0–150 (weight up to 100 × multipliers).
  // Linear map [0, 150] → [30, 95].
  const clamped = Math.max(0, Math.min(150, score))
  return Math.round(30 + (clamped / 150) * 65)
}
