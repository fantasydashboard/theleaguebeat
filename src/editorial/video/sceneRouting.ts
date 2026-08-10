/**
 * Scene routing — maps the issue's section types onto video scene
 * templates. Mirrors `sectionForStoryType` in composition.ts.
 *
 * Two rules matter here:
 *
 *   1. Unmapped sections are SKIPPED, never rendered generically. A
 *      shorter honest reel beats a padded one.
 *   2. Dedup runs on SceneTemplate, not SectionType. The mapping is
 *      many-to-one, so composeIssue's own dedup is not sufficient —
 *      without this pass, hero-faceoff + matchup-of-week would render
 *      as two identical scenes in a row.
 */

import type { IssueSection, SectionType } from '../composition'
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

/** Input is expected priority-sorted (composeIssue guarantees this), so
 *  first-wins is the same as highest-priority-wins. */
export function dedupeByTemplate(sections: IssueSection[]): IssueSection[] {
  const used = new Set<SceneTemplate>()
  const kept: IssueSection[] = []

  for (const section of sections) {
    const template = templateForSection(section.type)
    if (!template) continue
    if (used.has(template)) continue
    used.add(template)
    kept.push(section)
  }

  return kept
}
