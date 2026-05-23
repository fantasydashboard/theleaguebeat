/**
 * cadence — classifies story types by how often they fire. Used by
 * composition to break ties on hero selection: a fresh daily-cadence
 * story beats a stale weekly one of equal weight.
 *
 * The classification is *editorial*, not technical. "Daily" means
 * "this story belongs to a single day's news cycle" — a monster
 * batting line, a streak event, a blockbuster trade. "Weekly" means
 * "this story is about the whole matchup week" — new throne, photo
 * finish, blowout. "Season" means cumulative arcs that span months.
 *
 * Used by:
 *  - composition.ts → hero swap (prefer daily over weekly when fresh)
 *  - render layer  → cadence chip on each section ("DAILY" / "WEEKLY")
 */

import type { StoryType } from './detection/types'

export type Cadence = 'daily' | 'weekly' | 'season'

const DAILY: ReadonlySet<StoryType> = new Set<StoryType>([
  // Player nights — the canonical "today only" cadence. (Tier 3b)
  'monster-night',
  'three-hr-game',
  'twelve-k-game',

  // Transaction events — happen on a specific day. (Tier 3a)
  'blockbuster-trade',

  // Day-of-week cadence beats — pre-existing detectors.
  'monday-recap',
  'midweek-trade-talk',
  'friday-preview',
  'sunday-final-push',
  'off-day-deep-dive',

  // Streak events crystallize on the day the loss/win happened.
  'streak-broken',
  'streak-built',
])

const SEASON: ReadonlySet<StoryType> = new Set<StoryType>([
  'consistency-award',
  'inconsistency-award',
  'identity-shift',
  'three-week-comeback',
  'three-week-collapse',
  'first-above-500',
  'first-below-500',
])

/** Everything else is treated as weekly. Most matchup + standings
 *  stories live here. */
export function cadenceFor(type: StoryType): Cadence {
  if (DAILY.has(type)) return 'daily'
  if (SEASON.has(type)) return 'season'
  return 'weekly'
}

/**
 * Hero-priority boost applied to a story's weight when picking the
 * cover. Daily stories get a boost so a 3-HR-night naturally wins
 * the hero slot over a week-old throne change of equal raw weight.
 * Weekly is the baseline; season-cumulative stories get a slight
 * penalty because they're better suited to the season-arc section.
 */
export function heroBoostFor(type: StoryType): number {
  switch (cadenceFor(type)) {
    case 'daily':  return 1.25
    case 'weekly': return 1.0
    case 'season': return 0.85
  }
}
