/**
 * Weekly Awards — pure computation
 * ----------------------------------------------------------------------------
 * Given a single week's matchups (in the unified shape produced by the
 * adapters), return the award set for that week. No Vue, no store reads,
 * no I/O — so the same function powers the History tab's Weekly Awards
 * panel and the standalone Weekly Recap page.
 *
 * Matchup shape used (cross-platform, produced by unifiedAdapter):
 *   { teams: [{ name, points, logo_url? }, { name, points, logo_url? }] }
 */

export interface AwardWinner {
  team_name: string
  logo_url: string
  value: string
  details: string
  season?: string
  week?: number
}

export interface Award {
  title: string
  winner: AwardWinner | null
  isShame?: boolean
}

interface MatchupTeam {
  name: string
  points: number
  logo_url?: string
}

interface WeekMatchup {
  teams?: MatchupTeam[]
}

export function computeWeeklyAwards(weekMatchups: WeekMatchup[]): Award[] {
  let highScore = { value: 0, team: '', logo: '' }
  let lowScore = { value: Infinity, team: '', logo: '' }
  let biggestBlowout = { margin: 0, winner: '', loser: '', winnerLogo: '' }
  let closestGame = { margin: Infinity, winner: '', loser: '', winnerLogo: '' }

  for (const matchup of weekMatchups) {
    const teams = matchup.teams || []
    if (teams.length !== 2) continue

    const [team1, team2] = teams
    const points1 = team1.points || 0
    const points2 = team2.points || 0

    if (points1 > highScore.value) {
      highScore = { value: points1, team: team1.name, logo: team1.logo_url || '' }
    }
    if (points2 > highScore.value) {
      highScore = { value: points2, team: team2.name, logo: team2.logo_url || '' }
    }
    if (points1 > 0 && points1 < lowScore.value) {
      lowScore = { value: points1, team: team1.name, logo: team1.logo_url || '' }
    }
    if (points2 > 0 && points2 < lowScore.value) {
      lowScore = { value: points2, team: team2.name, logo: team2.logo_url || '' }
    }

    const margin = Math.abs(points1 - points2)
    const winnerTeam = points1 > points2 ? team1 : team2
    const loserTeam = points1 > points2 ? team2 : team1

    if (margin > biggestBlowout.margin) {
      biggestBlowout = {
        margin,
        winner: winnerTeam.name,
        loser: loserTeam.name,
        winnerLogo: winnerTeam.logo_url || '',
      }
    }
    if (margin < closestGame.margin && margin > 0) {
      closestGame = {
        margin,
        winner: winnerTeam.name,
        loser: loserTeam.name,
        winnerLogo: winnerTeam.logo_url || '',
      }
    }
  }

  return [
    {
      title: 'Week High Score',
      winner: highScore.value > 0 ? {
        team_name: highScore.team,
        logo_url: highScore.logo,
        value: highScore.value.toFixed(1),
        details: 'Best performance of the week',
      } : null,
      isShame: false,
    },
    {
      title: 'Week Low Score',
      winner: lowScore.value < Infinity ? {
        team_name: lowScore.team,
        logo_url: lowScore.logo,
        value: lowScore.value.toFixed(1),
        details: 'Worst performance of the week',
      } : null,
      isShame: true,
    },
    {
      title: 'Biggest Blowout',
      winner: biggestBlowout.margin > 0 ? {
        team_name: biggestBlowout.winner,
        logo_url: biggestBlowout.winnerLogo,
        value: biggestBlowout.margin.toFixed(1),
        details: `defeated ${biggestBlowout.loser}`,
      } : null,
      isShame: false,
    },
    {
      title: 'Closest Game',
      winner: closestGame.margin < Infinity ? {
        team_name: closestGame.winner,
        logo_url: closestGame.winnerLogo,
        value: closestGame.margin.toFixed(1),
        details: `narrowly beat ${closestGame.loser}`,
      } : null,
      isShame: false,
    },
  ]
}

// ============================================================================
// Category-league weekly awards
// ============================================================================
// Same intent — "what happened this week" — but the unit of competition is
// stat categories won, not points scored. Hero is the most lopsided sweep,
// not the high score. Input shape mirrors the helper above for consistency.

interface CategoryMatchupResult {
  team1: { name: string; logo_url?: string; categoriesWon: number }
  team2: { name: string; logo_url?: string; categoriesWon: number }
  ties?: number
}

export function computeCategoryWeeklyAwards(matchups: CategoryMatchupResult[]): Award[] {
  let mostDominant = { margin: 0, winner: '', loser: '', winnerLogo: '', score: '' }
  let tightest = { margin: Infinity, winner: '', loser: '', winnerLogo: '', score: '' }
  let bestSweep = { cats: 0, team: '', logo: '', total: 0 }

  for (const m of matchups) {
    const w1 = m.team1.categoriesWon || 0
    const w2 = m.team2.categoriesWon || 0
    if (w1 === 0 && w2 === 0) continue

    const totalCats = w1 + w2 + (m.ties || 0)
    const margin = Math.abs(w1 - w2)
    const winnerSide = w1 >= w2 ? m.team1 : m.team2
    const loserSide = w1 >= w2 ? m.team2 : m.team1
    const winnerWins = Math.max(w1, w2)
    const loserWins = Math.min(w1, w2)
    const scoreLabel = m.ties && m.ties > 0
      ? `${winnerWins}-${loserWins}-${m.ties}`
      : `${winnerWins}-${loserWins}`

    if (margin > mostDominant.margin) {
      mostDominant = {
        margin,
        winner: winnerSide.name,
        loser: loserSide.name,
        winnerLogo: winnerSide.logo_url || '',
        score: scoreLabel,
      }
    }
    if (margin < tightest.margin) {
      tightest = {
        margin,
        winner: winnerSide.name,
        loser: loserSide.name,
        winnerLogo: winnerSide.logo_url || '',
        score: scoreLabel,
      }
    }

    // Best individual sweep — highest cats won by any team this week
    if (w1 > bestSweep.cats) {
      bestSweep = { cats: w1, team: m.team1.name, logo: m.team1.logo_url || '', total: totalCats }
    }
    if (w2 > bestSweep.cats) {
      bestSweep = { cats: w2, team: m.team2.name, logo: m.team2.logo_url || '', total: totalCats }
    }
  }

  return [
    {
      title: 'Most Dominant Win',
      winner: mostDominant.margin > 0 || mostDominant.winner ? {
        team_name: mostDominant.winner,
        logo_url: mostDominant.winnerLogo,
        value: mostDominant.score,
        details: `dominated ${mostDominant.loser} in categories`,
      } : null,
      isShame: false,
    },
    {
      title: 'Tightest Battle',
      winner: tightest.margin < Infinity ? {
        team_name: tightest.winner,
        logo_url: tightest.winnerLogo,
        value: tightest.score,
        details: tightest.margin === 0
          ? `tied ${tightest.loser} in categories`
          : `edged out ${tightest.loser}`,
      } : null,
      isShame: false,
    },
    {
      title: 'Best Category Run',
      winner: bestSweep.cats > 0 ? {
        team_name: bestSweep.team,
        logo_url: bestSweep.logo,
        value: `${bestSweep.cats}/${bestSweep.total}`,
        details: 'Categories won this week',
      } : null,
      isShame: false,
    },
  ]
}
