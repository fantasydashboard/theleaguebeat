/**
 * buildReel — the only place editorial judgment lives on the video
 * side. Pure: no I/O, no clock, no randomness. Same inputs always
 * produce the same Reel, which is what makes the snapshot tests
 * meaningful and the renders reproducible.
 *
 * Structure is a fixed spine with a dynamic middle:
 *
 *   cold-open  →  [story scenes]  →  the-board  →  sign-off
 *
 * The fixed scenes are what guarantee a valid reel in a quiet week.
 * Story scenes come from composeIssue(), which reflects the WEB
 * LAYOUT's idea of section type (`hero-faceoff`, `matchup-of-week`,
 * `hero-solo`, `streak-watch`, …) — a decision made without any
 * awareness of what data a video scene template actually needs.
 * `the-throne` needs two teams and a decided current-week matchup;
 * `the-climb` needs one team and at least three rank-history points.
 * A single-team story like `dynasty-falling` can be routed to
 * `hero-faceoff` purely as a page-layout choice and yet have nothing
 * to fill a Throne with.
 *
 * So dedup here runs on BUILT scenes, not on section types: a
 * template slot is claimed only once a builder actually returns a
 * scene for it. `templateForSection` gives each section's PREFERRED
 * template; if that template is already claimed or its builder
 * returns null, the other story template is tried as a fallback
 * before the story is given up on. This is what lets `dynasty-falling`
 * (throne-shaped by layout, climb-shaped by data) still produce a
 * scene instead of silently losing a template slot to a story that
 * can't fill it. Any builder returning null drops its scene silently
 * — a shorter honest reel beats a padded one.
 */

import type { CategoryLeagueData } from '../types'
import type { IssueContext, SelectedStory } from '../detection/types'
import { composeIssue } from '../composition'
import type { Reel, ReelScene, SceneTemplate } from './types'
import { templateForSection } from './sceneRouting'
import { buildColdOpen } from './scenes/coldOpen'
import { buildSignOff } from './scenes/signOff'
import { buildBoard } from './scenes/theBoard'
import { buildThrone } from './scenes/theThrone'
import { buildClimb } from './scenes/theClimb'

/** How many story scenes sit between the cold open and the board. The
 *  real ceiling today is `STORY_TEMPLATES.length` (2) — dedup means at
 *  most one scene per story template survives, so this never actually
 *  binds. It exists as headroom: if a third story template is ever
 *  routed in, this is what keeps the reel from growing unbounded. */
const MAX_STORY_SCENES = 3

/** The two scene templates a story can fill, in the order fallback is
 *  tried. Kept a flat list (not a lookup table) because with only two
 *  members, "the other one" is simpler than a map. */
const STORY_TEMPLATES: SceneTemplate[] = ['the-throne', 'the-climb']

/** Attempt to build `template` for `story`. Unknown templates (i.e.
 *  anything that isn't one of the two story templates) never occur
 *  here — `candidatesFor` only ever draws from STORY_TEMPLATES — but
 *  the null fallthrough keeps this total rather than partial. */
function buildStoryScene(
  template: SceneTemplate,
  data: CategoryLeagueData,
  story: SelectedStory,
): ReelScene | null {
  if (template === 'the-throne') return buildThrone(data, story)
  if (template === 'the-climb') return buildClimb(data, story)
  return null
}

/** Preferred template first, then whichever other story template
 *  exists — the fallback path for a story whose layout-driven section
 *  type doesn't match what its data can actually support.
 *
 *  The two fallback directions are NOT symmetric. Climb → Throne is
 *  self-limiting: `buildThrone` requires two teams, so a genuinely
 *  single-team story always trips that guard and falls through
 *  cleanly. Throne → Climb is not self-limiting the same way —
 *  `buildClimb` only ever reads `teamIds[0]` and has no gate on how
 *  many teams the story actually names, so without a constraint here
 *  a two-team story (e.g. `matchup-of-week`) whose throne slot is
 *  already taken would silently drop its second team and still
 *  produce a scene — exactly the padded, non-editorial filler this
 *  module exists to avoid. The Climb is a single-team scene by
 *  design, so a multi-team story is never a candidate for it as a
 *  FALLBACK, regardless of what its rank history looks like. This
 *  gate belongs here, at the fallback decision, not inside
 *  `buildClimb` — a team genuinely holding its rank is a legitimate
 *  Climb when the-climb is the story's PREFERRED template. */
function candidatesFor(
  preferred: SceneTemplate,
  story: SelectedStory,
): SceneTemplate[] {
  const isSingleTeam = (story.teamIds?.length ?? 0) === 1
  const fallbacks = STORY_TEMPLATES.filter(
    (t) => t !== preferred && (t !== 'the-climb' || isSingleTeam),
  )
  return [preferred, ...fallbacks]
}

export function buildReel(
  data: CategoryLeagueData,
  context: IssueContext,
  stories: SelectedStory[],
): Reel {
  const scenes: ReelScene[] = [buildColdOpen(data)]

  /* Story scenes — routed from the existing composition layer, but
   * deduped here (by built scene, not by section type) so a template
   * slot is only spent once something actually fills it. */
  const sections = composeIssue(stories, context)
  const featuredTeamIds: string[] = []
  const usedTemplates = new Set<SceneTemplate>()

  for (const section of sections) {
    if (scenes.length - 1 >= MAX_STORY_SCENES) break
    if (!section.story) continue

    const preferred = templateForSection(section.type)
    if (!preferred) continue

    for (const template of candidatesFor(preferred, section.story)) {
      if (usedTemplates.has(template)) continue

      const scene = buildStoryScene(template, data, section.story)
      if (!scene) continue

      scenes.push(scene)
      usedTemplates.add(template)
      featuredTeamIds.push(...(section.story.teamIds ?? []))
      break
    }
  }

  /* The board — highlights whoever the story scenes were about. */
  const board = buildBoard(data, featuredTeamIds)
  if (board) scenes.push(board)

  /* Sign-off — only when next week's schedule actually exists. */
  const signOff = buildSignOff(data)
  if (signOff) scenes.push(signOff)

  return {
    leagueId: data.leagueId,
    leagueName: data.leagueName,
    year: data.currentSeason,
    week: data.currentWeek,
    width: 1080,
    height: 1920,
    fps: 30,
    scenes,
  }
}
