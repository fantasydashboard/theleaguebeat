/**
 * shareability — editorial layer above the share card that decides:
 *
 *   1. Which story types are worth a share card at all (tier S/A/B/C).
 *   2. Which card format each story type should render in
 *      (cover / numbers / brief).
 *
 * Magazines don't put every article on the cover. The default in the
 * UI ("every section has a share button") is the dashboard reflex,
 * not editorial discipline. This module enforces the discipline.
 *
 * Tier glossary:
 *
 *   S  Always card. Loudest treatment. 1-2 stories per season per team.
 *      e.g. new throne, championship, mathematical elimination.
 *
 *   A  Worth a card. Standard share button. The bread and butter.
 *      e.g. matchup of the week, blowout, photo finish, streak broken.
 *
 *   B  Situational. Share button visible only if the story is fresh and
 *      heavy enough. Quieter affordance.
 *      e.g. hot climber, division clash, three-week comeback.
 *
 *   C  No card. These are filler text, not shareable moments.
 *      e.g. quiet day, identity shift, off-day deep dive.
 */

import type { StoryType } from './detection/types'

export type ShareTier = 'S' | 'A' | 'B' | 'C'
export type ShareFormat = 'cover' | 'numbers' | 'brief'

/* ─────────────────────────────────────────────────────────────────
   Tier map — every active StoryType gets a tier. New story types
   default to Tier B (visible only when heavy + fresh) so we err on
   the side of less noise when something new shows up.
───────────────────────────────────────────────────────────────── */

const TIER_S: ReadonlySet<StoryType> = new Set<StoryType>([
  'new-throne',
  'locked-top-seed',
  'mathematical-elimination',
  'first-time-playoffs',
  'blockbuster-trade',
  'three-hr-game',
  'twelve-k-game',
  'monster-night',
])

const TIER_A: ReadonlySet<StoryType> = new Set<StoryType>([
  'dynasty-falling',
  'dethroned-rivalry',
  'matchup-of-week',
  'photo-finish',
  'razor-close',
  'comeback-win',
  'blowout',
  'streak-broken',
  'cat-sweep',
  'cat-shutout',
  'newcomer-breakout',
  'playoff-rematch',
  'first-above-500',
  'first-below-500',
  'three-week-collapse',
  'basement-streak',
  // Transaction stories worth a card
  'lopsided-trade',
  'faab-blowout',
])

const TIER_B: ReadonlySet<StoryType> = new Set<StoryType>([
  'streak-built',
  'throne-streak',
  'consistency-award',
  'inconsistency-award',
  'three-week-comeback',
  'hot-climber',
  'comeback-team',
  'division-clash',
  'division-lead-change',
  'wild-card-shift',
  'three-way-tie-bubble',
  'rematch',
  'stakes-week',
  'spoiler-watch',
  'spoiler-mode',
  'bubble-surprise',
  'punt-success',
  'punt-failure',
  'waiver-winner',
])

const TIER_C: ReadonlySet<StoryType> = new Set<StoryType>([
  'quiet-day',
  'identity-shift',
  'monday-recap',
  'midweek-trade-talk',
  'friday-preview',
  'sunday-final-push',
  'off-day-deep-dive',
])

export function tierOf(type: StoryType): ShareTier {
  if (TIER_S.has(type)) return 'S'
  if (TIER_A.has(type)) return 'A'
  if (TIER_C.has(type)) return 'C'
  return 'B'
}

/* ─────────────────────────────────────────────────────────────────
   Format router — picks the best card format per story type. Returns
   one of cover/numbers/brief. Drives which template useShareStory
   mounts when generating the PNG.

   Routing rationale:
     - cover   = drama. Stories where the moment itself is the story.
                 New throne, championship, dynasty falling. ONE big
                 cropped team logo carries the card.
     - numbers = data. Stories that live on a stat. Blowouts, streak
                 counts, monster nights, photo finishes. Big numeral
                 anchored by agate-type supporting stats.
     - brief   = wire dispatch. Tight, dense, no big imagery. Hot
                 climbers, division clashes, situational items.
───────────────────────────────────────────────────────────────── */

const COVER_TYPES: ReadonlySet<StoryType> = new Set<StoryType>([
  'new-throne',
  'dynasty-falling',
  'dethroned-rivalry',
  'mathematical-elimination',
  'first-time-playoffs',
  'locked-top-seed',
  'blockbuster-trade',
])

const NUMBERS_TYPES: ReadonlySet<StoryType> = new Set<StoryType>([
  'matchup-of-week',
  'photo-finish',
  'razor-close',
  'blowout',
  'comeback-win',
  'cat-sweep',
  'cat-shutout',
  'streak-built',
  'streak-broken',
  'throne-streak',
  'basement-streak',
  'three-week-comeback',
  'three-week-collapse',
  'monster-night',
  'three-hr-game',
  'twelve-k-game',
  'punt-success',
  'punt-failure',
  // Trade + transaction numerics (player count, FAAB dollars)
  'lopsided-trade',
  'faab-blowout',
])

export function pickFormat(type: StoryType): ShareFormat {
  if (COVER_TYPES.has(type)) return 'cover'
  if (NUMBERS_TYPES.has(type)) return 'numbers'
  return 'brief'
}

/* ─────────────────────────────────────────────────────────────────
   canShare — single-question gate the section components use. Tier C
   gets no share button. Tier B gates on weight + freshness.

   The weight/freshness threshold for Tier B is intentionally loose at
   this stage — better to show the button slightly too often than to
   leave users wondering why some sections are sharable and others
   aren't. Tighten later with impression data.
───────────────────────────────────────────────────────────────── */

export interface ShareGateInput {
  type: StoryType
  weight: number
  freshness?: number
}

export function canShare(story: ShareGateInput): boolean {
  const tier = tierOf(story.type)
  if (tier === 'C') return false
  if (tier === 'S' || tier === 'A') return true

  // Tier B — only if the story is heavy enough OR fresh enough.
  // Weights are detector-defined on a 1-100 scale; freshness is 0-1.
  const fresh = story.freshness ?? 0.5
  return story.weight >= 70 || fresh >= 0.85
}
