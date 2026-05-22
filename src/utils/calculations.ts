import type { SleeperRoster, SleeperMatchup } from '@/types/sleeper'

// Calculate all-play record for a roster
export function calculateAllPlayRecord(
  rosterId: number,
  matchupsByWeek: Map<number, SleeperMatchup[]>,
  playoffWeekStart: number
): { wins: number; losses: number } {
  let wins = 0
  let losses = 0

  matchupsByWeek.forEach((weekMatchups, week) => {
    // Only count regular season
    if (week >= playoffWeekStart) return

    const myMatchup = weekMatchups.find(m => m.roster_id === rosterId)
    if (!myMatchup) return

    const myPoints = myMatchup.points || 0

    weekMatchups.forEach(opponent => {
      if (opponent.roster_id !== rosterId) {
        const oppPoints = opponent.points || 0
        if (myPoints > oppPoints) {
          wins++
        } else if (myPoints < oppPoints) {
          losses++
        }
      }
    })
  })

  return { wins, losses }
}

// Calculate total transactions (trades + waivers) for a roster
export function calculateTransactionCount(
  rosterId: number,
  transactions: any[]
): number {
  return transactions.filter(t => 
    t.roster_ids?.includes(rosterId) && 
    t.status === 'complete' &&
    (t.type === 'trade' || t.type === 'waiver' || t.type === 'free_agent')
  ).length
}

// Get standings data over time (by week)
export function getStandingsOverTime(
  rosters: SleeperRoster[],
  matchupsByWeek: Map<number, SleeperMatchup[]>,
  playoffWeekStart: number
) {
  const weeks = Array.from(matchupsByWeek.keys())
    .filter(w => w < playoffWeekStart)
    .sort((a, b) => a - b)

  const standingsData: {
    week: number
    standings: Array<{ rosterId: number; wins: number; losses: number; pointsFor: number }>
  }[] = []

  weeks.forEach(throughWeek => {
    const weekStandings = rosters.map(roster => {
      let wins = 0
      let losses = 0
      let pointsFor = 0

      matchupsByWeek.forEach((weekMatchups, week) => {
        if (week > throughWeek || week >= playoffWeekStart) return

        const myMatchup = weekMatchups.find(m => m.roster_id === roster.roster_id)
        if (!myMatchup) return

        pointsFor += myMatchup.points || 0

        if (myMatchup.matchup_id) {
          const opponent = weekMatchups.find(
            m => m.matchup_id === myMatchup.matchup_id && m.roster_id !== roster.roster_id
          )

          if (opponent) {
            if ((myMatchup.points || 0) > (opponent.points || 0)) {
              wins++
            } else if ((myMatchup.points || 0) < (opponent.points || 0)) {
              losses++
            }
          }
        }
      })

      return {
        rosterId: roster.roster_id,
        wins,
        losses,
        pointsFor
      }
    })

    // Sort by wins, then points
    weekStandings.sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins
      return b.pointsFor - a.pointsFor
    })

    standingsData.push({
      week: throughWeek,
      standings: weekStandings
    })
  })

  return standingsData
}

// Determine best and worst managers based on points
export function getBestWorstManagers(rosters: SleeperRoster[]): {
  best: SleeperRoster | null
  worst: SleeperRoster | null
} {
  if (rosters.length === 0) return { best: null, worst: null }

  const sorted = [...rosters].sort((a, b) => 
    (b.settings?.fpts || 0) - (a.settings?.fpts || 0)
  )

  return {
    best: sorted[0],
    worst: sorted[sorted.length - 1]
  }
}
