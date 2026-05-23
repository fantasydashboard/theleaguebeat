/**
 * Detection orchestrator — runs every per-category detector and
 * returns the flat candidate list for selection.
 *
 * Each detector module exports `detect(data, context): StoryCandidate[]`.
 * Adding a new category means importing it here and adding it to
 * `DETECTORS`.
 *
 * See docs/EDITORIAL_ARCHITECTURE.md for the full spec.
 */

import type { CategoryLeagueData } from '../types'
import type { DetectFn, IssueContext, StoryCandidate } from './types'

import { detect as detectStandings } from './standings'
import { detect as detectMatchups } from './matchups'
import { detect as detectStreaks } from './streaks'
import { detect as detectSeasonStage } from './seasonStage'
import { detect as detectCadence } from './cadence'
import { detect as detectDivisions } from './divisions'
import { detectTransactionStories } from './transactions'
import { detectPlayerStories } from './players'
import { detectOvernightStories } from './overnight'

/** Every detector module that's wired in. New modules get added here. */
const DETECTORS: DetectFn[] = [
  detectStandings,
  detectMatchups,
  detectStreaks,
  detectSeasonStage,
  detectCadence,
  detectDivisions,
  detectTransactionStories,
  detectPlayerStories,
  detectOvernightStories,
  // Future tiers:
  //   detectCategories — needs categoryRanksHistory (Tier 2)
  //   detectPersonalization — needs impression infra (Tier 4)
  //   detectAnniversary — needs season history + member metadata (Tier 2)
  //   detectCommissioner — needs settings change log (Tier 3+)
  //   detectAbsences — needs roster snapshot timing (Tier 3b)
]

/** Runs every detector in parallel and returns the merged candidate
 *  list. Detectors are pure synchronous functions; the loop is just
 *  to keep the orchestrator readable. */
export function detectAll(
  data: CategoryLeagueData,
  context: IssueContext,
): StoryCandidate[] {
  const out: StoryCandidate[] = []
  for (const detect of DETECTORS) {
    try {
      const candidates = detect(data, context)
      if (candidates.length > 0) out.push(...candidates)
    } catch (err) {
      // Detectors must never throw, but defend against it so one
      // broken detector doesn't kill the entire issue render.
      console.warn('[detection] detector threw:', err)
    }
  }
  return out
}

// Re-export the types so consumers can `import { detectAll, StoryCandidate }
// from '@/editorial/detection'` without two import lines.
export * from './types'
