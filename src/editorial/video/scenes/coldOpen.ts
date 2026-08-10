/**
 * Cold Open — the fixed first scene. Brand hit, league name, week.
 * Always renders: it depends on nothing but league metadata, which is
 * why it is one of the three scenes that guarantee a valid reel.
 */

import type { CategoryLeagueData, CategoryLeagueDataTeam } from '../../types'
import type { ReelScene, ReelTeam } from '../types'

/** Narrow a full adapter team down to what a scene draws. */
export function toReelTeam(team: CategoryLeagueDataTeam): ReelTeam {
  return {
    id: team.id,
    name: team.name,
    avatarColor: team.avatarColor,
    ownerInitials: team.ownerInitials,
  }
}

export function buildColdOpen(data: CategoryLeagueData): ReelScene {
  return {
    template: 'cold-open',
    props: {
      leagueName: data.leagueName,
      week: data.currentWeek,
      subtitle: 'THE WEEK IN REVIEW',
    },
    vo: `Week ${data.currentWeek} in the ${data.leagueName}.`,
    minDurationMs: 4000,
  }
}
