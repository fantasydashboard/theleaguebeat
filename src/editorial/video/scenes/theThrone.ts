/**
 * The Throne — a two-team faceoff told as a category tug-of-war.
 *
 * teamA is always the WINNER, so the scene reads left-to-right as the
 * story does. Undecided categories are dropped: a contested cat is not
 * a won cat, and drawing it as one would be a lie in motion.
 */

import type { CategoryLeagueData, CategoryLeagueDataMatchup } from '../../types'
import type { SelectedStory } from '../../detection/types'
import type { ReelScene, ThroneCatLine } from '../types'
import { toReelTeam } from './coldOpen'

const EN_DASH = '–'
const SHARE_MIN = 0.5
const SHARE_MAX = 0.95

function findMatchup(
  data: CategoryLeagueData,
  idA: string,
  idB: string,
): CategoryLeagueDataMatchup | null {
  // matchupsCurrentWeek, NOT matchupsByWeek — see the field note in the
  // sign-off builder. Both exist on the contract and mean different things.
  const week = data.matchupsCurrentWeek ?? []
  return (
    week.find(
      (m) =>
        (m.homeTeamId === idA && m.awayTeamId === idB) ||
        (m.homeTeamId === idB && m.awayTeamId === idA),
    ) ?? null
  )
}

export function buildThrone(
  data: CategoryLeagueData,
  story: SelectedStory,
): ReelScene | null {
  const ids = story.teamIds ?? []
  if (ids.length < 2) return null

  const matchup = findMatchup(data, ids[0], ids[1])
  if (!matchup || !matchup.catLines || matchup.catLines.length === 0) return null

  // A tie has no winner, and this scene's entire frame is "X beat Y" — there
  // is no honest way to narrate a draw as a decisive category score, so skip
  // it rather than fabricate a winner out of a level matchup.
  if (matchup.homeCatWins === matchup.awayCatWins) return null

  const homeWon = matchup.homeCatWins >= matchup.awayCatWins
  const winnerId = homeWon ? matchup.homeTeamId : matchup.awayTeamId
  const loserId = homeWon ? matchup.awayTeamId : matchup.homeTeamId

  const winner = data.teams.find((t) => t.id === winnerId)
  const loser = data.teams.find((t) => t.id === loserId)
  if (!winner || !loser) return null

  const catLines: ThroneCatLine[] = []
  for (const line of matchup.catLines) {
    if (line.status === 'contested') continue
    const total = line.homeCurrent + line.awayCurrent
    if (total <= 0) continue

    const category = data.categories.find((c) => c.id === line.catId)
    if (!category) continue

    const homeTookIt = line.status === 'decided-home' || line.status === 'punted-away'
    const raw = Math.max(line.homeCurrent, line.awayCurrent) / total

    catLines.push({
      label: category.label,
      winner: homeTookIt === homeWon ? 'a' : 'b',
      share: Math.min(SHARE_MAX, Math.max(SHARE_MIN, raw)),
    })
  }

  if (catLines.length === 0) return null

  const winnerCats = homeWon ? matchup.homeCatWins : matchup.awayCatWins
  const loserCats = homeWon ? matchup.awayCatWins : matchup.homeCatWins
  const headline = `${winnerCats}${EN_DASH}${loserCats}`

  return {
    template: 'the-throne',
    props: {
      teamA: toReelTeam(winner),
      teamB: toReelTeam(loser),
      eyebrow: 'MATCHUP OF THE WEEK',
      headline,
      catLines,
      kicker: `${winnerCats} CATEGORIES TO ${loserCats}`,
    },
    vo: `${winner.name} and ${loser.name} met with the week on the line, and ${winner.name} took it ${winnerCats} categories to ${loserCats}.`,
    minDurationMs: 11000,
    storySignature: story.signature,
  }
}
