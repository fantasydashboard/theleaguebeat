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
import { heroBoostFor } from './cadence'

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

  /* 1. Hero — top-ranked story drives the cover, with a cadence-
   *    aware re-rank applied just to the hero slot. A fresh daily-
   *    cadence story (monster night, blockbuster trade, streak
   *    event) gets a 1.25x boost so it can leapfrog a higher-raw-
   *    weight weekly story. The selection layer's order is
   *    respected everywhere else — this swap only affects which
   *    story carries the cover. */
  const hero = pickHero(stories)
  if (hero) {
    sections.push({
      type: heroSectionForStoryType(hero.type),
      story: hero,
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
   *    stories show up higher. The hero is excluded so it doesn't
   *    render twice when the cadence swap promoted it from later in
   *    the list.
   *
   *    Dedup by SectionType: the home page renders one
   *    matchup-of-week, one streak-watch, one division-race. Without
   *    this filter, two stories of the same section type (e.g.
   *    "rematch" + "matchup-of-week" both routed to matchup-of-week)
   *    would render as two visually identical faceoff cards
   *    back-to-back — templated, not editorial. */
  const heroSig = hero?.signature
  const remaining = stories
    .filter((s) => s.signature !== heroSig)
    .slice(0, 4)
  const usedSectionTypes = new Set<SectionType>()
  for (const story of remaining) {
    const sectionType = sectionForStoryType(story.type)
    if (!sectionType) continue
    if (usedSectionTypes.has(sectionType)) continue  // one per section type
    usedSectionTypes.add(sectionType)
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
   HERO SELECTION
───────────────────────────────────────────────────────────────── */

/**
 * Editorial tier for the hero slot. Stories in lower tiers ALWAYS
 * beat stories in higher tiers, regardless of raw score. Within a
 * tier, score × cadence-boost breaks the tie.
 *
 * The tiers encode "what kind of story deserves the cover":
 *
 *   Tier 1: Stop the presses. Once-a-season moments. Mathematical
 *           elimination, locked top seed, championship, blockbuster
 *           trade. These dominate the cover when they fire.
 *
 *   Tier 2: Major news. The shock at the top of the standings or a
 *           freak player night. New throne, dynasty falling, monster
 *           player game.
 *
 *   Tier 3: Weekly headline. The "what happened this week" story.
 *           Default hero in a typical week.
 *
 *   Tier 4: Watch-this. Mid-arc stories worth a hero spot when no
 *           bigger story is firing.
 *
 *   Tier 5: Notable but secondary. Below-hero by default; only
 *           bubble up when tiers 1-4 are all empty.
 *
 *   Tier 6: Never hero. Filler. Renders as ticker / brief / skipped.
 */
function heroTier(type: StoryType): number {
  switch (type) {
    /* ── Tier 1: Cover story ──────────────────────────────────── */
    case 'mathematical-elimination':
    case 'locked-top-seed':
    case 'first-time-playoffs':
    case 'blockbuster-trade':
      return 1

    /* ── Tier 2: Major news ───────────────────────────────────── */
    case 'new-throne':
    case 'dynasty-falling':
    case 'dethroned-rivalry':
    case 'monster-night':
    case 'three-hr-game':
    case 'twelve-k-game':
      return 2

    /* ── Tier 3: Weekly headline ──────────────────────────────── */
    case 'matchup-of-week':
    case 'photo-finish':
    case 'comeback-win':
    case 'blowout':
    case 'cat-sweep':
    case 'cat-shutout':
    case 'streak-broken':
    case 'throne-streak':
      return 3

    /* ── Tier 4: Watch-this ───────────────────────────────────── */
    case 'comeback-team':
    case 'three-week-comeback':
    case 'three-week-collapse':
    case 'division-lead-change':
    case 'hot-climber':
    case 'playoff-rematch':
    case 'spoiler-mode':
    case 'spoiler-watch':
      return 4

    /* ── Tier 5: Notable but secondary ────────────────────────── */
    case 'streak-built':
    case 'newcomer-breakout':
    case 'division-clash':
    case 'rematch':
    case 'bubble-surprise':
    case 'punt-success':
    case 'punt-failure':
    case 'razor-close':
    case 'basement-streak':
    case 'first-above-500':
    case 'first-below-500':
    case 'stakes-week':
      return 5

    /* ── Tier 6: Never hero ───────────────────────────────────── */
    default:
      return 6
  }
}

/**
 * Pick the hero story from the selected list. Orders by tier first
 * (Tier 1 always beats Tier 2 regardless of score), then by
 * `score * cadenceBoost` within a tier. This is the editorial
 * discipline that ensures a fresh photo-finish doesn't outweigh a
 * locked top seed just because the score math happened to land.
 *
 * Considers the top 6 selected stories (broadened from 4 since
 * tier-sort means a high-tier story far down the list can still
 * claim the cover).
 *
 * Returns undefined when the input is empty so callers can fall
 * back to the quiet-day placeholder.
 */
function pickHero(stories: SelectedStory[]): SelectedStory | undefined {
  if (stories.length === 0) return undefined

  const ranked = stories
    .slice(0, 6)
    .map((s) => ({
      story: s,
      tier: heroTier(s.type),
      tieScore: s.score * heroBoostFor(s.type),
    }))
    .sort((a, b) => {
      // Lower tier wins. Within a tier, higher tieScore wins.
      if (a.tier !== b.tier) return a.tier - b.tier
      return b.tieScore - a.tieScore
    })

  return ranked[0].story
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

    /* Trade-driven — two teams; faceoff treatment works as fallback
     *  until a dedicated HeroTrade component lands. */
    case 'blockbuster-trade':
    case 'lopsided-trade':
      return 'hero-faceoff'

    /* Player-driven — single subject; solo treatment works as
     *  fallback until a dedicated HeroMilestone (player-centric)
     *  component lands. */
    case 'monster-night':
    case 'three-hr-game':
    case 'twelve-k-game':
    case 'no-hitter':
    case 'hat-trick':
      return 'hero-solo'

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
