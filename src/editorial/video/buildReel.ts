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
 * Story scenes come from composeIssue(), routed and deduped by scene
 * template. Any builder returning null drops its scene silently — a
 * shorter honest reel beats a padded one.
 */

import type { CategoryLeagueData } from '../types'
import type { IssueContext, SelectedStory } from '../detection/types'
import { composeIssue } from '../composition'
import type { Reel, ReelScene } from './types'
import { dedupeByTemplate, templateForSection } from './sceneRouting'
import { buildColdOpen } from './scenes/coldOpen'
import { buildSignOff } from './scenes/signOff'
import { buildBoard } from './scenes/theBoard'
import { buildThrone } from './scenes/theThrone'
import { buildClimb } from './scenes/theClimb'

/** How many story scenes sit between the cold open and the board. */
const MAX_STORY_SCENES = 3

export function buildReel(
  data: CategoryLeagueData,
  context: IssueContext,
  stories: SelectedStory[],
): Reel {
  const scenes: ReelScene[] = [buildColdOpen(data)]

  /* Story scenes — routed from the existing composition layer. */
  const sections = dedupeByTemplate(composeIssue(stories, context))
  const featuredTeamIds: string[] = []

  for (const section of sections) {
    if (scenes.length - 1 >= MAX_STORY_SCENES) break
    if (!section.story) continue

    const template = templateForSection(section.type)
    const scene =
      template === 'the-throne' ? buildThrone(data, section.story)
      : template === 'the-climb' ? buildClimb(data, section.story)
      : null

    if (!scene) continue
    scenes.push(scene)
    featuredTeamIds.push(...(section.story.teamIds ?? []))
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
