/**
 * Scene routing — maps the issue's section types onto video scene
 * templates. Mirrors `sectionForStoryType` in composition.ts.
 *
 * Unmapped sections are SKIPPED, never rendered generically. A
 * shorter honest reel beats a padded one.
 *
 * The mapping is many-to-one (hero-faceoff and matchup-of-week both
 * point at the-throne), so a naive render would produce duplicate
 * scenes. That dedup is `buildReel`'s job, not this module's: only
 * `buildReel` knows whether a section's preferred template actually
 * BUILT a scene, and a template slot should only be considered
 * claimed once something real fills it — see the header comment in
 * buildReel.ts for the full story (dynasty-falling: throne-shaped by
 * layout, climb-shaped by data).
 */

import type { SectionType } from '../composition'
import type { SceneTemplate } from './types'

const ROUTES: Partial<Record<SectionType, SceneTemplate>> = {
  'hero-faceoff': 'the-throne',
  'matchup-of-week': 'the-throne',
  'hero-solo': 'the-climb',
  'streak-watch': 'the-climb',
}

export function templateForSection(type: SectionType): SceneTemplate | null {
  return ROUTES[type] ?? null
}
